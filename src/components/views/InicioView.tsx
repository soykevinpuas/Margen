import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ImagenZoom } from '../ImagenZoom';
import {
  formatMoney,
  getProductBadges,
  getPeriodTotals,
  getLocalDateKey,
  METRIC_PERIOD_LABEL,
  MetricPeriod,
} from '../../utils/calculations';
import { ChartRenderer, ChartDataPoint } from '../ChartRenderer';
import { CalendarioMesModal } from '../modals/CalendarioMesModal';
import { EditRecordHandler } from '../modals/EditarRegistroModal';

interface InicioViewProps {
  onNavigateTab: (tab: 'inicio' | 'inventario' | 'mas') => void;
  /** Abre el overlay de Venta (opcionalmente con un producto preseleccionado) */
  onOpenVender: (productId?: string | null) => void;
  /**
   * @deprecated La vista de Gráficas ahora se abre desde la tab "Más".
   * Se mantiene opcional por compatibilidad con App.tsx.
   */
  onOpenGraficas?: () => void;
  onOpenCompra: (productId?: string | null) => void;
  onOpenGasto: () => void;
  onSelectProduct: (productId: string) => void;
  /** Abre el modal EditarRegistroModal desde el calendario mensual */
  onEdit: EditRecordHandler;
}

/** Orden de rotación automática de las temporalidades del dashboard */
const PERIOD_SEQUENCE: MetricPeriod[] = ['mes', 'sem', 'dia'];

/** Descripción corta del rango activo (se muestra bajo los KPIs) */
const PERIOD_HINT: Record<MetricPeriod, string> = {
  mes: 'Este mes',
  sem: 'Últimos 7 días',
  dia: 'Hoy',
};

/** Cadencia de rotación automática (ms) */
const CYCLE_MS = 5000;

/**
 * Animación de conteo (count-up) para cifras monetarias.
 * Arranca desde el último valor mostrado, por lo que se puede interrumpir
 * a mitad de camino si la temporalidad cambia de nuevo.
 */
const useCountUp = (target: number, duration = 650): number => {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);

  useEffect(() => {
    const from = fromRef.current;
    if (Math.abs(from - target) < 0.005) {
      fromRef.current = target;
      setValue(target);
      return;
    }

    let frame = 0;
    const startedAt = performance.now();
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const current = from + (target - from) * easeOut(progress);
      fromRef.current = current;
      setValue(current);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
        setValue(target);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
};

export const InicioView: React.FC<InicioViewProps> = ({
  onNavigateTab,
  onOpenVender,
  onOpenCompra,
  onOpenGasto,
  onSelectProduct,
  onEdit,
}) => {
  const { settings, products, categories, batches, sales, operatingExpenses } = useApp();
  const { displayCurrency, exchangeRate, chartType = 'barras' } = settings;

  // Modals & Interactive States
  const [isCalendarioOpen, setIsCalendarioOpen] = useState(false);

  // Toggle: card "Resumen financiero" <-> gráfica (en la misma posición)
  const [showChart, setShowChart] = useState(false);
  const [chartSelectedIndex, setChartSelectedIndex] = useState<number | null>(null);

  // Top Ventas: lista detallada <-> gráfica de barras
  const [topView, setTopView] = useState<'lista' | 'grafica'>('lista');

  // Temporalidad del dashboard KPI (rota automáticamente cada 5s)
  const [periodIndex, setPeriodIndex] = useState(0);
  // Reinicia el ciclo cuando el usuario elige una temporalidad manualmente
  const [cycleKey, setCycleKey] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setPeriodIndex((prev) => (prev + 1) % PERIOD_SEQUENCE.length);
    }, CYCLE_MS);
    return () => window.clearInterval(id);
  }, [cycleKey]);

  const activePeriod = PERIOD_SEQUENCE[periodIndex];

  const handleSelectPeriod = (idx: number) => {
    if (idx === periodIndex) {
      setCycleKey((k) => k + 1);
      return;
    }
    setPeriodIndex(idx);
    setCycleKey((k) => k + 1);
  };

  // ---- KPIs (3 métricas principales) ----
  const totals = getPeriodTotals(sales, operatingExpenses, activePeriod);
  const gastoAnimated = useCountUp(totals.gastoMXN);
  const gananciaAnimated = useCountUp(totals.gananciaMXN);
  const entradaAnimated = useCountUp(totals.ingresosMXN);
  const isNegativeProfit = totals.gananciaMXN < 0;

  const moneyTitle = (mxn: number) => formatMoney(mxn, displayCurrency, exchangeRate);

  // Total current inventory value (dato de apoyo en el footer del dashboard)
  const totalInventoryValueMXN = batches.reduce(
    (acc, b) => acc + b.cantidadDisponible * b.costoUnitarioRealMXN,
    0
  );

  const confirmedSales = sales.filter((s) => s.estado === 'confirmada');

  // ---- Gráfica inline (últimos 7 días) para el toggle del Resumen Financiero ----
  // Cálculo ligero: solo se ejecuta cuando la gráfica está visible.
  const chartPoints: ChartDataPoint[] = React.useMemo(() => {
    if (!showChart) return [];

    const now = new Date();
    const confirmed = sales.filter((s) => s.estado === 'confirmada');

    return Array.from({ length: 7 }).map((_, i) => {
      // Mediodía para evitar corrimiento de zona horaria al cruzar la medianoche
      const d = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - (6 - i),
        12,
        0,
        0
      );
      const dayAbbr = d.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '');
      const dayName = dayAbbr.charAt(0).toUpperCase() + dayAbbr.slice(1);
      const dayNum = String(d.getDate()).padStart(2, '0');
      const monthNum = String(d.getMonth() + 1).padStart(2, '0');
      const isToday = i === 6;
      const label = isToday
        ? `Hoy (${dayNum}/${monthNum})`
        : `${dayName} ${dayNum}/${monthNum}`;
      const dateStr = getLocalDateKey(d);

      const salesOfDay = confirmed.filter(
        (s) => s.fecha && getLocalDateKey(s.fecha) === dateStr
      );
      const rev = salesOfDay.reduce((sum, s) => sum + s.ingresoTotalMXN, 0);
      const cogs = salesOfDay.reduce(
        (sum, s) => sum + s.costoUnidadesVendidasMXN,
        0
      );
      const exp = operatingExpenses
        .filter((e) => e.fecha && getLocalDateKey(e.fecha) === dateStr)
        .reduce((sum, e) => sum + e.montoMXN, 0);

      const gastos = cogs + exp;

      return { label, ingresos: rev, gastos, gananciaReal: rev - gastos };
    });
  }, [showChart, sales, operatingExpenses]);

  // Top Ventas (histórico): unidades, ingresos y ganancia por producto
  const TOP_LIMIT = 5;
  const productStatsMap = new Map<
    string,
    { qty: number; revenueMXN: number; profitMXN: number }
  >();

  confirmedSales.forEach((s) => {
    const prev = productStatsMap.get(s.productoId) ?? {
      qty: 0,
      revenueMXN: 0,
      profitMXN: 0,
    };
    productStatsMap.set(s.productoId, {
      qty: prev.qty + s.cantidad,
      revenueMXN: prev.revenueMXN + s.ingresoTotalMXN,
      profitMXN: prev.profitMXN + s.gananciaVentaMXN,
    });
  });

  const topSellingProducts = [...products]
    .map((p) => {
      const stats = productStatsMap.get(p.id) ?? {
        qty: 0,
        revenueMXN: 0,
        profitMXN: 0,
      };
      return {
        product: p,
        qtySold: stats.qty,
        revenueMXN: stats.revenueMXN,
        profitMXN: stats.profitMXN,
      };
    })
    .filter((item) => item.qtySold > 0)
    .sort((a, b) => b.qtySold - a.qtySold || b.revenueMXN - a.revenueMXN)
    .slice(0, TOP_LIMIT);

  const topTotals = topSellingProducts.reduce(
    (acc, item) => ({
      qty: acc.qty + item.qtySold,
      revenueMXN: acc.revenueMXN + item.revenueMXN,
    }),
    { qty: 0, revenueMXN: 0 }
  );

  const topMaxQty = topSellingProducts[0]?.qtySold ?? 1;

  return (
    <div className="flex flex-col w-full px-4 gap-6 pt-2 pb-8">
      {/* ============ Banda de fecha (discreta) + DASHBOARD KPI (toggle con gráfica) ============ */}
      <div className="flex flex-col gap-2">
        {/* Banda/capsule de fecha ("Resumen del mes") -> abre el calendario financiero */}
        <div
          onClick={() => setIsCalendarioOpen(true)}
          className="w-full bg-surface-container-high/50 border border-outline-variant/60 rounded-lg px-3 py-1.5 flex items-center justify-between gap-2 cursor-pointer hover:border-primary/40 transition-colors group"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="material-symbols-outlined text-[13px] text-primary/80">
              calendar_month
            </span>
            <span className="text-[10px] font-semibold text-on-surface-variant truncate capitalize">
              {new Date().toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </span>
          </div>

          <div className="flex items-center gap-0.5 shrink-0 text-[9px] font-bold text-on-surface-variant group-hover:text-primary transition-colors">
            <span>Resumen del mes</span>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
          </div>
        </div>

        {/* Toggle entre la card Resumen Financiero y la gráfica */}
        {!showChart ? (
          <section
            key="resumen-visible"
            className="bg-surface-container rounded-xl border border-outline-variant shadow-sm overflow-hidden animate-fade-in cursor-pointer"
            onClick={() => setShowChart(true)}
          >
              {/* Header: título + chip de temporalidad activa */}
              <div className="flex items-center justify-between gap-2 px-3.5 pt-3 pb-2.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="material-symbols-outlined text-[15px] text-primary">
                    monitoring
                  </span>
                  <h1 className="text-[10px] font-extrabold uppercase tracking-wider text-on-surface-variant truncate">
                    Resumen financiero
                  </h1>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <div
                    className="flex items-center gap-0.5 bg-surface-container-high border border-outline-variant rounded-full p-0.5"
                    role="group"
                    aria-label="Temporalidad del resumen"
                  >
                    {PERIOD_SEQUENCE.map((p, idx) => (
                      <button
                        key={p}
                        type="button"
                        aria-pressed={idx === periodIndex}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectPeriod(idx);
                        }}
                        className={`px-2 py-[3px] rounded-full text-[10px] font-bold transition-all ${
                          idx === periodIndex
                            ? 'bg-primary text-on-primary shadow-sm'
                            : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        {METRIC_PERIOD_LABEL[p]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3 KPIs principales: Ingreso · Gasto · Ganancia */}
              <div className="grid grid-cols-3 divide-x divide-outline-variant/40">
                {/* INGRESO (entrada) */}
                <div className="flex flex-col gap-1 px-2.5 py-3">
                  <div className="flex items-center gap-1 text-violet-400">
                    <span className="material-symbols-outlined text-[13px]">south_east</span>
                    <span className="text-[9px] font-extrabold uppercase tracking-wider">
                      Ingreso
                    </span>
                  </div>
                  <span
                    className="font-headline font-extrabold text-[13px] leading-none text-violet-400 tabular-nums break-words leading-tight"
                    title={moneyTitle(totals.ingresosMXN)}
                  >
                    {formatMoney(entradaAnimated, displayCurrency, exchangeRate)}
                  </span>
                  <span
                    key={activePeriod}
                    className="text-[9px] leading-tight text-on-surface-variant animate-fade-in"
                  >
                    {totals.ventasCount} ventas
                  </span>
                </div>

                {/* GASTO */}
                <div className="flex flex-col gap-1 px-2.5 py-3">
                  <div className="flex items-center gap-1 text-rose-400">
                    <span className="material-symbols-outlined text-[13px]">
                      account_balance_wallet
                    </span>
                    <span className="text-[9px] font-extrabold uppercase tracking-wider">
                      Gasto
                    </span>
                  </div>
                  <span
                    className="font-headline font-extrabold text-[13px] leading-none text-rose-400 tabular-nums break-words leading-tight"
                    title={moneyTitle(totals.gastoMXN)}
                  >
                    {formatMoney(gastoAnimated, displayCurrency, exchangeRate)}
                  </span>
                  <span className="text-[9px] leading-tight text-on-surface-variant">
                    Costo + gastos
                  </span>
                </div>

                {/* GANANCIA (métrica destacada) */}
                <div className="flex flex-col gap-1 px-2.5 py-3 bg-primary/5">
                  <div
                    className={`flex items-center gap-1 ${
                      isNegativeProfit ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[13px]">payments</span>
                    <span className="text-[9px] font-extrabold uppercase tracking-wider">
                      Ganancia
                    </span>
                  </div>
                  <span
                    className={`font-headline font-extrabold text-[13px] leading-none tabular-nums break-words leading-tight ${
                      isNegativeProfit ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                    title={moneyTitle(totals.gananciaMXN)}
                  >
                    {formatMoney(gananciaAnimated, displayCurrency, exchangeRate)}
                  </span>
                  <span
                    key={activePeriod}
                    className="text-[9px] leading-tight text-on-surface-variant animate-fade-in"
                  >
                    Margen {totals.margenPct.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Footer: rango activo + valor de inventario */}
              <div className="flex items-center justify-between gap-2 px-3.5 py-2 border-t border-outline-variant/40 bg-background/40 text-[10px]">
                <span
                  key={activePeriod}
                  className="flex items-center gap-1 text-on-surface-variant animate-fade-in min-w-0 truncate"
                >
                  <span className="material-symbols-outlined text-[13px] text-primary">
                    date_range
                  </span>
                  <span className="truncate">
                    Mostrando:{' '}
                    <strong className="text-on-surface font-bold">
                      {PERIOD_HINT[activePeriod]}
                    </strong>
                  </span>
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigateTab('inventario');
                  }}
                  title="Ver valor del inventario"
                  className="flex items-center gap-1.5 shrink-0 text-left text-on-surface-variant hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px]">inventory_2</span>
                  <span className="flex flex-col leading-tight">
                    <span className="text-[11px] font-bold text-on-surface tabular-nums whitespace-nowrap">
                      {formatMoney(totalInventoryValueMXN, displayCurrency, exchangeRate)}
                    </span>
                    <span className="text-[8.5px] font-semibold uppercase tracking-wider text-on-surface-variant/80">
                      Valor de inventario
                    </span>
                  </span>
                </button>
              </div>
          </section>
        ) : (
          <section
            key="grafica-visible"
            onClick={() => setShowChart(false)}
            className="bg-surface-container rounded-xl border border-outline-variant shadow-sm overflow-hidden animate-fade-in cursor-pointer"
          >
            {/* Header en modo gráfica */}
            <div className="flex items-center justify-between gap-2 px-3.5 pt-3 pb-2.5 border-b border-outline-variant/40">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="material-symbols-outlined text-[15px] text-primary">
                  monitoring
                </span>
                <h1 className="text-[10px] font-extrabold uppercase tracking-wider text-on-surface-variant truncate">
                  Gráfica · últimos 7 días
                </h1>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowChart(false);
                }}
                className="flex items-center gap-0.5 shrink-0 text-[10px] font-bold text-primary hover:underline"
              >
                <span className="material-symbols-outlined text-[13px]">arrow_back</span>
                Resumen
              </button>
            </div>

            {/* Gráfica (ingresos vs gastos vs ganancia) */}
            <div className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
              <ChartRenderer
                data={chartPoints}
                chartType={chartType}
                displayCurrency={displayCurrency}
                exchangeRate={exchangeRate}
                height={180}
                showLegend={false}
                selectedIndex={chartSelectedIndex}
                onSelectPoint={(idx) => setChartSelectedIndex(idx)}
              />
            </div>

            <div className="px-3.5 pb-2.5 text-[9px] text-on-surface-variant/70">
              Toca una barra para ver sus números · toca fuera para regresar
            </div>
          </section>
        )}
      </div>

      {/* Quick Actions */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-headline font-bold text-on-surface-variant uppercase tracking-wider">
          Acciones Rápidas
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {/* Vender */}
          <button
            onClick={() => onOpenVender()}
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

      {/* Top Ventas */}
      <section className="flex flex-col gap-3">
        <div className="flex justify-between items-center gap-2">
          <h2 className="text-xs font-headline font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-2">
            <span
              className="material-symbols-outlined text-[16px] text-amber-500"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              local_fire_department
            </span>
            Top Ventas
          </h2>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-[9px] font-bold uppercase tracking-wider text-on-surface-variant/70">
              Top {TOP_LIMIT} histórico
            </span>
            <button
              type="button"
              onClick={() => setTopView((v) => (v === 'lista' ? 'grafica' : 'lista'))}
              title={topView === 'lista' ? 'Ver gráfica de barras' : 'Ver lista detallada'}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-outline-variant bg-surface-container text-on-surface-variant hover:text-primary hover:border-primary/40 transition-colors text-[10px] font-bold"
            >
              <span className="material-symbols-outlined text-[14px]">
                {topView === 'lista' ? 'bar_chart' : 'view_list'}
              </span>
              {topView === 'lista' ? 'Gráfica' : 'Lista'}
            </button>
          </div>
        </div>

        {topSellingProducts.length === 0 ? (
          <div className="bg-surface-container border border-outline-variant rounded-lg p-4 text-center text-xs text-on-surface-variant">
            Aún no se han registrado ventas en el sistema.
          </div>
        ) : topView === 'lista' ? (
          <div className="bg-surface-container rounded-xl border border-outline-variant overflow-hidden divide-y divide-outline-variant/40">
            {topSellingProducts.map((item, index) => {
              const badges = getProductBadges(item.product, batches, sales);
              const categoria = categories.find(
                (c) => c.id === item.product.categoriaId
              );

              return (
                <div
                  key={item.product.id}
                  onClick={() => onSelectProduct(item.product.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectProduct(item.product.id);
                    }
                  }}
                  className="w-full flex items-center gap-2.5 p-2.5 text-left cursor-pointer hover:bg-surface-container-high/60 transition-colors"
                >
                  <span
                    className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                      index === 0
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-surface-container-high text-on-surface-variant'
                    }`}
                  >
                    {index + 1}
                  </span>

                  <div className="w-10 h-10 shrink-0 rounded-lg overflow-hidden bg-surface-container-lowest border border-outline-variant flex items-center justify-center">
                    {item.product.imagen ? (
                      <ImagenZoom
                        src={item.product.imagen}
                        alt={item.product.nombre}
                        className="w-full h-full object-cover"
                        imgClassName="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="material-symbols-outlined text-on-surface-variant text-lg">
                        inventory_2
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 min-w-0">
                      <h3 className="text-xs font-bold text-on-surface truncate">
                        {item.product.nombre}
                      </h3>
                      {badges.length > 0 && (
                        <span className="text-[10px] shrink-0">{badges.join(' ')}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-on-surface-variant truncate">
                      {categoria?.nombre ?? 'General'} ·{' '}
                      <strong className="text-tertiary font-bold">
                        {item.qtySold} vendidos
                      </strong>
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-[11px] font-bold text-on-surface tabular-nums">
                      {formatMoney(item.revenueMXN, displayCurrency, exchangeRate)}
                    </p>
                    <p className="text-[9px] font-bold text-tertiary tabular-nums">
                      +{formatMoney(item.profitMXN, displayCurrency, exchangeRate)}
                    </p>
                  </div>
                </div>
              );
            })}

            <div className="flex items-center justify-between gap-2 px-3 py-2 bg-background/40 text-[9px] text-on-surface-variant">
              <span>
                {topTotals.qty} unidades en el top {topSellingProducts.length}
              </span>
              <span className="font-bold text-on-surface tabular-nums">
                {formatMoney(topTotals.revenueMXN, displayCurrency, exchangeRate)}
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-surface-container rounded-xl border border-outline-variant p-3 flex flex-col gap-3">
            {topSellingProducts.map((item, index) => {
              const pct = Math.max(
                6,
                Math.round((item.qtySold / topMaxQty) * 100)
              );

              return (
                <button
                  key={item.product.id}
                  type="button"
                  onClick={() => onSelectProduct(item.product.id)}
                  className="w-full text-left group"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-bold text-on-surface truncate">
                      <span className="text-on-surface-variant mr-1">#{index + 1}</span>
                      {item.product.nombre}
                    </span>
                    <span className="text-[10px] font-bold text-tertiary shrink-0 tabular-nums">
                      {item.qtySold} vendidos
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-surface-container-high overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary group-hover:bg-primary/80 transition-colors"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-end mt-0.5">
                    <span className="text-[9px] text-on-surface-variant tabular-nums">
                      {formatMoney(item.revenueMXN, displayCurrency, exchangeRate)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Monthly Financial Calendar Modal */}
      <CalendarioMesModal
        isOpen={isCalendarioOpen}
        onClose={() => setIsCalendarioOpen(false)}
        onEdit={onEdit}
      />
    </div>
  );
};
