# Spec: Deploy automático a Firebase Hosting con GitHub Actions

## Objetivo
Que cada `git push` a `main` despliegue automáticamente a Firebase Hosting.
GitHub (`main`) es la única fuente de verdad. Lo que está online se deriva del repo,
nunca al revés. El deploy manual local deja de ser el camino normal.

## Estado actual
- Repo: https://github.com/soykevinpuas/Margen, rama `main`.
- No existe `.github/` — cero workflows.
- Firebase: proyecto `gen-lang-client-0483115644` (display "leafread").
- Último release: 18/09/2026, `deployment-tool: cli-firebase` (manual, desde la CLI local).
- No hay integración GitHub ↔ Firebase hoy. Hay que crearla desde cero.
- `firebase.json`: solo hosting, `public: "dist"`.
- `.gitignore` incluye `dist/` → el build NUNCA está en el repo. El workflow debe buildear.
- `package.json` scripts:
  - `build` = `vite build && node scripts/build-id.mjs`
  - `lint` = `tsc --noEmit`
- Node local v26.10.0 / npm 11.19.1.
- NO hacen falta variables de entorno: `GEMINI_API_KEY` y `APP_URL` solo aparecen en
  `.env.example` y no se leen en ningún archivo del código. El build y el deploy no las necesitan.
- `firebase-applet-config.json` YA está commiteado (la apiKey del cliente es pública por
  diseño; la seguridad real está en `firestore.rules`, gateado por `request.auth.uid`).
- El token de deploy de Kevin (`github_pat_...`) NO sirve para Firebase. Es otro token.

## Orden de ejecución del workflow
`bun install --frozen-lockfile` → `bun run lint` → `bun run build` → `firebase deploy --only hosting`
Si CUALQUIER paso falla, el job para y NO se despliega.

## Workflow propuesto

Nombre de archivo: `.github/workflows/deploy.yml`

```yaml
name: Deploy a Firebase Hosting

# Solo deployeamos desde main. Los pull_request NUNCA deployean.
on:
  push:
    branches: [main]

# Evita dos deploys simultáneos si llegan varios pushes seguidos.
concurrency:
  group: deploy-production
  cancel-in-progress: true

# Permisos mínimos. El workflow solo lee el repo.
permissions:
  contents: read

jobs:
  deploy:
    name: Build y deploy a Firebase
    # Se ejecuta en el mismo commit que se pusheó, no sobre otro.
    runs-on: ubuntu-latest

    steps:
      - name: Copiar el repo
        uses: actions/checkout@v4

      - name: Instalar Node
        uses: actions/setup-node@v4
        with:
          # Node 20 LTS: más estable que Node 26 para CI.
          node-version: '20.x'
          cache: 'npm'

      - name: Instalar dependencias
        run: bun install --frozen-lockfile

      # Puerta obligatoria según AGENTS.md: sin errores de tipos, no se sigue.
      - name: Typecheck
        run: bun run lint

      # Genera dist/ e inyecta el meta build-id.
      - name: Build
        run: bun run build

      - name: Autenticar con Firebase
        uses: firebase-tools/action-firebase-hosting@v1
        with:
          # Autentica usando el service account guardado en secrets.
          serviceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}

      - name: Deploy a Hosting
        run: npx firebase-tools deploy --only hosting
```

Nota sobre `firebase-tools/action-firebase-hosting`: si en la práctica esta action no
resuelve bien la autenticación por service account en la versión actual, el paso
equivalente es usar la CLI directamente:
`npx firebase-tools@latest deploy --only hosting` precedido de un paso que descargue
el JSON del secret a un archivo temporal. Verificar en la implementación.

## Secret de GitHub

Nombre exacto: `FIREBASE_SERVICE_ACCOUNT`
Es el JSON completo de una Service Account de Google Cloud, con el rol que le permita
desplegar a Firebase Hosting del proyecto `gen-lang-client-0483115644`.

Se crea en: GitHub → repo `Margen` → Settings → Secrets and variables → Actions →
New repository secret.

## Pasos que hace KEVIN a mano (el agente no puede)

Estos pasos son en la web o en la consola de Google. Requieren que el agente NO las haga.

1. Crear el archivo `.github/workflows/deploy.yml` en el repo (o pedirlo al agente).
2. Crear una Service Account en Google Cloud con permiso de Firebase Hosting sobre
   el proyecto `gen-lang-client-0483115644`. Descargar su JSON.
3. Crear el secret `FIREBASE_SERVICE_ACCOUNT` en GitHub con el contenido de ese JSON.
4. Hacer un push de prueba a `main`.
5. Verificar que el run sale verde en la pestaña Actions.
6. Verificar que https://gen-lang-client-0483115644.web.app sirve el bundle nuevo.

Alternativa opcional (más segura, más trabajo): Workload Identity Federation con OIDC
en vez del JSON. A cambio de `id-token: write` en `permissions` y configurar la trust
policy en GCP. No es necesario para que funcione.

## Deploy manual local: deprecado, no borrado

Desde que el workflow exista, `firebase deploy` a mano queda PROHIBIDO como camino
normal: subiría a producción código que no está commiteado, y rompería la regla de
"GitHub es la fuente de verdad".

Solo se usa en EMERGENCIA (si GitHub Actions está caído), aceptando que despliega
código no commiteado. Comando:

```
bun run build
firebase deploy --only hosting
```

## Rollback

Manual, no automático. Si un deploy sale mal:

```
firebase hosting:rollback
```

Se deja manual a propósito: automatizarlo requiere detectar salud post-deploy y puede
revertir un deploy correcto por un falso positivo. Para este proyecto es lo correcto.

## Criterios de aceptación

- [ ] Existe `.github/workflows/deploy.yml` en la rama `main`.
- [ ] Un push a `main` produce un run en la pestaña Actions del repo.
- [ ] El run ejecuta en este orden: `bun install --frozen-lockfile` → `bun run lint` → `bun run build` → deploy.
- [ ] El run está VERDE (todos los pasos OK).
- [ ] https://gen-lang-client-0483115644.web.app responde 200.
- [ ] El `<meta name="build-id">` del HTML servido es DISTINTO al del deploy anterior
      (prueba de que se subió un bundle nuevo, no una caché).
- [ ] Si `bun run lint` falla por un error de tipos, el workflow NO despliega.
- [ ] El secret `FIREBASE_SERVICE_ACCOUNT` existe en el repo de GitHub.
- [ ] Un pull_request NO genera ningún deploy.
- [ ] El repo tiene 0 archivos modificados sin commitear al terminar.

## Nota de riesgo

Con este workflow, CADA push a `main` va directo a producción. Si se pushea código con
un bug, los usuarios lo ven de inmediato. Es lo que pidió el usuario. El mitigate es
que `bun run lint` acts como puerta, y que se pueda usar `firebase hosting:rollback`.

## Escrito por
Kevin (orquestador) + agente spec. Documentación en español rioplatense, para principiantes.
