import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatMoney, getLocalDateKey } from '../../utils/calculations';

interface CalendarioMesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CalendarioMesModal: React.FC<CalendarioMesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { settings, sales, operatingExpenses, batches, products } = useApp();
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
                          </div>
                        </div>
                        <span className="font-bold text-emerald-400 text-xs shrink-0">
                          +{formatMoney(s.ingresoTotalMXN, displayCurrency, exchangeRate)}
                        </span>
                      </div>
                    );
                  })
                )}

                <div className="font-bold text-on-surface-variant uppercase text-[9px] pt-1">Gastos Operativos: {selectedStats.dayExpenses.length}</div>
                {selectedStats.dayExpenses.length === 0 ? (
                  <p className="text-outline text-[9px] italic">Sin gastos registrados en esta fecha</p>
                ) : (
                  selectedStats.dayExpenses.map((e) => (
                    <div key={e.id} className="flex justify-between items-center bg-surface-container-high p-1.5 rounded border border-outline-variant/30">
                      <span>{e.concepto}</span>
                      <span className="font-bold text-rose-400">-{formatMoney(e.montoMXN, displayCurrency, exchangeRate)}</span>
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
