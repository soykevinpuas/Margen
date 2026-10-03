import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, PurchaseBatch } from '../../types';
import {
  formatMoney,
  getProductTotalStock,
  getProductBadges,
  getLocalDateKey,
} from '../../utils/calculations';

interface InventarioViewProps {
  onSelectProduct: (productId: string) => void;
  onOpenNuevoProducto: () => void;
  onOpenCompra: () => void;
}

export const InventarioView: React.FC<InventarioViewProps> = ({
  onSelectProduct,
  onOpenNuevoProducto,
  onOpenCompra,
}) => {
  const {
    settings,
    products,
    categories,
    batches,
    sales,
    updateBatchDate,
    updatePurchaseBatch,
    deletePurchaseBatch,
  } = useApp();
  const { displayCurrency, exchangeRate } = settings;

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'productos' | 'compras' | 'agotados'>('productos');

  // Editing batch state
  const [editingBatch, setEditingBatch] = useState<PurchaseBatch | null>(null);
  const [editQty, setEditQty] = useState<number>(1);
  const [editCostUnit, setEditCostUnit] = useState<number>(0);
  const [editProveedor, setEditProveedor] = useState<string>('');
  const [editFecha, setEditFecha] = useState<string>('');
  const [batchError, setBatchError] = useState<string>('');

  const handleStartEdit = (batch: PurchaseBatch) => {
    setEditingBatch(batch);
    setEditQty(batch.cantidadComprada);
    setEditCostUnit(batch.costoProductoUnitarioMXN);
    setEditProveedor(batch.proveedor || '');
    setEditFecha(getLocalDateKey(batch.fecha));
    setBatchError('');
  };

  const handleSaveEdit = () => {
    if (!editingBatch) return;
    const soldUnits = editingBatch.cantidadComprada - editingBatch.cantidadDisponible;
    if (editQty < soldUnits) {
      setBatchError(`No puedes reducir la cantidad por debajo de ${soldUnits} unidades ya vendidas.`);
      return;
    }
    updatePurchaseBatch(editingBatch.id, {
      cantidadComprada: Number(editQty),
      costoProductoUnitarioMXN: Number(editCostUnit),
      proveedor: editProveedor,
      fecha: editFecha,
    });
    setEditingBatch(null);
  };

  const handleDeleteBatch = (batch: PurchaseBatch) => {
    if (confirm(`¿Estás seguro de que deseas eliminar el Lote ${batch.id}?`)) {
      const res = deletePurchaseBatch(batch.id);
      if (!res.success) {
        alert(res.message);
      }
    }
  };

  // Filter products
  const activeProducts = products.filter((p) => !p.archivado);

  const filteredProducts = activeProducts.filter((p) => {
    const matchesSearch =
      p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesSearch;
  });

  // Sort helpers by creation date (newest first)
  const sortProductsByDate = (items: Product[]): Product[] => {
    return [...items].sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      if (timeA !== timeB) return timeB - timeA;
      return b.id.localeCompare(a.id);
    });
  };

  const sortBatchesByDate = (items: PurchaseBatch[]): PurchaseBatch[] => {
    return [...items].sort((a, b) => {
      const timeA = new Date(a.createdAt || a.fecha || 0).getTime();
      const timeB = new Date(b.createdAt || b.fecha || 0).getTime();
      if (timeA !== timeB) return timeB - timeA;
      return b.id.localeCompare(a.id);
    });
  };

  // Filter purchase batches for the 'compras' tab
  const filteredBatches = sortBatchesByDate(
    batches.filter((b) => {
      const prod = products.find((p) => p.id === b.productoId);
      const prodName = prod ? prod.nombre.toLowerCase() : '';
      return (
        b.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prodName.includes(searchQuery.toLowerCase()) ||
        (b.proveedor && b.proveedor.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    })
  );

  // Group products into 3 state buckets (sorted by creation date, newest first):
  const agotados = sortProductsByDate(
    filteredProducts.filter((p) => getProductTotalStock(p.id, batches) === 0)
  );

  const stockBajo = sortProductsByDate(
    filteredProducts.filter((p) => {
      const stock = getProductTotalStock(p.id, batches);
      return stock > 0 && stock <= p.stockMinimo;
    })
  );

  const disponibles = sortProductsByDate(
    filteredProducts.filter((p) => getProductTotalStock(p.id, batches) > p.stockMinimo)
  );

  const totalAvailableAndLow = stockBajo.length + disponibles.length;

  const getCategoryName = (catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    return cat ? cat.nombre : 'General';
  };

  return (
    <div className="flex flex-col w-full relative pb-24">
      {/* Sticky Search & Chrome-Style Tabs Bar */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md px-4 pt-3 pb-2 border-b border-outline-variant/30">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre o SKU..."
            className="w-full h-10 bg-surface-container text-on-surface text-sm rounded-lg pl-10 pr-4 outline-none border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>

        {/* Chrome-Style 3 Tabs */}
        <div className="flex bg-surface-container-high/80 border border-outline-variant/60 rounded-xl p-1 mt-3 gap-1 shadow-inner overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('productos')}
            className={`flex-1 min-w-[90px] py-1.5 px-2 text-[11px] font-extrabold rounded-lg transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'productos'
                ? 'bg-primary text-on-primary shadow-md border border-primary/40'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest/50'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">inventory_2</span>
            Productos ({totalAvailableAndLow})
          </button>

          <button
            onClick={() => setActiveTab('compras')}
            className={`flex-1 min-w-[110px] py-1.5 px-2 text-[11px] font-extrabold rounded-lg transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'compras'
                ? 'bg-primary text-on-primary shadow-md border border-primary/40'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest/50'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">local_shipping</span>
            Historial ({batches.length})
          </button>

          <button
            onClick={() => setActiveTab('agotados')}
            className={`flex-1 min-w-[85px] py-1.5 px-2 text-[11px] font-extrabold rounded-lg transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'agotados'
                ? 'bg-error text-on-error shadow-md border border-error/40'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest/50'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">block</span>
            Agotados ({agotados.length})
          </button>
        </div>
      </div>

      {/* TAB 1: PRODUCTOS DISPONIBLES Y STOCK BAJO */}
      {activeTab === 'productos' && (
        <div className="px-4 py-4 flex flex-col gap-6">
          {disponibles.length === 0 && stockBajo.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2">
                inventory_2
              </span>
              <p className="text-sm font-bold text-on-surface">No hay productos en inventario</p>
              <p className="text-xs text-on-surface-variant mt-1">
                Prueba cambiando la búsqueda o crea un nuevo producto.
              </p>
              <button
                onClick={onOpenNuevoProducto}
                className="mt-4 px-4 py-2 bg-primary text-on-primary font-bold text-xs rounded-lg shadow-md"
              >
                + Agregar Producto
              </button>
            </div>
          ) : (
            <>
              {/* STOCK BAJO SECTION */}
              {stockBajo.length > 0 && (
                <section>
                  <h2 className="text-xs font-bold text-tertiary uppercase tracking-wider mb-3 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">trending_down</span>
                    Stock Bajo ({stockBajo.length})
                  </h2>
                  <div className="flex flex-col gap-3">
                    {stockBajo.map((p) => {
                      const stock = getProductTotalStock(p.id, batches);
                      const badges = getProductBadges(p, batches, sales);
                      return (
                        <div
                          key={p.id}
                          onClick={() => onSelectProduct(p.id)}
                          className="bg-surface-container border border-outline-variant rounded-lg p-3 flex gap-3 hover:bg-surface-container-high transition-colors cursor-pointer group"
                        >
                          <div className="w-16 h-16 rounded-md bg-surface-container-highest flex-shrink-0 overflow-hidden border border-outline-variant flex items-center justify-center">
                            {p.imagen ? (
                              <img
                                src={p.imagen}
                                alt={p.nombre}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="material-symbols-outlined text-on-surface-variant text-xl">
                                inventory_2
                              </span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-start mb-0.5">
                                <h3 className="text-xs font-bold text-on-surface truncate group-hover:text-primary transition-colors">
                                  {p.nombre}
                                </h3>
                                <span className="text-[10px] bg-tertiary/10 text-tertiary px-1.5 py-0.5 rounded border border-tertiary/20 whitespace-nowrap ml-2 font-bold">
                                  {stock} und
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <p className="text-[11px] text-on-surface-variant truncate">
                                  {getCategoryName(p.categoriaId)}
                                </p>
                                {badges.map((b, i) => (
                                  <span key={i} className="text-[10px]">
                                    {b}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="flex justify-between items-end mt-2">
                              <span className="text-xs font-bold text-on-surface">
                                Sug:{' '}
                                {formatMoney(
                                  p.precioSugerido || 0,
                                  displayCurrency,
                                  exchangeRate
                                )}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenCompra();
                                }}
                                title="Comprar stock"
                                className="text-on-surface-variant hover:text-primary"
                              >
                                <span className="material-symbols-outlined text-[18px]">
                                  add_shopping_cart
                                </span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* DISPONIBLES SECTION */}
              {disponibles.length > 0 && (
                <section>
                  <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">inventory</span>
                    Disponibles ({disponibles.length})
                  </h2>
                  <div className="flex flex-col gap-3">
                    {disponibles.map((p) => {
                      const stock = getProductTotalStock(p.id, batches);
                      const badges = getProductBadges(p, batches, sales);
                      return (
                        <div
                          key={p.id}
                          onClick={() => onSelectProduct(p.id)}
                          className="bg-surface-container border border-outline-variant rounded-lg p-3 flex gap-3 hover:bg-surface-container-high transition-colors cursor-pointer group"
                        >
                          <div className="w-16 h-16 rounded-md bg-surface-container-highest flex-shrink-0 overflow-hidden border border-outline-variant flex items-center justify-center">
                            {p.imagen ? (
                              <img
                                src={p.imagen}
                                alt={p.nombre}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="material-symbols-outlined text-on-surface-variant text-xl">
                                inventory_2
                              </span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-start mb-0.5">
                                <h3 className="text-xs font-bold text-on-surface truncate group-hover:text-primary transition-colors">
                                  {p.nombre}
                                </h3>
                                <span className="text-[10px] bg-surface-variant text-on-surface-variant px-1.5 py-0.5 rounded border border-outline-variant whitespace-nowrap ml-2 font-bold">
                                  {stock} und
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <p className="text-[11px] text-on-surface-variant truncate">
                                  {getCategoryName(p.categoriaId)}
                                </p>
                                {badges.map((b, i) => (
                                  <span key={i} className="text-[10px]">
                                    {b}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="flex justify-between items-end mt-2">
                              <span className="text-xs font-bold text-on-surface">
                                Sug:{' '}
                                {formatMoney(
                                  p.precioSugerido || 0,
                                  displayCurrency,
                                  exchangeRate
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB 2: HISTORIAL DE COMPRAS (LOTES) */}
      {activeTab === 'compras' && (
        <div className="px-4 py-4 flex flex-col gap-3 text-xs">
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">history_edu</span>
              Lotes de Mercancía Comprada
            </h2>
            <button
              onClick={onOpenCompra}
              className="px-3 py-1.5 bg-primary text-on-primary font-bold text-xs rounded-lg shadow-sm flex items-center gap-1"
            >
              + Nueva Compra
            </button>
          </div>

          {filteredBatches.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center bg-surface-container border border-outline-variant/50 rounded-xl p-6">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2">
                local_shipping
              </span>
              <p className="text-sm font-bold text-on-surface">No hay compras registradas</p>
              <p className="text-xs text-on-surface-variant mt-1">
                Registra una compra o lote inicial para cargar inventario.
              </p>
            </div>
          ) : (
            filteredBatches.map((batch) => {
              const product = products.find((p) => p.id === batch.productoId);
              const isDepleted = batch.cantidadDisponible === 0;

              return (
                <div
                  key={batch.id}
                  className={`bg-surface-container border rounded-xl p-3.5 space-y-2.5 transition-all ${
                    isDepleted
                      ? 'border-outline-variant/40 opacity-60'
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
                        <p className="text-[10px] text-on-surface-variant mt-0.5 truncate">
                          {batch.fecha} • Proveedor: {batch.proveedor || 'Sin especificar'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold text-on-surface">
                        {batch.cantidadDisponible} / {batch.cantidadComprada} u.
                      </div>
                      <div className="text-[10px] text-tertiary font-bold mt-0.5">
                        Costo Real/u:{' '}
                        {formatMoney(
                          batch.costoUnitarioRealMXN,
                          displayCurrency,
                          exchangeRate
                        )}
                      </div>
                    </div>
                  </div>

                  {editingBatch?.id !== batch.id ? (
                    <>
                      <div className="bg-surface-container-lowest rounded-lg p-2 text-[10px] text-on-surface-variant flex justify-between border border-outline-variant/20">
                        <span>
                          Unit. Base:{' '}
                          {formatMoney(
                            batch.costoProductoUnitarioMXN,
                            displayCurrency,
                            exchangeRate
                          )}
                        </span>
                        <span>
                          Gastos:{' '}
                          {formatMoney(
                            batch.gastosDeCompra.reduce((a, g) => a + g.montoMXN, 0),
                            displayCurrency,
                            exchangeRate
                          )}
                        </span>
                        <span className="font-bold text-on-surface">
                          Total Lote:{' '}
                          {formatMoney(batch.costoTotalMXN, displayCurrency, exchangeRate)}
                        </span>
                      </div>

                      {/* Editable Batch Date & Action Buttons */}
                      <div className="flex items-center justify-between pt-2 border-t border-outline-variant/20 gap-2">
                        <div className="flex items-center gap-1.5 bg-surface-container-high border border-outline-variant/60 rounded-lg px-2 py-1 text-[10px]">
                          <span className="material-symbols-outlined text-[14px] text-primary">edit_calendar</span>
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
                            onClick={() => handleStartEdit(batch)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary/10 border border-primary/30 text-primary text-[10px] font-bold hover:bg-primary/20 transition-all"
                          >
                            <span className="material-symbols-outlined text-[13px]">edit</span>
                            Editar Lote
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteBatch(batch)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] font-bold hover:bg-rose-500/20 transition-all"
                            title="Eliminar lote"
                          >
                            <span className="material-symbols-outlined text-[13px]">delete</span>
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Inline Edit Mode Form */
                    <div className="bg-surface-container-high p-3 rounded-xl border border-primary/40 space-y-2.5 mt-2 animate-fade-in">
                      <div className="flex justify-between items-center text-xs font-bold text-primary">
                        <span>Editar Lote #{batch.id}</span>
                        <button
                          type="button"
                          onClick={() => setEditingBatch(null)}
                          className="text-on-surface-variant hover:text-on-surface text-xs"
                        >
                          Cancelar
                        </button>
                      </div>

                      {batchError && (
                        <div className="p-2 rounded bg-error/10 border border-error/30 text-error text-[10px] font-bold">
                          {batchError}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <label className="text-[10px] font-bold text-on-surface-variant block mb-0.5">
                            Cant. Comprada:
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={editQty}
                            onChange={(e) => setEditQty(Number(e.target.value))}
                            className="w-full bg-surface-container border border-outline-variant rounded p-1.5 text-on-surface font-bold text-xs"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-on-surface-variant block mb-0.5">
                            Costo Unit. (MXN):
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editCostUnit}
                            onChange={(e) => setEditCostUnit(Number(e.target.value))}
                            className="w-full bg-surface-container border border-outline-variant rounded p-1.5 text-on-surface font-bold text-xs"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-on-surface-variant block mb-0.5">
                            Proveedor:
                          </label>
                          <input
                            type="text"
                            value={editProveedor}
                            onChange={(e) => setEditProveedor(e.target.value)}
                            className="w-full bg-surface-container border border-outline-variant rounded p-1.5 text-on-surface text-xs"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-on-surface-variant block mb-0.5">
                            Fecha Compra:
                          </label>
                          <input
                            type="date"
                            value={editFecha}
                            onChange={(e) => setEditFecha(e.target.value)}
                            className="w-full bg-surface-container border border-outline-variant rounded p-1.5 text-on-surface font-bold text-xs"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingBatch(null)}
                          className="px-3 py-1.5 rounded-lg bg-surface-container text-on-surface-variant text-[11px] font-bold"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          className="px-3.5 py-1.5 rounded-lg bg-primary text-on-primary text-[11px] font-bold shadow-sm"
                        >
                          Guardar Cambios
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 3: AGOTADOS */}
      {activeTab === 'agotados' && (
        <div className="px-4 py-4 flex flex-col gap-4">
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-xs font-bold text-error uppercase tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">warning</span>
              Productos Agotados ({agotados.length})
            </h2>
            <button
              onClick={onOpenCompra}
              className="px-3 py-1.5 bg-primary text-on-primary font-bold text-xs rounded-lg shadow-sm flex items-center gap-1"
            >
              + Reponer Stock
            </button>
          </div>

          {agotados.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center bg-surface-container border border-outline-variant/50 rounded-xl p-6">
              <span className="material-symbols-outlined text-4xl text-emerald-400 mb-2">
                check_circle
              </span>
              <p className="text-sm font-bold text-on-surface">✓ ¡Excelente!</p>
              <p className="text-xs text-on-surface-variant mt-1">
                No tienes productos sin stock en este momento.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {agotados.map((p) => (
                <div
                  key={p.id}
                  onClick={() => onSelectProduct(p.id)}
                  className="bg-surface-container border border-error/30 rounded-lg p-3 flex gap-3 hover:bg-surface-container-high transition-colors cursor-pointer group"
                >
                  <div className="w-16 h-16 rounded-md bg-surface-container-highest flex-shrink-0 overflow-hidden relative border border-outline-variant flex items-center justify-center">
                    <div className="absolute inset-0 bg-background/60 z-10 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-on-surface uppercase text-center leading-tight">
                        Sin
                        <br />
                        Stock
                      </span>
                    </div>
                    {p.imagen ? (
                      <img
                        src={p.imagen}
                        alt={p.nombre}
                        className="w-full h-full object-cover grayscale"
                      />
                    ) : (
                      <span className="material-symbols-outlined text-on-surface-variant text-xl">
                        inventory_2
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-0.5">
                        <h3 className="text-xs font-bold text-on-surface truncate group-hover:text-primary transition-colors">
                          {p.nombre}
                        </h3>
                        <span className="text-[10px] bg-error/10 text-error px-1.5 py-0.5 rounded border border-error/20 whitespace-nowrap ml-2 font-bold">
                          0 und
                        </span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant truncate">
                        {getCategoryName(p.categoriaId)}
                        {p.sku ? ` • ${p.sku}` : ''}
                      </p>
                    </div>
                    <div className="flex justify-between items-end mt-2">
                      <span className="text-xs font-bold text-on-surface opacity-60">
                        Sug:{' '}
                        {formatMoney(
                          p.precioSugerido || 0,
                          displayCurrency,
                          exchangeRate
                        )}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenCompra();
                        }}
                        className="text-[11px] text-primary font-bold hover:underline"
                      >
                        Reponer Stock
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Floating Add Product FAB */}
      <button
        onClick={onOpenNuevoProducto}
        title="Crear Nuevo Producto"
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-primary text-on-primary shadow-lg flex items-center justify-center hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all z-40 border border-primary-fixed"
      >
        <span className="material-symbols-outlined text-[28px]">add</span>
      </button>
    </div>
  );
};
