import React from 'react';
import type { VitrinaAvatar } from '../../types';

/**
 * Avatar animado de la vitrina (CSS/SVG puro, sin librerías).
 * 3 presets flat/familiares: luna, nube, rombo.
 */
export interface AvatarAnimadoProps extends Partial<VitrinaAvatar> {
  preset: string;
  nombre: string;
  color: string;
  /** Si el nombre del avatar está vacío, muestra el nombre del negocio */
  nombreNegocio?: string;
  className?: string;
}

// Figura plana por preset (estilo flat, sin anime)
const Figura: React.FC<{ preset: string; color: string }> = ({
  preset,
  color,
}) => {
  const common = { fill: color };
  if (preset === 'nube') {
    // Nube que flota
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
        <ellipse className="animate-flotar-avatar" cx="32" cy="36" rx="20" ry="14" {...common} />
        <circle cx="22" cy="30" r="10" {...common} />
        <circle cx="34" cy="24" r="12" {...common} />
        <circle cx="44" cy="31" r="9" {...common} />
      </svg>
    );
  }
  if (preset === 'rombo') {
    // Rombo que saluda (se inclina)
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
        <g className="animate-saludo-avatar" style={{ transformOrigin: '32px 46px' }}>
          <polygon points="32,8 54,32 32,56 10,32" {...common} />
          <circle cx="26" cy="30" r="2.5" fill="#ffffff" opacity="0.9" />
          <circle cx="38" cy="30" r="2.5" fill="#ffffff" opacity="0.9" />
        </g>
      </svg>
    );
  }
  // luna (default): redondo que rebota
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
      <g className="animate-rebote-avatar">
        <circle cx="32" cy="34" r="22" {...common} />
        <circle cx="25" cy="30" r="3" fill="#ffffff" opacity="0.9" />
        <circle cx="39" cy="30" r="3" fill="#ffffff" opacity="0.9" />
        <path
          d="M24 40 Q32 47 40 40"
          stroke="#ffffff"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.9"
        />
      </g>
    </svg>
  );
};

export const AvatarAnimado: React.FC<AvatarAnimadoProps> = ({
  preset,
  nombre,
  color,
  saludo,
  nombreNegocio,
  className,
}) => {
  // Fallback: nombre vacío → nombre del negocio
  const nombreMostrar = (nombre || '').trim() || (nombreNegocio || '').trim();
  const saludoMostrar = (saludo || '').trim() || '¡Hola!';
  const colorValido = /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#10B981';

  return (
    <div className={`flex items-center gap-3 ${className ?? ''}`}>
      <div className="w-16 h-16 shrink-0 rounded-2xl bg-white/90 p-1.5 shadow-md">
        <Figura preset={preset} color={colorValido} />
      </div>
      {nombreMostrar && (
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-primary">{saludoMostrar}</p>
          <p className="text-sm font-headline font-bold text-on-surface truncate">
            {nombreMostrar}
          </p>
        </div>
      )}
    </div>
  );
};
