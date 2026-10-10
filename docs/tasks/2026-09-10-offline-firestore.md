# Offline real con Firestore

Fecha: 2026-09-10
Estado: ✅ done

## Qué quiere Kevin
Que la app Margen siga funcionando sin señal: guardar datos y verlos cuando vuelva la conexión.

## Criterios de aceptación
- [ ] `enableIndexedDbPersistence` activada en `src/lib/firebase.ts` (una sola vez, antes de los listeners).
- [ ] Manejado el caso de múltiples pestañas (error `failed-precondition`) y navegadores sin soporte (`unimplemented`).
- [ ] Comentario breve en español explicando qué hace.
- [ ] `npm run build` limpio.
- [ ] `npx tsc --noEmit` sin errores.
- [ ] qa aprueba.
- [ ] reviewer aprueba.

## Capas afectadas
- backend (datos/Firebase): `src/lib/firebase.ts`.

## Plan
1. Activación de persistencia local de Firestore en `lib/firebase.ts`.
2. QA: build + typecheck + smoke online.
3. Reviewer: revisa el diff.
4. Integración + commit propuesto.

## Resultado
- Implementado en `src/lib/firebase.ts` (persistencia local activada a nivel de módulo, con manejo de
  `failed-precondition` = múltiples pestañas y `unimplemented` = navegador sin IndexedDB).
- QA: build ✅, tsc ✅, smoke ✅ (200 en puerto libre; el puerto 3000 estaba ocupado por otro proyecto).
- Reviewer: APROBADO (sin 🟡 bloqueantes; uno opcional: aviso en UI si el navegador no soporta IndexedDB).
- Commit propuesto: `feat: activar persistencia local de firestore (offline)`.
- Pendiente integrar/comitear; desplegar para que llegue al cel (versión de AI Studio).