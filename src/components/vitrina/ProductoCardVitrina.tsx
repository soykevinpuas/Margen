import React, { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { ImagenZoom } from '../ImagenZoom';
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

interface ProductoCardVitrinaProps {
  producto: Product;
  whatsapp?: string;
  mensajePlantilla?: string;
}

export const ProductoCardVitrina: React.FC<ProductoCardVitrinaProps> = ({
  producto,
  whatsapp,
  mensajePlantilla,
}) => {
  // Precarga la foto para detectar onError (ImagenZoom no expone onError)
  const [estadoImg, setEstadoImg] = useState<'cargando' | 'ok' | 'error'>(
    producto.imagen ? 'cargando' : 'error'
  );

  useEffect(() => {
    if (!producto.imagen) {
      setEstadoImg('error');
      return;
    }
    setEstadoImg('cargando');
    const img = new Image();
    img.onload = () => setEstadoImg('ok');
    img.onerror = () => setEstadoImg('error');
    img.src = producto.imagen;
  }, [producto.imagen]);

  const hayStock = producto.stockDisponible != null && producto.stockDisponible > 0;
  const agotado = producto.stockDisponible === 0;
  const linkWa =
    whatsapp && whatsapp.trim()
      ? buildWhatsAppLink(
          whatsapp,
          buildMensaje(mensajePlantilla, producto.nombre, producto.precioSugerido)
        )
      : null;

  return (
    <article className="bg-surface-container border border-outline-variant/40 rounded-2xl overflow-hidden shadow-sm flex flex-col">
      {/* Foto (zoom opcional); sin imagen o error → placeholder con iniciales */}
      <div className="relative aspect-square bg-surface-container-highest/40">
        {estadoImg === 'ok' && producto.imagen ? (
          <ImagenZoom
            src={producto.imagen}
            alt={producto.nombre}
            className="w-full h-full"
            imgClassName="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-primary/10">
            <span className="text-4xl font-headline font-extrabold text-primary/40">
              {producto.nombre.trim().charAt(0).toUpperCase() || '?'}
            </span>
          </div>
        )}
        {estadoImg === 'cargando' && (
          <div className="absolute inset-0 animate-pulse bg-surface-container-highest/30" />
        )}
        {/* Disponibilidad: undefined → sin badge */}
        {producto.stockDisponible != null && (
          <span
            className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide shadow-sm ${
              agotado
                ? 'bg-error/90 text-on-error'
                : hayStock
                  ? 'bg-emerald-500/90 text-white'
                  : 'bg-surface-container-highest/90 text-on-surface'
            }`}
          >
            {agotado ? 'Agotado' : 'Disponible'}
          </span>
        )}
      </div>

      <div className="p-3 flex flex-col gap-1 flex-1">
        <h3 className="text-sm font-bold text-on-surface leading-snug">
          {producto.nombre}
        </h3>

        {producto.precioSugerido != null && (
          <p className="text-base font-headline font-extrabold text-primary">
            {fmtMoneda.format(producto.precioSugerido)}
          </p>
        )}

        {producto.descripcion && (
          <p className="text-[11px] text-on-surface-variant leading-snug line-clamp-2">
            {producto.descripcion}
          </p>
        )}

        <div className="flex-1" />

        {linkWa && (
          <a
            href={linkWa}
            target="_blank"
            rel="noopener noreferrer"
            className={`mt-2 w-full py-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
              agotado
                ? 'bg-surface-container-highest text-on-surface-variant'
                : 'bg-primary text-on-primary hover:opacity-95 shadow-sm'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            {agotado ? 'Preguntar por WhatsApp' : 'Pedir por WhatsApp'}
          </a>
        )}
      </div>
    </article>
  );
};
