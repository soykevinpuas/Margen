import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatMoney, getLocalDateKey } from '../../utils/calculations';
import { ChartRenderer, ChartDataPoint } from '../ChartRenderer';

export const GraficasView: React.FC = () => {
  const { settings, sales, operatingExpenses } = useApp();
  const { displayCurrency, exchangeRate, chartType = 'barras' } = settings;

  const [period, setPeriod] = useState<'dia' | 'sem' | 'mes'>(() => {
    const saved = localStorage.getItem('margen_graficas_period');
    return saved === 'dia' || saved === 'sem' || saved === 'mes' ? saved : 'dia';
  });
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handlePeriodChange = (p: 'dia' | 'sem' | 'mes') => {
    setPeriod(p);
    setSelectedIndex(null);
    localStorage.setItem('margen_graficas_period', p);
  };

  // Filter confirmed sales
  const confirmedSales = sales.filter((s) => s.estado === 'confirmada');

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
              👆 Desliza ↔ para recorrer los días y toca una barra para ver sus números
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
    </div>
  );
};
