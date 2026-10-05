import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatMoney, getLocalDateKey } from '../../utils/calculations';
import { PurchaseBatch } from '../../types';
import { EditRecordHandler } from './EditarRegistroModal';

interface HistorialComprasModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Abre el modal EditarRegistroModal con el lote seleccionado */
  onEdit: EditRecordHandler;
}

export const HistorialComprasModal: React.FC<HistorialComprasModalProps> = ({
  isOpen,
  onClose,
  onEdit,
}) => {
  const {
    settings,
    batches,
    products,
    updateBatchDate,
    deletePurchaseBatch,
  } = useApp();
  const { displayCurrency, exchangeRate } = settings;

  const [search, setSearch] = useState('');

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const filteredBatches = batches
    .filter((b) => {
      const prod = products.find((p) => p.id === b.productoId);
      const prodName = prod ? prod.nombre.toLowerCase() : '';
      return (
        b.id.toLowerCase().includes(search.toLowerCase()) ||
        prodName.includes(search.toLowerCase()) ||
        (b.proveedor && b.proveedor.toLowerCase().includes(search.toLowerCase()))
      );
    })
    .sort((a, b) => {
      const timeA = new Date(a.createdAt || a.fecha || 0).getTime();
      const timeB = new Date(b.createdAt || b.fecha || 0).getTime();
      if (timeA !== timeB) return timeB - timeA;
      return (b.id || '').localeCompare(a.id || '');
    });

  const handleDelete = (b: PurchaseBatch) => {
    if (confirm(`¿Estás seguro de eliminar el Lote ${b.id}? Esta acción no se puede deshacer.`)) {
      const res = deletePurchaseBatch(b.id);
      setFeedbackMsg({
        type: res.success ? 'success' : 'error',
        text: res.message,
      });
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-surface-container-high border border-outline-variant w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-surface-variant border border-outline-variant flex items-center justify-center text-on-surface">
              <span className="material-symbols-outlined text-lg">inventory</span>
            </div>
            <div>
              <h2 className="text-sm font-headline font-bold text-on-surface">
                Historial de Compras (Lotes)
              </h2>
              <p className="text-[10px] text-on-surface-variant">
                Control, edición y eliminación de compras realizadas
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

        {feedbackMsg && (
          <div
            className={`px-4 py-2 text-xs font-bold text-center ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-500/20 text-emerald-400 border-b border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-400 border-b border-rose-500/30'
            }`}
          >
            {feedbackMsg.text}
          </div>
        )}

        {/* Search */}
        <div className="px-4 py-3 border-b border-outline-variant/30">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">
              search
            </span>
            <input
              type="text"
              placeholder="Buscar por lote, producto o proveedor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-container border border-outline-variant text-on-surface text-xs rounded-lg py-2 pl-8 pr-3 focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3 text-xs">
          {filteredBatches.length === 0 ? (
            <p className="text-center py-8 text-on-surface-variant">
              No se encontraron lotes de compra.
            </p>
          ) : (
            filteredBatches.map((batch) => {
              const product = products.find((p) => p.id === batch.productoId);
              const isDepleted = batch.cantidadDisponible === 0;

              return (
                <div
                  key={batch.id}
                  className={`bg-surface-container border rounded-xl p-3 space-y-2 transition-all ${
                    isDepleted
                      ? 'border-outline-variant/40 opacity-70'
                      : 'border-outline-variant hover:border-primary/50'
                  }`}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-surface flex-shrink-0 flex items-center justify-center overflow-hidden border border-outline-variant shadow-sm">
                        {product?.imagen ? (
                          <img
                            src={product.imagen}
                            alt={product.nombre}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
                            inventory_2
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-on-surface text-xs">
                            Lote {batch.id}
                          </span>
                          {batch.esInventarioInicial && (
                            <span className="bg-primary/20 text-primary text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                              Inv. Inicial
                            </span>
                          )}
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                              isDepleted
                                ? 'bg-surface-variant text-on-surface-variant'
                                : 'bg-tertiary/20 text-tertiary'
                            }`}
                          >
                            {isDepleted ? 'Agotado' : 'En Stock'}
                          </span>
                        </div>
                        <h4 className="font-bold text-on-surface text-xs mt-0.5 truncate">
                          {product ? product.nombre : 'Producto no encontrado'}
                        </h4>
                        <p className="text-[10px] text-on-surface-variant truncate">
                          {batch.fecha} • Proveedor:{' '}
                          {batch.proveedor || 'Sin especificar'}
                        </p>
                        {batch.notas && (
                          <p className="text-[11px] text-on-surface-variant italic truncate mt-0.5">
                            {batch.notas}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold text-on-surface">
                        {batch.cantidadDisponible} / {batch.cantidadComprada} u.
                      </div>
                      <div className="text-[10px] text-tertiary font-bold">
                        Costo Real/u:{' '}
                        {formatMoney(
                          batch.costoUnitarioRealMXN,
                          displayCurrency,
                          exchangeRate
                        )}
                      </div>
                    </div>
                  </div>

                  <>
                    <div className="bg-surface-container-lowest rounded-lg p-2 text-[10px] text-on-surface-variant flex justify-between">
                      <span>
                        Prod Unit:{' '}
                        {formatMoney(
                          batch.costoProductoUnitarioMXN,
                          displayCurrency,
                          exchangeRate
                        )}
                      </span>
                      <span>
                        Gastos Lote:{' '}
                        {formatMoney(
                          batch.gastosDeCompra.reduce((a, g) => a + g.montoMXN, 0),
                          displayCurrency,
                          exchangeRate
                        )}
                      </span>
                      <span className="font-bold text-on-surface">
                        Total Lote:{' '}
                        {formatMoney(
                          batch.costoTotalMXN,
                          displayCurrency,
                          exchangeRate
                        )}
                      </span>
                    </div>

                    {/* Action buttons: Edit Date, Edit Batch, Delete Batch */}
                    <div className="flex items-center justify-between pt-2 border-t border-outline-variant/20 gap-2">
                      <div className="flex items-center gap-1.5 bg-surface-container-high border border-outline-variant/60 rounded-lg px-2 py-1 text-[10px]">
                        <span className="material-symbols-outlined text-[14px] text-primary">
                          edit_calendar
                        </span>
                        <span className="font-bold text-on-surface-variant">Fecha:</span>
                        <input
                          type="date"
                          value={getLocalDateKey(batch.fecha)}
                          onChange={(e) => {
                            if (e.target.value) {
                              updateBatchDate(batch.id, e.target.value);
                            }
                          }}
                          className="bg-transparent font-bold text-primary focus:outline-none cursor-pointer text-[10px]"
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEdit('lote', batch)}
                          title="Editar lote"
                          className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 border border-primary/30 text-primary text-[10px] font-bold hover:bg-primary/20 transition-all"
                        >
                          <span className="material-symbols-outlined text-[13px]">edit</span>
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(batch)}
                          className="flex items-center gap-1 px-2 py-1 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] font-bold hover:bg-rose-500/20 transition-all"
                          title="Eliminar lote"
                        >
                          <span className="material-symbols-outlined text-[13px]">delete</span>
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
