import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { AdjustmentReason } from '../../types';
import { formatMoney } from '../../utils/calculations';

interface AjusteInventarioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AjusteInventarioModal: React.FC<AjusteInventarioModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { settings, products, batches, addInventoryAdjustment } = useApp();
  const { displayCurrency, exchangeRate } = settings;

  const activeProducts = products.filter((p) => !p.archivado);

  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');

  const productBatches = batches.filter(
    (b) => b.productoId === selectedProductId && b.cantidadDisponible > 0
  );

  const [quantity, setQuantity] = useState<number | string>(1);
  const [reason, setReason] = useState<AdjustmentReason>('danado');
  const [date, setDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState<string>('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setReason('danado');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setMessage(null);
      if (activeProducts.length > 0) {
        setSelectedProductId(activeProducts[0].id);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedBatch = batches.find((b) => b.id === selectedBatchId);
  const maxAvailable = selectedBatch ? selectedBatch.cantidadDisponible : 0;
  const unitCost = selectedBatch ? selectedBatch.costoUnitarioRealMXN : 0;
  const numericQty = Math.max(1, parseInt(String(quantity)) || 1);
  const totalLoss = numericQty * unitCost;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !selectedBatchId) return;

    const res = addInventoryAdjustment({
      productoId: selectedProductId,
      loteId: selectedBatchId,
      cantidad: Math.min(numericQty, maxAvailable),
      tipoMotivo: reason,
      fecha: date,
      notas: notes,
    });

    setMessage(res.message);
    if (res.success) {
      setTimeout(() => {
        onClose();
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-surface-container-high border border-outline-variant w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <span className="material-symbols-outlined text-lg">fact_check</span>
            </div>
            <div>
              <h2 className="text-sm font-headline font-bold text-on-surface">
                Ajuste de Inventario (Baja)
              </h2>
              <p className="text-[10px] text-on-surface-variant">
                Registrar mermas, daños, robos o uso personal
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
        <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs">
          {message && (
            <div className="p-3 rounded-lg bg-primary/20 text-primary border border-primary/30 font-bold">
              {message}
            </div>
          )}

          <div>
            <label className="block font-bold text-on-surface-variant uppercase tracking-wider text-[10px] mb-1">
              Producto
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => {
                const pid = e.target.value;
                setSelectedProductId(pid);
                const firstB = batches.find(
                  (b) => b.productoId === pid && b.cantidadDisponible > 0
                );
                setSelectedBatchId(firstB ? firstB.id : '');
              }}
              className="w-full h-10 bg-surface-container border border-outline-variant text-on-surface rounded-lg px-3 text-xs focus:outline-none focus:border-primary"
            >
              {activeProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-on-surface-variant uppercase tracking-wider text-[10px] mb-1">
              Lote de Origen
            </label>
            {productBatches.length === 0 ? (
              <p className="text-error font-bold py-2 text-[11px]">
                Este producto no tiene lotes con stock disponible.
              </p>
            ) : (
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="w-full h-10 bg-surface-container border border-outline-variant text-on-surface rounded-lg px-3 text-xs focus:outline-none focus:border-primary"
              >
                {productBatches.map((b) => (
                  <option key={b.id} value={b.id}>
                    Lote {b.id} (Disp: {b.cantidadDisponible} u. • Costo/u:{' '}
                    {formatMoney(b.costoUnitarioRealMXN, displayCurrency, exchangeRate)})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-on-surface-variant uppercase tracking-wider text-[10px] mb-1">
                Cantidad a Dar de Baja
              </label>
              <input
                type="number"
                min="1"
                max={maxAvailable}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                onBlur={() => {
                  let q = parseInt(String(quantity));
                  if (isNaN(q) || q < 1) q = 1;
                  if (maxAvailable > 0 && q > maxAvailable) q = maxAvailable;
                  setQuantity(q);
                }}
                className="w-full h-10 bg-surface-container border border-outline-variant text-on-surface rounded-lg px-3 font-bold focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block font-bold text-on-surface-variant uppercase tracking-wider text-[10px] mb-1">
                Motivo
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as AdjustmentReason)}
                className="w-full h-10 bg-surface-container border border-outline-variant text-on-surface rounded-lg px-2 text-xs focus:outline-none focus:border-primary"
              >
                <option value="danado">Dañado / Roto</option>
                <option value="perdido">Perdido / Extraviado</option>
                <option value="uso_personal">Uso Personal / Muestra</option>
                <option value="caducado">Caducado / Vencido</option>
                <option value="otro">Otro</option>
              </select>
            </div>
          </div>

          {/* Loss Summary Card */}
          <div className="bg-surface-container border border-outline-variant rounded-xl p-3 flex justify-between items-center">
            <span className="text-xs font-bold text-on-surface-variant">
              Pérdida Total Estimada:
            </span>
            <span className="text-sm font-bold text-error">
              -{formatMoney(totalLoss, displayCurrency, exchangeRate)}
            </span>
          </div>

          <div>
            <label className="block font-bold text-on-surface-variant uppercase tracking-wider text-[10px] mb-1">
              Notas (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej. Caja llegó aplastada por la paquetería..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-10 bg-surface-container border border-outline-variant text-on-surface rounded-lg px-3 text-xs focus:outline-none focus:border-primary"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={!selectedBatchId || quantity <= 0 || quantity > maxAvailable}
              className="w-full py-3 bg-primary text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20 hover:opacity-95 active:scale-95 transition-all text-xs flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
            >
              <span className="material-symbols-outlined text-base">
                check_circle
              </span>
              Confirmar Ajuste
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
