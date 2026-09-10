import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  formatMoney,
  getProductTotalStock,
  getProductBadges,
  getLocalDateKey,
} from '../../utils/calculations';
import { ChartRenderer, ChartDataPoint } from '../ChartRenderer';
import { CalendarioMesModal } from '../modals/CalendarioMesModal';

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
  const { settings, products, batches, sales, operatingExpenses } = useApp();
  const { displayCurrency, exchangeRate, chartType = 'barras' } = settings;

  // Modals & Interactive States
  const [isCalendarioOpen, setIsCalendarioOpen] = useState(false);
  const [showProfitChart, setShowProfitChart] = useState(false);
  const [profitChartPeriod, setProfitChartPeriod] = useState<'dia' | 'sem' | 'mes'>('dia');
  const [profitSelectedIndex, setProfitSelectedIndex] = useState<number | null>(null);

  const [showMiniInventory, setShowMiniInventory] = useState(false);
  const [spentPeriod, setSpentPeriod] = useState<'dia' | 'sem' | 'mes'>('mes');
  const [isAlertasOpen, setIsAlertasOpen] = useState(false);

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

  // Calculate Total Gastado based on selected period (dia, sem, mes)
  const getSpentForPeriod = (p: 'dia' | 'sem' | 'mes') => {
    const todayKey = getLocalDateKey(new Date());
    const now = new Date();
    return confirmedSales.concat([]).reduce((sum, s) => {
      if (!s.fecha) return sum;
      const sKey = getLocalDateKey(s.fecha);
      if (p === 'dia') {
        return sKey === todayKey ? sum + s.costoUnidadesVendidasMXN : sum;
      } else if (p === 'sem') {
        const d = new Date(s.fecha);
        const diffDays = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
        return diffDays >= 0 && diffDays <= 7 ? sum + s.costoUnidadesVendidasMXN : sum;
      } else {
        const d = new Date(s.fecha);
        const isSameMonth = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        return isSameMonth ? sum + s.costoUnidadesVendidasMXN : sum;
      }
    }, 0) + operatingExpenses.reduce((sum, e) => {
      if (!e.fecha) return sum;
      const eKey = getLocalDateKey(e.fecha);
      if (p === 'dia') {
        return eKey === todayKey ? sum + e.montoMXN : sum;
      } else if (p === 'sem') {
        const d = new Date(e.fecha);
        const diffDays = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
        return diffDays >= 0 && diffDays <= 7 ? sum + e.montoMXN : sum;
      } else {
        const d = new Date(e.fecha);
        const isSameMonth = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        return isSameMonth ? sum + e.montoMXN : sum;
      }
    }, 0);
  };

  const totalSpentVal = getSpentForPeriod(spentPeriod);

  // Generate chart data points for Main Profit Card
  const getProfitChartData = (): ChartDataPoint[] => {
    const now = new Date();
    if (profitChartPeriod === 'dia') {
      // Últimos 30 días: índice 0 = HOY (izquierda), índice 29 = más antiguo (derecha)
      return Array.from({ length: 30 }).map((_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 12, 0, 0);
        const dayLetter = d.toLocaleDateString('es-ES', { weekday: 'narrow' }).toUpperCase();
        const dayNum = String(d.getDate()).padStart(2, '0');
        const monthNum = String(d.getMonth() + 1).padStart(2, '0');
        const isToday = i === 0;
        const label = isToday ? `Hoy (${dayNum}/${monthNum})` : `${dayLetter} ${dayNum}/${monthNum}`;
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

        const gastos = cogs + exp;
        return { label, ingresos: rev, gastos, gananciaReal: rev - gastos };
      });
    } else if (profitChartPeriod === 'sem') {
      return Array.from({ length: 4 }).map((_, i) => {
        const label = `S${i + 1}`;
        const endDay = new Date();
        endDay.setDate(now.getDate() - (3 - i) * 7);
        const startDay = new Date(endDay);
        startDay.setDate(endDay.getDate() - 6);

        const rev = confirmedSales
          .filter((s) => s.fecha && new Date(s.fecha) >= startDay && new Date(s.fecha) <= endDay)
          .reduce((sum, s) => sum + s.ingresoTotalMXN, 0);
        const cogs = confirmedSales
          .filter((s) => s.fecha && new Date(s.fecha) >= startDay && new Date(s.fecha) <= endDay)
          .reduce((sum, s) => sum + s.costoUnidadesVendidasMXN, 0);
        const exp = operatingExpenses
          .filter((e) => e.fecha && new Date(e.fecha) >= startDay && new Date(e.fecha) <= endDay)
          .reduce((sum, e) => sum + e.montoMXN, 0);

        const gastos = cogs + exp;
        return { label, ingresos: rev, gastos, gananciaReal: rev - gastos };
      });
    } else {
      return Array.from({ length: 6 }).map((_, i) => {
        const d = new Date();
        d.setMonth(now.getMonth() - (5 - i));
        const label = d.toLocaleDateString('es-ES', { month: 'short' });
        const year = d.getFullYear();
        const month = d.getMonth();

        const rev = confirmedSales
          .filter((s) => s.fecha && new Date(s.fecha).getFullYear() === year && new Date(s.fecha).getMonth() === month)
          .reduce((sum, s) => sum + s.ingresoTotalMXN, 0);
        const cogs = confirmedSales
          .filter((s) => s.fecha && new Date(s.fecha).getFullYear() === year && new Date(s.fecha).getMonth() === month)
          .reduce((sum, s) => sum + s.costoUnidadesVendidasMXN, 0);
        const exp = operatingExpenses
          .filter((e) => e.fecha && new Date(e.fecha).getFullYear() === year && new Date(e.fecha).getMonth() === month)
          .reduce((sum, e) => sum + e.montoMXN, 0);

        const gastos = cogs + exp;
        return { label, ingresos: rev, gastos, gananciaReal: rev - gastos };
      });
    }
  };

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
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - i), 12, 0, 0);
    const dayAbbr = d.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '');
    const dayCap = dayAbbr.charAt(0).toUpperCase() + dayAbbr.slice(1);
    const dayNum = String(d.getDate()).padStart(2, '0');
    const monthNum = String(d.getMonth() + 1).padStart(2, '0');
    const isToday = i === 6;
    const dayName = isToday ? `Hoy (${dayNum}/${monthNum})` : `${dayCap} ${dayNum}/${monthNum}`;
    const dateStr = getLocalDateKey(d);

    const daySalesTotal = confirmedSales.reduce((sum, s) => {
      const saleDateStr = getLocalDateKey(s.fecha);
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
    <div className="flex flex-col w-full px-4 gap-6 pt-2 pb-8">
      {/* Ribbon Tape Banner ("Modo Cinta") */}
      <div
        onClick={() => setIsCalendarioOpen(true)}
        className="w-full bg-gradient-to-r from-primary/15 via-surface-container-high to-primary/15 border border-primary/40 py-2.5 px-3.5 rounded-xl shadow-md flex items-center justify-between cursor-pointer hover:border-primary/70 hover:shadow-lg transition-all group relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-12 h-12 bg-primary/5 rounded-full blur-xl pointer-events-none"></div>

        <div className="flex items-center gap-2.5 z-10">
          <div className="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center font-bold shadow-sm group-hover:scale-105 transition-transform flex-shrink-0">
            <span className="material-symbols-outlined text-lg">calendar_month</span>
          </div>
          <div>
            <div className="text-sm font-bold text-on-surface capitalize">
              {new Date().toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[10px] font-extrabold text-primary bg-primary/10 border border-primary/30 px-2.5 py-1 rounded-full group-hover:bg-primary group-hover:text-on-primary transition-all z-10 flex-shrink-0">
          <span>🗓️ Calendario</span>
          <span className="material-symbols-outlined text-[12px]">chevron_right</span>
        </div>
      </div>

      {/* KPIs Section */}
      <section className="grid grid-cols-2 gap-3">
        {/* Ganancia Total (Main Interactive KPI Card) */}
        <div
          onClick={() => setShowProfitChart(!showProfitChart)}
          className="col-span-2 bg-surface-container rounded-xl p-4 border border-outline-variant flex flex-col gap-2 relative overflow-hidden group shadow-sm cursor-pointer hover:border-primary/50 transition-all"
        >
          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px] text-primary">
                payments
              </span>
              <span className="text-xs font-medium uppercase tracking-wider">
                Ganancia Total de Ventas
              </span>
            </div>
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">
                {showProfitChart ? 'tag' : 'show_chart'}
              </span>
              {showProfitChart ? 'Ver Número' : 'Ver Gráfica'}
            </span>
          </div>

          {!showProfitChart ? (
            <div>
              <div className="text-3xl font-headline font-bold text-on-surface z-10 flex items-baseline gap-1">
                {formatMoney(totalProfit, displayCurrency, exchangeRate)}
              </div>

              {/* Mini text Ingresado y Gastado */}
              <div className="flex items-center gap-3 text-[11px] font-bold mt-2 pt-1.5 border-t border-outline-variant/30 z-10">
                <span className="text-violet-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                  Ingresado: {formatMoney(totalSalesRevenue, displayCurrency, exchangeRate)}
                </span>
                <span className="text-rose-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                  Gastado: {formatMoney(confirmedSales.reduce((a, s) => a + s.costoUnidadesVendidasMXN, 0) + operatingExpenses.reduce((a, e) => a + e.montoMXN, 0), displayCurrency, exchangeRate)}
                </span>
              </div>

              <p className="text-[10px] text-on-surface-variant mt-1.5 flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px] text-tertiary">touch_app</span>
                Toca aquí para transformar esta tarjeta en mini gráfica interactiva
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 pt-1 z-10" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase">
                  Mini Gráfica ({chartType})
                </span>
                {/* Interval selector for mini chart */}
                <div className="flex bg-surface-container-high rounded-lg p-0.5 border border-outline-variant text-[10px]">
                  <button
                    onClick={() => setProfitChartPeriod('dia')}
                    className={`px-2 py-0.5 font-bold rounded ${profitChartPeriod === 'dia' ? 'bg-primary text-on-primary' : 'text-on-surface-variant'}`}
                  >
                    Día
                  </button>
                  <button
                    onClick={() => setProfitChartPeriod('sem')}
                    className={`px-2 py-0.5 font-bold rounded ${profitChartPeriod === 'sem' ? 'bg-primary text-on-primary' : 'text-on-surface-variant'}`}
                  >
                    Semana
                  </button>
                  <button
                    onClick={() => setProfitChartPeriod('mes')}
                    className={`px-2 py-0.5 font-bold rounded ${profitChartPeriod === 'mes' ? 'bg-primary text-on-primary' : 'text-on-surface-variant'}`}
                  >
                    Mes
                  </button>
                </div>
              </div>

              <ChartRenderer
                data={getProfitChartData()}
                chartType={chartType}
                displayCurrency={displayCurrency}
                exchangeRate={exchangeRate}
                height={140}
                showLegend={true}
                selectedIndex={profitSelectedIndex}
                onSelectPoint={(idx) => setProfitSelectedIndex(idx)}
                scrollableDays={profitChartPeriod === 'dia' && chartType === 'barras'}
              />

              <button
                onClick={() => setShowProfitChart(false)}
                className="text-[10px] text-primary font-bold hover:underline self-center pt-1"
              >
                ▲ Volver a vista numérica
              </button>
            </div>
          )}
        </div>

        {/* Ventas Registradas (Opens Sales History on Vender tab) */}
        <div
          onClick={() => onNavigateTab('vender')}
          className="bg-surface-container rounded-xl p-4 border border-outline-variant flex flex-col justify-between relative group cursor-pointer hover:border-tertiary/50 transition-all shadow-sm"
        >
          <div>
            <div className="flex items-center justify-between mb-1 z-10">
              <div className="flex items-center gap-1.5 text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px] text-tertiary">shopping_cart</span>
                <span className="text-[10px] font-medium uppercase tracking-wider">
                  Ventas Registradas
                </span>
              </div>
              <span className="material-symbols-outlined text-xs text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">
                open_in_new
              </span>
            </div>
            <div className="text-xl font-headline font-bold text-on-surface z-10 mt-1">
              {totalSalesCountMonth} <span className="text-xs font-normal text-on-surface-variant">ventas</span>
            </div>
          </div>
          <div className="mt-2 text-[10px] text-tertiary font-bold flex items-center gap-1">
            <span>Historial de Ventas</span>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
          </div>
        </div>

        {/* Valor Inventario (Interactive: Toggles mini inventory list) */}
        <div
          onClick={() => setShowMiniInventory(!showMiniInventory)}
          className="bg-surface-container rounded-xl p-4 border border-outline-variant flex flex-col justify-between relative group cursor-pointer hover:border-primary/50 transition-all shadow-sm"
        >
          <div>
            <div className="flex items-center justify-between mb-1 z-10">
              <div className="flex items-center gap-1.5 text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px] text-primary">inventory_2</span>
                <span className="text-[10px] font-medium uppercase tracking-wider">
                  Valor Inventario
                </span>
              </div>
              <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                {showMiniInventory ? 'Valor' : 'Mini List'}
              </span>
            </div>

            {!showMiniInventory ? (
              <div className="text-xl font-headline font-bold text-on-surface z-10 mt-1">
                {formatMoney(totalInventoryValueMXN, displayCurrency, exchangeRate)}
              </div>
            ) : (
              <div className="mt-1 space-y-1.5 z-10 max-h-28 overflow-y-auto pr-1">
                {products.length === 0 ? (
                  <p className="text-[10px] text-on-surface-variant">Sin productos</p>
                ) : (
                  products.slice(0, 4).map((p) => {
                    const st = getProductTotalStock(p.id, batches);
                    return (
                      <div key={p.id} className="flex justify-between items-center text-[10px] border-b border-outline-variant/20 pb-1">
                        <span className="truncate font-medium text-on-surface max-w-[80px]">{p.nombre}</span>
                        <span className={`font-bold ${st <= p.stockMinimo ? 'text-amber-400' : 'text-primary'}`}>{st} u.</span>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
          <div className="mt-2 text-[10px] text-on-surface-variant font-medium flex justify-between items-center">
            <span>{showMiniInventory ? '▲ Volver a Total' : 'Toca para Mini Lista'}</span>
            <span className="material-symbols-outlined text-[12px]">list_alt</span>
          </div>
        </div>

        {/* Nuevo Panel: Total Gastado (Día / Semana / Mes) */}
        <div className="col-span-2 bg-surface-container rounded-xl p-4 border border-outline-variant flex flex-col gap-2 relative shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px] text-rose-500">
                account_balance_wallet
              </span>
              <span className="text-xs font-headline font-bold uppercase tracking-wider text-on-surface">
                Total Gastado
              </span>
            </div>

            {/* Selector Día, Semana, Mes */}
            <div className="flex bg-surface-container-high rounded-lg p-0.5 border border-outline-variant text-[10px]">
              <button
                onClick={() => setSpentPeriod('dia')}
                className={`px-2 py-0.5 font-bold rounded transition-all ${spentPeriod === 'dia' ? 'bg-rose-500 text-white' : 'text-on-surface-variant'}`}
              >
                Día
              </button>
              <button
                onClick={() => setSpentPeriod('sem')}
                className={`px-2 py-0.5 font-bold rounded transition-all ${spentPeriod === 'sem' ? 'bg-rose-500 text-white' : 'text-on-surface-variant'}`}
              >
                Semana
              </button>
              <button
                onClick={() => setSpentPeriod('mes')}
                className={`px-2 py-0.5 font-bold rounded transition-all ${spentPeriod === 'mes' ? 'bg-rose-500 text-white' : 'text-on-surface-variant'}`}
              >
                Mes
              </button>
            </div>
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <div className="text-2xl font-headline font-bold text-rose-400">
              {formatMoney(totalSpentVal, displayCurrency, exchangeRate)}
            </div>
            <span className="text-[10px] text-on-surface-variant">
              (Costo mercancía vendida + Gastos op. de {spentPeriod === 'dia' ? 'hoy' : spentPeriod === 'sem' ? 'la semana' : 'este mes'})
            </span>
          </div>
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

      {/* Alertas de Stock Dropdown */}
      <section className="flex flex-col gap-2">
        <div
          onClick={() => setIsAlertasOpen(!isAlertasOpen)}
          className="w-full bg-surface-container border border-outline-variant hover:border-primary/50 rounded-xl p-3 flex items-center justify-between cursor-pointer transition-all shadow-sm group"
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <span className="material-symbols-outlined text-base">warning</span>
            </div>
            <span className="text-xs font-bold text-on-surface">
              Alertas de Stock ({outOfStockProducts.length + lowStockProducts.length})
            </span>
            {(outOfStockProducts.length > 0 || lowStockProducts.length > 0) && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-error/15 text-error border border-error/30">
                {outOfStockProducts.length > 0 ? `${outOfStockProducts.length} Agotado(s)` : `${lowStockProducts.length} Stock Bajo`}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNavigateTab('inventario');
              }}
              className="text-[10px] font-bold text-primary hover:underline"
            >
              Ver en Inventario
            </button>
            <span className="material-symbols-outlined text-on-surface-variant text-lg group-hover:text-primary transition-colors">
              {isAlertasOpen ? 'expand_less' : 'expand_more'}
            </span>
          </div>
        </div>

        {isAlertasOpen && (
          <div className="flex flex-col gap-2 pt-1 animate-fade-in">
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
        )}
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

      {/* Monthly Financial Calendar Modal */}
      <CalendarioMesModal
        isOpen={isCalendarioOpen}
        onClose={() => setIsCalendarioOpen(false)}
      />
    </div>
  );
};
