---
name: disenar-arquitectura
description: "Usa cuando una tarea requiera decidir el esquema de Firestore (colecciones, documentos, reglas), agregar campos o colecciones, elegir librerías nuevas, o definir fronteras entre módulos. Firestore, reglas, firestore.rules, colecciones, arquitecto, decisiones técnicas."
---

# Diseñar arquitectura — Manual del arquitecto

Cuándo actúa: cuando algo toca el diseño (colección/campo nuevo, reglas de seguridad, librería nueva, o división de módulos).

## Cómo diseñar en este proyecto

### Esquema de datos (Firestore)
- TODO vive bajo `users/{uid}/`: `categories`, `products`, `batches`, `sales`, `expenses`, `adjustments` y `settings/config`.
- Un documento por registro; el `id` del documento es el `id` del objeto (ej. `L-4928`, `V-8942`, `prod-…`).
- Prefiere **subcolecciones bajo el usuario**; evita colecciones globales (rompen el aislamiento por `uid`).
- Agregar un campo nuevo: revisa `src/types.ts`, el objeto en `seedData.ts` y que el `onSnapshot` de `AppContext` lo maneje.
- Reglas (`firestore.rules`): cada ruta bajo `/users/{userId}` DEBE exigir `request.auth.uid == userId`.
- No borres colecciones en producción; usa `archivado`/`estado` como es el patrón actual.

### Módulos
- `src/context/AppContext.tsx` → estado global + acciones + sincronización Firestore (la capa de datos).
- `src/context/AuthContext.tsx` → autenticación.
- `src/utils/calculations.ts` → lógica pura (FIFO, moneda, stock, badges) SIN Firestore ni UI.
- `src/components/` → UI (views y modals). Sin lógica de negocio compleja.
- `src/data/seedData.ts` → datos iniciales de ejemplo.

### Librerías
- NO agregar sin justificación. Preferir siempre: `firebase`, `react`, `tailwind`, `lucide-react`, `motion`, `xlsx`, `qrcode.react`.
- Cualquier dependencia nueva requiere: justificación (qué problema resuelve), `npm install`, y quedará en package.json + lock.

## Entregable
Un diseño escrito para Kevin con:
1. Qué se cambia en Firestore (colección/campo/tipo) y por qué.
2. Qué archivos se tocan.
3. Qué librería nueva se agrega (si aplica) y por qué.
4. Límites y riesgos (concurrencia, reglas, volumen de datos).