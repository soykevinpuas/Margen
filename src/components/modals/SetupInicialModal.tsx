import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { PRIMARY_COLORS, BACKGROUND_COLORS } from '../../data/themeOptions';

interface SetupInicialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Sugerencias de unidades de venta para el datalist
const UNIT_SUGGESTIONS = [
  'pza', 'kg', 'ml', 'und', 'l', 'm', 'caja', 'par', 'docena',
  'bolsa', 'botella', 'sobre', 'pieza', 'litro', 'gramo', 'metro',
];

export const SetupInicialModal: React.FC<SetupInicialModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { settings, updateSettings } = useApp();

  // Estado local precargado con los settings actuales (o defaults)
  const [businessName, setBusinessName] = useState(settings?.businessName || 'Margen');
  const [displayCurrency, setDisplayCurrency] = useState<'MXN' | 'USD'>(
    settings?.displayCurrency || 'MXN'
  );
  const [unidad, setUnidad] = useState(settings?.unidadPredeterminada || 'und');
  const [primaryColor, setPrimaryColor] = useState(settings?.primaryColor || 'emerald');
  const [backgroundColor, setBackgroundColor] = useState(settings?.backgroundColor || 'dark');

  // Sincroniza el formulario con los settings al abrir
  useEffect(() => {
    if (isOpen) {
      setBusinessName(settings?.businessName || 'Margen');
      setDisplayCurrency(settings?.displayCurrency || 'MXN');
      setUnidad(settings?.unidadPredeterminada || 'und');
      setPrimaryColor(settings?.primaryColor || 'emerald');
      setBackgroundColor(settings?.backgroundColor || 'dark');
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  // Guarda la configuración completa y cierra el setup
  const handleSave = () => {
    updateSettings({
      businessName: businessName.trim() || 'Margen',
      displayCurrency,
      unidadPredeterminada: unidad.trim() || 'und',
      primaryColor,
      backgroundColor,
      setupCompletado: true,
    });
    onClose();
  };

  // Omite el setup por ahora (solo marca el flag)
  const handleSkip = () => {
    updateSettings({ setupCompletado: true });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-surface-container-high border border-outline-variant w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-lg">rocket_launch</span>
            </div>
            <div>
              <h2 className="text-sm font-headline font-bold text-on-surface">
                ¡Bienvenido a Margen!
              </h2>
              <p className="text-[10px] text-on-surface-variant">
                Configura tu negocio en menos de un minuto
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4 text-xs overflow-y-auto flex-1">
          <div>
            <label className="block font-bold text-on-surface-variant uppercase tracking-wider text-[10px] mb-1">
              Nombre del Negocio
            </label>
            <input
              type="text"
              placeholder="Ej. Mi Tienda"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full h-10 bg-surface-container border border-outline-variant text-on-surface rounded-lg px-3 font-bold text-xs focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-on-surface-variant uppercase tracking-wider text-[10px] mb-1">
                Moneda
              </label>
              <select
                value={displayCurrency}
                onChange={(e) => setDisplayCurrency(e.target.value as 'MXN' | 'USD')}
                className="w-full h-10 bg-surface-container border border-outline-variant text-on-surface rounded-lg px-2.5 text-xs focus:outline-none focus:border-primary"
              >
                <option value="MXN">MXN (Pesos)</option>
                <option value="USD">USD (Dólares)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-on-surface-variant uppercase tracking-wider text-[10px] mb-1">
                Unidad Predeterminada
              </label>
              <input
                type="text"
                list="setup-unit-suggestions"
                placeholder="Ej. pza, kg, und..."
                value={unidad}
                onChange={(e) => setUnidad(e.target.value)}
                className="w-full h-10 bg-surface-container border border-outline-variant text-on-surface rounded-lg px-3 font-bold text-xs focus:outline-none focus:border-primary"
              />
              <datalist id="setup-unit-suggestions">
                {UNIT_SUGGESTIONS.map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Color primario */}
          <div>
            <label className="block font-bold text-on-surface-variant uppercase tracking-wider text-[10px] mb-2">
              Color Principal
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PRIMARY_COLORS.map((opt) => (
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

          {/* Color de fondo */}
          <div>
            <label className="block font-bold text-on-surface-variant uppercase tracking-wider text-[10px] mb-2">
              Color de Fondo
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {BACKGROUND_COLORS.map((opt) => (
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
          </div>

          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={handleSave}
              className="w-full py-3 bg-primary text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20 hover:opacity-95 active:scale-95 transition-all text-xs flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base">check_circle</span>
              Guardar y empezar
            </button>
            <button
              type="button"
              onClick={handleSkip}
              className="w-full py-2.5 bg-surface-container border border-outline-variant text-on-surface-variant font-bold rounded-xl hover:text-on-surface transition-colors text-xs"
            >
              Saltar por ahora
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};