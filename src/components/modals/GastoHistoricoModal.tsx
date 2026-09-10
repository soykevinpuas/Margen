import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatMoney } from '../../utils/calculations';

interface GastoHistoricoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GastoHistoricoModal: React.FC<GastoHistoricoModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { settings, sales, operatingExpenses, batches } = useApp();
  const { displayCurrency, exchangeRate } = settings;

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'todos' | 'operativos' | 'compras' | 'cogs'>('todos');

  if (!isOpen) return null;

  const confirmedSales = sales.filter((s) => s.estado === 'confirmada');

  // Total COGS from sales
  const totalCogs = confirmedSales.reduce((acc, s) => acc + s.costoUnidadesVendidasMXN, 0);

  // Total Operating Expenses
  const totalOpExp = operatingExpenses.reduce((acc, e) => acc + e.montoMXN, 0);

  // Total Purchase Batches Costs (or shipping/extra expenses on purchases)
  const totalBatchExtraExp = batches.reduce(
    (acc, b) => acc + b.gastosDeCompra.reduce((sum, g) => sum + g.montoMXN, 0),
    0
  );

  const grandTotalExpenses = totalCogs + totalOpExp + totalBatchExtraExp;

  // Combine items for detailed list
  const opExpList = operatingExpenses.map((e) => ({
    id: `op-${e.id}`,
    type: 'operativos' as const,
    title: e.concepto,
    subtitle: `Categoría: ${e.categoria}`,
    montoMXN: e.montoMXN,
    fecha: e.fecha,
    tag: 'Gasto Operativo',
    color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
  }));

  const salesCogsList = confirmedSales.map((s) => ({
    id: `cogs-${s.id}`,
    type: 'cogs' as const,
    title: `Costo Venta ${s.id}`,
    subtitle: `${s.cantidad} unidad(es) de mercancía vendida`,
    montoMXN: s.costoUnidadesVendidasMXN,
    fecha: s.fecha,
    tag: 'Mercancía Vendida',
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  }));

  const batchExpList = batches.flatMap((b) =>
    b.gastosDeCompra.map((g) => ({
      id: `batch-exp-${b.id}-${g.id}`,
      type: 'compras' as const,
      title: `${g.nombre} (Lote ${b.id})`,
      subtitle: `Proveedor: ${b.proveedor || 'N/A'}`,
      montoMXN: g.montoMXN,
      fecha: b.fecha,
      tag: 'Gasto de Compra',
      color: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
    }))
  );

  const allItems = [...opExpList, ...salesCogsList, ...batchExpList]
    .filter((item) => {
      if (filterType !== 'todos' && item.type !== filterType) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return item.title.toLowerCase().includes(q) || item.subtitle.toLowerCase().includes(q);
    })
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-surface-container-high border border-outline-variant w-full max-w-xl rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-outline-variant flex items-center justify-between bg-surface-container">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-sm">
              <span className="material-symbols-outlined text-xl">account_balance_wallet</span>
            </div>
            <div>
              <h2 className="text-sm font-headline font-bold text-on-surface">
                Gasto Histórico
              </h2>
              <p className="text-[10px] text-on-surface-variant">
                Detalle y acumulado total de todos los egresos del negocio
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

        {/* Grand Total Summary Card */}
        <div className="p-4 bg-surface-container border-b border-outline-variant/40 space-y-3">
          <div className="bg-gradient-to-r from-rose-500/10 via-surface-container-high to-rose-500/10 border border-rose-500/30 rounded-xl p-3.5 flex flex-col gap-1 shadow-inner">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
              Gasto Acumulado Total Histórico
            </span>
            <span className="text-2xl font-headline font-extrabold text-rose-400">
              {formatMoney(grandTotalExpenses, displayCurrency, exchangeRate)}
            </span>
          </div>

          {/* Breakdown Pills */}
          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-2 flex flex-col">
              <span className="text-on-surface-variant">Costo Mercancía</span>
              <span className="font-bold text-amber-400 mt-0.5">
                {formatMoney(totalCogs, displayCurrency, exchangeRate)}
              </span>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-2 flex flex-col">
              <span className="text-on-surface-variant">Gastos Operativos</span>
              <span className="font-bold text-rose-400 mt-0.5">
                {formatMoney(totalOpExp, displayCurrency, exchangeRate)}
              </span>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-2 flex flex-col">
              <span className="text-on-surface-variant">Fletes & Envíos Lotes</span>
              <span className="font-bold text-sky-400 mt-0.5">
                {formatMoney(totalBatchExtraExp, displayCurrency, exchangeRate)}
              </span>
            </div>
          </div>
        </div>

        {/* Filter & Search */}
        <div className="px-4 py-2.5 border-b border-outline-variant/30 flex flex-col gap-2 bg-surface-container-lowest/50">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">
              search
            </span>
            <input
              type="text"
              placeholder="Buscar gasto o concepto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-container border border-outline-variant text-on-surface text-xs rounded-lg py-1.5 pl-8 pr-3 focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex gap-1 overflow-x-auto text-[10px] pb-1">
            <button
              onClick={() => setFilterType('todos')}
              className={`px-2.5 py-1 rounded-md font-bold whitespace-nowrap transition-colors ${
                filterType === 'todos'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Todos ({allItems.length})
            </button>
            <button
              onClick={() => setFilterType('operativos')}
              className={`px-2.5 py-1 rounded-md font-bold whitespace-nowrap transition-colors ${
                filterType === 'operativos'
                  ? 'bg-rose-500 text-white'
                  : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Operativos
            </button>
            <button
              onClick={() => setFilterType('cogs')}
              className={`px-2.5 py-1 rounded-md font-bold whitespace-nowrap transition-colors ${
                filterType === 'cogs'
                  ? 'bg-amber-500 text-white'
                  : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Mercancía Vendida
            </button>
            <button
              onClick={() => setFilterType('compras')}
              className={`px-2.5 py-1 rounded-md font-bold whitespace-nowrap transition-colors ${
                filterType === 'compras'
                  ? 'bg-sky-500 text-white'
                  : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Envíos Compras
            </button>
          </div>
        </div>

        {/* List of expenses */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2 text-xs">
          {allItems.length === 0 ? (
            <div className="text-center py-12 text-on-surface-variant">
              <span className="material-symbols-outlined text-3xl mb-1 text-outline">search_off</span>
              <p>No se encontraron registros de gastos.</p>
            </div>
          ) : (
            allItems.map((item) => (
              <div
                key={item.id}
                className="bg-surface-container border border-outline-variant/40 rounded-xl p-3 flex justify-between items-center hover:border-outline-variant transition-colors"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-on-surface text-xs">{item.title}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${item.color}`}>
                      {item.tag}
                    </span>
                  </div>
                  <p className="text-[10px] text-on-surface-variant">
                    {item.subtitle} • {item.fecha ? item.fecha.slice(0, 10) : ''}
                  </p>
                </div>

                <div className="text-right">
                  <span className="font-mono font-bold text-rose-400 text-xs">
                    -{formatMoney(item.montoMXN, displayCurrency, exchangeRate)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
