import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  X,
} from 'lucide-react';
import type { Product } from '../../types';
import { buildWhatsAppLink } from '../../lib/vitrina';

// Precio en MXN (precioSugerido es moneda contable base)
const fmtMoneda = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
});

/** Interpola {nombre} y {precio} en la plantilla (o usa el default) */
const buildMensaje = (
  plantilla: string | undefined,
  nombre: string,
  precio?: number
): string => {
  const base = plantilla?.trim() || 'Hola, me interesa: {nombre} ({precio})';
  const precioTxt = precio != null ? fmtMoneda.format(precio) : '';
  return base.replaceAll('{nombre}', nombre).replaceAll('{precio}', precioTxt);
};

interface ProductoDetalleVitrinaProps {
  producto: Product;
  whatsapp?: string;
  mensajePlantilla?: string;
  categoriaNombre?: string;
  onClose: () => void;
}

/**
 * Detalle público de un producto: portada + sinopsis en un carrusel
 * deslizable (swipe) y botón de WhatsApp.
 */
export const ProductoDetalleVitrina: React.FC<ProductoDetalleVitrinaProps> = ({
  producto,
  whatsapp,
  mensajePlantilla,
  categoriaNombre,
  onClose,
}) => {
  const [slide, setSlide] = useState(0);
  const [imgError, setImgError] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const sinopsis = producto.descripcion?.trim() || '';
  const totalSlides = sinopsis ? 2 : 1;

  const hayStock =
    producto.stockDisponible != null && producto.stockDisponible > 0;
  const agotado = producto.stockDisponible === 0;

  const linkWa =
    whatsapp && whatsapp.trim()
      ? buildWhatsAppLink(
          whatsapp,
          buildMensaje(
            mensajePlantilla,
            producto.nombre,
            producto.precioSugerido
          )
        )
      : null;

  const irASlide = (idx: number) => {
    const track = trackRef.current;
    if (!track) return;
    const destino = Math.max(0, Math.min(idx, totalSlides - 1));
    track.scrollTo({ left: destino * track.clientWidth, behavior: 'smooth' });
    setSlide(destino);
  };

  const handleScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    const idx = Math.round(track.scrollLeft / track.clientWidth);
    if (idx !== slide) setSlide(idx);
  };

  // Bloquea el scroll del fondo y permite cerrar con Escape
  useEffect(() => {
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[120] bg-background/90 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={producto.nombre}
        className="bg-surface-container-high border border-outline-variant w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-outline-variant flex items-start justify-between gap-3">
          <div className="min-w-0">
            {categoriaNombre && (
              <p className="text-[9px] font-bold uppercase tracking-wider text-on-surface-variant/70 truncate">
                {categoriaNombre}
              </p>
            )}
            <h2 className="text-sm font-headline font-bold text-on-surface leading-snug">
              {producto.nombre}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="w-8 h-8 shrink-0 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Carrusel: portada ↔ sinopsis */}
        <div className="relative bg-surface-container-lowest">
          <div
            ref={trackRef}
            onScroll={handleScroll}
            className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar"
          >
            {/* Slide 1: portada */}
            <div className="min-w-full snap-center h-[42vh] min-h-[220px] max-h-[420px] flex items-center justify-center bg-black/20">
              {producto.imagen && !imgError ? (
                <img
                  src={producto.imagen}
                  alt={producto.nombre}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-primary/10 text-primary/50">
                  <span className="text-6xl font-headline font-extrabold">
                    {producto.nombre.trim().charAt(0).toUpperCase() || '?'}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Sin portada
                  </span>
                </div>
              )}
            </div>

            {/* Slide 2: sinopsis */}
            {sinopsis && (
              <div className="min-w-full snap-center h-[42vh] min-h-[220px] max-h-[420px] overflow-y-auto p-5 bg-surface-container">
                <div className="flex items-center gap-1.5 text-primary mb-2">
                  <BookOpen className="w-4 h-4" />
                  <h3 className="text-[10px] font-extrabold uppercase tracking-wider">
                    Sinopsis
                  </h3>
                </div>
                <p className="text-xs leading-relaxed text-on-surface whitespace-pre-line">
                  {sinopsis}
                </p>
              </div>
            )}
          </div>

          {/* Flechas (desktop) */}
          {totalSlides > 1 && (
            <>
              <button
                type="button"
                onClick={() => irASlide(slide - 1)}
                disabled={slide === 0}
                aria-label="Anterior"
                className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/70 backdrop-blur items-center justify-center text-on-surface disabled:opacity-0 transition-opacity"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => irASlide(slide + 1)}
                disabled={slide === totalSlides - 1}
                aria-label="Siguiente"
                className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/70 backdrop-blur items-center justify-center text-on-surface disabled:opacity-0 transition-opacity"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Indicador / hint de swipe */}
        {totalSlides > 1 && (
          <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-outline-variant/30 bg-background/30">
            <span className="text-[9px] font-semibold text-on-surface-variant">
              {slide === 0
                ? 'Desliza para ver la sinopsis →'
                : '← Desliza para volver a la portada'}
            </span>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalSlides }).map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => irASlide(idx)}
                  aria-label={`Ir a la vista ${idx + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    slide === idx
                      ? 'w-5 bg-primary'
                      : 'w-1.5 bg-on-surface-variant/40'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Info + WhatsApp */}
        <div className="p-4 space-y-3 overflow-y-auto">
          <div className="flex items-center justify-between gap-3">
            {producto.precioSugerido != null ? (
              <p className="text-xl font-headline font-extrabold text-primary">
                {fmtMoneda.format(producto.precioSugerido)}
              </p>
            ) : (
              <span />
            )}

            {producto.stockDisponible != null && (
              <span
                className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${
                  agotado
                    ? 'bg-error/15 text-error border border-error/30'
                    : hayStock
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-surface-container-highest text-on-surface-variant border border-outline-variant'
                }`}
              >
                {agotado ? 'Agotado' : 'Disponible'}
              </span>
            )}
          </div>

          {sinopsis && (
            <button
              type="button"
              onClick={() => irASlide(slide === 1 ? 0 : 1)}
              className="w-full py-2 rounded-xl border border-outline-variant bg-surface-container text-on-surface-variant text-[11px] font-bold flex items-center justify-center gap-1.5 hover:text-primary hover:border-primary/40 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              {slide === 1 ? 'Ver portada' : 'Leer sinopsis'}
            </button>
          )}

          {linkWa ? (
            <a
              href={linkWa}
              target="_blank"
              rel="noopener noreferrer"
              className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                agotado
                  ? 'bg-surface-container-highest text-on-surface-variant'
                  : 'bg-primary text-on-primary hover:opacity-95 shadow-sm'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              {agotado ? 'Preguntar por WhatsApp' : 'Pedir por WhatsApp'}
            </a>
          ) : (
            <p className="text-[10px] text-on-surface-variant text-center">
              El negocio aún no tiene WhatsApp configurado.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
