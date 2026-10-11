import React, { Suspense, useMemo } from 'react';
import type { VitrinaAvatar } from '../../types';

// ¡NUNCA import estático! lottie-react (~500KB) se descarga bajo demanda
const Lottie = React.lazy(() => import('lottie-react'));

// Presets flat/familiares (figuras geométricas que parpadean/saludan)
import luna from './presets/luna.json';
import nube from './presets/nube.json';
import rombo from './presets/rombo.json';

const PRESETS: Record<string, unknown> = { luna, nube, rombo };

// Lottie lee colores como arrays RGB normalizados; convierte strings "#RRGGBB"
const hexARgb = (hex: string): number[] => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1];
};

const normalizarColores = (nodo: unknown): unknown => {
  if (typeof nodo === 'string') {
    return /^#[0-9a-fA-F]{6}$/.test(nodo) ? hexARgb(nodo) : nodo;
  }
  if (Array.isArray(nodo)) return nodo.map(normalizarColores);
  if (nodo && typeof nodo === 'object') {
    const limpio: Record<string, unknown> = {};
    for (const key of Object.keys(nodo)) {
      limpio[key] = normalizarColores((nodo as Record<string, unknown>)[key]);
    }
    return limpio;
  }
  return nodo;
};

/** Recolorea el preset: string-replace del primer color hex del JSON (el de marca) */
const pintarPreset = (preset: unknown, color?: string): unknown => {
  let crudo = JSON.stringify(preset);
  const match = crudo.match(/#[0-9a-fA-F]{6}/);
  if (match && color && /^#[0-9a-fA-F]{6}$/.test(color)) {
    crudo = crudo.split(match[0]).join(color); // pinta todas las partes de marca
  }
  return normalizarColores(JSON.parse(crudo));
};

export interface AvatarLottieProps extends Partial<VitrinaAvatar> {
  preset: string;
  nombre: string;
  color: string;
  /** Si el nombre del avatar está vacío, muestra el nombre del negocio */
  nombreNegocio?: string;
  className?: string;
}

export const AvatarLottie: React.FC<AvatarLottieProps> = ({
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

  const animationData = useMemo(
    () => pintarPreset(PRESETS[preset] ?? luna, color),
    [preset, color]
  );

  return (
    <div className={`flex items-center gap-3 ${className ?? ''}`}>
      <div className="w-16 h-16 shrink-0 rounded-2xl bg-white/90 p-1 shadow-md">
        <Suspense
          fallback={
            <div className="w-full h-full rounded-xl bg-surface-container animate-pulse" />
          }
        >
          <Lottie
            animationData={animationData}
            loop
            autoplay
            className="w-full h-full"
          />
        </Suspense>
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
