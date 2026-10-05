import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ExpenseCategory, OperatingExpense, PurchaseBatch, Sale } from '../../types';
import { getLocalDateKey } from '../../utils/calculations';

export type EditableRecordType = 'venta' | 'lote' | 'gasto';
export type EditableRecord = Sale | PurchaseBatch | OperatingExpense;
export type EditRecordHandler = (type: EditableRecordType, record: EditableRecord) => void;

interface EditarRegistroModalProps {
  isOpen: boolean;
  type: EditableRecordType;
  record: EditableRecord | null;
  /** Id del registro a editar (respaldo si el objeto `record` no llega) */
  recordId?: string;
  onClose: () => void;
}

const CATEGORIAS: { value: ExpenseCategory; label: string }[] = [
  { value: 'renta', label: 'Renta' },
  { value: 'servicios', label: 'Servicios (Luz/Agua/Internet)' },
  { value: 'nomina', label: 'Nómina / Sueldos' },
  { value: 'marketing', label: 'Marketing / Publicidad' },
  { value: 'insumos', label: 'Insumos de Oficina / Empaque' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'otros', label: 'Otros' },
];

const TITULOS: Record<EditableRecordType, { title: string; subtitle: string; icon: string }> = {
  venta: {
    title: 'Editar Venta',
    subtitle: 'Ajusta cantidad, precio, fecha o notas del registro',
    icon: 'point_of_sale',
  },
  lote: {
    title: 'Editar Lote de Compra',
    subtitle: 'Ajusta cantidad, costo unitario, proveedor, fecha o notas',
    icon: 'inventory',
  },
  gasto: {
    title: 'Editar Gasto Operativo',
    subtitle: 'Ajusta concepto, categoría, monto, fecha o notas',
    icon: 'receipt_long',
  },
};

export const EditarRegistroModal: React.FC<EditarRegistroModalProps> = ({
  isOpen,
  type,
  record,
  recordId,
  onClose,
}) => {
  const {
    products,
    sales,
    batches,
    operatingExpenses,
    updateSale,
    updatePurchaseBatch,
    updateOperatingExpense,
  } = useApp();

  // Registro más fresco (por si cambió en contexto mientras el modal está abierto)
  const targetId = recordId || (record ? record.id : null);
  const fresh =
    type === 'venta'
      ? sales.find((s) => s.id === targetId) || null
      : type === 'lote'
      ? batches.find((b) => b.id === targetId) || null
      : operatingExpenses.find((e) => e.id === targetId) || null;
  const current = (fresh || record) as EditableRecord | null;

  // Campos (strings para evitar problemas de inputs controlados type="number")
  const [cantidad, setCantidad] = useState('1');
  const [precio, setPrecio] = useState('0');
  const [cantidadComprada, setCantidadComprada] = useState('1');
  const [costoUnitario, setCostoUnitario] = useState('0');
  const [proveedor, setProveedor] = useState('');
  const [concepto, setConcepto] = useState('');
  const [categoria, setCategoria] = useState<ExpenseCategory>('renta');
  const [monto, setMonto] = useState('0');
  const [esRecurrente, setEsRecurrente] = useState(false);
  const [fecha, setFecha] = useState('');
  const [notas, setNotas] = useState('');
  const [error, setError] = useState('');

  // Sincroniza los campos al abrir o al cambiar de registro
  useEffect(() => {
    if (!isOpen || !current) return;
    setError('');

    if (type === 'venta') {
      const sale = current as Sale;
      setCantidad(String(sale.cantidad ?? 1));
      setPrecio(String(sale.precioVentaUnitarioMXN ?? 0));
      setFecha(getLocalDateKey(sale.fecha));
      setNotas(sale.notas || '');
    } else if (type === 'lote') {
      const batch = current as PurchaseBatch;
      setCantidadComprada(String(batch.cantidadComprada ?? 1));
      setCostoUnitario(String(batch.costoProductoUnitarioMXN ?? 0));
      setProveedor(batch.proveedor || '');
      setFecha(getLocalDateKey(batch.fecha));
      setNotas(batch.notas || '');
    } else {
      const expense = current as OperatingExpense;
      setConcepto(expense.concepto || '');
      setCategoria(expense.categoria || 'otros');
      setMonto(String(expense.montoMXN ?? 0));
      setEsRecurrente(!!expense.esRecurrente);
      setFecha(getLocalDateKey(expense.fecha));
      setNotas(expense.notas || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, type, targetId]);

  if (!isOpen || !current) return null;

  const meta = TITULOS[type];
  const productName =
    type === 'venta'
      ? products.find((p) => p.id === (current as Sale).productoId)?.nombre
      : type === 'lote'
      ? products.find((p) => p.id === (current as PurchaseBatch).productoId)?.nombre
      : undefined;

  const handleSave = () => {
    if (type === 'venta') {
      const sale = current as Sale;
      const qty = parseInt(cantidad, 10);
      const price = parseFloat(precio);
      if (!Number.isFinite(qty) || qty < 1) {
        setError('La cantidad debe ser un entero mayor o igual a 1.');
        return;
      }
      if (!Number.isFinite(price) || price < 0) {
        setError('Ingresa un precio de venta válido.');
        return;
      }
      if (sale.estado === 'confirmada') {
        // Máximo editable = stock actual del producto + las unidades que esta venta ya retiene
        const held = (sale.asignacionesLotes || []).reduce(
          (acc, a) => acc + a.cantidadTomada,
          0
        );
        const free = batches
          .filter((b) => b.productoId === sale.productoId)
          .reduce((acc, b) => acc + b.cantidadDisponible, 0);
        const maxQty = free + held;
        if (qty > maxQty) {
          setError(`Solo hay ${maxQty} unidades disponibles de este producto.`);
          return;
        }
      }
      updateSale(sale.id, {
        cantidad: qty,
        precioVentaUnitarioMXN: price,
        fecha,
        notas,
      });
    } else if (type === 'lote') {
      const batch = current as PurchaseBatch;
      const qty = parseInt(cantidadComprada, 10);
      const cost = parseFloat(costoUnitario);
      const soldUnits = batch.cantidadComprada - batch.cantidadDisponible;
      if (!Number.isFinite(qty) || qty < 1) {
        setError('La cantidad comprada debe ser un entero mayor o igual a 1.');
        return;
      }
      if (qty < soldUnits) {
        setError(
          `No puedes reducir la cantidad por debajo de ${soldUnits} unidades ya vendidas.`
        );
        return;
      }
      if (!Number.isFinite(cost) || cost < 0) {
        setError('Ingresa un costo unitario válido.');
        return;
      }
      updatePurchaseBatch(batch.id, {
        cantidadComprada: qty,
        costoProductoUnitarioMXN: cost,
        proveedor: proveedor.trim(),
        fecha: fecha || batch.fecha,
        notas,
      });
    } else {
      const expense = current as OperatingExpense;
      const amount = parseFloat(monto);
      if (!concepto.trim()) {
        setError('El concepto del gasto no puede estar vacío.');
        return;
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        setError('El monto debe ser mayor a 0.');
        return;
      }
      updateOperatingExpense(expense.id, {
        concepto: concepto.trim(),
        categoria,
        montoMXN: amount,
        fecha,
        notas,
        esRecurrente,
      });
    }

    onClose();
  };

  const inputClass =
    'w-full h-10 bg-surface-container border border-outline-variant text-on-surface rounded-lg px-3 text-xs focus:outline-none focus:border-primary';
  const labelClass =
    'block font-bold text-on-surface-variant uppercase tracking-wider text-[10px] mb-1';

  return (
    <div className="fixed inset-0 z-[80] bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-surface-container-high border border-outline-variant w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-lg">{meta.icon}</span>
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-headline font-bold text-on-surface truncate">
                {meta.title}
              </h2>
              <p className="text-[10px] text-on-surface-variant truncate">
                {productName ? `${productName} • ` : ''}
                {current.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface shrink-0"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="p-4 space-y-3.5 text-xs overflow-y-auto flex-1"
        >
          <p className="text-[10px] text-on-surface-variant">{meta.subtitle}</p>

          {error && (
            <div className="p-2 rounded-lg bg-error/10 border border-error/30 text-error text-[11px] font-bold">
              {error}
            </div>
          )}

          {type === 'venta' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Cantidad Vendida</label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Precio Unitario (MXN)</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-2.5 text-on-surface-variant text-xs">$</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={precio}
                      onChange={(e) => setPrecio(e.target.value)}
                      className={`${inputClass} pl-6 pr-3 text-right font-bold`}
                    />
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-on-surface-variant -mt-2">
                Si hay stock disponible, la cantidad se reasigna automáticamente por FIFO y se
                recalculan ingreso, ganancia y margen.
              </p>
            </>
          )}

          {type === 'lote' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Cant. Comprada</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={cantidadComprada}
                  onChange={(e) => setCantidadComprada(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Costo Unit. (MXN)</label>
                <div className="relative flex items-center">
                  <span className="absolute left-2.5 text-on-surface-variant text-xs">$</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={costoUnitario}
                    onChange={(e) => setCostoUnitario(e.target.value)}
                    className={`${inputClass} pl-6 pr-3 text-right font-bold`}
                  />
                </div>
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Proveedor</label>
                <input
                  type="text"
                  value={proveedor}
                  placeholder="Ej. Distribuidora XYZ"
                  onChange={(e) => setProveedor(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {type === 'gasto' && (
            <>
              <div>
                <label className={labelClass}>Concepto del Gasto</label>
                <input
                  type="text"
                  value={concepto}
                  onChange={(e) => setConcepto(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Categoría</label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value as ExpenseCategory)}
                    className={inputClass}
                  >
                    {CATEGORIAS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Monto (MXN)</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-2.5 text-on-surface-variant text-xs">$</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={monto}
                      onChange={(e) => setMonto(e.target.value)}
                      className={`${inputClass} pl-6 pr-3 text-right font-bold`}
                    />
                  </div>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={esRecurrente}
                  onChange={(e) => setEsRecurrente(e.target.checked)}
                  className="w-4 h-4 rounded accent-primary cursor-pointer"
                />
                <span className="text-xs text-on-surface font-medium">Gasto Recurrente</span>
              </label>
            </>
          )}

          {/* Fecha editable (también se puede cambiar inline desde las cards) */}
          <div>
            <label className={labelClass}>Fecha</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Notas (Opcional)</label>
            <input
              type="text"
              value={notas}
              placeholder="Ej. Factura #402, Pago en efectivo..."
              onChange={(e) => setNotas(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Footer actions */}
          <div className="flex gap-2 pt-2 pb-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-surface-container border border-outline-variant text-on-surface font-bold text-xs rounded-xl hover:bg-surface-container-highest transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl shadow-lg shadow-primary/20 hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">save</span>
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
