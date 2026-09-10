# 04 — Glosario (lo que significan las cosas)

Definiciones en español simple de los términos que usamos en Margen.

## Frontend / React
- **Frontend** (`src/`): lo que ves y tocas en el navegador. Toda la app es frontend.
- **Componente**: un bloque de UI reutilizable (un botón, una tarjeta, un modal).
- **Vista (view)**: una pantalla completa (Inventario, Vender, Gráficas…).
- **Modal**: ventana que se abre encima (Registrar venta, Nueva compra…).
- **Prop (props)**: datos que le pasas a un componente.
- **Estado (state)**: datos que cambian y la UI reacciona.
- **Hook**: herramienta de React (ej. `useState`, `useEffect`). `useApp()` y `useAuth()` son los contextos.
- **Contexto (context)**: estado global compartido. `AppContext` tiene todos los datos del negocio.

## Datos / Firebase
- **Firebase**: plataforma de Google que da login, base de datos y hosting sin servidor propio.
- **Firestore**: la base de datos de Firebase (en la nube, sincronizada en tiempo real).
- **Colección**: un grupo de documentos (ej. `products`, `batches`, `sales`).
- **Documento**: un registro dentro de la colección (un producto, un lote, una venta).
- **Campo**: un dato de cada documento (nombre, precio, cantidad).
- **Ruta (path)**: la dirección de un dato. Ej. `users/<uid>/products/<id>`.
- **onSnapshot**: "escuchar en vivo": cada cambio en Firebase se refleja solo en la app.
- **setDoc / writeBatch**: formas de guardar. `writeBatch` guarda varios documentos de una,
  como una sola operación (recomendado cuando se tocan lotes + ventas).
- **Reglas (firestore.rules)**: las llaves de seguridad de la base. Nada se guarda sin
  verificar `request.auth.uid`.

## Negocio (la lógica de Margen)
- **Producto**: lo que vendes (tenis, libros, ropa…).
- **Lote (batch)**: una compra específica con su costo real. `L-4928`.
- **FIFO**: "primero en entrar, primero en salir": se vende primero lo más viejo (lote más antiguo).
- **Costo real**: costo del producto + gastos de compra prorrateados por unidad.
- **COGS**: costo de las unidades efectivamente vendidas.
- **Margen %**: qué % de la venta es ganancia real.
- **Gastos operativos**: renta, luz, nómina, insumos (no de una compra específica).
- **Ajuste de inventario**: salida de stock por daño, pérdida, regalo, uso personal.

## PWA / Internet
- **PWA**: app web que se instala en el cel y se ve como app normal.
- **Manifest**: el "carnet" de la PWA (nombre, color, icono).
- **Service worker** (`sw.js`): un ayudante que permite funcionar sin internet (offline).
- **Offline**: usar la app sin conexión. Hoy la app sincroniza solo con señal; el modo
  offline real (persistencia local) está pendiente.

## Herramientas / Comandos
- **Build**: convertir el código fuente al producto final optimizado (`npm run build`).
- **Typecheck**: revisar tipos sin errores (`npx tsc --noEmit`).
- **Bundle**: el archivo JS final que carga el navegador (hoy ~1.5MB; ideal < 500KB por chunk).
- **Servidor dev**: correr la app local para pruebas (`npm run dev` en `:3000`).
- **Git / Commit**: control de versiones. Un commit = punto de control.
- **Repo (repositorio)**: la carpeta del proyecto con su historial Git (`soykevinpuas/Margen`).
- **.gitignore**: lista de archivos que NO se suben (node_modules, .env…).
- **API key**: la llave pública del proyecto Firebase. NO es secreta; la seguridad real son las reglas.