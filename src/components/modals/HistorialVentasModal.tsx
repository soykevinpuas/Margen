import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatMoney, getLocalDateKey } from '../../utils/calculations';

interface HistorialVentasModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HistorialVentasModal: React.FC<HistorialVentasModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { settings, sales, products, cancelSale, updateSaleDate } = useApp();
  const { displayCurrency, exchangeRate } = settings;

  const [search, setSearch] = useState('');
  const [filterState, setFilterState] = useState<'todas' | 'confirmada' | 'cancelada'>('todas');
  const [cancellingSaleId, setCancellingSaleId] = useState<string | null>(null);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredSales = sales
    .filter((s) => {
      const prod = products.find((p) => p.id === s.productoId);
      const prodName = prod ? prod.nombre.toLowerCase() : '';
      const matchesSearch =
        s.id.toLowerCase().includes(search.toLowerCase()) ||
        prodName.includes(search.toLowerCase());

      const matchesState =
        filterState === 'todas' ? true : s.estado === filterState;

      return matchesSearch && matchesState;
    })
    .sort((a, b) => {
      const timeA = new Date(a.createdAt || a.fecha || 0).getTime();
      const timeB = new Date(b.createdAt || b.fecha || 0).getTime();
      if (timeA !== timeB) return timeB - timeA;
      return (b.id || '').localeCompare(a.id || '');
    });

  const handleCancelSale = (saleId: string) => {
    const res = cancelSale(saleId);
    setCancelMessage(res.message);
    setCancellingSaleId(null);
    setTimeout(() => {
      setCancelMessage(null);
    }, 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-surface-container-high border border-outline-variant w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-tertiary/10 border border-tertiary/20 flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined text-lg">history</span>
            </div>
            <div>
              <h2 className="text-sm font-headline font-bold text-on-surface">
                Historial de Ventas
              </h2>
              <p className="text-[10px] text-on-surface-variant">
                Listado completo de ventas y cancelación con restauración de stock
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

        {/* Filter Bar */}
        <div className="px-4 py-3 border-b border-outline-variant/30 space-y-2">
          {cancelMessage && (
            <div className="p-2 rounded-lg bg-tertiary/20 text-tertiary border border-tertiary/30 text-xs font-bold">
              {cancelMessage}
            </div>
          )}

          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">
                search
              </span>
              <input
                type="text"
                placeholder="Buscar por folio o producto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-surface-container border border-outline-variant text-on-surface text-xs rounded-lg py-2 pl-8 pr-3 focus:outline-none focus:border-primary"
              />
            </div>

            <select
              value={filterState}
              onChange={(e) => setFilterState(e.target.value as any)}
              className="bg-surface-container border border-outline-variant text-on-surface text-xs rounded-lg py-2 px-2 focus:outline-none"
            >
              <option value="todas">Todas</option>
              <option value="confirmada">Confirmadas</option>
              <option value="cancelada">Canceladas</option>
            </select>
          </div>
        </div>

        {/* Sales List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3 text-xs">
          {filteredSales.length === 0 ? (
            <p className="text-center py-8 text-on-surface-variant">
              No se encontraron ventas registradas.
            </p>
          ) : (
            filteredSales.map((sale) => {
              const product = products.find((p) => p.id === sale.productoId);
              const isCancelled = sale.estado === 'cancelada';

              return (
                <div
                  key={sale.id}
                  className={`bg-surface-container border rounded-xl p-3 space-y-2 transition-all ${
                    isCancelled
                      ? 'border-error/30 opacity-60'
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
                            {sale.id}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                              isCancelled
                                ? 'bg-error/20 text-error border-error/30'
                                : 'bg-tertiary/20 text-tertiary border-tertiary/30'
                            }`}
                          >
                            {sale.estado}
                          </span>
                        </div>
                        <h4 className="font-bold text-on-surface text-xs mt-0.5 truncate">
                          {product ? product.nombre : 'Producto no encontrado'}
                        </h4>
                        <p className="text-[10px] text-on-surface-variant truncate">
                          {new Date(sale.fecha).toLocaleString()} • {sale.cantidad} u.
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`text-sm font-headline font-bold ${isCancelled ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>
                        {formatMoney(
                          sale.ingresoTotalMXN,
                          displayCurrency,
                          exchangeRate
                        )}
                      </div>
                      {!isCancelled && (
                        <div className="text-[10px] font-bold text-tertiary">
                          Ganancia:{' '}
                          {formatMoney(
                            sale.gananciaVentaMXN,
                            displayCurrency,
                            exchangeRate
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* FIFO Batch Allocations breakdown */}
                  <div className="bg-surface-container-lowest rounded-lg p-2 text-[10px] text-on-surface-variant space-y-1">
                    <div className="font-bold flex justify-between border-b border-outline-variant/20 pb-1">
                      <span>Asignación de Lotes:</span>
                      <span>Costo de Compra: {formatMoney(sale.costoUnidadesVendidasMXN ?? 0, displayCurrency, exchangeRate)}</span>
                    </div>
                    {(sale.asignacionesLotes || []).map((alloc) => (
                      <div key={alloc.loteId} className="flex justify-between">
                        <span>Lote {alloc.loteId}: {alloc.cantidadTomada} unidades</span>
                        <span>@{formatMoney(alloc.costoUnitarioLoteSnapshotMXN ?? 0, displayCurrency, exchangeRate)}/u</span>
                      </div>
                    ))}
                  </div>

                  {/* Actions & Editable Date */}
                  {!isCancelled && (
                    <div className="flex flex-wrap items-center justify-between pt-1 border-t border-outline-variant/20 gap-2">
                      <div className="flex items-center gap-1.5 bg-surface-container-high border border-outline-variant/60 rounded-lg px-2 py-1 text-[10px]">
                        <span className="material-symbols-outlined text-[14px] text-primary">edit_calendar</span>
                        <span className="font-bold text-on-surface-variant">Fecha:</span>
                        <input
                          type="date"
                          value={getLocalDateKey(sale.fecha)}
                          onChange={(e) => {
                            if (e.target.value) {
                              updateSaleDate(sale.id, e.target.value);
                            }
                          }}
                          className="bg-transparent font-bold text-primary focus:outline-none cursor-pointer text-[10px]"
                        />
                      </div>

                      <button
                        onClick={() => setCancellingSaleId(sale.id)}
                        className="px-2.5 py-1 bg-error/10 border border-error/30 text-error hover:bg-error/20 font-bold text-[10px] rounded-lg transition-all flex items-center gap-1 shrink-0"
                      >
                        <span className="material-symbols-outlined text-[14px]">cancel</span>
                        Anular Venta y Devolver Stock
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* CONFIRMATION MODAL FOR CANCEL SALE */}
        {cancellingSaleId && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-surface-container-high border border-error/40 w-full max-w-sm rounded-2xl p-5 shadow-2xl space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-error/10 border border-error/30 text-error flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-2xl">warning</span>
              </div>

              <div>
                <h3 className="text-sm font-headline font-bold text-on-surface">
                  ¿Confirmar Anulación de Venta?
                </h3>
                <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed">
                  Esta acción revertirá la venta <strong className="text-on-surface font-mono">{cancellingSaleId}</strong>, devolverá las unidades al inventario en sus lotes de origen y restará el ingreso.
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={() => handleCancelSale(cancellingSaleId)}
                  className="w-full py-2.5 bg-error text-on-error font-bold text-xs rounded-xl hover:bg-error/90 transition-all shadow-md shadow-error/20"
                >
                  Sí, Anular Venta y Reponer Stock
                </button>
                <button
                  onClick={() => setCancellingSaleId(null)}
                  className="w-full py-2.5 bg-surface-container border border-outline-variant text-on-surface font-bold text-xs rounded-xl hover:bg-surface-container-high transition-all"
                >
                  Cancelar / Mantener Venta
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
