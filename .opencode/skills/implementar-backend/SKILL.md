---
name: implementar-backend
description: "Usa cuando una tarea toque la capa de datos: acciones y sincronización Firestore en AppContext, autenticación, seedData, tipos, o reglas de seguridad en firestore.rules. Firebase, Firestore, AppContext, seedData, reglas, sincronización, datos."
---

# Implementar backend (datos y Firebase) — Manual del backend developer

## Antes de empezar
- [ ] Leí la spec (`docs/tasks/*.md`) y el diseño de `architect`.
- [ ] Conozco el esquema: todo bajo `users/{uid}/` (products, batches, sales, expenses, adjustments, settings).

## Patrones a seguir SIEMPRE

### Acciones (`src/context/AppContext.tsx`)
- Cada acción hace actualización **optimista**: `setState` primero, escritura a Firestore después.
- Limpia `undefined` antes de guardar: usa el helper `safeSetDoc` existente.
- IDs: sigue el patrón existente (`L-####`, `V-####`, `prod-<timestamp>`, `G-###`).

### Escrituras múltiples (CRÍTICO)
- Cuando una acción toca VARIOS documentos (ej. registrar venta → documento `sales` + descontar `batches`),
  usa `writeBatch` o transacción, NO `setDoc` sueltos. Evita stock inconsistente.

### Lecturas y sincronización
- Los datos llegan por `onSnapshot` (tiempo real). No dupliques colecciones en memoria sin necesidad.
- Alto el patrón: un `useEffect` de sync por colección, unsubscribe al desmontar.

### Reglas de seguridad (`firestore.rules`)
- Toda ruta bajo `/users/{userId}` exige `request.auth.uid == userId`.
- Nunca abras escrituras/lecturas sin auth.

## Verificación obligatoria (antes de entregar)
```bash
npm run build                # DEBE pasar limpio
npx tsc --noEmit             # sin errores de tipos
# revisar firestore.rules coherente con lo tocado
```

## Estilo de código
- Comentarios breves en español: `// Restaura stock del lote al cancelar la venta`.
- Sin comentarios de más. Sigue las librerías existentes.
- Nunca pongas secretos en el código (la apiKey Firebase del cliente es pública; no es secreto).