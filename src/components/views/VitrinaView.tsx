import React, { useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { Store, MessageCircle, AlertCircle } from 'lucide-react';
import { db } from '../../lib/firebase';
import type { Category, Product, VitrinaIndex } from '../../types';
import { buildWhatsAppLink } from '../../lib/vitrina';
import { AvatarAnimado } from '../vitrina/AvatarAnimado';
import { ProductoCardVitrina } from '../vitrina/ProductoCardVitrina';

interface VitrinaViewProps {
  slug: string;
}

type Estado = 'cargando' | 'no-disponible' | 'lista';

export const VitrinaView: React.FC<VitrinaViewProps> = ({ slug }) => {
  const [estado, setEstado] = useState<Estado>('cargando');
  const [vitrina, setVitrina] = useState<VitrinaIndex | null>(null);
  const [productos, setProductos] = useState<Product[]>([]);
  const [categorias, setCategorias] = useState<Category[]>([]);
  const [categoriaActiva, setCategoriaActiva] = useState<string>('todas');

  useEffect(() => {
    let cancelado = false;

    const cargar = async () => {
      try {
        // 1) Índice público vitrinas/{slug}
        const snap = await getDoc(doc(db, 'vitrinas', slug));
        if (cancelado) return;
        const data = snap.data() as (VitrinaIndex & {
          productosDestacados?: string[];
        }) | undefined;

        if (!snap.exists() || !data?.activa) {
          setEstado('no-disponible');
          return;
        }
        setVitrina(data);

        // 2) Productos del negocio (solo activos, filtrado en cliente)
        const prodsSnap = await getDocs(
          collection(
            db,
            'users',
            data.uid,
            'businesses',
            data.businessId,
            'products'
          )
        );
        if (cancelado) return;
        const lista = prodsSnap.docs
          .map((d) => ({ ...d.data(), id: d.id } as Product))
          .filter((p) => p.archivado === false);

        // 3) Categorías públicas (si fallan, la vitrina sigue mostrando productos)
        let categoriasLista: Category[] = [];
        try {
          const catsSnap = await getDocs(
            collection(
              db,
              'users',
              data.uid,
              'businesses',
              data.businessId,
              'categories'
            )
          );
          categoriasLista = catsSnap.docs
            .map((d) => ({ ...d.data(), id: d.id } as Category))
            .filter((c) => !c.archived);
        } catch (err) {
          console.error('No se pudieron cargar las categorías:', err);
        }
        if (cancelado) return;

        // 4) Destacados primero (si el dueño los marcó)
        if (data.productosDestacados?.length) {
          lista.sort(
            (a, b) =>
              (data.productosDestacados!.indexOf(a.id) === -1
                ? 9999
                : data.productosDestacados!.indexOf(a.id)) -
              (data.productosDestacados!.indexOf(b.id) === -1
                ? 9999
                : data.productosDestacados!.indexOf(b.id))
          );
        }
        setCategorias(categoriasLista);
        setProductos(lista);
        setEstado('lista');
      } catch (err) {
        console.error('Error cargando vitrina:', err);
        if (!cancelado) setEstado('no-disponible');
      }
    };

    void cargar();
    return () => {
      cancelado = true;
    };
  }, [slug]);

  // ---------- Cargando ----------
  if (estado === 'cargando') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 text-on-surface">
        <div className="w-10 h-10 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-on-surface-variant">
          Abriendo vitrina...
        </p>
      </div>
    );
  }

  // ---------- No disponible ----------
  if (estado === 'no-disponible') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-surface-container border border-outline-variant flex items-center justify-center text-on-surface-variant">
          <Store className="w-8 h-8" />
        </div>
        <h1 className="text-lg font-headline font-bold text-on-surface">
          Esta vitrina no está disponible
        </h1>
        <p className="text-xs text-on-surface-variant max-w-xs leading-relaxed">
          El negocio aún no ha activado su vitrina pública o el enlace no es
          correcto.
        </p>
      </div>
    );
  }

  // ---------- Vitrina activa ----------
  const avatar = vitrina?.avatar;
  const whatsapp = vitrina?.whatsapp?.trim() || '';
  const saludo =
    avatar?.saludo?.trim() || `¡Hola! Bienvenido a ${vitrina?.nombreNegocio}`;

  // Categorías con al menos un producto visible (orden alfabético)
  const categoriasVisibles = categorias
    .map((c) => ({
      ...c,
      total: productos.filter((p) => p.categoriaId === c.id).length,
    }))
    .filter((c) => c.total > 0)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  const productosFiltrados =
    categoriaActiva === 'todas'
      ? productos
      : productos.filter((p) => p.categoriaId === categoriaActiva);

  return (
    <div className="min-h-screen bg-background text-on-surface font-sans flex flex-col antialiased">
      {/* Header: avatar + nombre del negocio */}
      <header className="sticky top-0 z-10 bg-surface/90 backdrop-blur border-b border-outline-variant/30 px-4 py-3.5">
        <AvatarAnimado
          preset={avatar?.preset || 'luna'}
          nombre={avatar?.nombre || ''}
          color={avatar?.color || '#10B981'}
          saludo={saludo}
          nombreNegocio={vitrina?.nombreNegocio}
        />

        {/* Filtro por categorías (solo las que tienen productos) */}
        {categoriasVisibles.length > 0 && (
          <div className="mt-3 -mx-4 px-4 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1.5 w-max pb-0.5">
              <button
                type="button"
                onClick={() => setCategoriaActiva('todas')}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap border transition-colors ${
                  categoriaActiva === 'todas'
                    ? 'bg-primary text-on-primary border-primary'
                    : 'bg-surface-container-high text-on-surface-variant border-outline-variant hover:text-on-surface'
                }`}
              >
                Todos <span className="opacity-70">({productos.length})</span>
              </button>

              {categoriasVisibles.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoriaActiva(c.id)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap border transition-colors ${
                    categoriaActiva === c.id
                      ? 'bg-primary text-on-primary border-primary'
                      : 'bg-surface-container-high text-on-surface-variant border-outline-variant hover:text-on-surface'
                  }`}
                >
                  {c.nombre} <span className="opacity-70">({c.total})</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 w-full max-w-md lg:max-w-3xl mx-auto p-4">
        {productos.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface-container border border-outline-variant flex items-center justify-center text-on-surface-variant">
              <Store className="w-8 h-8" />
            </div>
            <h2 className="text-base font-headline font-bold text-on-surface">
              Pronto tendremos productos
            </h2>
            <p className="text-xs text-on-surface-variant max-w-xs">
              Estamos preparando nuestro catálogo. Pregunta por WhatsApp y te
              avisamos.
            </p>
            {whatsapp ? (
              <a
                href={buildWhatsAppLink(
                  whatsapp,
                  `Hola, vi la vitrina de ${vitrina?.nombreNegocio}. ¿Qué productos tienen?`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 px-4 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm hover:opacity-95 active:scale-95 transition-all"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Preguntar por WhatsApp
              </a>
            ) : (
              <p className="text-[10px] text-on-surface-variant flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                El negocio aún no tiene WhatsApp configurado
              </p>
            )}
          </div>
        ) : productosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-surface-container border border-outline-variant flex items-center justify-center text-on-surface-variant">
              <Store className="w-7 h-7" />
            </div>
            <h2 className="text-sm font-headline font-bold text-on-surface">
              No hay productos en esta categoría
            </h2>
            <p className="text-xs text-on-surface-variant max-w-xs">
              Prueba con otra categoría o revisa todo el catálogo.
            </p>
          </div>
        ) : (
          /* Grid de productos (mobile-first) */
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {productosFiltrados.map((p) => {
              const categoria = categorias.find(
                (c) => c.id === p.categoriaId
              );

              return (
                <ProductoCardVitrina
                  key={p.id}
                  producto={p}
                  whatsapp={whatsapp}
                  mensajePlantilla={vitrina?.mensajePlantilla}
                  categoriaNombre={categoria?.nombre}
                />
              );
            })}
          </div>
        )}
      </main>

      <footer className="py-4 text-center text-[9px] text-on-surface-variant/60">
        Vitrina con Margen
      </footer>
    </div>
  );
};
