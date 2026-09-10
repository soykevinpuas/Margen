import React from 'react';
import { useApp } from '../../context/AppContext';
import { formatMoney } from '../../utils/calculations';

interface GananciasHistoricasModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GananciasHistoricasModal: React.FC<GananciasHistoricasModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { settings, sales, operatingExpenses, batches } = useApp();
  const { displayCurrency, exchangeRate } = settings;

  if (!isOpen) return null;

  const confirmedSales = sales.filter((s) => s.estado === 'confirmada');

  // Overall Totals
  const totalRevenue = confirmedSales.reduce((acc, s) => acc + s.ingresoTotalMXN, 0);
  const totalCogs = confirmedSales.reduce((acc, s) => acc + s.costoUnidadesVendidasMXN, 0);
  const totalOpExp = operatingExpenses.reduce((acc, e) => acc + e.montoMXN, 0);
  const totalBatchExtraExp = batches.reduce(
    (acc, b) => acc + b.gastosDeCompra.reduce((sum, g) => sum + g.montoMXN, 0),
    0
  );

  const totalExpenses = totalCogs + totalOpExp + totalBatchExtraExp;
  const netProfit = totalRevenue - totalExpenses;
  const marginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  const roiPercent = totalExpenses > 0 ? (netProfit / totalExpenses) * 100 : 0;

  // Monthly Breakdown Map YYYY-MM
  const monthlyMap: Record<
    string,
    { monthKey: string; label: string; revenue: number; expenses: number }
  > = {};

  // Process Sales
  confirmedSales.forEach((s) => {
    if (!s.fecha) return;
    const key = s.fecha.slice(0, 7); // YYYY-MM
    if (!monthlyMap[key]) {
      const [year, month] = key.split('-');
      const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
      const label = dateObj.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      monthlyMap[key] = { monthKey: key, label, revenue: 0, expenses: 0 };
    }
    monthlyMap[key].revenue += s.ingresoTotalMXN;
    monthlyMap[key].expenses += s.costoUnidadesVendidasMXN;
  });

  // Process Operating Expenses
  operatingExpenses.forEach((e) => {
    if (!e.fecha) return;
    const key = e.fecha.slice(0, 7);
    if (!monthlyMap[key]) {
      const [year, month] = key.split('-');
      const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
      const label = dateObj.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      monthlyMap[key] = { monthKey: key, label, revenue: 0, expenses: 0 };
    }
    monthlyMap[key].expenses += e.montoMXN;
  });

  // Process Batch Extra Expenses
  batches.forEach((b) => {
    if (!b.fecha) return;
    const key = b.fecha.slice(0, 7);
    const extraExp = b.gastosDeCompra.reduce((sum, g) => sum + g.montoMXN, 0);
    if (extraExp > 0) {
      if (!monthlyMap[key]) {
        const [year, month] = key.split('-');
        const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
        const label = dateObj.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        monthlyMap[key] = { monthKey: key, label, revenue: 0, expenses: 0 };
      }
      monthlyMap[key].expenses += extraExp;
    }
  });

  const sortedMonths = Object.values(monthlyMap).sort(
    (a, b) => b.monthKey.localeCompare(a.monthKey)
  );

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-surface-container-high border border-outline-variant w-full max-w-xl rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-outline-variant flex items-center justify-between bg-surface-container">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm">
              <span className="material-symbols-outlined text-xl">trending_up</span>
            </div>
            <div>
              <h2 className="text-sm font-headline font-bold text-on-surface">
                Ganancias Históricas
              </h2>
              <p className="text-[10px] text-on-surface-variant">
                Balance histórico real de ingresos, egresos y ganancia libre
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* Total Net Profit Banner */}
        <div className="p-4 bg-surface-container border-b border-outline-variant/40 space-y-3">
          <div className="bg-gradient-to-r from-emerald-500/15 via-surface-container-high to-emerald-500/15 border border-emerald-500/40 rounded-xl p-4 flex flex-col gap-1 shadow-md relative overflow-hidden">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">
              Ganancia Libre Histórica Acumulada
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-headline font-black text-emerald-400">
                {formatMoney(netProfit, displayCurrency, exchangeRate)}
              </span>
              <span className="text-xs font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                {marginPercent.toFixed(1)}% Margen
              </span>
            </div>
            <p className="text-[10px] text-on-surface-variant mt-1">
              Dinero real ganado descontando compras de mercancía y todos los gastos operativos.
            </p>
          </div>

          {/* Grid Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-2.5 flex flex-col">
              <span className="text-[10px] text-violet-400 font-bold uppercase">Ingresado</span>
              <span className="font-extrabold text-on-surface mt-0.5">
                {formatMoney(totalRevenue, displayCurrency, exchangeRate)}
              </span>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-2.5 flex flex-col">
              <span className="text-[10px] text-rose-400 font-bold uppercase">Gastado</span>
              <span className="font-extrabold text-rose-400 mt-0.5">
                {formatMoney(totalExpenses, displayCurrency, exchangeRate)}
              </span>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-2.5 flex flex-col">
              <span className="text-[10px] text-tertiary font-bold uppercase">Margen %</span>
              <span className="font-extrabold text-tertiary mt-0.5">
                {marginPercent.toFixed(1)}%
              </span>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-2.5 flex flex-col">
              <span className="text-[10px] text-sky-400 font-bold uppercase">ROI %</span>
              <span className="font-extrabold text-sky-400 mt-0.5">
                {roiPercent.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Monthly Breakdown Title */}
        <div className="px-4 py-2 border-b border-outline-variant/30 bg-surface-container-lowest flex justify-between items-center text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
          <span>Desglose Mes a Mes</span>
          <span>{sortedMonths.length} Meses Registrados</span>
        </div>

        {/* Monthly List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2 text-xs">
          {sortedMonths.length === 0 ? (
            <div className="text-center py-12 text-on-surface-variant">
              <span className="material-symbols-outlined text-3xl mb-1 text-outline">analytics</span>
              <p>No hay datos mensuales registrados.</p>
            </div>
          ) : (
            sortedMonths.map((m) => {
              const mProfit = m.revenue - m.expenses;
              const mMargin = m.revenue > 0 ? (mProfit / m.revenue) * 100 : 0;

              return (
                <div
                  key={m.monthKey}
                  className="bg-surface-container border border-outline-variant/40 rounded-xl p-3 flex flex-col gap-2 hover:border-primary/50 transition-colors"
                >
                  <div className="flex justify-between items-center border-b border-outline-variant/20 pb-2">
                    <span className="font-bold text-on-surface capitalize text-xs flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-primary text-[16px]">
                        calendar_today
                      </span>
                      {m.label}
                    </span>

                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                        mProfit >= 0
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      {mProfit >= 0 ? '+' : ''}
                      {formatMoney(mProfit, displayCurrency, exchangeRate)}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <div className="flex flex-col">
                      <span className="text-on-surface-variant">Ingresado</span>
                      <span className="font-bold text-violet-400">
                        {formatMoney(m.revenue, displayCurrency, exchangeRate)}
                      </span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-on-surface-variant">Gastado</span>
                      <span className="font-bold text-rose-400">
                        {formatMoney(m.expenses, displayCurrency, exchangeRate)}
                      </span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-on-surface-variant">Margen</span>
                      <span
                        className={`font-bold ${
                          mMargin >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {mMargin.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
