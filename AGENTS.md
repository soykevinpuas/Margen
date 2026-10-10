# Margen — Reglas del equipo

Proyecto: PWA de control de inventario y ventas FIFO para vendedores independientes. Multi-negocio por cuenta.
Stack: frontend React + Vite + TypeScript + Tailwind CSS v4 (`src/`) con Firebase (Auth + Firestore) como backend y PWA.

## Esquema de datos (v2, multi-negocio)

- `users/{uid}/profile/main` → perfil (`activeBusinessId`, `migratedFrom`)
- `users/{uid}/businesses/{businessId}/` → `products`, `batches`, `sales`, `expenses`, `adjustments`, `categories`, `settings`
- Un usuario puede tener varios negocios; solo uno está activo a la vez.
- Sin login (guest): los datos viven en `localStorage` por `businessId`.

## Flujo de trabajo (SIGUELO SIEMPRE)

1. `orchestrator` clarifica el pedido con Kevin (preguntas, sin tocar código).
2. `architect` revisa/acuerda el diseño (esquema Firestore, límites, librerías).
3. `backend-dev` (datos/Firebase) o `frontend-dev` (UI) implementa SOLO su parte.
4. `qa` verifica (build + typecheck + pruebas). PUERTA: si falla, vuelve a implementación.
5. `reviewer` revisa el diff. PUERTA: si encuentra algo grave, vuelve a implementación.
6. `orchestrator` integra, resume a Kevin y propone commit (espera su aprobación).

## Estilo de código

- **Comentarios BREVES en español** que expliquen QUÉ hace cada pieza (ej: `// Descuenta stock del lote tras la venta`).
- Sin comentarios de más: solo donde aportan.
- Sigue los patrones y librerías YA existentes; no introduzcas librerías nuevas sin avisar a `architect`.
- Nombres consistentes con lo existente (productos, lotes, ventas, gastos…).
- Firebase: la `apiKey` del cliente es **pública por diseño**; la seguridad REAL son las reglas de `firestore.rules`. Nunca pongas secretos en el código ni en el repo.

## Memoria del proyecto (ConPort)

- Servidor MCP `conport` configurado en `~/.config/opencode/opencode.json`
  (SQLite en el workspace `margen-github`).
- Al iniciar sesión: consulta ConPort para saber en qué va el proyecto.
- Al tomar una decisión, hito o convención: guárdala en ConPort.
- Los tests / `bun run build` son la fuente de verdad.

## Verificación (comandos)

- Typecheck (puerta): `npm run lint`
- Build (puerta): `npm run build` — debe pasar **limpio**.
- Servidor dev: `npm run dev` en `:3000`.
- Firestore: revisa `firestore.rules` antes de tocar colecciones o reglas.

## Documentación

- La documentación del equipo vive en `.opencode/` (agents, skills, specs).
- Las tareas/planes viven en `docs/tasks/`.
