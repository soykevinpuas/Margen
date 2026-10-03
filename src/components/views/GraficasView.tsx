import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatMoney, getProductTotalStock, getLocalDateKey } from '../../utils/calculations';
import { ChartRenderer, ChartDataPoint } from '../ChartRenderer';

export const GraficasView: React.FC = () => {
  const { settings, sales, operatingExpenses, adjustments, batches, products } = useApp();
  const { displayCurrency, exchangeRate, chartType = 'barras' } = settings;

  const [period, setPeriod] = useState<'dia' | 'sem' | 'mes'>(() => {
    const saved = localStorage.getItem('margen_graficas_period');
    return saved === 'dia' || saved === 'sem' || saved === 'mes' ? saved : 'dia';
  });
  const [activeTopTab, setActiveTab] = useState<'vendidos' | 'rentables'>('vendidos');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handlePeriodChange = (p: 'dia' | 'sem' | 'mes') => {
    setPeriod(p);
    setSelectedIndex(null);
    localStorage.setItem('margen_graficas_period', p);
  };

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
  const getChartPoints = (): ChartDataPoint[] => {
    const now = new Date();
    if (period === 'dia') {
      // Last 7 days including current day
      return Array.from({ length: 7 }).map((_, i) => {
        // Set hour 12:00:00 to prevent timezone drift across midnight
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - i), 12, 0, 0);
        const dayAbbr = d.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '');
        const dayName = dayAbbr.charAt(0).toUpperCase() + dayAbbr.slice(1);
        const dayNum = String(d.getDate()).padStart(2, '0');
        const monthNum = String(d.getMonth() + 1).padStart(2, '0');
        const isToday = i === 6;
        const label = isToday ? `Hoy (${dayNum}/${monthNum})` : `${dayName} ${dayNum}/${monthNum}`;
        const dateStr = getLocalDateKey(d);

        const rev = confirmedSales
          .filter((s) => s.fecha && getLocalDateKey(s.fecha) === dateStr)
          .reduce((sum, s) => sum + s.ingresoTotalMXN, 0);
        const cogs = confirmedSales
          .filter((s) => s.fecha && getLocalDateKey(s.fecha) === dateStr)
          .reduce((sum, s) => sum + s.costoUnidadesVendidasMXN, 0);
        const exp = operatingExpenses
          .filter((e) => e.fecha && getLocalDateKey(e.fecha) === dateStr)
          .reduce((sum, e) => sum + e.montoMXN, 0);

        const totalGastos = cogs + exp;
        const prof = rev - totalGastos;

        return { label, ingresos: rev, gastos: totalGastos, gananciaReal: prof };
      });
    } else if (period === 'sem') {
      // Last 4 weeks
      return Array.from({ length: 4 }).map((_, i) => {
        const label = `Sem ${i + 1}`;
        const endDay = new Date();
        endDay.setDate(now.getDate() - (3 - i) * 7);
        const startDay = new Date(endDay);
        startDay.setDate(endDay.getDate() - 6);
        const startKey = getLocalDateKey(startDay);
        const endKey = getLocalDateKey(endDay);

        const rev = confirmedSales
          .filter((s) => {
            if (!s.fecha) return false;
            const sKey = getLocalDateKey(s.fecha);
            return sKey >= startKey && sKey <= endKey;
          })
          .reduce((sum, s) => sum + s.ingresoTotalMXN, 0);

        const cogs = confirmedSales
          .filter((s) => {
            if (!s.fecha) return false;
            const sKey = getLocalDateKey(s.fecha);
            return sKey >= startKey && sKey <= endKey;
          })
          .reduce((sum, s) => sum + s.costoUnidadesVendidasMXN, 0);

        const exp = operatingExpenses
          .filter((e) => {
            if (!e.fecha) return false;
            const eKey = getLocalDateKey(e.fecha);
            return eKey >= startKey && eKey <= endKey;
          })
          .reduce((sum, e) => sum + e.montoMXN, 0);

        const totalGastos = cogs + exp;
        const prof = rev - totalGastos;

        return { label, ingresos: rev, gastos: totalGastos, gananciaReal: prof };
      });
    } else {
      // Last 6 months
      return Array.from({ length: 6 }).map((_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const monthName = d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '').toUpperCase();
        const label = monthName;
        const yearStr = d.getFullYear();
        const monthStr = String(d.getMonth() + 1).padStart(2, '0');
        const targetYm = `${yearStr}-${monthStr}`;

        const rev = confirmedSales
          .filter((s) => s.fecha && getLocalDateKey(s.fecha).startsWith(targetYm))
          .reduce((sum, s) => sum + s.ingresoTotalMXN, 0);

        const cogs = confirmedSales
          .filter((s) => s.fecha && getLocalDateKey(s.fecha).startsWith(targetYm))
          .reduce((sum, s) => sum + s.costoUnidadesVendidasMXN, 0);

        const exp = operatingExpenses
          .filter((e) => e.fecha && getLocalDateKey(e.fecha).startsWith(targetYm))
          .reduce((sum, e) => sum + e.montoMXN, 0);

        const totalGastos = cogs + exp;
        const prof = rev - totalGastos;

        return { label, ingresos: rev, gastos: totalGastos, gananciaReal: prof };
      });
    }
  };

  const chartPoints = getChartPoints();

  // Dynamic KPI calculations based on selected bar/day
  const selectedPoint =
    selectedIndex !== null && chartPoints[selectedIndex]
      ? chartPoints[selectedIndex]
      : null;

  const displayIngresado = selectedPoint
    ? selectedPoint.ingresos
    : chartPoints.reduce((sum, p) => sum + p.ingresos, 0);

  const displayGastado = selectedPoint
    ? selectedPoint.gastos
    : chartPoints.reduce((sum, p) => sum + p.gastos, 0);

  const displayGanancia = selectedPoint
    ? selectedPoint.gananciaReal
    : chartPoints.reduce((sum, p) => sum + p.gananciaReal, 0);

  return (
    <div className="flex flex-col w-full gap-4 px-4 py-4 pb-24">
      {/* Resumen principal: Ingresos vs Beneficios */}
      <div className="bg-surface-container rounded-xl p-4 shadow-sm flex flex-col gap-3 border border-outline-variant">
        <div className="flex justify-between items-center">
          <h2 className="text-on-surface text-sm font-headline font-bold flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-base">bar_chart</span>
            Resumen General
          </h2>

          {/* Selector de Periodo */}
          <div className="flex bg-surface-container-high rounded-lg p-1 border border-outline-variant">
            <button
              onClick={() => handlePeriodChange('dia')}
              className={`px-2.5 py-1 text-xs font-bold rounded-[6px] transition-all ${
                period === 'dia'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant'
              }`}
            >
              Día
            </button>
            <button
              onClick={() => handlePeriodChange('sem')}
              className={`px-2.5 py-1 text-xs font-bold rounded-[6px] transition-all ${
                period === 'sem'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant'
              }`}
            >
              Sem
            </button>
            <button
              onClick={() => handlePeriodChange('mes')}
              className={`px-2.5 py-1 text-xs font-bold rounded-[6px] transition-all ${
                period === 'mes'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant'
              }`}
            >
              Mes
            </button>
          </div>
        </div>

        {/* Dynamic 3 KPI Box Row: Ingresado, Gastado, Ganancia Libre */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {/* Ingresado */}
          <div className="bg-surface-container-high/60 border border-violet-500/30 rounded-xl p-2 flex flex-col">
            <span className="text-[9px] font-bold text-violet-400 uppercase tracking-wider">
              Ingresado
            </span>
            <span className="text-sm sm:text-base font-headline font-bold text-on-surface truncate">
              {formatMoney(displayIngresado, displayCurrency, exchangeRate)}
            </span>
          </div>

          {/* Gastado */}
          <div className="bg-surface-container-high/60 border border-rose-500/30 rounded-xl p-2 flex flex-col">
            <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider">
              Gastado
            </span>
            <span className="text-sm sm:text-base font-headline font-bold text-rose-300 truncate">
              {formatMoney(displayGastado, displayCurrency, exchangeRate)}
            </span>
          </div>

          {/* Ganancia Libre */}
          <div className="bg-surface-container-high/60 border border-emerald-500/30 rounded-xl p-2 flex flex-col">
            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">
              Ganancia Libre
            </span>
            <span className={`text-sm sm:text-base font-headline font-bold truncate ${displayGanancia >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatMoney(displayGanancia, displayCurrency, exchangeRate)}
            </span>
          </div>
        </div>

        {/* Selected bar indicator / status note */}
        <div className="flex items-center justify-between text-[10px] text-on-surface-variant font-medium">
          {selectedPoint ? (
            <div className="flex items-center gap-2 bg-primary/10 border border-primary/30 text-primary px-2.5 py-1 rounded-full font-bold">
              <span>Filtro activo: <strong>{selectedPoint.label}</strong></span>
              <button
                type="button"
                onClick={() => setSelectedIndex(null)}
                className="hover:text-on-surface text-[11px] font-bold ml-1 bg-surface-container px-1.5 py-0.2 rounded-full border border-primary/20"
                title="Quitar filtro"
              >
                ✕ Ver periodo completo
              </button>
            </div>
          ) : (
            <span className="text-on-surface-variant/70 italic text-[10px]">
              👆 Selecciona cualquier barra o punto para ver los números de ese día
            </span>
          )}
        </div>

        {/* Dynamic Chart Renderer */}
        <div className="mt-1">
          <ChartRenderer
            data={chartPoints}
            chartType={chartType}
            displayCurrency={displayCurrency}
            exchangeRate={exchangeRate}
            height={200}
            showLegend={false}
            selectedIndex={selectedIndex}
            onSelectPoint={(idx) => setSelectedIndex(idx)}
          />
        </div>
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
              - Costo de Mercancía Vendida
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
