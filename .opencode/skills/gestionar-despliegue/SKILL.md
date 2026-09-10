---
name: gestionar-despliegue
description: "Usa cuando haya que preparar, compilar u optimizar la app para producción, revisar el tamaño del bundle, la calidad PWA (service worker, manifest, offline), backups o el hosting. DevOps, deploy, build de producción, bundle, PWA, offline, hosting."
---

# Gestionar despliegue — Manual del DevOps

## Build de producción
```bash
npm run build   # genera dist/ (el sitio optimizado)
```

## Tamaño del bundle
- Hoy el bundle principal ronda **~1.5MB** (por `xlsx`). Objetivo: mantener cada chunk < 500KB.
- Cómo achicarlo:
  - Cargar modales pesados con `import()` dinámico (solo al abrirlos).
  - `build.rollupOptions.output.manualChunks` para separar `firebase` y `xlsx`.

## PWA
- `public/sw.js`: para offline real hay que (1) precachear el `dist/` en `install`, (2) versionar el nombre del caché al publicar (hoy es fijo `margen-v1`), y (3) limpiar cachés viejos en `activate`.
- `public/manifest.json`: verifica que los iconos existan (`pwa-192.png`, `pwa-512.png` — hoy faltan; solo hay `icon.svg`).

## Datos y offline
- Persistencia local de Firestore (`enableIndexedDbPersistence`) para usar la app sin señal.
- Backups: exportar Firestore en la consola junto con cada release; nunca depender de un solo entorno.

## Hosting
- Hoy: AI Studio (`aistudio.google.com/apps/57f36e98-...`), servicio autogenerado. El deploy sale desde Studio, NO del repo.
- Para dominio propio/multiusuario: migrar a Firebase Hosting o Vercel con deploy desde Git (CI).
- `firebase-applet-config.json` es pública y necesaria; no la quites.
- `.env` y `node_modules/` NUNCA se suben (ya en `.gitignore`).

## Checklist de producción
- [ ] `npm run build` limpio.
- [ ] Bundle dentro de límite (o plan de code-splitting).
- [ ] SW precachea y versiona caché; manifest con iconos existentes.
- [ ] Persistencia offline evaluada/habilitada.
- [ ] .env y node_modules fuera de Git.
- [ ] Backups de Firestore.

## Reglas
- Solo lectura sobre `src/` y `public/` (eso es de implementadores). Puedes tocar config de build/deploy.
- En español, claro.