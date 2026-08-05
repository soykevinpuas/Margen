import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  formatMoney,
  getProductTotalStock,
  getProductBadges,
} from '../../utils/calculations';

interface InicioViewProps {
  onNavigateTab: (tab: 'vender' | 'inventario' | 'graficas' | 'mas') => void;
  onOpenCompra: () => void;
  onOpenGasto: () => void;
  onSelectProduct: (productId: string) => void;
}

export const InicioView: React.FC<InicioViewProps> = ({
  onNavigateTab,
  onOpenCompra,
  onOpenGasto,
  onSelectProduct,
}) => {
  const { settings, products, batches, sales } = useApp();
  const { displayCurrency, exchangeRate } = settings;

  // Calculate KPIs
  const confirmedSales = sales.filter((s) => s.estado === 'confirmada');
  const totalSalesCountMonth = confirmedSales.length;

  const totalSalesRevenue = confirmedSales.reduce((acc, s) => acc + s.ingresoTotalMXN, 0);
  const totalProfit = confirmedSales.reduce((acc, s) => acc + s.gananciaVentaMXN, 0);

  // Total current inventory value
  const totalInventoryValueMXN = batches.reduce(
    (acc, b) => acc + b.cantidadDisponible * b.costoUnitarioRealMXN,
    0
  );

  // Stock alerts
  const outOfStockProducts = products.filter((p) => {
    if (p.archivado) return false;
    const stock = getProductTotalStock(p.id, batches);
    return stock === 0;
  });

  const lowStockProducts = products.filter((p) => {
    if (p.archivado) return false;
    const stock = getProductTotalStock(p.id, batches);
    return stock > 0 && stock <= p.stockMinimo;
  });

  // Top Sellers
  const productSalesMap = new Map<string, number>();
  confirmedSales.forEach((s) => {
    productSalesMap.set(
      s.productoId,
      (productSalesMap.get(s.productoId) || 0) + s.cantidad
    );
  });

  const topSellingProducts = [...products]
    .map((p) => ({
      product: p,
      qtySold: productSalesMap.get(p.id) || 0,
    }))
    .filter((item) => item.qtySold > 0)
    .sort((a, b) => b.qtySold - a.qtySold)
    .slice(0, 2);

  // Real 7-day sales calculation
  const last7DaysData = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayName = d.toLocaleDateString('es-ES', { weekday: 'narrow' }).toUpperCase();
    const dateStr = d.toISOString().split('T')[0];

    const daySalesTotal = confirmedSales.reduce((sum, s) => {
      const saleDateStr = s.fecha ? s.fecha.split('T')[0] : '';
      return saleDateStr === dateStr ? sum + s.ingresoTotalMXN : sum;
    }, 0);

    return {
      day: dayName,
      dateStr,
      val: daySalesTotal,
    };
  });

  const total7DaysSalesVal = last7DaysData.reduce((acc, d) => acc + d.val, 0);
  const maxDayVal = Math.max(...last7DaysData.map((d) => d.val), 1);

  return (
    <div className="flex flex-col w-full px-4 gap-6 pt-4 pb-8">
      {/* KPIs Section */}
      <section className="grid grid-cols-2 gap-3">
        {/* Ganancia Total (Main KPI) */}
        <div className="col-span-2 bg-surface-container rounded-xl p-5 border border-outline-variant flex flex-col gap-1 relative overflow-hidden group shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
          <div className="flex items-center gap-2 text-on-surface-variant mb-1 z-10">
            <span className="material-symbols-outlined text-[18px] text-primary">
              payments
            </span>
            <span className="text-xs font-medium uppercase tracking-wider">
              Ganancia Total de Ventas
            </span>
          </div>
          <div className="text-3xl font-headline font-bold text-on-surface z-10 flex items-baseline gap-1">
            {formatMoney(totalProfit, displayCurrency, exchangeRate)}
          </div>
          {confirmedSales.length > 0 && (
            <div className="flex items-center gap-1 mt-2 text-tertiary z-10">
              <span className="material-symbols-outlined text-[14px]">insights</span>
              <span className="text-xs font-bold">Ventas registradas en tiempo real</span>
            </div>
          )}
        </div>

        {/* Ventas del Mes */}
        <div className="bg-surface-container rounded-xl p-4 border border-outline-variant flex flex-col gap-1 relative group">
          <div className="flex items-center gap-2 text-on-surface-variant mb-1 z-10">
            <span className="material-symbols-outlined text-[16px]">shopping_cart</span>
            <span className="text-[10px] font-medium uppercase tracking-wider">
              Ventas Registradas
            </span>
          </div>
          <div className="text-xl font-headline font-bold text-on-surface z-10">
            {totalSalesCountMonth}
          </div>
          <span className="text-[10px] text-on-surface-variant mt-1">
            Ingreso: {formatMoney(totalSalesRevenue, displayCurrency, exchangeRate)}
          </span>
        </div>

        {/* Valor Inventario */}
        <div className="bg-surface-container rounded-xl p-4 border border-outline-variant flex flex-col gap-1 relative group">
          <div className="flex items-center gap-2 text-on-surface-variant mb-1 z-10">
            <span className="material-symbols-outlined text-[16px]">inventory_2</span>
            <span className="text-[10px] font-medium uppercase tracking-wider">
              Valor Inventario
            </span>
          </div>
          <div className="text-xl font-headline font-bold text-on-surface z-10">
            {formatMoney(totalInventoryValueMXN, displayCurrency, exchangeRate)}
          </div>
          <span className="text-[10px] text-tertiary mt-1 font-medium">
            Cap. Invertido
          </span>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-headline font-bold text-on-surface-variant uppercase tracking-wider">
          Acciones Rápidas
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {/* Vender */}
          <button
            onClick={() => onNavigateTab('vender')}
            className="bg-primary hover:bg-primary-container text-on-primary rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-primary/20"
          >
            <span
              className="material-symbols-outlined text-[26px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              add_circle
            </span>
            <span className="text-xs font-bold">Vender</span>
          </button>

          {/* Agregar Compra */}
          <button
            onClick={onOpenCompra}
            className="bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[24px] text-primary">
              local_mall
            </span>
            <span className="text-[11px] font-medium text-center">Compra</span>
          </button>

          {/* Registrar Gasto */}
          <button
            onClick={onOpenGasto}
            className="bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[24px] text-error">
              receipt_long
            </span>
            <span className="text-[11px] font-medium text-center">Gasto</span>
          </button>
        </div>
      </section>

      {/* Sales Chart Summary */}
      <section className="bg-surface-container rounded-xl p-4 border border-outline-variant flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-headline font-bold text-on-surface">
            Ventas (7 días)
          </h2>
          <span className="text-xs text-on-surface-variant font-medium">
            {displayCurrency}
          </span>
        </div>

        {/* Bar Chart */}
        {total7DaysSalesVal === 0 ? (
          <div className="h-24 w-full flex flex-col items-center justify-center border border-dashed border-outline-variant/50 rounded-lg p-2 text-center">
            <span className="material-symbols-outlined text-[24px] text-outline mb-1">bar_chart</span>
            <span className="text-xs text-on-surface-variant font-medium">Sin ventas registradas en los últimos 7 días</span>
          </div>
        ) : (
          <div className="h-24 w-full flex items-end justify-between gap-2 relative">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              <div className="border-b border-outline-variant/30 w-full h-px"></div>
              <div className="border-b border-outline-variant/30 w-full h-px"></div>
              <div className="border-b border-outline-variant/30 w-full h-px"></div>
            </div>

            {last7DaysData.map((item, idx) => {
              const heightPct = Math.round((item.val / maxDayVal) * 85);
              const isToday = idx === last7DaysData.length - 1;
              return (
                <div
                  key={idx}
                  className={`w-full rounded-t-sm relative group cursor-pointer transition-all ${
                    isToday
                      ? 'bg-primary shadow-[0_0_10px_rgba(167,139,250,0.4)]'
                      : 'bg-primary/25 hover:bg-primary/40'
                  }`}
                  style={{ height: `${Math.max(heightPct, 4)}%` }}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface-container-highest border border-outline-variant text-[11px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity text-on-surface z-10 whitespace-nowrap shadow-md">
                    {formatMoney(item.val, displayCurrency, exchangeRate)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-between items-center text-[10px] text-on-surface-variant px-1">
          {last7DaysData.map((item, idx) => (
            <span
              key={idx}
              className={idx === last7DaysData.length - 1 ? 'text-primary font-bold' : ''}
            >
              {item.day}
            </span>
          ))}
        </div>
      </section>

      {/* Alertas de Stock */}
      <section className="flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h2 className="text-xs font-headline font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-error">
              warning
            </span>
            Alertas de Stock
          </h2>
          <button
            onClick={() => onNavigateTab('inventario')}
            className="text-xs text-primary font-medium hover:underline"
          >
            Ver todo
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {outOfStockProducts.length === 0 && lowStockProducts.length === 0 ? (
            <div className="bg-surface-container border border-outline-variant rounded-lg p-3 text-center text-xs text-on-surface-variant">
              ✓ Todo el inventario tiene stock suficiente
            </div>
          ) : (
            <>
              {outOfStockProducts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => onSelectProduct(p.id)}
                  className="bg-surface-container-lowest border border-error/30 rounded-lg p-3 flex items-center gap-3 cursor-pointer hover:bg-surface-container transition-colors"
                >
                  <div className="w-10 h-10 rounded-md bg-surface-container overflow-hidden flex-shrink-0 border border-outline-variant flex items-center justify-center">
                    {p.imagen ? (
                      <img
                        src={p.imagen}
                        alt={p.nombre}
                        className="w-full h-full object-cover grayscale opacity-60"
                      />
                    ) : (
                      <span className="material-symbols-outlined text-on-surface-variant text-lg">
                        inventory_2
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-bold text-on-surface truncate">
                      {p.nombre}
                    </h3>
                    <p className="text-[11px] text-error font-bold flex items-center gap-1">
                      Agotado (0 unidades)
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenCompra();
                    }}
                    title="Reponer stock"
                    className="px-2.5 py-1 rounded-md bg-primary/10 border border-primary/30 text-primary text-[10px] font-bold hover:bg-primary/20 transition-colors"
                  >
                    Reponer
                  </button>
                </div>
              ))}

              {lowStockProducts.map((p) => {
                const stock = getProductTotalStock(p.id, batches);
                return (
                  <div
                    key={p.id}
                    onClick={() => onSelectProduct(p.id)}
                    className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 flex items-center gap-3 cursor-pointer hover:bg-surface-container transition-colors"
                  >
                    <div className="w-10 h-10 rounded-md bg-surface-container overflow-hidden flex-shrink-0 border border-outline-variant flex items-center justify-center">
                      {p.imagen ? (
                        <img
                          src={p.imagen}
                          alt={p.nombre}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="material-symbols-outlined text-on-surface-variant text-lg">
                          inventory_2
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs font-bold text-on-surface truncate">
                        {p.nombre}
                      </h3>
                      <p className="text-[11px] text-on-surface-variant flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        Quedan {stock} unidades (mínimo: {p.stockMinimo})
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenCompra();
                      }}
                      className="w-8 h-8 rounded-full bg-surface-container border border-outline-variant flex items-center justify-center text-on-surface hover:text-primary transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        add_shopping_cart
                      </span>
                    </button>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </section>

      {/* Top Productos */}
      <section className="flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h2 className="text-xs font-headline font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-2">
            <span
              className="material-symbols-outlined text-[16px] text-amber-500"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              local_fire_department
            </span>
            Top Ventas
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {topSellingProducts.length === 0 ? (
            <div className="col-span-2 bg-surface-container border border-outline-variant rounded-lg p-4 text-center text-xs text-on-surface-variant">
              Aún no se han registrado ventas en el sistema.
            </div>
          ) : (
            topSellingProducts.map((item, index) => {
              const badges = getProductBadges(item.product, batches, sales);
              return (
                <div
                  key={item.product.id}
                  onClick={() => onSelectProduct(item.product.id)}
                  className="bg-surface-container rounded-lg border border-outline-variant p-2 flex flex-col gap-2 relative overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
                >
                  <div className="absolute top-2 right-2 bg-background/80 backdrop-blur px-1.5 py-0.5 rounded text-[10px] font-bold text-on-surface flex items-center gap-1 border border-outline-variant z-10">
                    #{index + 1}
                  </div>
                  <div className="w-full aspect-square rounded-md overflow-hidden bg-surface-container-lowest relative border border-outline-variant flex items-center justify-center">
                    {item.product.imagen ? (
                      <img
                        src={item.product.imagen}
                        alt={item.product.nombre}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="material-symbols-outlined text-on-surface-variant text-2xl">
                        inventory_2
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1">
                      <h3 className="text-xs font-bold text-on-surface truncate flex-1">
                        {item.product.nombre}
                      </h3>
                      <span className="text-[10px]">{badges.join(' ')}</span>
                    </div>
                    <span className="text-[10px] text-tertiary font-bold mt-0.5">
                      {item.qtySold} vendidos
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};
