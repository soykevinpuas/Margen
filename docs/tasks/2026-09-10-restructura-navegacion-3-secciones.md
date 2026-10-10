# Reestructura de navegación: Margen a 3 secciones

Fecha: 2026-09-10
Estado: 🔵 en progreso (plan acordado con Kevin)

## Qué quiere Kevin
Demasiadas secciones. Quiere una app sencilla e intuitiva:
1. **3 pestañas**: `Inicio | Inventario | Más` (desaparecen "Vender" y "Gráficas" como pestañas).
2. **Vender como MODAL global** (confirmado): 1 tap desde Inicio (botón Vender gigante), desde Inventario
   (botón/por producto) y desde el Detalle de producto (producto preseleccionado). El historial de ventas lo
   cubre `HistorialVentasModal` (ya tiene filtros, editar fecha, anular y devolver stock).
3. **Inventario operable**: desde las tarjetas de producto poder **Vender** y **+Stock** (compra con el
   producto ya elegido). Mantener 3 tabs internos (Productos/Historial/Agotados) y FAB "Nuevo producto".
4. **Gráficas inteligentes**:
   - Al "Ver más" del dashboard suben piezas compactas de mostrador: **Ranking M. Vendidos/M. Rentables
     (top 5)**, **Margen Prom. %** y **Gastos por Categoría**.
   - No duplicar: "Dinero Invertido" == "Valor Inventario" (queda solo el de Inicio).
   - Lo grande (Resumen General Día/Sem/Mes, Estructura de Costos) → entrada **"Reportes"** dentro de Más.
5. "Más Opciones" → **"Más"**. Header sigue el título de pestaña activa (3 títulos).

## Alcance por archivo (planeado)
- `Navbar.tsx` (S): TabType a 3 valores; quitar botones Vender/Gráficas.
- `App.tsx` (M): estado `isVentaOpen` + montar `VentaModal`; quitar casos de vista vender/graficas;
  `tabTitles` a 3; props: `onOpenVenta`, preselección venta, preselección compra; card "Ventas Registradas" →
  abrir `HistorialVentasModal`.
- `VenderView.tsx` (M-L): refactor → `components/modals/VentaModal.tsx` (bottom sheet con el flujo
  Registrar Venta + éxito; props `isOpen,onClose,preselectedProductId,onGoToHistory,onOpenNuevoProducto`).
  Se descarta el tab interno de historial (cubierto por HistorialVentasModal).
- `InventarioView.tsx` (M): iconos por tarjeta (Vender / +Stock), botón "+ Vender", preselección, prop
  `onOpenVenta`.
- `InicioView.tsx` (M): botón Vender → onOpenVenta; "Ventas Registradas" → modal historial; 3 cards
  compactas nuevas en "Ver más".
- `GraficasView.tsx` (M-L): extraer componentes compartidos (Rankings, Margen, Gastos por categoría) para
  reusar en Inicio; el resto se monta desde Más/Reportes.
- `MasView.tsx` (M): entrada "Reportes / Gráficas" montando `GraficasView` (componentes compartidos).
- `Header.tsx`: casi 0 (títulos llegan de App).

## Ajustes de architect (puerta 0, validado)
- VentaModal: reset completo al abrir (efecto `[isOpen]`); preselección consumida UNA sola vez; App limpia
  `preselectedProductForSale` en close Y éxito; sin partir en dos: flujo registrar+éxito completo en el sheet;
  panel resumen `sticky bottom-0` (no fixed apuntando al navbar) + `max-h` con scroll; éxito "Ver Historial"
  coordina cerrar VentaModal + abrir HistorialVentasModal.
- Compra preseleccionada: estado `preselectedProductForCompra`, firma `onOpenCompra(productId?)`, limpiar en
  close; DetalleProductoModal "Nuevo Lote" cablea (hoy tira el id).
- DetalleProductoModal: NUEVA prop `onOpenSaleForProduct(productId)` + botón "Vender este producto".
- InicioView.onNavigateTab ya no tipa 'vender'|'graficas' (quedan solo pestañas reales).
- Componentes de gráficas PRESENTACIONALES por props (no `useApp`): `src/components/graficas/Rankings.tsx`,
  `MargenPromedio.tsx`, `GastosCategoria.tsx`, usados por GraficasView y por Inicio/Ver-más.
- Inicio: la sección "Top Ventas" (top-2) se REEMPLAZA por el Rankings compartido (top-5 vendidos/rentables).
- VenderView: se descarta su tab interno de historial (~200 líneas de estado muerto se eliminan).

## Criterios de aceptación (gates)
- `npm run build` limpio y `npx tsc --noEmit` sin errores.
- Flujos verificados (smoke + revisión estática): venta modal desde Inicio/Inventario/Detalle; +Stock
  preseleccionado; historial de ventas accesible desde Inicio; "Ver más" con rankings/margen/gastos;
  Reportes en Más; sin código muerto (props huérfanas cableadas o eliminadas).

## Plan de implementación (orden)
0. Architect valida el diseño de props/modales (puerta 0).
1. Extraer componentes compartidos de GraficasView (Rankings/Margen/GastosCategoria) sin cambiar UI.
2. Crear `VentaModal` desde VenderView (flujo registrar+éxito).
3. Navbar a 3 tabs + App (estado venta, modales, callbacks, tabTitles, preselecciones).
4. InventarioView: acciones por tarjeta + "+ Vender".
5. InicioView: botón Vender → modal; Ventas Registradas → historial modal; 3 cards en "Ver más".
6. MasView: entrada Reportes (monta GraficasView usando compartidos).
7. QA + reviewer (puertas). 8. Commits + deploy (aprobar con Kevin).

## Resultado
(se llena al final)