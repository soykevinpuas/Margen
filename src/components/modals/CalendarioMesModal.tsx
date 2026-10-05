import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatMoney, getLocalDateKey } from '../../utils/calculations';
import { EditRecordHandler } from './EditarRegistroModal';

interface CalendarioMesModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Abre el modal EditarRegistroModal con la venta o el gasto del día */
  onEdit: EditRecordHandler;
}

export const CalendarioMesModal: React.FC<CalendarioMesModalProps> = ({
  isOpen,
  onClose,
  onEdit,
}) => {
  const { settings, sales, operatingExpenses, batches, products, deleteSale } = useApp();
  const { displayCurrency, exchangeRate } = settings;

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // First day of month & total days
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthName = currentDate.toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric',
  });

  const confirmedSales = sales.filter((s) => s.estado === 'confirmada');

  const handleDeleteSale = (saleId: string) => {
    if (
      !confirm(
        `¿Eliminar la venta ${saleId}? Se restaurará el stock de sus lotes y no se puede deshacer.`
      )
    ) {
      return;
    }
    const res = deleteSale(saleId);
    if (!res.success) alert(res.message);
  };

  // Compute stats for a specific YYYY-MM-DD
  const getDayStats = (dateKey: string) => {
    const daySales = confirmedSales.filter(
      (s) => s.fecha && getLocalDateKey(s.fecha) === dateKey
    );
    const dayExpenses = operatingExpenses.filter(
      (e) => e.fecha && getLocalDateKey(e.fecha) === dateKey
    );
    const dayBatches = batches.filter(
      (b) => b.fecha && getLocalDateKey(b.fecha) === dateKey
    );

    const ingresado = daySales.reduce((acc, s) => acc + s.ingresoTotalMXN, 0);
    const cogs = daySales.reduce((acc, s) => acc + s.costoUnidadesVendidasMXN, 0);
    const opExp = dayExpenses.reduce((acc, e) => acc + e.montoMXN, 0);
    const gastado = cogs + opExp;
    const ganancia = ingresado - gastado;

    return { ingresado, gastado, ganancia, daySales, dayExpenses, dayBatches };
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDayKey(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDayKey(null);
  };

  const todayKey = getLocalDateKey(new Date());

  const selectedStats = selectedDayKey ? getDayStats(selectedDayKey) : null;

  // ===== Resumen del mes (siempre visible, no requiere seleccionar un día) =====
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthSales = confirmedSales.filter(
    (s) => s.fecha && getLocalDateKey(s.fecha).startsWith(monthPrefix)
  );
  const monthExpenses = operatingExpenses.filter(
    (e) => e.fecha && getLocalDateKey(e.fecha).startsWith(monthPrefix)
  );

  const monthIngresado = monthSales.reduce((acc, s) => acc + s.ingresoTotalMXN, 0);
  const monthCogs = monthSales.reduce(
    (acc, s) => acc + s.costoUnidadesVendidasMXN,
    0
  );
  const monthGastosOperativos = monthExpenses.reduce((acc, e) => acc + e.montoMXN, 0);
  const monthGastado = monthCogs + monthGastosOperativos;
  const monthGanancia = monthIngresado - monthGastado;
  const monthMargenPct = monthIngresado > 0 ? (monthGanancia / monthIngresado) * 100 : 0;

  const monthDayStats = Array.from({ length: daysInMonth }).map((_, i) => {
    const dateKey = getLocalDateKey(new Date(year, month, i + 1));
    const stats = getDayStats(dateKey);
    const hasActivity =
      stats.ingresado > 0 || stats.gastado > 0 || stats.dayBatches.length > 0;
    return { dayNum: i + 1, hasActivity, ...stats };
  });

  const diasActivos = monthDayStats.filter((d) => d.hasActivity).length;

  // Mejor día = día con mayor ganancia neta entre los días con ventas
  const bestDay = monthDayStats
    .filter((d) => d.daySales.length > 0)
    .reduce<{ dayNum: number; ganancia: number } | null>(
      (best, d) => (best === null || d.ganancia > best.ganancia
        ? { dayNum: d.dayNum, ganancia: d.ganancia }
        : best),
      null
    );

  const bestDayLabel = bestDay
    ? new Date(year, month, bestDay.dayNum).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
      })
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      <div className="bg-surface-container-high border border-outline-variant w-full max-w-xl rounded-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-4 py-3 border-b border-outline-variant flex items-center justify-between bg-surface-container">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-lg">calendar_month</span>
            </div>
            <div>
              <h2 className="text-sm font-headline font-bold text-on-surface capitalize">
                Calendario Financiero Mensual
              </h2>
              <p className="text-[10px] text-on-surface-variant">
                Visualiza tus 3 indicadores principales día por día
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* Month Navigation Banner */}
        <div className="px-4 py-2.5 bg-surface-container-lowest/50 border-b border-outline-variant/30 flex items-center justify-between">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant flex items-center"
          >
            <span className="material-symbols-outlined text-base">chevron_left</span>
          </button>

          <span className="text-sm font-headline font-bold text-on-surface capitalize tracking-wide">
            {monthName}
          </span>

          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant flex items-center"
          >
            <span className="material-symbols-outlined text-base">chevron_right</span>
          </button>
        </div>

        {/* Legend */}
        <div className="px-4 py-1.5 bg-surface-container/30 border-b border-outline-variant/20 flex items-center justify-around text-[10px] text-on-surface-variant">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-violet-500"></span>
            <span>Ingresado</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>Gastado</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Ganancia</span>
          </div>
        </div>

        {/* Resumen del mes (siempre visible, aunque no se seleccione ningún día) */}
        <div className="px-4 py-3 bg-surface-container/60 border-b border-outline-variant/30">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-headline font-bold text-on-surface flex items-center gap-1.5 min-w-0">
              <span className="material-symbols-outlined text-[15px] text-primary">
                query_stats
              </span>
              <span className="truncate">Resumen de {monthName}</span>
            </span>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary/10 border border-primary/30 text-primary shrink-0">
              {diasActivos} {diasActivos === 1 ? 'día activo' : 'días activos'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-surface-container-high/50 border border-outline-variant rounded-lg px-2 py-1.5 flex flex-col min-w-0">
              <span className="text-[9px] font-bold uppercase tracking-wider text-on-surface-variant">
                Ventas
              </span>
              <span className="text-xs font-extrabold text-on-surface tabular-nums truncate">
                {monthSales.length}
              </span>
            </div>

            <div className="bg-violet-500/10 border border-violet-500/25 rounded-lg px-2 py-1.5 flex flex-col min-w-0">
              <span className="text-[9px] font-bold uppercase tracking-wider text-violet-400">
                Ingresado
              </span>
              <span
                className="text-xs font-extrabold text-on-surface tabular-nums truncate"
                title={formatMoney(monthIngresado, displayCurrency, exchangeRate)}
              >
                {formatMoney(monthIngresado, displayCurrency, exchangeRate)}
              </span>
            </div>

            <div className="bg-rose-500/10 border border-rose-500/25 rounded-lg px-2 py-1.5 flex flex-col min-w-0">
              <span className="text-[9px] font-bold uppercase tracking-wider text-rose-400">
                Gastado
              </span>
              <span
                className="text-xs font-extrabold text-rose-300 tabular-nums truncate"
                title={`${formatMoney(monthGastado, displayCurrency, exchangeRate)} (mercancía + ${formatMoney(monthGastosOperativos, displayCurrency, exchangeRate)} gastos op.)`}
              >
                {formatMoney(monthGastado, displayCurrency, exchangeRate)}
              </span>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-lg px-2 py-1.5 flex flex-col min-w-0">
              <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                Ganancia
              </span>
              <span
                className={`text-xs font-extrabold tabular-nums truncate ${
                  monthGanancia >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
                title={formatMoney(monthGanancia, displayCurrency, exchangeRate)}
              >
                {formatMoney(monthGanancia, displayCurrency, exchangeRate)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 mt-2 text-[10px]">
            <span className="flex items-center gap-1 min-w-0">
              <span className="material-symbols-outlined text-[13px] text-amber-400">
                emoji_events
              </span>
              <span className="text-on-surface-variant shrink-0">Mejor día:</span>
              {bestDayLabel ? (
                <>
                  <strong className="text-on-surface truncate">{bestDayLabel}</strong>
                  <span
                    className={`font-bold shrink-0 ${
                      bestDay && bestDay.ganancia >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {bestDay && bestDay.ganancia >= 0 ? '+' : ''}
                    {formatMoney(bestDay ? bestDay.ganancia : 0, displayCurrency, exchangeRate)}
                  </span>
                </>
              ) : (
                <span className="text-on-surface-variant italic">Sin ventas este mes</span>
              )}
            </span>

            <span className="text-on-surface-variant shrink-0">
              Margen{' '}
              <strong className={monthGanancia >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {monthMargenPct.toFixed(0)}%
              </strong>
            </span>
          </div>
        </div>

        {/* Calendar Grid Container */}
        <div className="p-3 overflow-y-auto flex-1">
          {/* Day Names Header */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-on-surface-variant mb-1">
            <span>Dom</span>
            <span>Lun</span>
            <span>Mar</span>
            <span>Mié</span>
            <span>Jue</span>
            <span>Vie</span>
            <span>Sáb</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty slots before first day */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="h-16 rounded-lg bg-surface-container-lowest/20 opacity-30" />
            ))}

            {/* Days of month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateObj = new Date(year, month, dayNum);
              const dateKey = getLocalDateKey(dateObj);
              const isToday = dateKey === todayKey;
              const isSelected = dateKey === selectedDayKey;

              const stats = getDayStats(dateKey);
              const hasActivity = stats.ingresado > 0 || stats.gastado > 0 || stats.dayBatches.length > 0;

              return (
                <div
                  key={dateKey}
                  onClick={() => setSelectedDayKey(isSelected ? null : dateKey)}
                  className={`h-16 rounded-xl p-1 border flex flex-col justify-between cursor-pointer transition-all relative overflow-hidden ${
                    isSelected
                      ? 'bg-primary/20 border-primary ring-2 ring-primary/40 shadow-md'
                      : isToday
                      ? 'bg-surface-container border-primary/60 ring-1 ring-primary/30'
                      : hasActivity
                      ? 'bg-surface-container/80 border-outline-variant hover:border-primary/40'
                      : 'bg-surface-container-lowest/40 border-outline-variant/30 hover:border-outline'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold px-1 rounded-md ${
                        isToday
                          ? 'bg-primary text-on-primary font-extrabold'
                          : 'text-on-surface'
                      }`}
                    >
                      {dayNum}
                    </span>
                    {isToday && (
                      <span className="text-[8px] font-extrabold text-primary uppercase">Hoy</span>
                    )}
                  </div>

                  {hasActivity ? (
                    <div className="flex flex-col gap-0.5 text-[8px] leading-tight font-bold">
                      {stats.ingresado > 0 && (
                        <span className="text-violet-400 truncate">
                          +
                          {formatMoney(
                            stats.ingresado,
                            displayCurrency,
                            exchangeRate,
                            false
                          )}
                        </span>
                      )}
                      {stats.gastado > 0 && (
                        <span className="text-rose-400 truncate">
                          -
                          {formatMoney(
                            stats.gastado,
                            displayCurrency,
                            exchangeRate,
                            false
                          )}
                        </span>
                      )}
                      {stats.ganancia !== 0 && (
                        <span
                          className={`truncate ${
                            stats.ganancia > 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          =
                          {formatMoney(
                            stats.ganancia,
                            displayCurrency,
                            exchangeRate,
                            false
                          )}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[8px] text-outline opacity-40 self-center">--</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Selected Day Details Panel */}
          {selectedDayKey && selectedStats && (
            <div className="mt-4 p-3 bg-surface-container rounded-xl border border-primary/30 flex flex-col gap-2 animate-fade-in">
              <div className="flex items-center justify-between border-b border-outline-variant/30 pb-2">
                <span className="text-xs font-bold text-primary flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">event</span>
                  Detalle del día {selectedDayKey}
                </span>
                <button
                  onClick={() => setSelectedDayKey(null)}
                  className="text-[10px] font-bold text-on-surface-variant hover:text-on-surface"
                >
                  ✕ Cerrar detalle
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg p-1.5">
                  <div className="text-[9px] text-violet-400 font-bold uppercase">Ingresado</div>
                  <div className="font-bold text-on-surface">
                    {formatMoney(selectedStats.ingresado, displayCurrency, exchangeRate)}
                  </div>
                </div>
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-1.5">
                  <div className="text-[9px] text-rose-400 font-bold uppercase">Gastado</div>
                  <div className="font-bold text-rose-300">
                    {formatMoney(selectedStats.gastado, displayCurrency, exchangeRate)}
                  </div>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-1.5">
                  <div className="text-[9px] text-emerald-400 font-bold uppercase">Ganancia Libre</div>
                  <div className={`font-bold ${selectedStats.ganancia >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatMoney(selectedStats.ganancia, displayCurrency, exchangeRate)}
                  </div>
                </div>
              </div>

              {/* Transactions List */}
              <div className="text-[10px] space-y-1 mt-1 max-h-36 overflow-y-auto">
                <div className="font-bold text-on-surface-variant uppercase text-[9px]">Ventas: {selectedStats.daySales.length}</div>
                {selectedStats.daySales.length === 0 ? (
                  <p className="text-outline text-[9px] italic">Sin ventas registradas en esta fecha</p>
                ) : (
                  selectedStats.daySales.map((s) => {
                    const product = products.find((p) => p.id === s.productoId);
                    return (
                      <div key={s.id} className="flex justify-between items-center bg-surface-container-high p-2 rounded-lg border border-outline-variant/30 gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-md bg-surface flex-shrink-0 flex items-center justify-center overflow-hidden border border-outline-variant">
                            {product?.imagen ? (
                              <img
                                src={product.imagen}
                                alt={product.nombre}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <span className="material-symbols-outlined text-on-surface-variant text-[16px]">
                                inventory_2
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-on-surface text-xs truncate">
                              {product ? product.nombre : 'Producto no encontrado'}
                            </div>
                            <div className="text-[9px] text-on-surface-variant flex items-center gap-1">
                              <span className="font-mono">#{s.id.slice(-5)}</span>
                              <span>•</span>
                              <span>{s.cantidad} u.</span>
                            </div>
                            {s.notas && (
                              <div className="text-[11px] text-on-surface-variant italic truncate">
                                {s.notas}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="font-bold text-emerald-400 text-xs">
                            +{formatMoney(s.ingresoTotalMXN, displayCurrency, exchangeRate)}
                          </span>
                          <button
                            type="button"
                            onClick={() => onEdit('venta', s)}
                            title="Editar venta"
                            className="w-6 h-6 flex items-center justify-center rounded-md bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-all"
                          >
                            <span className="material-symbols-outlined text-[14px]">edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSale(s.id)}
                            title="Eliminar venta"
                            className="w-6 h-6 flex items-center justify-center rounded-md bg-error/10 border border-error/40 text-error hover:bg-error/20 transition-all"
                          >
                            <span className="material-symbols-outlined text-[14px]">delete</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}

                <div className="font-bold text-on-surface-variant uppercase text-[9px] pt-1">Gastos Operativos: {selectedStats.dayExpenses.length}</div>
                {selectedStats.dayExpenses.length === 0 ? (
                  <p className="text-outline text-[9px] italic">Sin gastos registrados en esta fecha</p>
                ) : (
                  selectedStats.dayExpenses.map((e) => (
                    <div
                      key={e.id}
                      className="bg-surface-container-high p-1.5 rounded border border-outline-variant/30"
                    >
                      <div className="flex justify-between items-center gap-2">
                        <span className="min-w-0 truncate">{e.concepto}</span>
                        <span className="flex items-center gap-1.5 shrink-0">
                          <span className="font-bold text-rose-400">
                            -{formatMoney(e.montoMXN, displayCurrency, exchangeRate)}
                          </span>
                          <button
                            type="button"
                            onClick={() => onEdit('gasto', e)}
                            title="Editar gasto"
                            className="w-6 h-6 flex items-center justify-center rounded-md bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-all"
                          >
                            <span className="material-symbols-outlined text-[14px]">edit</span>
                          </button>
                        </span>
                      </div>
                      {e.notas && (
                        <div className="text-[11px] text-on-surface-variant italic truncate mt-0.5">
                          {e.notas}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
