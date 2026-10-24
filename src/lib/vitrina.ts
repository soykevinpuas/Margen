import {
  Firestore,
  DocumentReference,
  DocumentData,
  getDoc,
  doc,
  writeBatch,
} from 'firebase/firestore';
import { VitrinaConfig } from '../types';

// Slug válido: 3-30 caracteres, inicia alfanumérico, admite guiones y guiones bajos
const SLUG_REGEX = /^[a-z0-9][a-z0-9_-]{2,29}$/;

// Elimina campos undefined (Firestore los rechaza en las escrituras)
const limpiarUndefined = (obj: unknown): unknown => {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(limpiarUndefined);
  if (typeof obj === 'object') {
    const limpio: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) {
      const valor = (obj as Record<string, unknown>)[key];
      if (valor !== undefined) limpio[key] = limpiarUndefined(valor);
    }
    return limpio;
  }
  return obj;
};

/** Normaliza a slug: minúsculas y espacios→guiones; devuelve '' si no es válido */
export function normalizeSlug(text: string): string {
  const slug = text.toLowerCase().trim().replace(/\s+/g, '-');
  return SLUG_REGEX.test(slug) ? slug : '';
}

/** Link de WhatsApp con el mensaje prellenado */
export function buildWhatsAppLink(whatsapp: string, mensaje: string): string {
  return `https://wa.me/${whatsapp.trim()}?text=${encodeURIComponent(mensaje)}`;
}

/** Verifica que el slug esté libre (no exista en vitrinas/) */
export async function checkSlugAvailable(
  db: Firestore,
  slug: string
): Promise<boolean> {
  if (!SLUG_REGEX.test(slug)) return false; // formato inválido → no disponible

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    // Timeout defensivo: evita que el spinner quede pegado si la red no responde
    const snap = await Promise.race([
      getDoc(doc(db, 'vitrinas', slug)),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('Tiempo de espera agotado al verificar slug')),
          8000
        );
      }),
    ]);
    return !snap.exists();
  } finally {
    if (timer) clearTimeout(timer);
  }
}

type VitrinaOp =
  | { tipo: 'set'; ref: DocumentReference; data: DocumentData; merge?: boolean }
  | { tipo: 'update'; ref: DocumentReference; data: DocumentData }
  | { tipo: 'delete'; ref: DocumentReference };

/**
 * Única función que escribe la vitrina de un negocio:
 * - reemplaza el bloque `vitrina` en settings/config
 * - doc público vitrinas/{slug} (crear/actualizar; activa:false reserva el slug)
 * - borra el doc viejo si el slug cambió
 */
export async function syncVitrinaIndex(
  db: Firestore,
  uid: string,
  businessId: string,
  config: VitrinaConfig,
  businessName: string
): Promise<void> {
  // Lee la config actual para detectar si el slug cambió
  const settingsSnap = await getDoc(
    doc(db, 'users', uid, 'businesses', businessId, 'settings', 'config')
  );
  const oldSlug = (settingsSnap.data()?.vitrina as VitrinaConfig | undefined)?.slug;
  const newSlug = config.slug?.trim() || undefined;
  const settingsRef = doc(
    db,
    'users',
    uid,
    'businesses',
    businessId,
    'settings',
    'config'
  );
  const settingsData = { vitrina: limpiarUndefined(config) } as DocumentData;

  const ops: VitrinaOp[] = [
    // 1) Reemplaza el bloque vitrina en settings/config (update = reemplazo del mapa)
    settingsSnap.exists()
      ? { tipo: 'update', ref: settingsRef, data: settingsData }
      : { tipo: 'set', ref: settingsRef, data: settingsData, merge: true },
  ];

  // 2) Índice público (solo campos públicos)
  if (newSlug) {
    const indexData: DocumentData = limpiarUndefined({
      uid,
      businessId,
      activa: config.activa,
      nombreNegocio: businessName,
      ...(config.whatsapp !== undefined && { whatsapp: config.whatsapp }),
      ...(config.mensajePlantilla !== undefined && {
        mensajePlantilla: config.mensajePlantilla,
      }),
      ...(config.avatar !== undefined && { avatar: config.avatar }),
      // Destacados no son sensibles: se exponen para ordenar la vitrina
      ...(config.productosDestacados !== undefined && {
        productosDestacados: config.productosDestacados,
      }),
    }) as DocumentData;
    ops.push({ tipo: 'set', ref: doc(db, 'vitrinas', newSlug), data: indexData });
  }

  // 3) Si el slug cambió, borra el doc viejo (solo si existe)
  if (oldSlug && oldSlug !== newSlug) {
    const oldIndexSnap = await getDoc(doc(db, 'vitrinas', oldSlug));
    if (oldIndexSnap.exists()) {
      ops.push({ tipo: 'delete', ref: doc(db, 'vitrinas', oldSlug) });
    }
  }

  const batch = writeBatch(db);
  ops.forEach((op) => {
    if (op.tipo === 'delete') {
      batch.delete(op.ref);
    } else if (op.tipo === 'update') {
      batch.update(op.ref, op.data);
    } else if (op.merge) {
      batch.set(op.ref, op.data, { merge: true });
    } else {
      batch.set(op.ref, op.data);
    }
  });
  await batch.commit();
}
