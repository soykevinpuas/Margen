# Al hacerla responsiva para iPad/tablets
Fecha: 2026-09-16
Estado: 🔵 en progreso

## Qué quiere Kevin
Soporte de iPads y tablets: la app debe verse bien en 768px (retrato) y 1024px (landscape).

## Criterios de aceptación
- [ ] El shell de la app aprovecha el ancho en tablet (no quedarse a 448px ni estirarse kilométrico).
- [ ] Reportes/Gráficas (overlay) con ancho contenido en tablet.
- [ ] "Ver más" del Inicio en 2 columnas en md+.
- [ ] Cards de productos (Stock Bajo, Disponibles, Agotados) en 2 columnas en md+.
- [ ] Rankings muestra ambos paneles lado a lado en md+.
- [ ] Móvil (<768px) se comporta idéntico a hoy.
- [ ] npm run build limpio + tsc limpio.
- [ ] qa aprueba y reviewer aprueba.

## Capas afectadas
- frontend (clases Tailwind con breakpoints sm/md/lg; sin librerías)

## Diseño (architect)
- App.tsx shell: `max-w-md md:max-w-2xl lg:max-w-3xl` (un solo cambio arregla Header+vista+Navbar).
- GraficasView raíz: `max-w-2xl lg:max-w-3xl mx-auto` (overlay de MasView).
- InicioView "Ver más" (L615): `flex flex-col` → `grid grid-cols-1 md:grid-cols-2`; la cinta Calendario (L617) gana `md:col-span-2`. Los `col-span-2` que ya existían se activan en md.
- InventarioView: listas de Stock Bajo (L243), Disponibles (L344) y Agotados (L746) → `grid grid-cols-1 md:grid-cols-2 gap-3`. Lotes (tab Compras): NO se tocan.
- Rankings.tsx: tabs `md:hidden`; lista `flex flex-col` → `flex flex-col divide-y ... md:grid md:grid-cols-2`; cada panel con visibilidad condicional (activo visible, inactivo `hidden md:flex`); mini-encabezado opcional visible solo en md.
- FAB de InventarioView y Navbar/Header: sin cambios.
- Sin cambios de DB/config/librerías.

## Resultado
✅ Implementado. architect diseñó; frontend-dev implementó (5 archivos, 78+/47-); QA (tsc + build limpios); reviewer APROBÓ (sin 🔴, 2 🟡 cosméticas).
Commit: `feat: responsive para iPad/tablets`