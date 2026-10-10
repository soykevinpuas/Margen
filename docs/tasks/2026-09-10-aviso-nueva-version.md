# Aviso de nueva versión disponible

Fecha: 2026-09-10
Estado: 🔵 en progreso

## Qué quiere Kevin
Que cuando subamos una versión nueva se refleje al instante, y que la app avise: un banner
**"Nueva versión disponible → Actualizar"** para que nunca dude si ya trae lo último.
(Contexto: antes Firebase cachelaba index.html 1h; ya se puso no-cache — firebase.json —, este task
añade el aviso visual + build-id para detectar cada deploy.)

## Diseño (acordado por architect)
- En cada build se inyecta un `<meta name="build-id" content="<timestamp>" />` en `dist/index.html`
  (script `scripts/build-id.mjs` que corre DESPUÉS de `vite build`).
- La app (componente `NuevaVersionBanner`) lee ese meta al abrir, lo compara con
  `localStorage['margen-build-id']`:
  - si difiere → muestra banner fijo arriba "🆕 Nueva versión — Actualizar" → botón hace
    `window.location.reload()` (con index.html no-cache, recarga ya el bundle nuevo).
  - guarda el id actual (para que al recargar el banner desaparezca).
- Primera carga con la feature: no hay previo → no muestra banner (solo guarda). Deploys posteriores: avisa.

## Criterios de aceptación
- [ ] `npm run build` = `vite build` + `node scripts/build-id.mjs`; dist/index.html contiene el meta build-id.
- [ ] `NuevaVersionBanner` montado global en main.tsx (sobre toda la app), fixed top, z alto, estética
      acorde (fondo primary, texto on-primary), botón "Actualizar".
- [ ] Compara/build-id correctos; no muestra banner en primera carga; guarda id; detecta cambio en siguiente.
- [ ] `npx tsc --noEmit` limpio y `npm run build` limpio (verificar el meta en dist/).
- [ ] Sin romper nada: smoke local HTTP 200.

## Capas afectadas
- frontend: `package.json` (build), `scripts/build-id.mjs` (nuevo), `src/components/NuevaVersionBanner.tsx`
  (nuevo), `src/main.tsx` (montar banner). NO tocar más.

## Plan
1. Script build-id → package.json → componente → main.tsx.
2. QA + reviewer.
3. Commit `feat: ...` + firebase.json (`chore: no-cache...`) y deploy.

## Resultado
(se llena al final)