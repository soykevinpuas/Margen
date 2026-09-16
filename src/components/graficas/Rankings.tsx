import React, { useState } from 'react';
import { Product } from '../../types';

// Producto con métricas ya calculadas por la vista
export interface ProductRankingEntry {
  product: Product;
  qty: number;
  revenue: number;
  profit: number;
}

interface RankingsProps {
  // Top 5 más vendidos (ordenados por cantidad)
  masVendidos: ProductRankingEntry[];
  // Top 5 más rentables (ordenados por ganancia)
  masRentables: ProductRankingEntry[];
  // Formatea un monto a la moneda de la app
  formatMoney: (value: number) => string;
  // Muestra "N uds. vendidas" bajo el nombre del producto
  mostrarUnidades?: boolean;
}

// Ranking con pestañas: Más Vendidos vs Más Rentables (top 5)
export const Rankings: React.FC<RankingsProps> = ({
  masVendidos,
  masRentables,
  formatMoney,
  mostrarUnidades = true,
}) => {
  const [activeTab, setActiveTab] = useState<'vendidos' | 'rentables'>('vendidos');

  const emptyMessage = (
    <p className="text-xs text-on-surface-variant text-center py-4">
      Sin ventas para clasificar.
    </p>
  );

  return (
    <div className="bg-surface-container rounded-xl border border-outline-variant overflow-hidden flex flex-col">
      {/* Tabs */}
      <div className="flex border-b border-outline-variant/30">
        <button
          onClick={() => setActiveTab('vendidos')}
          className={`flex-1 py-3 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'vendidos'
              ? 'text-primary border-primary bg-surface-container-high'
              : 'text-on-surface-variant border-transparent'
          }`}
        >
          🔥 Más Vendidos
        </button>
        <button
          onClick={() => setActiveTab('rentables')}
          className={`flex-1 py-3 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'rentables'
              ? 'text-primary border-primary bg-surface-container-high'
              : 'text-on-surface-variant border-transparent'
          }`}
        >
          💰 Más Rentables
        </button>
      </div>

      {/* Lista del tab activo */}
      <div className="flex flex-col divide-y divide-outline-variant/20 p-2">
        {activeTab === 'vendidos' ? (
          masVendidos.length === 0 ? (
            emptyMessage
          ) : (
            masVendidos.map((item, idx) => (
              <div key={item.product.id} className="flex items-center gap-3 p-2">
                <div className="w-8 h-8 rounded-lg bg-surface-container-lowest flex items-center justify-center text-on-surface-variant text-xs font-bold border border-outline-variant">
                  {idx + 1}
                </div>
                <div className="w-10 h-10 rounded-lg bg-surface flex-shrink-0 flex items-center justify-center overflow-hidden border border-outline-variant">
                  {item.product.imagen ? (
                    <img
                      src={item.product.imagen}
                      alt={item.product.nombre}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="material-symbols-outlined text-on-surface-variant">
                      inventory_2
                    </span>
                  )}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-xs font-bold text-on-surface truncate">
                    {item.product.nombre}
                  </span>
                  {mostrarUnidades && (
                    <span className="text-[10px] text-on-surface-variant">
                      {item.qty} uds. vendidas
                    </span>
                  )}
                </div>
                <span className="text-xs font-bold text-primary">
                  {formatMoney(item.revenue)}
                </span>
              </div>
            ))
          )
        ) : masRentables.length === 0 ? (
          emptyMessage
        ) : (
          masRentables.map((item, idx) => (
            <div key={item.product.id} className="flex items-center gap-3 p-2">
              <div className="w-8 h-8 rounded-lg bg-surface-container-lowest flex items-center justify-center text-on-surface-variant text-xs font-bold border border-outline-variant">
                {idx + 1}
              </div>
              <div className="w-10 h-10 rounded-lg bg-surface flex-shrink-0 flex items-center justify-center overflow-hidden border border-outline-variant">
                {item.product.imagen ? (
                  <img
                    src={item.product.imagen}
                    alt={item.product.nombre}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="material-symbols-outlined text-on-surface-variant">
                    inventory_2
                  </span>
                )}
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-xs font-bold text-on-surface truncate">
                  {item.product.nombre}
                </span>
                <span className="text-[10px] text-tertiary font-bold">
                  Ganancia: {formatMoney(item.profit)}
                </span>
              </div>
              <span className="text-xs font-bold text-tertiary">
                +{formatMoney(item.profit)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};