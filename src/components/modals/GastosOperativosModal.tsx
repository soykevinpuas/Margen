import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatMoney } from '../../utils/calculations';

interface GastosOperativosModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GastosOperativosModal: React.FC<GastosOperativosModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { settings, operatingExpenses } = useApp();
  const { displayCurrency, exchangeRate } = settings;

  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filtered = operatingExpenses.filter((e) =>
    e.concepto.toLowerCase().includes(search.toLowerCase()) ||
    e.categoria.toLowerCase().includes(search.toLowerCase())
  );

  const totalSumMXN = operatingExpenses.reduce((acc, e) => acc + e.montoMXN, 0);

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-surface-container-high border border-outline-variant w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-surface-variant border border-outline-variant flex items-center justify-center text-on-surface">
              <span className="material-symbols-outlined text-lg">
                account_balance_wallet
              </span>
            </div>
            <div>
              <h2 className="text-sm font-headline font-bold text-on-surface">
                Gastos Operativos (Detalle)
              </h2>
              <p className="text-[10px] text-on-surface-variant">
                Total acumulado:{' '}
                {formatMoney(totalSumMXN, displayCurrency, exchangeRate)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-outline-variant/30">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">
              search
            </span>
            <input
              type="text"
              placeholder="Buscar concepto o categoría..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-container border border-outline-variant text-on-surface text-xs rounded-lg py-2 pl-8 pr-3 focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2 text-xs">
          {filtered.length === 0 ? (
            <p className="text-center py-8 text-on-surface-variant">
              No se encontraron gastos registrados.
            </p>
          ) : (
            filtered.map((exp) => (
              <div
                key={exp.id}
                className="bg-surface-container border border-outline-variant rounded-xl p-3 flex justify-between items-center"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-on-surface text-xs">
                      {exp.concepto}
                    </span>
                    {exp.esRecurrente && (
                      <span className="bg-primary/20 text-primary text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                        Recurrente
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-on-surface-variant capitalize mt-0.5">
                    Cat: {exp.categoria} • {exp.fecha}
                  </p>
                </div>

                <div className="text-right font-bold text-error text-sm">
                  -{formatMoney(exp.montoMXN, displayCurrency, exchangeRate)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
