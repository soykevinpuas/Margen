import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { useApp, ImportRow, ImportResult } from '../../context/AppContext';
import { getLocalDateKey } from '../../utils/calculations';

interface ImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ---- Funciones puras de parseo/validación (sin Firestore ni UI) ----

const MAX_FILAS = 250;

// Normaliza un header: minúsculas, sin acentos, trim
const normHeader = (v: unknown): string =>
  String(v ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export interface ColumnMap {
  nombre: number;
  categoria: number;
  cantidad: number;
  costo: number;
  precio: number;
  stockMinimo: number;
  fecha: number;
}

// Detecta las columnas esperadas (acepta headers en español/inglés) o null si falta "Nombre"
export function detectColumns(headers: unknown[]): ColumnMap | null {
  const findCol = (pred: (h: string) => boolean): number => {
    for (let i = 0; i < headers.length; i++) {
      if (pred(normHeader(headers[i]))) return i;
    }
    return -1;
  };

  const nombre = findCol((h) =>
    ['nombre', 'name', 'producto', 'product', 'producto nombre'].includes(h)
  );
  if (nombre < 0) return null;

  const categoria = findCol((h) =>
    ['categoria', 'categorias', 'category', 'cat', 'categoría'].includes(h)
  );
  const cantidad = findCol((h) =>
    ['cantidad', 'quantity', 'qty', 'cant', 'unidades', 'units'].includes(h)
  );
  const costo = findCol(
    (h) => h.includes('costo') || h.includes('cost') || h.includes('coste')
  );
  const precio = findCol((h) => (h.includes('precio') || h.includes('price')) && !h.includes('costo'));
  const stockMinimo = findCol((h) => h.includes('stock') && h.includes('min'));
  const fecha = findCol((h) => h.includes('fecha') || h.includes('date'));

  return { nombre, categoria, cantidad, costo, precio, stockMinimo, fecha };
}

// Convierte un número a number válido o null
export function parseNumber(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v ?? '').trim();
  if (s === '') return null;
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

// Convierte a entero (solo si el valor no tiene decimales)
export function parseEntero(v: unknown): number | null {
  const n = parseNumber(v);
  if (n === null) return null;
  const e = Math.trunc(n);
  return e === n ? e : null;
}

// Parsea fecha: serial de Excel (NNNNN) o texto (YYYY-MM-DD / dd/mm/yyyy); null si ilegible
export function parseDateValue(v: unknown): string | null {
  if (typeof v === 'number' && Number.isFinite(v)) {
    // Serial de Excel: días desde 1899-12-30
    const d = new Date(Math.round((v - 25569) * 86400000));
    if (!isNaN(d.getTime())) return getLocalDateKey(d);
    return null;
  }
  const s = String(v ?? '').trim();
  if (s === '') return null;
  const dd = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dd) {
    const d = new Date(Number(dd[3]), Number(dd[2]) - 1, Number(dd[1]));
    if (!isNaN(d.getTime())) return getLocalDateKey(d);
    return null;
  }
  return getLocalDateKey(s) || null;
}

export interface ValidationError {
  fila: number;
  mensaje: string;
}

export interface ValidatedImport {
  validRows: ImportRow[];
  errors: ValidationError[];
  exceso: number; // filas ignoradas por pasar el límite de 250
  message?: string; // error global (ej: falta columna Nombre)
}

// Valida fila por fila y devuelve solo las válidas (fail-fast: si hay errores NO se importa nada)
export function validateFileRows(
  rawRows: Record<string, unknown>[],
  defaultMinStock: number
): ValidatedImport {
  const empty: ValidatedImport = { validRows: [], errors: [], exceso: 0 };
  if (rawRows.length === 0) return { ...empty, message: 'El archivo no contiene datos.' };

  const headers = Object.keys(rawRows[0]).map((h) => (typeof h === 'string' ? h : String(h)));
  const cols = detectColumns(headers);
  if (!cols) {
    return {
      ...empty,
      message:
        'La hoja debe tener una columna "Nombre" en la primera fila. Revisa los headers del archivo.',
    };
  }

  const exceso = Math.max(0, rawRows.length - MAX_FILAS);
  const filas = rawRows.slice(0, MAX_FILAS);
  const validRows: ImportRow[] = [];
  const errors: ValidationError[] = [];
  const vistos = new Map<string, number>();
  const todayKey = getLocalDateKey(new Date());

  const getCell = (row: Record<string, unknown>, col: number): unknown => {
    if (col < 0) return '';
    const keys = Object.keys(row);
    return keys[col] !== undefined ? row[keys[col]] : '';
  };

  filas.forEach((row, idx) => {
    const fila = idx + 2; // la fila 1 es la de headers
    const nombreRaw = String(getCell(row, cols.nombre) ?? '').trim();
    const errorsDeFila: string[] = [];

    if (!nombreRaw) {
      errorsDeFila.push('Nombre vacío.');
    } else if (nombreRaw.length > 120) {
      errorsDeFila.push('Nombre supera los 120 caracteres.');
    } else {
      const key = nombreRaw.toLowerCase();
      const prev = vistos.get(key);
      if (prev !== undefined) {
        errorsDeFila.push(`Nombre duplicado dentro del archivo (ya aparece en la fila ${prev}).`);
      } else {
        vistos.set(key, fila);
      }
    }

    const cantidad = parseEntero(getCell(row, cols.cantidad));
    if (cantidad === null) {
      errorsDeFila.push('Cantidad no es un entero.');
    } else if (cantidad < 1 || cantidad > 10000) {
      errorsDeFila.push('Cantidad fuera de rango (1–10.000).');
    }

    const costo = parseNumber(getCell(row, cols.costo));
    if (costo === null) {
      errorsDeFila.push('Costo unitario no es un número.');
    } else if (costo < 0) {
      errorsDeFila.push('Costo unitario no puede ser negativo.');
    }

    if (cols.precio >= 0) {
      const precio = parseNumber(getCell(row, cols.precio));
      if (precio === null && String(getCell(row, cols.precio) ?? '').trim() !== '') {
        errorsDeFila.push('Precio venta no es un número.');
      } else if (precio !== null && precio < 0) {
        errorsDeFila.push('Precio venta no puede ser negativo.');
      }
    }

    let stockMinimo = defaultMinStock;
    if (cols.stockMinimo >= 0) {
      const st = parseEntero(getCell(row, cols.stockMinimo));
      if (st === null && String(getCell(row, cols.stockMinimo) ?? '').trim() !== '') {
        errorsDeFila.push('Stock mínimo no es un entero.');
      } else if (st !== null && st < 0) {
        errorsDeFila.push('Stock mínimo no puede ser negativo.');
      } else if (st !== null) {
        stockMinimo = st;
      }
    }

    let fecha = todayKey;
    if (cols.fecha >= 0 && String(getCell(row, cols.fecha) ?? '').trim() !== '') {
      const parsed = parseDateValue(getCell(row, cols.fecha));
      if (parsed) {
        fecha = parsed;
      } else {
        errorsDeFila.push('Fecha compra ilegible (usa serial de Excel o dd/mm/aaaa).');
      }
    }

    if (errorsDeFila.length > 0) {
      errors.push({ fila, mensaje: errorsDeFila.join(' ') });
      return;
    }

    const precio =
      cols.precio >= 0 ? parseNumber(getCell(row, cols.precio)) : null;

    validRows.push({
      nombre: nombreRaw,
      categoriaNombre: String(getCell(row, cols.categoria) ?? '').trim() || 'General',
      cantidad: cantidad as number,
      costoUnitarioMXN: costo as number,
      precioSugerido: precio !== null && precio >= 0 ? precio : undefined,
      stockMinimo,
      fecha,
    });
  });

  return { validRows, errors, exceso };
}

// ---- Modal de importación ----

export const ImportExcelModal: React.FC<ImportExcelModalProps> = ({ isOpen, onClose }) => {
  const { settings, importExcel } = useApp();

  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState<ValidatedImport | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Sigue el estado de conexión para bloquear el import offline
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Limpia el estado cuando se cierra el modal
  useEffect(() => {
    if (!isOpen) {
      setFileName('');
      setParsed(null);
      setResult(null);
      setIsImporting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Lee el .xlsx y valida todas sus filas
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        if (!ws) {
          setParsed({ validRows: [], errors: [], exceso: 0, message: 'El archivo no contiene hojas.' });
          return;
        }
        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
        setParsed(validateFileRows(rawRows, settings.defaultMinStock ?? 3));
      } catch (err) {
        setParsed({
          validRows: [],
          errors: [],
          exceso: 0,
          message: 'No se pudo leer el archivo. Verifica que sea un .xlsx válido.',
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Ejecuta el import atómico y muestra el resumen
  const handleImport = async () => {
    if (!parsed || parsed.validRows.length === 0 || parsed.errors.length > 0 || !isOnline) return;
    setIsImporting(true);
    const res = await importExcel(parsed.validRows);
    setResult(res);
    setIsImporting(false);
  };

  const hasBlockingErrors = parsed ? parsed.errors.length > 0 || !!parsed.message : true;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-surface-container-high border border-outline-variant w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <span className="material-symbols-outlined text-lg">file_upload</span>
            </div>
            <div>
              <h2 className="text-sm font-headline font-bold text-on-surface">
                Importar Compras desde Excel
              </h2>
              <p className="text-[10px] text-on-surface-variant">
                Productos + lotes en una sola operación atómica
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        <div className="p-4 space-y-3 text-xs overflow-y-auto flex-1">
          {/* Columnas esperadas */}
          <div className="p-3 bg-surface-container border border-outline-variant/60 rounded-xl">
            <span className="block font-bold text-on-surface uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px] text-primary">table_view</span>
              Columnas esperadas (fila 1)
            </span>
            <p className="text-[10px] text-on-surface-variant mt-1.5 leading-relaxed">
              <strong className="text-on-surface">Nombre*</strong>, Categoria,{' '}
              <strong className="text-on-surface">Cantidad*</strong>,{' '}
              <strong className="text-on-surface">Costo unitario*</strong> (MXN), Precio venta,
              Stock minimo y Fecha compra. Límite de <strong className="text-on-surface">250 filas</strong>.
            </p>
          </div>

          {/* Selector de archivo */}
          <label className="block">
            <input
              type="file"
              accept=".xlsx"
              onChange={handleFileSelect}
              className="hidden"
            />
            <span className="w-full h-12 bg-surface-container border-2 border-dashed border-outline-variant rounded-xl flex items-center justify-center gap-2 text-on-surface-variant hover:border-primary/50 hover:text-on-surface transition-colors cursor-pointer font-bold">
              <span className="material-symbols-outlined text-lg">upload_file</span>
              {fileName || 'Elige un archivo .xlsx'}
            </span>
          </label>

          {/* Aviso offline */}
          {!isOnline && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-base">wifi_off</span>
              Sin conexión a internet. El import se deshabilita (el writeBatch no se confirma offline).
            </div>
          )}

          {/* Error global del archivo */}
          {parsed?.message && (
            <div className="p-3 bg-error/10 border border-error/30 rounded-xl text-error font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-base">error</span>
              {parsed.message}
            </div>
          )}

          {/* Aviso por límite de filas */}
          {parsed && parsed.exceso > 0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-base">warning</span>
              El archivo tiene {parsed.exceso + (parsed.validRows.length + parsed.errors.length)} filas; solo se procesarán las primeras 250.
            </div>
          )}

          {/* Preview */}
          {parsed && (parsed.validRows.length > 0 || parsed.errors.length > 0) && (
            <div className="space-y-2.5">
              {parsed.validRows.length > 0 && (
                <div className="bg-surface-container border border-outline-variant/50 rounded-xl overflow-hidden">
                  <div className="px-3 py-2 bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-400 font-bold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    Filas válidas a importar ({parsed.validRows.length})
                  </div>
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/30">
                        <th className="text-left px-3 py-1.5 font-bold">Producto</th>
                        <th className="text-right px-2 py-1.5 font-bold">Cant.</th>
                        <th className="text-right px-2 py-1.5 font-bold">Costo</th>
                        <th className="text-right px-3 py-1.5 font-bold">Venta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.validRows.map((r, i) => (
                        <tr key={i} className="border-b border-outline-variant/10 last:border-0">
                          <td className="px-3 py-1.5 font-bold text-on-surface truncate max-w-[150px]">
                            {r.nombre}
                          </td>
                          <td className="px-2 py-1.5 text-right text-on-surface-variant">{r.cantidad}</td>
                          <td className="px-2 py-1.5 text-right text-on-surface-variant">
                            ${r.costoUnitarioMXN}
                          </td>
                          <td className="px-3 py-1.5 text-right text-on-surface-variant">
                            {r.precioSugerido !== undefined ? `$${r.precioSugerido}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {parsed.errors.length > 0 && (
                <div className="bg-surface-container border border-rose-500/40 rounded-xl overflow-hidden">
                  <div className="px-3 py-2 bg-rose-500/10 border-b border-rose-500/30 text-rose-400 font-bold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">block</span>
                    Errores: no se importará nada hasta corregirlos ({parsed.errors.length})
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    {parsed.errors.map((err, i) => (
                      <p key={i} className="px-3 py-1.5 border-b border-outline-variant/10 last:border-0 text-[10px] text-on-surface-variant">
                        <span className="text-rose-400 font-bold">✗ Fila {err.fila}:</span>{' '}
                        {err.mensaje}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Resumen del import */}
          {result && (
            <div
              className={`p-3 rounded-xl border font-bold text-xs flex items-center gap-2 ${
                result.ok
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-error/10 border-error/30 text-error'
              }`}
            >
              <span className="material-symbols-outlined text-base">
                {result.ok ? 'check_circle' : 'error'}
              </span>
              <span>
                {result.ok
                  ? `${result.creadosProductos} productos nuevos, ${result.creadosLotes} lotes y ${result.creadasCategorias} categorías.`
                  : result.mensaje}
                {result.ok && result.errores.length > 0 && ` ${result.errores.length} fila(s) omitida(s).`}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-outline-variant bg-surface-container flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-surface-container-highest border border-outline-variant text-on-surface rounded-xl text-xs font-bold hover:bg-surface-variant transition-colors"
          >
            Cerrar
          </button>
          <button
            type="button"
            disabled={
              !parsed || hasBlockingErrors || parsed.validRows.length === 0 || isImporting || !isOnline
            }
            onClick={handleImport}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 active:scale-95 transition-all text-xs flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
          >
            {isImporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Importando...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">upload</span>
                <span>
                  Importar {parsed?.validRows.length ?? 0} fila(s)
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};