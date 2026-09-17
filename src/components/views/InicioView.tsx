import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  formatMoney,
  getProductTotalStock,
  getLocalDateKey,
  getProductUnitLabel,
} from '../../utils/calculations';
import { ChartRenderer, ChartDataPoint } from '../ChartRenderer';
import { CalendarioMesModal } from '../modals/CalendarioMesModal';
// Componentes compartidos de mostrador (también usados por Reportes/Gráficas)
import { Rankings } from '../graficas/Rankings';
import { MargenPromedio } from '../graficas/MargenPromedio';
import { GastosCategoria } from '../graficas/GastosCategoria';

interface InicioViewProps {
  // Solo pestañas reales: inventario o más
  onNavigateTab: (tab: 'inventario' | 'mas') => void;
  // Abre el modal de venta global
  onOpenVenta: () => void;
  // Abre el historial de ventas (modal global)
  onOpenHistorialVentas: () => void;
  onOpenCompra: (productId?: string) => void;
  onOpenGasto: () => void;
  onSelectProduct: (productId: string) => void;
}

// Periodo visible en las cards KPI: mes, semana o día
type KpiMode = 'mes' | 'semana' | 'dia';

// Cicla el periodo: mes → semana → día → mes
const nextKpiMode = (m: KpiMode): KpiMode =>
  m === 'mes' ? 'semana' : m === 'semana' ? 'dia' : 'mes';

export const InicioView: React.FC<InicioViewProps> = ({
  onNavigateTab,
  onOpenVenta,
  onOpenHistorialVentas,
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
  const [showMore, setShowMore] = useState(false);

  // Calculate KPIs
  const confirmedSales = sales.filter((s) => s.estado === 'confirmada');

  // ¿La fecha pertenece al mes actual? (compara el prefijo YYYY-MM de la clave local)
  const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const isThisMonth = (fecha?: string | Date) =>
    !!fecha && getLocalDateKey(fecha).startsWith(currentMonthKey);

  // ¿La fecha está en los últimos 7 días (hoy inclusive)?
  const isThisWeek = (fecha: string | Date): boolean => {
    const d = new Date(fecha);
    const diff = (Date.now() - d.getTime()) / 86400000;
    return diff >= 0 && diff < 7;
  };

  // KPIs del MES actual (ventas y gastos del mes en curso)
  const monthSales = confirmedSales.filter((s) => s.fecha && isThisMonth(s.fecha));
  const monthIngresado = monthSales.reduce((acc, s) => acc + s.ingresoTotalMXN, 0);
  const monthCostoMercancia = monthSales.reduce((acc, s) => acc + s.costoUnidadesVendidasMXN, 0);
  const monthGastosOp = operatingExpenses
    .filter((e) => e.fecha && isThisMonth(e.fecha))
    .reduce((acc, e) => acc + e.montoMXN, 0);
  const monthGastado = monthCostoMercancia + monthGastosOp;
  const monthGanancia = monthIngresado - monthGastado;

  // KPIs del DIA actual (ventas y gastos confirmados de hoy)
  const todayKey = getLocalDateKey(new Date());
  const todaySales = confirmedSales.filter((s) => s.fecha && getLocalDateKey(s.fecha) === todayKey);
  const todayExpenses = operatingExpenses.filter((e) => e.fecha && getLocalDateKey(e.fecha) === todayKey);
  const dayIngresado = todaySales.reduce((acc, s) => acc + s.ingresoTotalMXN, 0);
  const dayCogs = todaySales.reduce((acc, s) => acc + s.costoUnidadesVendidasMXN, 0);
  const dayOpExp = todayExpenses.reduce((acc, e) => acc + e.montoMXN, 0);
  const dayGastado = dayCogs + dayOpExp;
  const dayGanancia = dayIngresado - dayGastado;

  // KPIs de la SEMANA actual (últimos 7 días, hoy inclusive)
  const weekSales = confirmedSales.filter((s) => s.fecha && isThisWeek(s.fecha));
  const weekExpenses = operatingExpenses.filter((e) => e.fecha && isThisWeek(e.fecha));
  const weekIngresado = weekSales.reduce((acc, s) => acc + s.ingresoTotalMXN, 0);
  const weekCogs = weekSales.reduce((acc, s) => acc + s.costoUnidadesVendidasMXN, 0);
  const weekOpExp = weekExpenses.reduce((acc, e) => acc + e.montoMXN, 0);
  const weekGastado = weekCogs + weekOpExp;
  const weekGanancia = weekIngresado - weekGastado;
  const weekSalesCount = weekSales.length;

  // Modo de las cards KPI: 'mes' | 'semana' | 'dia'. El toque fija el último modo elegido.
  const [kpiMode, setKpiMode] = useState<KpiMode>('mes');
  const lastTouchMs = useRef(Date.now());

  const toggleKpiMode = () => {
    lastTouchMs.current = Date.now();
    setKpiMode((m) => nextKpiMode(m));
  };

  // Rota mes → semana → día cada 7 s si el usuario no ha tocado en los últimos 10 s
  useEffect(() => {
    const id = setInterval(() => {
      if (Date.now() - lastTouchMs.current > 10000) {
        setKpiMode((m) => nextKpiMode(m));
      }
    }, 7000);
    return () => clearInterval(id);
  }, []);

  // Modo resuelto: números y contador de ventas según la vista elegida
  const kpiIngresado =
    kpiMode === 'mes' ? monthIngresado : kpiMode === 'semana' ? weekIngresado : dayIngresado;
  const kpiGastado =
    kpiMode === 'mes' ? monthGastado : kpiMode === 'semana' ? weekGastado : dayGastado;
  const kpiGanancia =
    kpiMode === 'mes' ? monthGanancia : kpiMode === 'semana' ? weekGanancia : dayGanancia;
  const kpiSalesCount =
    kpiMode === 'mes' ? monthSales.length : kpiMode === 'semana' ? weekSalesCount : todaySales.length;
  const kpiSalesLabel =
    kpiMode === 'mes' ? 'ventas' : kpiMode === 'semana' ? 'ventas esta semana' : 'ventas hoy';

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

  // Generate chart data points for Profit Card (histórico)
  const getProfitChartData = (): ChartDataPoint[] => {
    const now = new Date();
    if (profitChartPeriod === 'dia') {
      // Últimos 30 días: índice 29 = HOY (derecha), índice 0 = más antiguo (izquierda)
      return Array.from({ length: 30 }).map((_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (29 - i), 12, 0, 0);
        const dayLetter = d.toLocaleDateString('es-ES', { weekday: 'narrow' }).toUpperCase();
        const dayNum = String(d.getDate()).padStart(2, '0');
        const monthNum = String(d.getMonth() + 1).padStart(2, '0');
        const isToday = i === 29;
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

  // Métricas de ventas por producto (histórico) para Rankings compartido
  const productStatsMap = new Map<string, { qty: number; revenue: number; profit: number }>();
  confirmedSales.forEach((s) => {
    const existing = productStatsMap.get(s.productoId) || { qty: 0, revenue: 0, profit: 0 };
    productStatsMap.set(s.productoId, {
      qty: existing.qty + s.cantidad,
      revenue: existing.revenue + s.ingresoTotalMXN,
      profit: existing.profit + s.gananciaVentaMXN,
    });
  });

  // Ranking compartido: top 5 Más Vendidos (por unidades) y Más Rentables (por ganancia)
  const masVendidos = [...products]
    .map((p) => ({ product: p, ...(productStatsMap.get(p.id) || { qty: 0, revenue: 0, profit: 0 }) }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  const masRentables = [...products]
    .map((p) => ({ product: p, ...(productStatsMap.get(p.id) || { qty: 0, revenue: 0, profit: 0 }) }))
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 5);

  // Margen promedio % sobre ventas confirmadas (misma fórmula que Reportes/Gráficas)
  const rankingRevenueMXN = confirmedSales.reduce((acc, s) => acc + s.ingresoTotalMXN, 0);
  const rankingProfitMXN = confirmedSales.reduce((acc, s) => acc + s.gananciaVentaMXN, 0);
  const averageMarginPct =
    rankingRevenueMXN > 0 ? (rankingProfitMXN / rankingRevenueMXN) * 100 : 0;

  // Gastos operativos del MES actual agrupados por categoría
  const monthOpExpenses = operatingExpenses.filter((e) => e.fecha && isThisMonth(e.fecha));
  const totalOpExpensesMXN = monthOpExpenses.reduce((acc, e) => acc + e.montoMXN, 0);
  const expenseCatMap = new Map<string, number>();
  monthOpExpenses.forEach((e) => {
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

  return (
    <div className="flex flex-col w-full px-4 gap-6 pt-2 pb-8">
      {/* 1. KPIs del MES actual: Ingresado, Gastado y Ganancia del mes en curso */}
      <section className="flex flex-col gap-3">
        {/* Encabezado KPIs: selector de periodo (MES/SEM/DÍA) + chip de calendario */}
        <div className="flex items-center justify-between gap-2">
          {/* Segmented control: cambia el periodo visible de las cards KPI */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                lastTouchMs.current = Date.now();
                setKpiMode('mes');
              }}
              className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full transition-colors ${kpiMode === 'mes' ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface border border-outline-variant'}`}
            >
              MES
            </button>
            <button
              type="button"
              onClick={() => {
                lastTouchMs.current = Date.now();
                setKpiMode('semana');
              }}
              className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full transition-colors ${kpiMode === 'semana' ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface border border-outline-variant'}`}
            >
              SEM
            </button>
            <button
              type="button"
              onClick={() => {
                lastTouchMs.current = Date.now();
                setKpiMode('dia');
              }}
              className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full transition-colors ${kpiMode === 'dia' ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface border border-outline-variant'}`}
            >
              DÍA
            </button>
          </div>

          {/* Chip Calendario: abre el calendario del mes */}
          <button
            type="button"
            onClick={() => setIsCalendarioOpen(true)}
            className="text-[9px] font-bold text-primary bg-primary/10 border border-primary/30 px-2 py-1 rounded-full transition-colors hover:bg-primary hover:text-on-primary flex items-center gap-0.5 flex-shrink-0"
          >
            <span className="material-symbols-outlined text-[11px]">calendar_month</span>
            Calendario
          </button>
        </div>

        {/* 3 KPI boxes (al tocarlas ciclan mes → semana → día) */}
        <div
          onClick={toggleKpiMode}
          className="grid grid-cols-3 gap-2 cursor-pointer select-none"
        >
          {/* Ingresado */}
          <div className="bg-surface-container-high/60 border border-violet-500/30 rounded-xl p-2 flex flex-col">
            <span className="text-[9px] font-bold text-violet-400 uppercase tracking-wider">
              Ingresado
            </span>
            <AnimatedNumber
              value={kpiIngresado}
              format={(v) => formatMoney(v, displayCurrency, exchangeRate)}
              className="text-sm sm:text-base font-headline font-bold text-on-surface truncate"
            />
            <span className="text-[9px] text-on-surface-variant mt-0.5">
              {kpiSalesCount} {kpiSalesLabel}
            </span>
          </div>

          {/* Gastado */}
          <div className="bg-surface-container-high/60 border border-rose-500/30 rounded-xl p-2 flex flex-col">
            <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider">
              Gastado
            </span>
            <AnimatedNumber
              value={kpiGastado}
              format={(v) => formatMoney(v, displayCurrency, exchangeRate)}
              className="text-sm sm:text-base font-headline font-bold text-rose-300 truncate"
            />
          </div>

          {/* Ganancia */}
          <div className="bg-surface-container-high/60 border border-emerald-500/30 rounded-xl p-2 flex flex-col">
            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">
              Ganancia
            </span>
            <AnimatedNumber
              value={kpiGanancia}
              format={(v) => formatMoney(v, displayCurrency, exchangeRate)}
              className={`text-sm sm:text-base font-headline font-bold truncate ${kpiGanancia >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
            />
          </div>
        </div>

        {/* Ayuda sutil: tocar las cards cambia la vista */}
        <p className="text-[9px] text-on-surface-variant flex items-center gap-1">
          <span className="material-symbols-outlined text-[11px] text-tertiary">touch_app</span>
          Toca las cards para cambiar la vista
        </p>
      </section>

      {/* 2. Acciones: Vender GIGANTE + Compra y Gasto secundarias */}
      <section className="flex flex-col gap-2">
        {/* Botón Vender destacado a todo el ancho: abre el modal de venta global */}
        <button
          onClick={() => onOpenVenta()}
          className="w-full bg-primary hover:bg-primary/90 text-on-primary rounded-2xl py-6 px-4 flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-primary/30 col-span-3"
        >
          <span
            className="material-symbols-outlined text-[30px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            add_circle
          </span>
          <span className="text-xl font-headline font-bold">Vender</span>
        </button>

        {/* Compra y Gasto en fila discreta */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onOpenCompra}
            className="bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface rounded-xl p-3 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[22px] text-primary">
              local_mall
            </span>
            <span className="text-[11px] font-medium">Compra</span>
          </button>
          <button
            onClick={onOpenGasto}
            className="bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface rounded-xl p-3 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[22px] text-error">
              receipt_long
            </span>
            <span className="text-[11px] font-medium">Gasto</span>
          </button>
        </div>
      </section>

      {/* 3. Alertas de Stock (acordeón con contador) */}
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
                        onOpenCompra(p.id);
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
                          onOpenCompra(p.id);
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

      {/* 4. Rankings compartidos: Más Vendidos vs Más Rentables (top 5) */}
      <section className="flex flex-col gap-3">
        <Rankings
          masVendidos={masVendidos}
          masRentables={masRentables}
          formatMoney={(v) => formatMoney(v, displayCurrency, exchangeRate)}
        />
      </section>

      {/* 5. "Ver más": consultas de baja frecuencia en acordeón */}
      <section className="flex flex-col gap-2">
        <div
          onClick={() => setShowMore(!showMore)}
          className="w-full bg-surface-container border border-outline-variant hover:border-primary/50 rounded-xl p-3 flex items-center justify-between cursor-pointer transition-all shadow-sm group"
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-base">apps</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-on-surface">Ver más</span>
              <span className="text-[9px] text-on-surface-variant">
                Datos del día y análisis
              </span>
            </div>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant text-lg group-hover:text-primary transition-colors">
            {showMore ? 'expand_less' : 'expand_more'}
          </span>
        </div>

        {showMore && (
          <div className="flex flex-col gap-4 pt-1 animate-fade-in">
            {/* Cinta Calendario (antes iba hasta arriba) */}
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

            {/* Ganancia del Mes (número ⇄ mini gráfica) */}
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
                    Ganancia del Mes
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
                    {formatMoney(monthGanancia, displayCurrency, exchangeRate)}
                  </div>

                  {/* Mini text Ingresado y Gastado */}
                  <div className="flex items-center gap-3 text-[11px] font-bold mt-2 pt-1.5 border-t border-outline-variant/30 z-10">
                    <span className="text-violet-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                      Ingresado: {formatMoney(monthIngresado, displayCurrency, exchangeRate)}
                    </span>
                    <span className="text-rose-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                      Gastado: {formatMoney(monthGastado, displayCurrency, exchangeRate)}
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

            {/* Ventas Registradas + Valor Inventario en par */}
            <div className="grid grid-cols-2 gap-3">
              {/* Ventas Registradas: abre el historial de ventas (modal global) */}
              <div
                onClick={onOpenHistorialVentas}
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
                    {monthSales.length} <span className="text-xs font-normal text-on-surface-variant">ventas este mes</span>
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
                              <span className={`font-bold ${st <= p.stockMinimo ? 'text-amber-400' : 'text-primary'}`}>{st} {getProductUnitLabel(p, settings)}</span>
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
            </div>

            {/* Total Gastado (Día / Semana / Mes) */}
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

            {/* Margen Promedio % (mostrador compacto) */}
            <MargenPromedio promedioPorcentaje={averageMarginPct} />

            {/* Gastos operativos del mes por categoría (mostrador compacto) */}
            <GastosCategoria
              categorias={expenseCategoryList}
              totalGastos={totalOpExpensesMXN}
              formatMoney={(v) => formatMoney(v, displayCurrency, exchangeRate)}
            />
          </div>
        )}
      </section>

      {/* Monthly Financial Calendar Modal */}
      <CalendarioMesModal
        isOpen={isCalendarioOpen}
        onClose={() => setIsCalendarioOpen(false)}
      />
    </div>
  );
};

// Anima el número hacia su objetivo con suavidad
interface AnimatedNumberProps {
  value: number;
  format: (v: number) => string;
  className?: string;
}

const AnimatedNumber: React.FC<AnimatedNumberProps> = ({ value, format, className }) => {
  const [display, setDisplay] = useState(value);
  const displayRef = useRef(value);

  useEffect(() => {
    const prev = displayRef.current;
    if (prev === value) return;
    const duration = 700;
    let start: number | null = null;
    let rafId: number;

    const step = (ts: number) => {
      if (start === null) start = ts;
      const t = Math.min((ts - start) / duration, 1);
      const e = t < 1 ? t * t * (3 - 2 * t) : 1;
      const next = prev + (value - prev) * e;
      displayRef.current = next;
      setDisplay(next);
      if (t < 1) {
        rafId = requestAnimationFrame(step);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [value]);

  return <span className={className}>{format(display)}</span>;
};
