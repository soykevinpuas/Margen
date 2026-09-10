import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { LogOut, UserCheck, Shield, Key } from 'lucide-react';
import { ExportExcelModal } from './ExportExcelModal';

interface ConfiguracionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth: () => void;
}

export const ConfiguracionModal: React.FC<ConfiguracionModalProps> = ({
  isOpen,
  onClose,
  onOpenAuth,
}) => {
  const { settings, updateSettings, resetToSeedData, clearAllData } = useApp();
  const { user, logout } = useAuth();

  const [businessName, setBusinessName] = useState(settings?.businessName || 'Margen');
  const [displayCurrency, setDisplayCurrency] = useState(settings?.displayCurrency || 'MXN');
  const [exchangeRate, setExchangeRate] = useState(
    (settings?.exchangeRate ?? 20).toString()
  );
  const [minStockDefault, setMinStockDefault] = useState(
    (settings?.defaultMinStock ?? 2).toString()
  );
  const [primaryColor, setPrimaryColor] = useState(settings?.primaryColor || 'emerald');
  const [backgroundColor, setBackgroundColor] = useState(settings?.backgroundColor || 'dark');
  const [chartType, setChartType] = useState<'barras' | 'lineas' | 'puntos' | 'radial'>(
    settings?.chartType || 'barras'
  );

  // Excel Modal state
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);

  // Sync state when settings or isOpen changes
  useEffect(() => {
    if (isOpen && settings) {
      setBusinessName(settings.businessName || 'Margen');
      setDisplayCurrency(settings.displayCurrency || 'MXN');
      setExchangeRate((settings.exchangeRate ?? 20).toString());
      setMinStockDefault((settings.defaultMinStock ?? 2).toString());
      setPrimaryColor(settings.primaryColor || 'emerald');
      setBackgroundColor(settings.backgroundColor || 'dark');
      setChartType(settings.chartType || 'barras');
    }
  }, [isOpen, settings]);

  const themeOptions = [
    { id: 'emerald', name: 'Esmeralda', hex: '#10b981', bgClass: 'bg-[#10b981]' },
    { id: 'violet', name: 'Violeta', hex: '#8b5cf6', bgClass: 'bg-[#8b5cf6]' },
    { id: 'blue', name: 'Cobalto', hex: '#3b82f6', bgClass: 'bg-[#3b82f6]' },
    { id: 'amber', name: 'Ámbar', hex: '#f59e0b', bgClass: 'bg-[#f59e0b]' },
    { id: 'rose', name: 'Rosa Cobre', hex: '#f43f5e', bgClass: 'bg-[#f43f5e]' },
    { id: 'teal', name: 'Turquesa', hex: '#14b8a6', bgClass: 'bg-[#14b8a6]' },
  ];

  const bgOptions = [
    { id: 'dark', name: 'Oscuro Margen', colorHex: '#090d16' },
    { id: 'black', name: 'Negro Absoluto', colorHex: '#000000' },
    { id: 'charcoal', name: 'Gris Carbón', colorHex: '#121212' },
    { id: 'midnight', name: 'Azul Noche', colorHex: '#0b132b' },
    { id: 'zinc', name: 'Gris Grafito', colorHex: '#18181b' },
    { id: 'warm', name: 'Sombra Cálida', colorHex: '#1c1917' },
    { id: 'slate', name: 'Azul Abismo', colorHex: '#0f172a' },
    { id: 'emerald_dark', name: 'Verde Oscuro', colorHex: '#051c14' },
  ];

  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  // Word confirmation state
  const [clearTypedWord, setClearTypedWord] = useState('');
  const [resetTypedWord, setResetTypedWord] = useState('');

  // Loading states
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [loadingStepText, setLoadingStepText] = useState('');
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    updateSettings({
      businessName: businessName.trim() || 'Margen',
      displayCurrency,
      exchangeRate: parseFloat(exchangeRate) || 20.0,
      defaultMinStock: parseInt(minStockDefault) || 2,
      primaryColor,
      backgroundColor,
      chartType,
    });
    setIsSaving(false);
    onClose();
  };

  const handleResetData = async () => {
    if (resetTypedWord.toUpperCase() !== 'DEMO') return;
    setIsResetting(true);
    setLoadingStepText('Restableciendo categorías y catálogo...');
    await new Promise((r) => setTimeout(r, 400));
    setLoadingStepText('Generando lotes de mercancía y ventas de ejemplo...');
    await new Promise((r) => setTimeout(r, 400));
    resetToSeedData();
    setIsResetting(false);
    setConfirmReset(false);
    setResetTypedWord('');
    setActionSuccessMessage('¡Datos de demostración cargados con éxito!');
    setTimeout(() => {
      setActionSuccessMessage(null);
      onClose();
    }, 1200);
  };

  const handleClearData = async () => {
    if (clearTypedWord.toUpperCase() !== 'VACIAR') return;
    setIsClearing(true);
    setLoadingStepText('Conectando y preparando limpieza...');
    await new Promise((r) => setTimeout(r, 350));
    setLoadingStepText('Eliminando catálogo de productos y lotes...');
    await new Promise((r) => setTimeout(r, 350));
    setLoadingStepText('Borrando historial de ventas, gastos y ajustes...');
    await clearAllData();
    setIsClearing(false);
    setConfirmClear(false);
    setClearTypedWord('');
    setActionSuccessMessage('¡Base de datos limpiada! Tu inventario está en $0.');
    setTimeout(() => {
      setActionSuccessMessage(null);
      onClose();
    }, 1400);
  };

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-surface-container-high border border-outline-variant w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-lg">settings</span>
            </div>
            <div>
              <h2 className="text-sm font-headline font-bold text-on-surface">
                Configuración del Negocio
              </h2>
              <p className="text-[10px] text-on-surface-variant">
                Preferencias de moneda, usuario y base de datos
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs overflow-y-auto flex-1">
          {/* Auth Section */}
          <div className="p-3 bg-surface-container border border-outline/30 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-on-surface-variant uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-primary" />
                Cuenta y Base de Datos
              </span>
              {user ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                  <UserCheck className="w-3 h-3" /> Nube Sincronizada
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Modo Local
                </span>
              )}
            </div>

            {user ? (
              <div className="space-y-2 pt-1">
                <p className="text-xs text-on-surface font-semibold truncate">
                  {user.displayName ? `${user.displayName} (${user.email})` : user.email}
                </p>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full py-2 bg-error/10 hover:bg-error/20 text-error border border-error/30 font-bold rounded-lg transition-all text-xs flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" /> Cerrar Sesión
                </button>
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                <p className="text-[11px] text-on-surface-variant">
                  Inicia sesión para guardar tu información en la nube con base de datos propia.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAuth();
                  }}
                  className="w-full py-2 bg-primary text-on-primary font-bold rounded-lg shadow-sm hover:opacity-95 transition-all text-xs flex items-center justify-center gap-1.5"
                >
                  <Key className="w-3.5 h-3.5" /> Iniciar Sesión / Registrarse
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block font-bold text-on-surface-variant uppercase tracking-wider text-[10px] mb-1">
              Nombre de la Marca / Negocio
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full h-10 bg-surface-container border border-outline-variant text-on-surface rounded-lg px-3 font-bold text-xs focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-on-surface-variant uppercase tracking-wider text-[10px] mb-1">
                Moneda de Visualización
              </label>
              <select
                value={displayCurrency}
                onChange={(e) => setDisplayCurrency(e.target.value as 'MXN' | 'USD')}
                className="w-full h-10 bg-surface-container border border-outline-variant text-on-surface rounded-lg px-2.5 text-xs focus:outline-none focus:border-primary"
              >
                <option value="MXN">MXN (Pesos Mexicanos)</option>
                <option value="USD">USD (Dólares US)</option>
              </select>
              <p className="text-[9px] text-on-surface-variant mt-1">
                MXN es la moneda contable base. USD es preferencia visual.
              </p>
            </div>

            <div>
              <label className="block font-bold text-on-surface-variant uppercase tracking-wider text-[10px] mb-1">
                Tipo de Cambio (1 USD = MXN)
              </label>
              <input
                type="number"
                step="0.01"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
                className="w-full h-10 bg-surface-container border border-outline-variant text-on-surface rounded-lg px-3 text-right font-bold focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-on-surface-variant uppercase tracking-wider text-[10px] mb-1">
              Stock Mínimo Default para Alertas
            </label>
            <input
              type="number"
              min="0"
              value={minStockDefault}
              onChange={(e) => setMinStockDefault(e.target.value)}
              className="w-full h-10 bg-surface-container border border-outline-variant text-on-surface rounded-lg px-3 font-bold focus:outline-none focus:border-primary"
            />
          </div>

          {/* Tipo de Gráficas */}
          <div>
            <label className="block font-bold text-on-surface-variant uppercase tracking-wider text-[10px] mb-1 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px] text-primary">bar_chart</span>
              Tipo de Gráficas Preferido
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setChartType('barras')}
                className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all ${
                  chartType === 'barras'
                    ? 'bg-primary text-on-primary border-primary shadow-sm'
                    : 'bg-surface-container text-on-surface-variant border-outline-variant hover:border-primary/50'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">bar_chart</span>
                Barras
              </button>

              <button
                type="button"
                onClick={() => setChartType('lineas')}
                className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all ${
                  chartType === 'lineas'
                    ? 'bg-primary text-on-primary border-primary shadow-sm'
                    : 'bg-surface-container text-on-surface-variant border-outline-variant hover:border-primary/50'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">show_chart</span>
                Líneas
              </button>

              <button
                type="button"
                onClick={() => setChartType('puntos')}
                className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all ${
                  chartType === 'puntos'
                    ? 'bg-primary text-on-primary border-primary shadow-sm'
                    : 'bg-surface-container text-on-surface-variant border-outline-variant hover:border-primary/50'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">scatter_plot</span>
                Puntos
              </button>

              <button
                type="button"
                onClick={() => setChartType('radial')}
                className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all ${
                  chartType === 'radial'
                    ? 'bg-primary text-on-primary border-primary shadow-sm'
                    : 'bg-surface-container text-on-surface-variant border-outline-variant hover:border-primary/50'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">donut_large</span>
                Radial / Dona
              </button>
            </div>
            <p className="text-[9px] text-on-surface-variant mt-1">
              Aplica a la vista de reportes y a las mini-gráficas del Dashboard.
            </p>
          </div>

          {/* Color del Tema / Detalles */}
          <div>
            <label className="block font-bold text-on-surface-variant uppercase tracking-wider text-[10px] mb-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px] text-primary">palette</span>
              Color Principal y Accent
            </label>
            <div className="grid grid-cols-3 gap-2">
              {themeOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPrimaryColor(opt.id)}
                  className={`p-2 rounded-xl border flex items-center gap-2 transition-all ${
                    primaryColor === opt.id
                      ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary'
                      : 'border-outline-variant bg-surface-container hover:border-outline'
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded-full ${opt.bgClass} border border-white/20 shrink-0`} />
                  <span className="text-[11px] font-bold text-on-surface truncate">{opt.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Color de Fondo */}
          <div>
            <label className="block font-bold text-on-surface-variant uppercase tracking-wider text-[10px] mb-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px] text-primary">format_paint</span>
              Color de Fondo (Tema Oscuro Neutro)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {bgOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setBackgroundColor(opt.id)}
                  className={`p-2 rounded-xl border flex items-center gap-2 transition-all ${
                    backgroundColor === opt.id
                      ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary'
                      : 'border-outline-variant bg-surface-container hover:border-outline'
                  }`}
                >
                  <div
                    className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                    style={{ backgroundColor: opt.colorHex }}
                  />
                  <span className="text-[11px] font-bold text-on-surface truncate">{opt.name}</span>
                </button>
              ))}
            </div>
            <p className="text-[9px] text-on-surface-variant mt-1">
              Colores seleccionados para garantizar alto contraste y legibilidad con las tarjetas y texto.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving || isClearing || isResetting}
              className="w-full py-3 bg-primary text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20 hover:opacity-95 active:scale-95 transition-all text-xs flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div>
                  <span>Guardando cambios...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">save</span>
                  <span>Guardar Configuración</span>
                </>
              )}
            </button>
          </div>

          {/* Success toast notification overlay inside form */}
          {actionSuccessMessage && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-center animate-fade-in flex items-center justify-center gap-2 text-emerald-400 font-bold text-xs">
              <span className="material-symbols-outlined text-lg">check_circle</span>
              <span>{actionSuccessMessage}</span>
            </div>
          )}

          {/* Dynamic Loading Overlay during Heavy Operation */}
          {(isClearing || isResetting) && (
            <div className="p-5 bg-surface-container-highest/90 border border-outline-variant/60 rounded-xl text-center space-y-3 animate-fade-in">
              <div className="flex justify-center">
                <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
              <div>
                <h4 className="font-bold text-sm text-on-surface">Procesando Operación...</h4>
                <p className="text-xs text-primary font-medium mt-1 animate-pulse">
                  {loadingStepText}
                </p>
              </div>
            </div>
          )}

          {/* Exportar Resumen Excel */}
          <div className="border-t border-outline-variant/30 pt-4 mt-4 space-y-2">
            <span className="block font-bold text-on-surface-variant uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px] text-emerald-400">description</span>
              Reportes y Hojas de Cálculo (Excel)
            </span>

            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-on-surface">Descargar Resumen Mensual (.xlsx)</h4>
                  <p className="text-[10px] text-on-surface-variant">
                    Genera un documento Excel oficial con encabezado de {businessName || 'tu marca'}, resumen ejecutivo, ventas, inventario y gastos.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsExcelModalOpen(true)}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-all text-xs flex items-center justify-center gap-2 shadow-sm"
              >
                <span className="material-symbols-outlined text-base">download</span>
                <span>Configurar y Descargar Excel</span>
              </button>
            </div>
          </div>

          {/* Reset / Clear Data Section */}
          <div className="border-t border-outline-variant/30 pt-4 mt-4 space-y-3">
            <span className="block font-bold text-on-surface-variant uppercase tracking-wider text-[10px]">
              Gestión de Datos e Inventario
            </span>

            {/* Clear All Data */}
            {confirmClear ? (
              <div className="p-3.5 rounded-xl bg-error/10 border border-error/30 space-y-3 animate-fade-in">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-error text-lg mt-0.5">warning</span>
                  <div>
                    <p className="text-error font-bold text-[11px]">
                      ¡Atención! Esta acción eliminará permanentemente todos tus productos, lotes de compras, ventas y gastos registrados.
                    </p>
                    <p className="text-[10px] text-on-surface-variant mt-1">
                      Para confirmar, escribe la palabra <strong className="text-error font-mono">VACIAR</strong> abajo:
                    </p>
                  </div>
                </div>

                <input
                  type="text"
                  placeholder='Escribe "VACIAR" para confirmar'
                  value={clearTypedWord}
                  onChange={(e) => setClearTypedWord(e.target.value)}
                  className="w-full h-9 bg-surface-container border border-error/40 text-on-surface rounded-lg px-3 font-mono font-bold text-xs focus:outline-none focus:border-error"
                />

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    disabled={clearTypedWord.toUpperCase() !== 'VACIAR' || isClearing}
                    onClick={handleClearData}
                    className="flex-1 py-2 bg-error text-on-error font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-md"
                  >
                    <span className="material-symbols-outlined text-sm">delete_forever</span>
                    Confirmar y Vaciar Todo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmClear(false);
                      setClearTypedWord('');
                    }}
                    className="px-3 py-2 bg-surface-container border border-outline-variant text-on-surface rounded-lg text-xs hover:bg-surface-variant transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setConfirmClear(true);
                  setConfirmReset(false);
                }}
                className="w-full py-2.5 bg-error/10 text-error border border-error/30 font-bold rounded-xl hover:bg-error/20 transition-colors text-xs flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
                Vaciar Inventario (Empezar en Limpio)
              </button>
            )}

            {/* Load Seed Data */}
            {confirmReset ? (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3 animate-fade-in">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-amber-400 text-lg mt-0.5">help</span>
                  <div>
                    <p className="text-amber-400 font-bold text-[11px]">
                      ¿Restablecer el inventario cargando datos de demostración de prueba (AirPods, Fundas, etc.)?
                    </p>
                    <p className="text-[10px] text-on-surface-variant mt-1">
                      Para confirmar, escribe la palabra <strong className="text-amber-400 font-mono">DEMO</strong> abajo:
                    </p>
                  </div>
                </div>

                <input
                  type="text"
                  placeholder='Escribe "DEMO" para confirmar'
                  value={resetTypedWord}
                  onChange={(e) => setResetTypedWord(e.target.value)}
                  className="w-full h-9 bg-surface-container border border-amber-500/40 text-on-surface rounded-lg px-3 font-mono font-bold text-xs focus:outline-none focus:border-amber-400"
                />

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    disabled={resetTypedWord.toUpperCase() !== 'DEMO' || isResetting}
                    onClick={handleResetData}
                    className="flex-1 py-2 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-md"
                  >
                    <span className="material-symbols-outlined text-sm">restore</span>
                    Confirmar y Cargar Demo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmReset(false);
                      setResetTypedWord('');
                    }}
                    className="px-3 py-2 bg-surface-container border border-outline-variant text-on-surface rounded-lg text-xs hover:bg-surface-variant transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setConfirmReset(true);
                  setConfirmClear(false);
                }}
                className="w-full py-2.5 bg-surface-container text-on-surface-variant border border-outline-variant font-medium rounded-xl hover:text-on-surface transition-colors text-xs flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">restore</span>
                Cargar Datos de Ejemplo (Demo)
              </button>
            )}
          </div>
        </form>

        <ExportExcelModal
          isOpen={isExcelModalOpen}
          onClose={() => setIsExcelModalOpen(false)}
        />
      </div>
    </div>
  );
};
