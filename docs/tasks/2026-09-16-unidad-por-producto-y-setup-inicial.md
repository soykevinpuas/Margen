# Unidad por producto y setup inicial guiado
Fecha: 2026-09-16
Estado: 🔵 en progreso

## Qué quiere Kevin
Que Margen sirva para otros giros: cada producto lleva SU unidad (pza, kg, ml…) y al crear
cuenta un setup inicial guiado configura negocio, moneda, unidad y color. Por ahora SIN
plantillas por giro (lo deja para después).

## Criterios de aceptación
- [ ] Cada producto tiene unidad propia (pza/kg/ml…); si no se define, usa la unidad
      predeterminada del negocio.
- [ ] La unidad aparece donde hoy dice "und"/"u." en vistas de producto (stock y reportes
      por producto) usando la unidad correcta de ese producto.
- [ ] Setup inicial guiado en el primer acceso: nombre del negocio, moneda, unidad y color.
- [ ] Puede saltarse o demorarse; configuración queda editable en Configuración.
- [ ] npm run build limpio.
- [ ] qa aprueba.
- [ ] reviewer aprueba.

## Capas afectadas
- frontend (tipos, settings, formulario setup, pantallas que muestran "und")

## Plan
1. Architect diseña: campos (AppSettings.unidadPredeterminada, Product.unidad?, flag de setup
   completado), dónde reemplazar "und"/"u." y cómo evitar sumar unidades incompatibles.
2. Frontend implementa: tipos, helper de unidad, setup wizard, campos en alta/edición de
   producto, Configuración, y reemplazo de etiquetas.
3. QA verifica build + flujo de setup y unidades.
4. Reviewer revisa el diff.

## Diseño (architect, aprobado)
- `AppSettings.unidadPredeterminada?`, `setupCompletado?`; `Product.unidad?` (opcionales; Firestore schemaless, sin migración).
- Helper `getProductUnitLabel(product, settings)` en `src/utils/calculations.ts` → unidad del producto o predeterminada, fallback 'und'.
- Setup wizard `SetupInicialModal.tsx` (nuevo): nombre, moneda, unidad (con sugerencias), color primario+fondo; "Guardar y empezar" / "Saltar por ahora" (setea setupCompletado:true). Se muestra si `user && settings.setupCompletado !== true`, gated por `settingsReady` (nuevo flag en AppContext para evitar parpadeo).
- Arrays de color extraídos a `src/data/themeOptions.ts` (compartido con ConfiguracionModal).
- ImportExcel: columna opcional "unidad" (headers unidad/unit/medida/um); solo a productos nuevos.
- NuevoProductoModal: campo "Unidad de Venta" con `<datalist>` nativo.
- ConfiguracionModal: campo "Unidad Predeterminada".
- Reemplazo de etiquetas: resuelven producto vía `products.find`. Total mixto `monthUnits` (CalendarioMesModal) = número puro sin unidad.
- Límites: ventas históricas muestran unidad ACTUAL (sin snapshot); prosa "unidades" correcta no se toca; no se toca ExportExcel/Graficas/rules.

## Resultado
✅ Implementado. Architect aprobó diseño; frontend-dev implementó (17 archivos + 3 nuevos); QA verificó (tsc + build limpios, resumen y puntos clave); reviewer APROBÓ (3 🟡 no bloqueantes: longitud unidad importada, limpiar unidad en edición — corregidos —, settingsReady entre usuarios, aceptado).
Commit propuesto: `feat: unidad por producto y setup inicial guiado`