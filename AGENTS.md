# Margen — Reglas del equipo

Proyecto: PWA de control de inventario y ventas FIFO para vendedores independientes (libros, tenis, ropa, etc.).
Stack: frontend React + Vite + TypeScript + Tailwind CSS v4 (`src/`) con Firebase (Auth + Firestore) como backend y PWA (`public/`).

## Flujo de trabajo (SIGUELO SIEMPRE)

Cada tarea pasa por estas estaciones gestionadas por el agente `orchestrator`:

1. `orchestrator` clarifica el pedido con Kevin (ETIQUETAR preguntas, sin tocar código).
2. `architect` revisa/acuerda el diseño (esquema Firestore, límites, librerías, reglas).
3. `backend-dev` (datos/Firebase) o `frontend-dev` (UI) implementa SOLO su parte.
4. `qa` verifica (build + typecheck + pruebas). PUERTA: si falla, vuelve a implementación.
5. `reviewer` revisa el diff. PUERTA: si encuentra algo grave, vuelve a implementación.
6. `orchestrator` integra, resume a Kevin y propone commit (espera su aprobación).

Reglas de las puertas:
- NO se marca una tarea como terminada sin que pasen `qa` y `reviewer`.
- Los tests / `npm run build` son la fuente de verdad; el "yo creo que está bien" NO cuenta.
- Cada cambio debe estar comentado y ser verificable.

## Estilo de código

- **Comentarios BREVES en español** que expliquen QUÉ hace cada pieza (ej: `// Calcula el margen de la venta`).
  Estilo tipo los comentarios del template original: una línea, clara, sin relleno.
- Sin comentarios de más: solo donde aportan.
- Sigue los patrones y librerías YA existentes; no introduzcas librerías nuevas sin avisar a `architect`.
- Nombres EN español e inglés consistentes con lo existente (productos, lotes, ventas, gastos…).
- Firebase: la `apiKey` del cliente es **pública por diseño**; la seguridad REAL son las reglas de `firestore.rules` (regidas por `request.auth.uid`). Nunca pongas secretos en el código ni en el repo.

## Verificación (comandos)

- Build (puerta): `npm run build` en la raíz — debe pasar **limpio**.
- Typecheck: `npx tsc --noEmit` — sin errores.
- Servidor dev: `npm run dev` en `:3000` para pruebas manuales en el navegador.
- Firestore: revisa `firestore.rules` antes de tocar colecciones o reglas.

## Documentación

- La documentación para Kevin vive en `docs/` (en español, para principiantes).
- Los agentes y skills del equipo viven en `.opencode/` (queda la historia completa junto al código).
- Ante dudas sobre el significado de un término, consulta `docs/04-glosario.md`.

## Roles del equipo

- `orchestrator` (principal): dirige, clarifica, delega, integra, propone commits.
- `architect`, `backend-dev`, `frontend-dev`, `qa`, `reviewer`, `devops`: subagentes especializados.
- Detalle completo en `docs/01-equipo.md`.