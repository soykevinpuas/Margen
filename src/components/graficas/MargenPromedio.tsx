import React from 'react';

interface MargenPromedioProps {
  // Margen promedio de ventas en porcentaje (0-100)
  promedioPorcentaje: number;
}

// Card con el margen promedio de ventas y barra de progreso
export const MargenPromedio: React.FC<MargenPromedioProps> = ({ promedioPorcentaje }) => {
  const barWidth = Math.min(100, promedioPorcentaje);

  return (
    <div className="bg-surface-container rounded-xl p-4 border border-outline-variant flex flex-col justify-between">
      <span className="text-xs text-on-surface-variant font-bold">
        Margen Prom. Ventas
      </span>
      <div className="flex items-baseline gap-1 mt-1">
        <span className="text-2xl font-headline font-bold text-on-surface">
          {promedioPorcentaje.toFixed(0)}
        </span>
        <span className="text-xs font-bold text-on-surface-variant">%</span>
      </div>
      <div className="mt-2 w-full bg-surface-container-high rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-tertiary h-full rounded-full"
          style={{ width: `${barWidth}%` }}
        ></div>
      </div>
    </div>
  );
};