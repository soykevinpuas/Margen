# Vitrina virtual por negocio

Fecha: 2026-10-09
Estado: 🔵 en progreso (spec lista, espera aprobación de Kevin)

## Qué quiere Kevin
Una vitrina pública por negocio: un link o QR que el cliente abre sin login y ve los productos de ese negocio (Bookea / Rop Vans), con foto, nombre, precio, descripción y disponibilidad. Pide por WhatsApp (número fijo por negocio). Avatar animado (Lottie, estilo familiar). Pagos en línea: fase 2.

## Respuestas de clarificación
- Pública, con link o QR por negocio ✅
- Muestra: foto, nombre, precio, descripción, disponibilidad ✅
- WhatsApp: número fijo por negocio ✅
- Avatar: Lottie, estilo familiar/flat ✅
- Pagos: mejora próxima (fase 2) ✅

## Diseño propuesto (pendiente architect)
- **Config por negocio**: nuevo bloque `vitrina` en `businesses/{businessId}/settings`:
  `{ activa, slug, whatsapp, mensajePlantilla, avatar: { preset, nombre, color }, productosDestacados[] }`
- **URL pública**: `/{slug}` en Firebase Hosting (rewrite a index.html). Ej. `margen.app/bookea`
- **QR**: generar con `qrcode.react` (ya en el proyecto) apuntando al link público
- **Imágenes**: Firebase Storage, lectura pública para productos con foto
- **Reglas Firestore**: lectura pública de `products` (solo `archivado: false`, sin costos/lotes) cuando `vitrina.activa == true`; validar con `get()` del doc settings
- **Avatar (MVP)**: presets (3-5 personajes Lottie) + nombre libre + color de marca (recoloreado del JSON al vuelo). Editor avanzado (Rive/Ready Player Me): fase 3
- **Avatar**: librería nueva `lottie-react` (requiere OK de architect)

## Criterios de aceptación
- [ ] Link público por negocio abre sin login y muestra solo productos activos
- [ ] QR por negocio genera y descarga
- [ ] Botón "Pedir por WhatsApp" por producto (mensaje prellenado, número del negocio)
- [ ] Panel "Vitrina" en Ajustes: activar, slug, WhatsApp, avatar (preset/nombre/color), mensajes
- [ ] Avatar Lottie animado en la vitrina (saludo, reacciones básicas)
- [ ] `bun run lint` y `bun run build` limpios
- [ ] qa aprueba (flujo público + privado sin regresión)
- [ ] reviewer aprueba (reglas Firestore seguras: NADA de costos/lotes públicos)
- [ ] commit con aprobación de Kevin

## Fase 2 (no ahora)
- Pago en línea (Mercado Pago / links de pago)
- Imágenes por Storage con subida desde la app
- Avatar con IA (Gemini) para conversación

## Riesgos
- Reglas públicas mal configuradas exponen datos sensibles → reviewer obligatorio
- `lottie-react` nueva librería → architect debe aprobar
- Bundle ya está en 1.5MB → Lottie puede engordarlo; evaluar precache del JSON

## Dictamen architect (2026-10-09): ✅ OK con ajustes
- `vitrina` va embebido en `settings/config` + índice público top-level `vitrinas/{slug}` (único escritor: `syncVitrinaIndex` en `src/lib/vitrina.ts`)
- Reglas: dueño siempre; público `get, list` de products solo si `vitrina.activa == true` (fail-closed con `get()`); batches/sales/expenses/adjustments owner-only siempre
- Disponibilidad = `stockDisponible?: number` denormalizado en Product (effect debounced en AppContext); omitir `unidad` en MVP
- `lottie-react` solo lazy (`React.lazy` o entry separado); presets como JSON cargados bajo demanda; recoloreado por string-replace del hex
- Hosting: rewrite ya existe; parsear `window.location.pathname` en App.tsx ANTES del gate `if (!user)`
- Estructura: `views/VitrinaView.tsx`, `vitrina/VitrinaPanel.tsx`, `vitrina/AvatarLottie.tsx`, `vitrina/ProductoCardVitrina.tsx`, `lib/vitrina.ts`, tipos en `types.ts`
- Kevin aprobó: omitir unidad ✅, stockDisponible ✅ (2026-10-09)
