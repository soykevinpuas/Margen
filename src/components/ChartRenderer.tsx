import React from 'react';
import { formatMoney } from '../utils/calculations';
import { Currency } from '../types';

export interface ChartDataPoint {
  label: string;
  ingresos: number;
  gastos: number;
  gananciaReal: number;
}

interface ChartRendererProps {
  data: ChartDataPoint[];
  chartType: 'barras' | 'lineas' | 'puntos' | 'radial';
  displayCurrency: Currency;
  exchangeRate: number;
  height?: number;
  showLegend?: boolean;
  selectedIndex?: number | null;
  onSelectPoint?: (index: number | null) => void;
  // Modo 30 días: scroll horizontal con snap por barra
  scrollableDays?: boolean;
}

export const ChartRenderer: React.FC<ChartRendererProps> = ({
  data,
  chartType = 'barras',
  displayCurrency,
  exchangeRate,
  height = 180,
  showLegend = true,
  selectedIndex = null,
  onSelectPoint,
  scrollableDays = false,
}) => {
  const totalIngresos = data.reduce((acc, d) => acc + d.ingresos, 0);
  const totalGastos = data.reduce((acc, d) => acc + d.gastos, 0);
  const totalGananciaReal = data.reduce((acc, d) => acc + d.gananciaReal, 0);

  const maxVal = Math.max(
    ...data.flatMap((d) => [d.ingresos, d.gastos, Math.max(0, d.gananciaReal)]),
    1
  );

  const hasData = totalIngresos > 0 || totalGastos > 0 || Math.abs(totalGananciaReal) > 0;

  if (data.length === 0) {
    return (
      <div
        className="w-full flex flex-col items-center justify-center border border-dashed border-outline-variant/50 rounded-xl p-4 text-center bg-surface-container-lowest/50"
        style={{ height: `${height}px` }}
      >
        <span className="material-symbols-outlined text-3xl text-outline mb-1">
          bar_chart
        </span>
        <p className="text-xs font-bold text-on-surface-variant">Sin registros en este periodo</p>
        <p className="text-[10px] text-outline mt-0.5">
          Registra ventas y gastos para visualizar el desglose en gráfica de {chartType}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-3">
      {/* GRAPH RENDER AREA */}
      <div
        className={`w-full relative flex items-end justify-between gap-1 pt-4 pb-2 px-1 bg-surface-container-lowest/30 rounded-xl border border-outline-variant/30 ${scrollableDays ? 'overflow-x-auto snap-x snap-mandatory' : 'overflow-hidden'}`}
        style={{ height: `${height}px` }}
      >
        {/* GRID LINES FOR BARS / LINES / DOTS */}
        {chartType !== 'radial' && (
          <div className="absolute inset-x-2 inset-y-4 flex flex-col justify-between pointer-events-none opacity-20">
            <div className="border-b border-outline w-full h-px"></div>
            <div className="border-b border-outline w-full h-px"></div>
            <div className="border-b border-outline w-full h-px"></div>
          </div>
        )}

        {/* 1. BARRAS */}
        {chartType === 'barras' && (
          <div className={`w-full h-full flex items-end gap-1 z-10 ${scrollableDays ? 'min-w-max' : 'justify-between'}`}>
            {data.map((pt, idx) => {
              const isToday = pt.label.startsWith('Hoy');
              const hasActivity = pt.ingresos > 0 || pt.gastos > 0 || pt.gananciaReal !== 0;
              
              // If zero activity but it's today, show a subtle 2px placeholder bar
              const hIngreso = pt.ingresos > 0 ? Math.max(4, Math.round((pt.ingresos / maxVal) * 100)) : (isToday && !hasActivity ? 2 : 0);
              const hGasto = pt.gastos > 0 ? Math.max(4, Math.round((pt.gastos / maxVal) * 100)) : 0;
              const hGanancia = pt.gananciaReal > 0 ? Math.max(4, Math.round((pt.gananciaReal / maxVal) * 100)) : (isToday && !hasActivity ? 2 : 0);
              const isSelected = selectedIndex === idx;

              return (
                <div
                  key={idx}
                  onClick={() => onSelectPoint?.(isSelected ? null : idx)}
                  className={`${scrollableDays ? 'flex-shrink-0 min-w-[46px] snap-start' : 'flex-1'} flex flex-col items-center justify-end h-full group cursor-pointer transition-all rounded-lg p-0.5 ${
                    isSelected
                      ? 'bg-primary/20 ring-1 ring-primary shadow-sm'
                      : isToday
                      ? 'bg-primary/5 hover:bg-primary/10 border border-primary/20'
                      : 'hover:bg-surface-container-high/60'
                  }`}
                  title={`${pt.label}: Ingreso ${formatMoney(pt.ingresos, displayCurrency, exchangeRate)} | Gasto ${formatMoney(pt.gastos, displayCurrency, exchangeRate)} | Ganancia ${formatMoney(pt.gananciaReal, displayCurrency, exchangeRate)}`}
                >
                  <div className="w-full flex items-end justify-center gap-0.5 h-[75%]">
                    {/* Ingreso Bar (Violet) */}
                    <div
                      style={{ height: `${hIngreso}%` }}
                      className={`w-1.5 sm:w-2.5 rounded-t-sm transition-all ${
                        isSelected ? 'bg-violet-400 ring-1 ring-violet-200' : 'bg-violet-500 group-hover:bg-violet-400'
                      }`}
                    ></div>
                    {/* Gasto Bar (Rose) */}
                    <div
                      style={{ height: `${hGasto}%` }}
                      className={`w-1.5 sm:w-2.5 rounded-t-sm transition-all ${
                        isSelected ? 'bg-rose-400 ring-1 ring-rose-200' : 'bg-rose-500 group-hover:bg-rose-400'
                      }`}
                    ></div>
                    {/* Ganancia Real Bar (Emerald) */}
                    <div
                      style={{ height: `${hGanancia}%` }}
                      className={`w-1.5 sm:w-2.5 rounded-t-sm transition-all ${
                        isSelected
                          ? 'bg-emerald-300 ring-1 ring-emerald-100 shadow-md shadow-emerald-400/50'
                          : 'bg-emerald-500 group-hover:bg-emerald-400 shadow-sm shadow-emerald-500/30'
                      }`}
                    ></div>
                  </div>
                  <span
                    className={`text-[9px] font-bold mt-1 text-center truncate max-w-full leading-none transition-colors ${
                      isSelected
                        ? 'text-primary font-extrabold'
                        : isToday
                        ? 'text-primary font-black bg-primary/20 px-1 py-0.5 rounded-full ring-1 ring-primary/40'
                        : 'text-on-surface-variant'
                    }`}
                  >
                    {pt.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* 2. LINEAS */}
        {chartType === 'lineas' && (
          <div className="w-full h-full relative z-10 flex flex-col justify-between">
            <svg
              className="w-full h-[85%] overflow-visible"
              viewBox="0 0 100 40"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="emerald-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Ingresos Line (Violet) */}
              <path
                d={`M ${data
                  .map((p, i) => {
                    const x = (i / Math.max(1, data.length - 1)) * 100;
                    const y = 38 - (p.ingresos / maxVal) * 34;
                    return `${x.toFixed(1)},${y.toFixed(1)}`;
                  })
                  .join(' L ')}`}
                fill="none"
                stroke="#8b5cf6"
                strokeWidth="2"
                strokeLinecap="round"
              />

              {/* Gastos Line (Rose) */}
              <path
                d={`M ${data
                  .map((p, i) => {
                    const x = (i / Math.max(1, data.length - 1)) * 100;
                    const y = 38 - (p.gastos / maxVal) * 34;
                    return `${x.toFixed(1)},${y.toFixed(1)}`;
                  })
                  .join(' L ')}`}
                fill="none"
                stroke="#f43f5e"
                strokeWidth="1.5"
                strokeDasharray="2 2"
                strokeLinecap="round"
              />

              {/* Ganancia Real Area & Line (Emerald) */}
              <path
                d={`M ${data
                  .map((p, i) => {
                    const x = (i / Math.max(1, data.length - 1)) * 100;
                    const y = 38 - (Math.max(0, p.gananciaReal) / maxVal) * 34;
                    return `${x.toFixed(1)},${y.toFixed(1)}`;
                  })
                  .join(' L ')} L 100,40 L 0,40 Z`}
                fill="url(#emerald-grad)"
              />
              <path
                d={`M ${data
                  .map((p, i) => {
                    const x = (i / Math.max(1, data.length - 1)) * 100;
                    const y = 38 - (Math.max(0, p.gananciaReal) / maxVal) * 34;
                    return `${x.toFixed(1)},${y.toFixed(1)}`;
                  })
                  .join(' L ')}`}
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>

            <div className="w-full flex justify-between px-1">
              {data.map((p, i) => {
                const isSelected = selectedIndex === i;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onSelectPoint?.(isSelected ? null : i)}
                    className={`text-[9px] font-bold px-1 py-0.5 rounded transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary text-on-primary shadow-sm font-extrabold'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. PUNTOS */}
        {chartType === 'puntos' && (
          <div className="w-full h-full relative z-10 flex flex-col justify-between">
            <svg
              className="w-full h-[85%] overflow-visible"
              viewBox="0 0 100 40"
              preserveAspectRatio="none"
            >
              {data.map((p, i) => {
                const x = (i / Math.max(1, data.length - 1)) * 100;
                const yIngreso = 38 - (p.ingresos / maxVal) * 34;
                const yGasto = 38 - (p.gastos / maxVal) * 34;
                const yGanancia = 38 - (Math.max(0, p.gananciaReal) / maxVal) * 34;
                const isSelected = selectedIndex === i;

                return (
                  <g key={i} className="cursor-pointer" onClick={() => onSelectPoint?.(isSelected ? null : i)}>
                    {/* Vertical Connecting Guide */}
                    <line
                      x1={x}
                      y1={0}
                      x2={x}
                      y2={40}
                      stroke={isSelected ? '#10b981' : '#3f3f46'}
                      strokeWidth={isSelected ? '1.5' : '0.5'}
                      strokeDasharray={isSelected ? 'none' : '1 2'}
                      opacity={isSelected ? '1' : '0.5'}
                    />
                    {/* Ingreso Dot */}
                    <circle cx={x} cy={yIngreso} r={isSelected ? '3.5' : '2.5'} fill="#8b5cf6" />
                    {/* Gasto Dot */}
                    <circle cx={x} cy={yGasto} r={isSelected ? '3.5' : '2.5'} fill="#f43f5e" />
                    {/* Ganancia Real Dot */}
                    <circle
                      cx={x}
                      cy={yGanancia}
                      r={isSelected ? '5' : '3.5'}
                      fill="#10b981"
                      stroke={isSelected ? '#ffffff' : '#042f2e'}
                      strokeWidth={isSelected ? '2' : '1'}
                    />
                  </g>
                );
              })}
            </svg>

            <div className="w-full flex justify-between px-1">
              {data.map((p, i) => {
                const isSelected = selectedIndex === i;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onSelectPoint?.(isSelected ? null : i)}
                    className={`text-[9px] font-bold px-1 py-0.5 rounded transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary text-on-primary shadow-sm font-extrabold'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. RADIAL / DONA */}
        {chartType === 'radial' && (
          <div className="w-full h-full flex flex-col sm:flex-row items-center justify-around gap-4 p-2 z-10">
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                {/* Background Track */}
                <path
                  className="text-surface-container"
                  strokeWidth="3.8"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                {/* Gastos Arc (Rose) */}
                <path
                  className="text-rose-500"
                  strokeDasharray={`${totalIngresos > 0 ? Math.min(100, Math.round((totalGastos / totalIngresos) * 100)) : 0}, 100`}
                  strokeWidth="3.8"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                {/* Ganancia Real Arc (Emerald) */}
                <path
                  className="text-emerald-500"
                  strokeDasharray={`${totalIngresos > 0 ? Math.min(100, Math.round((Math.max(0, totalGananciaReal) / totalIngresos) * 100)) : 0}, 100`}
                  strokeDashoffset={`-${totalIngresos > 0 ? Math.min(100, Math.round((totalGastos / totalIngresos) * 100)) : 0}`}
                  strokeWidth="3.8"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-[8px] uppercase tracking-wider text-on-surface-variant font-bold">
                  Ganancia
                </span>
                <span className="text-xs font-bold font-headline text-emerald-400">
                  {formatMoney(totalGananciaReal, displayCurrency, exchangeRate)}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-violet-500"></div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-on-surface-variant font-medium">Ingresos Brutos</span>
                  <span className="font-bold text-on-surface">{formatMoney(totalIngresos, displayCurrency, exchangeRate)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-on-surface-variant font-medium">Gastos / Costos</span>
                  <span className="font-bold text-rose-400">{formatMoney(totalGastos, displayCurrency, exchangeRate)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-on-surface-variant font-medium">Ganancia Real Libre</span>
                  <span className="font-bold text-emerald-400">{formatMoney(totalGananciaReal, displayCurrency, exchangeRate)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FLOATING DETAIL BOX FOR SELECTED DAY */}
      {selectedIndex !== null && data[selectedIndex] && (
        <div className="bg-surface-container border border-primary/50 shadow-xl rounded-xl p-2.5 flex flex-col gap-1.5 animate-fade-in relative z-20">
          <div className="flex items-center justify-between border-b border-outline-variant/30 pb-1">
            <span className="text-xs font-bold text-primary flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">calendar_today</span>
              Valores de: {data[selectedIndex].label}
            </span>
            <button
              onClick={() => onSelectPoint?.(null)}
              className="text-[10px] text-on-surface-variant hover:text-on-surface px-1.5 py-0.5 rounded bg-surface-container-highest font-bold"
            >
              ✕ Cerrar
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-[10px]">
            <div className="bg-violet-500/10 border border-violet-500/30 rounded-lg p-1.5 flex flex-col">
              <span className="text-violet-400 font-bold">Ingresado</span>
              <span className="font-extrabold text-on-surface mt-0.5">
                {formatMoney(data[selectedIndex].ingresos, displayCurrency, exchangeRate)}
              </span>
            </div>

            <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-1.5 flex flex-col">
              <span className="text-rose-400 font-bold">Gastado</span>
              <span className="font-extrabold text-rose-400 mt-0.5">
                {formatMoney(data[selectedIndex].gastos, displayCurrency, exchangeRate)}
              </span>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-1.5 flex flex-col">
              <span className="text-emerald-400 font-bold">Ganancia</span>
              <span className="font-extrabold text-emerald-400 mt-0.5">
                {formatMoney(data[selectedIndex].gananciaReal, displayCurrency, exchangeRate)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* LEGEND BADGES */}
      {showLegend && chartType !== 'radial' && (
        <div className="flex items-center justify-between px-2 pt-1 border-t border-outline-variant/20 text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-500"></span>
            <span className="text-on-surface-variant font-medium">
              Ingresado: <strong className="text-on-surface">{formatMoney(totalIngresos, displayCurrency, exchangeRate)}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span className="text-on-surface-variant font-medium">
              Gastado: <strong className="text-rose-400">{formatMoney(totalGastos, displayCurrency, exchangeRate)}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/30"></span>
            <span className="text-on-surface-variant font-medium">
              Ganancia Libre: <strong className="text-emerald-400">{formatMoney(totalGananciaReal, displayCurrency, exchangeRate)}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
