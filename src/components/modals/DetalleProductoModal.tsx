import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  formatMoney,
  getProductTotalStock,
  getProductAverageCost,
  getProductBadges,
  calculateFifoAllocation,
} from '../../utils/calculations';

interface DetalleProductoModalProps {
  productId: string | null;
  onClose: () => void;
  onOpenEditProduct: (productId: string) => void;
  onOpenNewBatchForProduct: (productId: string) => void;
}

export const DetalleProductoModal: React.FC<DetalleProductoModalProps> = ({
  productId,
  onClose,
  onOpenEditProduct,
  onOpenNewBatchForProduct,
}) => {
  const {
    settings,
    products,
    categories,
    batches,
    sales,
    updateBatchNotes,
    deletePurchaseBatch,
    deleteProduct,
  } = useApp();

  const { displayCurrency, exchangeRate } = settings;

  const [editingBatchNoteId, setEditingBatchNoteId] = useState<string | null>(null);
  const [tempNoteText, setTempNoteText] = useState('');
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);

  if (!productId) return null;

  const product = products.find((p) => p.id === productId);
  if (!product) return null;

  const category = categories.find((c) => c.id === product.categoriaId);
  const totalStock = getProductTotalStock(product.id, batches);
  const avgCostMXN = getProductAverageCost(product.id, batches);
  const badges = getProductBadges(product, batches, sales);

  // Active Batches for this product
  const productBatches = batches.filter((b) => b.productoId === product.id);
  const activeBatches = productBatches.filter((b) => b.cantidadDisponible > 0);

  // Sales history for this product
  const productSales = sales.filter(
    (s) => s.productoId === product.id && s.estado === 'confirmada'
  );

  // Projected Margin % with Suggested Price
  const projectedMarginPct =
    product.precioSugerido && avgCostMXN > 0
      ? ((product.precioSugerido - avgCostMXN) / product.precioSugerido) * 100
      : 0;

  // FIFO test allocation for 1 unit preview
  const fifoPreview = calculateFifoAllocation(product.id, 1, batches);

  const handleSaveBatchNote = (batchId: string) => {
    updateBatchNotes(batchId, tempNoteText);
    setEditingBatchNoteId(null);
  };

  const handleDeleteProduct = () => {
    const res = deleteProduct(product.id);
    setDeleteMessage(res.message);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-surface-container-high border border-outline-variant w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-headline font-bold text-on-surface truncate max-w-[240px]">
              {product.nombre}
            </h2>
            {badges.map((b, idx) => (
              <span key={idx} className="text-xs">
                {b}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenEditProduct(product.id)}
              title="Editar producto"
              className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-base">edit</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-5 text-xs">
          {deleteMessage && (
            <div className="p-3 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
              {deleteMessage}
            </div>
          )}

          {/* Product Overview Card */}
          <div className="flex gap-4 bg-surface-container border border-outline-variant rounded-xl p-3.5">
            <div className="w-20 h-20 rounded-lg bg-surface flex-shrink-0 border border-outline-variant overflow-hidden flex items-center justify-center">
              {product.imagen ? (
                <img
                  src={product.imagen}
                  alt={product.nombre}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="material-symbols-outlined text-on-surface-variant text-2xl">
                  inventory_2
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">
                  {category ? category.nombre : 'General'}{' '}
                  {product.sku ? `• SKU: ${product.sku}` : ''}
                </span>
                <div className="text-sm font-bold text-on-surface truncate">
                  {product.nombre}
                </div>
              </div>

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-outline-variant/30">
                <span className="text-[10px] text-on-surface-variant">Stock Total</span>
                <span
                  className={`font-bold text-xs ${
                    totalStock === 0 ? 'text-error' : 'text-primary'
                  }`}
                >
                  {totalStock} unidades
                </span>
              </div>
            </div>
          </div>

          {/* Key Financial Specs Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface-container border border-outline-variant rounded-xl p-3 space-y-1">
              <span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">
                Costo Real Promedio
              </span>
              <div className="text-base font-headline font-bold text-on-surface">
                {formatMoney(avgCostMXN, displayCurrency, exchangeRate)}
              </div>
              <p className="text-[9px] text-on-surface-variant">
                Incluye gastos de envío/importación por lote
              </p>
            </div>

            <div className="bg-surface-container border border-outline-variant rounded-xl p-3 space-y-1">
              <span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">
                Precio Sugerido
              </span>
              <div className="text-base font-headline font-bold text-tertiary">
                {formatMoney(
                  product.precioSugerido || 0,
                  displayCurrency,
                  exchangeRate
                )}
              </div>
              <p className="text-[9px] text-tertiary font-bold">
                Margen proyectado: {projectedMarginPct.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Active FIFO Batches */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-headline font-bold text-on-surface text-xs flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">
                  layers
                </span>
                Lotes Activos (Orden de Antigüedad)
              </h3>
              <button
                onClick={() => onOpenNewBatchForProduct(product.id)}
                className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">add</span>
                Nuevo Lote
              </button>
            </div>

            {activeBatches.length === 0 ? (
              <div className="bg-surface-container border border-dashed border-outline-variant rounded-xl p-4 text-center text-on-surface-variant text-xs">
                No hay lotes con stock disponible actualmente.
              </div>
            ) : (
              <div className="space-y-2">
                {activeBatches.map((batch, index) => {
                  const isFirstFifo = index === 0;

                  return (
                    <div
                      key={batch.id}
                      className={`bg-surface-container border rounded-xl p-3 space-y-2 transition-all ${
                        isFirstFifo
                          ? 'border-primary/50 shadow-md shadow-primary/5'
                          : 'border-outline-variant'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold text-on-surface">
                            {batch.id}
                          </span>
                          {isFirstFifo && (
                            <span className="bg-primary text-on-primary text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                              Próximo a salir
                            </span>
                          )}
                          {batch.locked && (
                            <span
                              title="Lote bloqueado (ya tiene ventas registradas)"
                              className="material-symbols-outlined text-on-surface-variant text-[14px]"
                            >
                              lock
                            </span>
                          )}
                        </div>

                        <span className="font-bold text-xs text-on-surface">
                          {batch.cantidadDisponible} / {batch.cantidadComprada} u.
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] text-on-surface-variant border-t border-outline-variant/30 pt-2">
                        <div>
                          <span>Costo Producto Unit:</span>
                          <span className="font-bold text-on-surface ml-1">
                            {formatMoney(
                              batch.costoProductoUnitarioMXN,
                              displayCurrency,
                              exchangeRate
                            )}
                          </span>
                        </div>
                        <div className="text-right">
                          <span>Costo Unitario Real:</span>
                          <span className="font-bold text-tertiary ml-1">
                            {formatMoney(
                              batch.costoUnitarioRealMXN,
                              displayCurrency,
                              exchangeRate
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Batch Notes editable */}
                      <div className="text-[10px] text-on-surface-variant flex items-center justify-between border-t border-outline-variant/20 pt-1">
                        {editingBatchNoteId === batch.id ? (
                          <div className="flex gap-2 w-full items-center">
                            <input
                              type="text"
                              value={tempNoteText}
                              onChange={(e) => setTempNoteText(e.target.value)}
                              placeholder="Editar nota de lote..."
                              className="flex-1 bg-surface-container-lowest border border-outline-variant text-on-surface text-[10px] rounded px-2 py-1"
                            />
                            <button
                              onClick={() => handleSaveBatchNote(batch.id)}
                              className="text-primary font-bold text-[10px] px-2 py-1 bg-primary/10 rounded"
                            >
                              Guardar
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="italic truncate max-w-[180px]">
                              Nota: {batch.notas || 'Sin notas'}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingBatchNoteId(batch.id);
                                  setTempNoteText(batch.notas || '');
                                }}
                                className="text-primary text-[10px] hover:underline"
                              >
                                Editar nota
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`¿Eliminar el Lote ${batch.id}?`)) {
                                    const res = deletePurchaseBatch(batch.id);
                                    if (!res.success) alert(res.message);
                                  }
                                }}
                                className="text-rose-400 text-[10px] hover:underline font-bold"
                              >
                                Eliminar
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Sales History */}
          <div className="space-y-2 pt-2 border-t border-outline-variant/30">
            <h3 className="font-headline font-bold text-on-surface text-xs">
              Historial Reciente de Ventas ({productSales.length})
            </h3>

            {productSales.length === 0 ? (
              <p className="text-[10px] text-on-surface-variant italic">
                Aún no hay ventas registradas para este producto.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {productSales.slice(0, 5).map((sale) => (
                  <div
                    key={sale.id}
                    className="bg-surface-container border border-outline-variant/40 rounded-lg p-2.5 flex justify-between items-center text-[11px]"
                  >
                    <div>
                      <span className="font-mono text-on-surface font-bold">
                        {sale.id}
                      </span>
                      <span className="text-on-surface-variant ml-2">
                        {sale.cantidad} und. •{' '}
                        {new Date(sale.fecha).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-on-surface">
                        {formatMoney(
                          sale.ingresoTotalMXN,
                          displayCurrency,
                          exchangeRate
                        )}
                      </div>
                      <div className="text-[9px] font-bold text-tertiary">
                        +{formatMoney(
                          sale.gananciaVentaMXN,
                          displayCurrency,
                          exchangeRate
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Delete / Archive Product Action */}
          <div className="pt-4 border-t border-outline-variant/30 flex justify-between items-center">
            <button
              onClick={handleDeleteProduct}
              className="text-xs text-error font-bold hover:underline flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
              Eliminar / Archivar Producto
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
