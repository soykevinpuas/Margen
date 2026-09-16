import React from 'react';

// Categoría de gasto con su monto ya sumado
export interface ExpenseCategoryEntry {
  cat: string;
  name: string;
  icon: string;
  amount: number;
}

interface GastosCategoriaProps {
  // Categorías con gastos mayores a cero, ya calculadas por la vista
  categorias: ExpenseCategoryEntry[];
  // Total de gastos operativos (denominador del %)
  totalGastos: number;
  // Formatea un monto a la moneda de la app
  formatMoney: (value: number) => string;
}

// Barras de gastos operativos por categoría con porcentaje del total
export const GastosCategoria: React.FC<GastosCategoriaProps> = ({
  categorias,
  totalGastos,
  formatMoney,
}) => (
  <div className="bg-surface-container rounded-xl p-4 border border-outline-variant flex flex-col gap-3">
    <h2 className="text-sm font-headline font-bold text-on-surface">
      Gastos Operativos por Categoría
    </h2>

    {categorias.length === 0 ? (
      <p className="text-xs text-on-surface-variant text-center py-4">
        No se han registrado gastos operativos en este periodo.
      </p>
    ) : (
      <div className="flex flex-col gap-3">
        {categorias.map((item) => {
          const pct =
            totalGastos > 0 ? Math.round((item.amount / totalGastos) * 100) : 0;

          return (
            <div key={item.cat} className="flex flex-col gap-1">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-on-surface flex items-center gap-1.5 capitalize">
                  <span className="material-symbols-outlined text-[14px] text-primary">
                    {item.icon}
                  </span>{' '}
                  {item.name}
                </span>
                <span className="text-on-surface-variant font-bold">
                  {formatMoney(item.amount)} ({pct}%)
                </span>
              </div>
              <div className="w-full bg-surface-container-high rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full"
                  style={{ width: `${pct}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);