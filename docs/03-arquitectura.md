# 03 — Arquitectura del proyecto (mapa comentado)

Cómo está organizado el código y qué hace cada pieza de Margen.

## Vista general

```
Margen/
├── npm run dev/build          → comandos en la raíz (Vite)
├── src/                       → toda la app (frontend React + lógica)
│   ├── main.tsx               → punto de entrada: monta AuthProvider + AppProvider
│   ├── App.tsx                → pestañas, modales y navegación principal
│   ├── components/
│   │   ├── views/             → pantallas: Inicio, Inventario, Vender, Gráficas, Más, Landing
│   │   ├── modals/            → ventanas: NuevaCompra, NuevoGasto, DetalleProducto,
│   │   │                        HistorialVentas/Compras, GastosOperativos, AjusteInventario,
│   │   │                        NuevoProducto, Configuracion, Auth, ExportExcel, CalendarioMes,
│   │   │                        GastoHistorico, GananciasHistoricas, CompartirAmigo
│   │   ├── ChartRenderer.tsx  → gráficas reutilizables
│   │   ├── Header.tsx         → barra superior
│   │   └── Navbar.tsx         → navegación inferior (tabs)
│   ├── context/
│   │   ├── AuthContext.tsx    → login (Google + email) vía Firebase Auth
│   │   └── AppContext.tsx     → EL CORAZÓN: todos los datos + sincronización Firestore
│   ├── data/seedData.ts       → datos de ejemplo (categorías, productos, lotes, ventas…)
│   ├── lib/firebase.ts        → conexión a Firebase (Auth + Firestore)
│   ├── utils/calculations.ts  → lógica pura: FIFO, moneda, stock, badges
│   └── types.ts               → los tipos compartidos (Product, PurchaseBatch, Sale…)
├── public/                    → PWA: manifest.json, sw.js (service worker), icon.svg
├── firestore.rules            → reglas de seguridad de la base
├── firebase-applet-config.json→ config pública del proyecto Firebase
├── docs/                      → documentación (para ti) 👈 estás aquí
├── .opencode/                 → agentes y skills del equipo IA
└── AGENTS.md                  → reglas del equipo en la raíz
```

## Cómo se conectan los mundos (simple)

```
Navegador (React)                      Firebase en la nube
   ┌────────────┐   escucha en vivo →   ┌────────────────┐
   │ components │ ◄── onSnapshot ───── │ users/{uid}/   │
   │  + vistas  │   (tiempo real)       │  products,     │
   └────────────┘                       │  batches,      │
        │  llama acciones               │  sales,        │
        ▼                               │  expenses,     │
   ┌────────────┐                       │  adjustments,  │
   │ AppContext │ ──── setDoc/writeBatch└────────────────┘
   └────────────┘
```

- Los componentes JAMÁS tocan Firebase directo: todo pasa por `AppContext` (`useApp()`).
- Los datos viven en Firestore bajo el usuario: `users/{uid}/…`. Sin login, la app
  usa `localStorage` como respaldo local.

## El modelo de datos (lotes y margen real)

- **`products`**: el producto que vendes (nombre, categoría, precio sugerido, stock mínimo…).
- **`batches`** (lotes): cada compra es un lote con su **costo real** (costo de producto +
  gastos de compra prorrateados). Es la base del inventario FIFO.
- **`sales`**: cada venta se asigna de los lotes **FIFO** (sale lo más viejo primero) y guarda:
  costo de lo vendido (COGS), gastos de venta, ganancia y **margen %**.
- **`expenses`**: gastos operativos del negocio (renta, servicios, nómina…).
- **`adjustments`**: salidas de inventario por daño, pérdida, uso personal, regalo, otro.
- **`settings/config`**: preferencias (moneda, tasa de cambio, nombre, stock mínimo por defecto).

Método de costo: **FIFO**. Canciones de venta/ajustes restauran o descuentan lotes.

## Tecnologías (¿por qué estas?)

| Capa | Tecnología | Por qué |
|------|-----------|---------|
| Frontend | React 19 + Vite 6 + TypeScript | Componentes + recarga instantánea + tipos seguros |
| Estilo | Tailwind CSS v4 | UI profesional con tema definido en `index.css` |
| Datos | Firebase Firestore | Sincronización en vivo (offline-friendly), sin servidor propio |
| Login | Firebase Auth | Google + email, gratis y seguro |
| Gráficas | ChartRenderer (SVG) | Reportes visuales sin librería pesada |
| Excel | `xlsx` | Exportar reportes para el negocio |
| QR | `qrcode.react` | Compartir vitrina/perfil con amigos |
| Iconos / animación | lucide-react / motion | Consistentes y suaves |
| PWA | manifest + service worker | Instalable en el cel, funciona como app |

## Hosting (hoy)

La app se publica desde **Google AI Studio** (`aistudio.google.com/apps/57f36e98-…`)
en un servicio de Cloud Run. El deploy sale de Studio, no del repo. Para dominio propio
se migraría a Firebase Hosting o Vercel (ver `devops`).