import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  formatMoney,
  getProductTotalStock,
  getProductBadges,
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
  const { settings, products, categories, batches, sales } = useApp();
  const { displayCurrency, exchangeRate } = settings;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Filter products
  const activeProducts = products.filter((p) => !p.archivado);

  const filteredProducts = activeProducts.filter((p) => {
    const matchesSearch =
      p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategoryId
      ? p.categoriaId === selectedCategoryId
      : true;

    return matchesSearch && matchesCategory;
  });

  // Group products into 3 state buckets:
  // 1. Agotados (stock === 0)
  // 2. Stock Bajo (stock > 0 && stock <= stockMinimo)
  // 3. Disponibles (stock > stockMinimo) - sorted alphabetically
  const agotados = filteredProducts.filter(
    (p) => getProductTotalStock(p.id, batches) === 0
  );

  const stockBajo = filteredProducts.filter((p) => {
    const stock = getProductTotalStock(p.id, batches);
    return stock > 0 && stock <= p.stockMinimo;
  });

  const disponibles = filteredProducts
    .filter((p) => getProductTotalStock(p.id, batches) > p.stockMinimo)
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const getCategoryName = (catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    return cat ? cat.nombre : 'General';
  };

  return (
    <div className="flex flex-col w-full relative pb-24">
      {/* Sticky Search & Category Bar */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md px-4 py-3 border-b border-outline-variant/30">
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

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto mt-3 pb-1 scrollbar-hide">
          <button
            onClick={() => setSelectedCategoryId(null)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
              selectedCategoryId === null
                ? 'bg-primary text-on-primary border-primary font-bold shadow-sm'
                : 'bg-surface-container text-on-surface-variant border-outline-variant hover:bg-surface-variant'
            }`}
          >
            Todos ({activeProducts.length})
          </button>
          {categories
            .filter((c) => !c.archived)
            .map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
                  selectedCategoryId === cat.id
                    ? 'bg-primary text-on-primary border-primary font-bold shadow-sm'
                    : 'bg-surface-container text-on-surface-variant border-outline-variant hover:bg-surface-variant'
                }`}
              >
                {cat.nombre}
              </button>
            ))}
        </div>
      </div>

      {/* Product Groups */}
      <div className="px-4 py-4 flex flex-col gap-6">
        {filteredProducts.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2">
              inventory_2
            </span>
            <p className="text-sm font-bold text-on-surface">No se encontraron productos</p>
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
            {/* AGOTADOS SECTION */}
            {agotados.length > 0 && (
              <section>
                <h2 className="text-xs font-bold text-error uppercase tracking-wider mb-3 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">warning</span>
                  Agotados ({agotados.length})
                </h2>
                <div className="flex flex-col gap-3">
                  {agotados.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => onSelectProduct(p.id)}
                      className="bg-surface-container border border-outline-variant rounded-lg p-3 flex gap-3 opacity-80 hover:opacity-100 hover:bg-surface-container-high transition-colors cursor-pointer group"
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
                            Reponer
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

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
