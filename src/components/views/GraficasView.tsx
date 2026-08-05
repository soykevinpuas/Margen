import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatMoney, getProductTotalStock } from '../../utils/calculations';

export const GraficasView: React.FC = () => {
  const { settings, sales, operatingExpenses, adjustments, batches, products } = useApp();
  const { displayCurrency, exchangeRate } = settings;

  const [period, setPeriod] = useState<'dia' | 'sem' | 'mes'>('mes');
  const [activeTopTab, setActiveTab] = useState<'vendidos' | 'rentables'>('vendidos');

  // Filter confirmed sales
  const confirmedSales = sales.filter((s) => s.estado === 'confirmada');

  // Total sales revenue
  const totalRevenueMXN = confirmedSales.reduce((acc, s) => acc + s.ingresoTotalMXN, 0);

  // Total sales profit (sales revenue - COGS - sales expenses)
  const salesProfitMXN = confirmedSales.reduce((acc, s) => acc + s.gananciaVentaMXN, 0);

  // COGS
  const totalCogsMXN = confirmedSales.reduce((acc, s) => acc + s.costoUnidadesVendidasMXN, 0);

  // Operating Expenses
  const totalOpExpensesMXN = operatingExpenses.reduce((acc, e) => acc + e.montoMXN, 0);

  // Inventory Loss
  const totalAdjustmentsLossMXN = adjustments.reduce((acc, a) => acc + a.perdidaTotalMXN, 0);

  // Real Net Business Result
  const realNetResultMXN = salesProfitMXN - totalOpExpensesMXN - totalAdjustmentsLossMXN;

  // Average Margin %
  const averageMarginPct =
    totalRevenueMXN > 0 ? (salesProfitMXN / totalRevenueMXN) * 100 : 0;

  // Real Net Margin %
  const realNetMarginPct =
    totalRevenueMXN > 0 ? (realNetResultMXN / totalRevenueMXN) * 100 : 0;

  // Total Capital Invested in Stock
  const totalInventoryValueMXN = batches.reduce(
    (acc, b) => acc + b.cantidadDisponible * b.costoUnitarioRealMXN,
    0
  );

  // Expenses by Category
  const expenseCatMap = new Map<string, number>();
  operatingExpenses.forEach((e) => {
    expenseCatMap.set(e.categoria, (expenseCatMap.get(e.categoria) || 0) + e.montoMXN);
  });

  const expenseCategoryList = [
    { cat: 'renta', name: 'Renta', icon: 'storefront', amount: expenseCatMap.get('renta') || 0 },
    { cat: 'servicios', name: 'Servicios', icon: 'bolt', amount: expenseCatMap.get('servicios') || 0 },
    { cat: 'nomina', name: 'Nómina', icon: 'groups', amount: expenseCatMap.get('nomina') || 0 },
    { cat: 'marketing', name: 'Marketing', icon: 'campaign', amount: expenseCatMap.get('marketing') || 0 },
    { cat: 'insumos', name: 'Insumos', icon: 'inventory', amount: expenseCatMap.get('insumos') || 0 },
    { cat: 'mantenimiento', name: 'Mantenimiento', icon: 'build', amount: expenseCatMap.get('mantenimiento') || 0 },
    { cat: 'otros', name: 'Otros', icon: 'more_horiz', amount: expenseCatMap.get('otros') || 0 },
  ].filter((item) => item.amount > 0);

  // Product rankings
  const productStatsMap = new Map<
    string,
    { qty: number; revenue: number; profit: number }
  >();

  confirmedSales.forEach((s) => {
    const existing = productStatsMap.get(s.productoId) || {
      qty: 0,
      revenue: 0,
      profit: 0,
    };
    productStatsMap.set(s.productoId, {
      qty: existing.qty + s.cantidad,
      revenue: existing.revenue + s.ingresoTotalMXN,
      profit: existing.profit + s.gananciaVentaMXN,
    });
  });

  const topSellingProducts = [...products]
    .map((p) => {
      const stats = productStatsMap.get(p.id) || { qty: 0, revenue: 0, profit: 0 };
      return { product: p, ...stats };
    })
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  const topProfitableProducts = [...products]
    .map((p) => {
      const stats = productStatsMap.get(p.id) || { qty: 0, revenue: 0, profit: 0 };
      return { product: p, ...stats };
    })
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 5);

  // Generate real graph points depending on selected period
  const getChartPoints = () => {
    const now = new Date();
    if (period === 'dia') {
      // Last 7 days
      return Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(now.getDate() - (6 - i));
        const label = d.toLocaleDateString('es-ES', { weekday: 'narrow' }).toUpperCase();
        const dateStr = d.toISOString().split('T')[0];

        const rev = confirmedSales
          .filter((s) => s.fecha && s.fecha.startsWith(dateStr))
          .reduce((sum, s) => sum + s.ingresoTotalMXN, 0);
        const prof = confirmedSales
          .filter((s) => s.fecha && s.fecha.startsWith(dateStr))
          .reduce((sum, s) => sum + s.gananciaVentaMXN, 0);

        return { label, revenue: rev, profit: prof };
      });
    } else if (period === 'sem') {
      // Last 4 weeks
      return Array.from({ length: 4 }).map((_, i) => {
        const label = `Sem ${i + 1}`;
        const endDay = new Date();
        endDay.setDate(now.getDate() - (3 - i) * 7);
        const startDay = new Date(endDay);
        startDay.setDate(endDay.getDate() - 6);

        const rev = confirmedSales
          .filter((s) => {
            if (!s.fecha) return false;
            const saleDate = new Date(s.fecha);
            return saleDate >= startDay && saleDate <= endDay;
          })
          .reduce((sum, s) => sum + s.ingresoTotalMXN, 0);

        const prof = confirmedSales
          .filter((s) => {
            if (!s.fecha) return false;
            const saleDate = new Date(s.fecha);
            return saleDate >= startDay && saleDate <= endDay;
          })
          .reduce((sum, s) => sum + s.gananciaVentaMXN, 0);

        return { label, revenue: rev, profit: prof };
      });
    } else {
      // Last 6 months
      return Array.from({ length: 6 }).map((_, i) => {
        const d = new Date();
        d.setMonth(now.getMonth() - (5 - i));
        const label = d.toLocaleDateString('es-ES', { month: 'short' });
        const year = d.getFullYear();
        const month = d.getMonth();

        const rev = confirmedSales
          .filter((s) => {
            if (!s.fecha) return false;
            const saleDate = new Date(s.fecha);
            return saleDate.getFullYear() === year && saleDate.getMonth() === month;
          })
          .reduce((sum, s) => sum + s.ingresoTotalMXN, 0);

        const prof = confirmedSales
          .filter((s) => {
            if (!s.fecha) return false;
            const saleDate = new Date(s.fecha);
            return saleDate.getFullYear() === year && saleDate.getMonth() === month;
          })
          .reduce((sum, s) => sum + s.gananciaVentaMXN, 0);

        return { label, revenue: rev, profit: prof };
      });
    }
  };

  const chartPoints = getChartPoints();
  const maxVal = Math.max(...chartPoints.map((p) => Math.max(p.revenue, p.profit)), 1);
  const hasChartData = chartPoints.some((p) => p.revenue > 0 || p.profit > 0);

  const revenuePointsStr = chartPoints
    .map((p, i) => {
      const x = (i / (chartPoints.length - 1)) * 100;
      const y = 35 - (p.revenue / maxVal) * 28;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' L ');

  const profitPointsStr = chartPoints
    .map((p, i) => {
      const x = (i / (chartPoints.length - 1)) * 100;
      const y = 35 - (p.profit / maxVal) * 28;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' L ');

  const revenuePathD = `M ${revenuePointsStr}`;
  const revenueGradientD = `M ${revenuePointsStr} L 100,40 L 0,40 Z`;
  const profitPathD = `M ${profitPointsStr}`;

  return (
    <div className="flex flex-col w-full gap-4 px-4 py-4 pb-24">
      {/* Resumen principal: Ingresos vs Beneficios */}
      <div className="bg-surface-container rounded-xl p-4 shadow-sm flex flex-col gap-3 border border-outline-variant">
        <div className="flex justify-between items-center">
          <h2 className="text-on-surface text-sm font-headline font-bold">
            Resumen General
          </h2>

          {/* Selector de Periodo */}
          <div className="flex bg-surface-container-high rounded-lg p-1 border border-outline-variant">
            <button
              onClick={() => setPeriod('dia')}
              className={`px-2 py-1 text-xs font-bold rounded-[6px] transition-all ${
                period === 'dia'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant'
              }`}
            >
              Día
            </button>
            <button
              onClick={() => setPeriod('sem')}
              className={`px-2 py-1 text-xs font-bold rounded-[6px] transition-all ${
                period === 'sem'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant'
              }`}
            >
              Sem
            </button>
            <button
              onClick={() => setPeriod('mes')}
              className={`px-2 py-1 text-xs font-bold rounded-[6px] transition-all ${
                period === 'mes'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant'
              }`}
            >
              Mes
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">
            Ingresos Totales
          </span>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-headline font-bold text-on-surface">
              {formatMoney(totalRevenueMXN, displayCurrency, exchangeRate)}
            </span>
            {hasChartData && (
              <span className="text-xs font-bold text-tertiary flex items-center mb-1 bg-tertiary/10 px-1.5 py-0.5 rounded border border-tertiary/20">
                <span className="material-symbols-outlined text-[14px]">insights</span>{' '}
                En tiempo real
              </span>
            )}
          </div>
        </div>

        {/* Line Chart SVG */}
        {!hasChartData ? (
          <div className="w-full h-32 mt-2 flex flex-col items-center justify-center border border-dashed border-outline-variant/50 rounded-xl p-4 text-center">
            <span className="material-symbols-outlined text-[28px] text-outline mb-1">
              show_chart
            </span>
            <span className="text-xs text-on-surface-variant font-medium">
              Sin datos de ventas en este periodo
            </span>
            <span className="text-[10px] text-outline mt-0.5">
              Registra tu primera venta para generar las curvas de ingresos y ganancias
            </span>
          </div>
        ) : (
          <div className="w-full h-32 mt-2 relative">
            <svg
              className="w-full h-full overflow-visible"
              viewBox="0 0 100 40"
              preserveAspectRatio="none"
            >
              {/* Grid lines */}
              <line
                x1="0"
                y1="10"
                x2="100"
                y2="10"
                stroke="#27272a"
                strokeWidth="0.5"
                strokeDasharray="1 2"
              />
              <line
                x1="0"
                y1="20"
                x2="100"
                y2="20"
                stroke="#27272a"
                strokeWidth="0.5"
                strokeDasharray="1 2"
              />
              <line
                x1="0"
                y1="30"
                x2="100"
                y2="30"
                stroke="#27272a"
                strokeWidth="0.5"
                strokeDasharray="1 2"
              />

              {/* Income Line */}
              <path
                d={revenuePathD}
                fill="none"
                stroke="#a78bfa"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              {/* Gradient Fill */}
              <path
                d={revenueGradientD}
                fill="url(#violet-gradient)"
                opacity="0.3"
              />

              {/* Profit Line (Emerald) */}
              <path
                d={profitPathD}
                fill="none"
                stroke="#34d399"
                strokeWidth="1"
                strokeDasharray="2 2"
                strokeLinecap="round"
              />

              <defs>
                <linearGradient id="violet-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" stopOpacity="1" />
                  <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>

            {/* Legend */}
            <div className="absolute bottom-0 right-0 flex gap-3 text-[10px]">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-primary"></div>
                <span className="text-on-surface-variant font-medium">Ingresos</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full border border-tertiary border-dashed"></div>
                <span className="text-on-surface-variant font-medium">Ganancia</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Two Columns: Margen Promedio & Capital Invertido */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface-container rounded-xl p-4 border border-outline-variant flex flex-col justify-between">
          <span className="text-xs text-on-surface-variant font-bold">
            Margen Prom. Ventas
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-headline font-bold text-on-surface">
              {averageMarginPct.toFixed(0)}
            </span>
            <span className="text-xs font-bold text-on-surface-variant">%</span>
          </div>
          <div className="mt-2 w-full bg-surface-container-high rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-tertiary h-full rounded-full"
              style={{ width: `${Math.min(100, averageMarginPct)}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-surface-container rounded-xl p-4 border border-outline-variant flex flex-col justify-between">
          <span className="text-xs text-on-surface-variant font-bold">
            Dinero Invertido
          </span>
          <div className="flex flex-col mt-1">
            <span className="text-lg font-headline font-bold text-on-surface truncate">
              {formatMoney(totalInventoryValueMXN, displayCurrency, exchangeRate)}
            </span>
            <span className="text-[10px] text-on-surface-variant">En inventario</span>
          </div>
        </div>
      </div>

      {/* P&L / Estructura de Costos & Resultado Real del Negocio */}
      <div className="bg-surface-container rounded-xl p-4 border border-outline-variant flex flex-col gap-3">
        <h2 className="text-sm font-headline font-bold text-on-surface flex items-center justify-between">
          <span>Estructura de Costos & Utilidad</span>
          <span
            className={`text-xs px-2 py-0.5 rounded font-bold ${
              realNetResultMXN >= 0
                ? 'bg-tertiary/20 text-tertiary border border-tertiary/30'
                : 'bg-error/20 text-error border border-error/30'
            }`}
          >
            {realNetMarginPct.toFixed(1)}% Neto Real
          </span>
        </h2>

        <div className="flex flex-col divide-y divide-outline-variant/30 text-xs">
          <div className="py-2 flex justify-between items-center">
            <span className="text-on-surface-variant font-medium">
              Ventas Totales
            </span>
            <span className="font-bold text-on-surface">
              {formatMoney(totalRevenueMXN, displayCurrency, exchangeRate)}
            </span>
          </div>

          <div className="py-2 flex justify-between items-center">
            <span className="text-on-surface-variant font-medium">
              - Costo de Mercancía Vendida (COGS FIFO)
            </span>
            <span className="font-bold text-error">
              -{formatMoney(totalCogsMXN, displayCurrency, exchangeRate)}
            </span>
          </div>

          <div className="py-2 flex justify-between items-center">
            <span className="text-on-surface-variant font-medium">
              - Gastos Directos de Venta
            </span>
            <span className="font-bold text-error">
              -
              {formatMoney(
                confirmedSales.reduce((a, s) => a + s.gastosDeVentaTotalMXN, 0),
                displayCurrency,
                exchangeRate
              )}
            </span>
          </div>

          <div className="py-2 flex justify-between items-center bg-surface-container-lowest/50 px-2 rounded font-bold">
            <span className="text-tertiary">= Ganancia Bruta de Ventas</span>
            <span className="text-tertiary">
              {formatMoney(salesProfitMXN, displayCurrency, exchangeRate)}
            </span>
          </div>

          <div className="py-2 flex justify-between items-center">
            <span className="text-on-surface-variant font-medium">
              - Gastos Operativos del Negocio
            </span>
            <span className="font-bold text-error">
              -{formatMoney(totalOpExpensesMXN, displayCurrency, exchangeRate)}
            </span>
          </div>

          {totalAdjustmentsLossMXN > 0 && (
            <div className="py-2 flex justify-between items-center">
              <span className="text-on-surface-variant font-medium">
                - Pérdidas por Ajuste de Inventario
              </span>
              <span className="font-bold text-error">
                -{formatMoney(totalAdjustmentsLossMXN, displayCurrency, exchangeRate)}
              </span>
            </div>
          )}

          <div className="py-3 flex justify-between items-center bg-surface-container-highest px-3 rounded-lg border border-outline-variant mt-1">
            <span className="text-sm font-bold text-on-surface">
              Resultado Real del Negocio
            </span>
            <span
              className={`text-base font-headline font-bold ${
                realNetResultMXN >= 0 ? 'text-tertiary' : 'text-error'
              }`}
            >
              {formatMoney(realNetResultMXN, displayCurrency, exchangeRate)}
            </span>
          </div>
        </div>
      </div>

      {/* Gastos por Categoría */}
      <div className="bg-surface-container rounded-xl p-4 border border-outline-variant flex flex-col gap-3">
        <h2 className="text-sm font-headline font-bold text-on-surface">
          Gastos Operativos por Categoría
        </h2>

        {expenseCategoryList.length === 0 ? (
          <p className="text-xs text-on-surface-variant text-center py-4">
            No se han registrado gastos operativos en este periodo.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {expenseCategoryList.map((item) => {
              const pct =
                totalOpExpensesMXN > 0
                  ? Math.round((item.amount / totalOpExpensesMXN) * 100)
                  : 0;

              return (
                <div key={item.cat} className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-on-surface flex items-center gap-1.5 capitalize">
                      <span className="material-symbols-outlined text-[14px] text-primary">
                        {item.icon}
                      </span>{' '}
                      {item.name}
                    </span>
                    <span className="text-on-surface-variant font-bold">
                      {formatMoney(item.amount, displayCurrency, exchangeRate)}{' '}
                      ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-surface-container-high rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rankings: Más Vendidos vs Más Rentables */}
      <div className="bg-surface-container rounded-xl border border-outline-variant overflow-hidden flex flex-col">
        {/* Tabs */}
        <div className="flex border-b border-outline-variant/30">
          <button
            onClick={() => setActiveTab('vendidos')}
            className={`flex-1 py-3 text-xs font-bold border-b-2 transition-colors ${
              activeTopTab === 'vendidos'
                ? 'text-primary border-primary bg-surface-container-high'
                : 'text-on-surface-variant border-transparent'
            }`}
          >
            🔥 Más Vendidos
          </button>
          <button
            onClick={() => setActiveTab('rentables')}
            className={`flex-1 py-3 text-xs font-bold border-b-2 transition-colors ${
              activeTopTab === 'rentables'
                ? 'text-primary border-primary bg-surface-container-high'
                : 'text-on-surface-variant border-transparent'
            }`}
          >
            💰 Más Rentables
          </button>
        </div>

        {/* List */}
        <div className="flex flex-col divide-y divide-outline-variant/20 p-2">
          {activeTopTab === 'vendidos' ? (
            topSellingProducts.length === 0 ? (
              <p className="text-xs text-on-surface-variant text-center py-4">
                Sin ventas para clasificar.
              </p>
            ) : (
              topSellingProducts.map((item, idx) => (
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
                    <span className="text-[10px] text-on-surface-variant">
                      {item.qty} uds. vendidas
                    </span>
                  </div>
                  <span className="text-xs font-bold text-primary">
                    {formatMoney(item.revenue, displayCurrency, exchangeRate)}
                  </span>
                </div>
              ))
            )
          ) : topProfitableProducts.length === 0 ? (
            <p className="text-xs text-on-surface-variant text-center py-4">
              Sin ventas para clasificar.
            </p>
          ) : (
            topProfitableProducts.map((item, idx) => (
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
                    Ganancia: {formatMoney(item.profit, displayCurrency, exchangeRate)}
                  </span>
                </div>
                <span className="text-xs font-bold text-tertiary">
                  +{formatMoney(item.profit, displayCurrency, exchangeRate)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
