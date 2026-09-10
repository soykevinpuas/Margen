import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { OperatingExpense } from '../../types';

interface NuevoGastoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NuevoGastoModal: React.FC<NuevoGastoModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { addOperatingExpense } = useApp();

  const [concepto, setConcepto] = useState('');
  const [categoria, setCategoria] = useState<OperatingExpense['categoria']>('renta');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [esRecurrente, setEsRecurrente] = useState(false);
  const [notas, setNotas] = useState('');

  const resetForm = () => {
    setConcepto('');
    setCategoria('renta');
    setMonto('');
    setFecha(new Date().toISOString().split('T')[0]);
    setEsRecurrente(false);
    setNotas('');
  };

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericMonto = parseFloat(monto) || 0;
    if (!concepto.trim() || numericMonto <= 0) return;

    addOperatingExpense({
      concepto: concepto.trim(),
      categoria,
      montoMXN: numericMonto,
      fecha,
      esRecurrente,
      notas,
    });

    resetForm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-surface-container-high border border-outline-variant w-full max-w-md rounded-t-2xl sm:rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-4 py-3.5 border-b border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-error/10 border border-error/20 flex items-center justify-center text-error">
              <span className="material-symbols-outlined text-lg">receipt_long</span>
            </div>
            <div>
              <h2 className="text-sm font-headline font-bold text-on-surface">
                Registrar Gasto Operativo
              </h2>
              <p className="text-[10px] text-on-surface-variant">
                Egresos generales no vinculados a compra de mercancía
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-on-surface-variant uppercase tracking-wider text-[10px] mb-1">
              Concepto del Gasto
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Renta local Mayo, Campaña Meta Ads, Luz..."
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="w-full h-10 bg-surface-container border border-outline-variant text-on-surface rounded-lg px-3 text-xs focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-on-surface-variant uppercase tracking-wider text-[10px] mb-1">
                Categoría
              </label>
              <select
                value={categoria}
                onChange={(e) =>
                  setCategoria(e.target.value as any)
                }
                className="w-full h-10 bg-surface-container border border-outline-variant text-on-surface rounded-lg px-2.5 text-xs focus:outline-none focus:border-primary"
              >
                <option value="renta">Renta</option>
                <option value="servicios">Servicios (Luz/Agua/Internet)</option>
                <option value="nomina">Nómina / Sueldos</option>
                <option value="marketing">Marketing / Publicidad</option>
                <option value="insumos">Insumos de Oficina / Empaque</option>
                <option value="mantenimiento">Mantenimiento</option>
                <option value="otros">Otros</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-on-surface-variant uppercase tracking-wider text-[10px] mb-1">
                Monto (MXN)
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-2.5 text-on-surface-variant text-xs">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  className="w-full h-10 bg-surface-container border border-outline-variant text-on-surface rounded-lg pl-6 pr-3 text-right font-bold text-xs focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-on-surface-variant uppercase tracking-wider text-[10px] mb-1">
                Fecha
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full h-10 bg-surface-container border border-outline-variant text-on-surface rounded-lg px-2.5 text-xs focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={esRecurrente}
                  onChange={(e) => setEsRecurrente(e.target.checked)}
                  className="w-4 h-4 rounded accent-primary cursor-pointer"
                />
                <span className="text-xs text-on-surface font-medium">
                  Gasto Recurrente
                </span>
              </label>
            </div>
          </div>

          <div>
            <label className="block font-bold text-on-surface-variant uppercase tracking-wider text-[10px] mb-1">
              Notas (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej. Factura #402, Pago en efectivo..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full h-10 bg-surface-container border border-outline-variant text-on-surface rounded-lg px-3 text-xs focus:outline-none focus:border-primary"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={!concepto.trim() || !monto || parseFloat(monto) <= 0}
              className="w-full py-3 bg-primary text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20 hover:opacity-95 active:scale-95 transition-all text-xs flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
            >
              <span className="material-symbols-outlined text-base">
                check_circle
              </span>
              Guardar Gasto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
