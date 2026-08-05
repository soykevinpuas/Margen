import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatMoney } from '../../utils/calculations';

interface HistorialComprasModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HistorialComprasModal: React.FC<HistorialComprasModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { settings, batches, products } = useApp();
  const { displayCurrency, exchangeRate } = settings;

  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filteredBatches = batches.filter((b) => {
    const prod = products.find((p) => p.id === b.productoId);
    const prodName = prod ? prod.nombre.toLowerCase() : '';
    return (
      b.id.toLowerCase().includes(search.toLowerCase()) ||
      prodName.includes(search.toLowerCase()) ||
      (b.proveedor && b.proveedor.toLowerCase().includes(search.toLowerCase()))
    );
  });

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
                Control de disponibilidad y costos de adquisición
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
                      ? 'border-outline-variant/40 opacity-60'
                      : 'border-outline-variant hover:border-primary/50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
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
                      <h4 className="font-bold text-on-surface text-xs mt-1">
                        {product ? product.nombre : 'Producto no encontrado'}
                      </h4>
                      <p className="text-[10px] text-on-surface-variant">
                        {batch.fecha} • Proveedor:{' '}
                        {batch.proveedor || 'Sin especificar'}
                      </p>
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
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
