# Gráficas: 30 días con scroll horizontal (snap táctil)

Fecha: 2026-09-10
Estado: ✅ done

## Qué quiere Kevin
Que las gráficas de la pestaña "Día" (GraficasView → Resumen General y Dashboard → Mini Gráfica)
muestren los **últimos 30 días** navegables con **scroll horizontal** (`overflow-x-auto` + `snap-x`),
manteniendo el **día actual visible** y con buen manejo táctil.

## Criterios de aceptación
- [ ] La pestaña "Día" genera 30 puntos (incluye hoy) en `GraficasView` y en `InicioView` (Mini Gráfica).
- [ ] El día actual queda **a la izquierda y visible al abrir** (sin necesidad de scrollear); a la
      derecha van los días previos (más antiguos) — flujo natural: deslizas hacia la izquierda para ver el pasado.
- [ ] Contenedor con `overflow-x-auto` + scroll snap (`snap-x snap-mandatory`); cada barra con
      `snap-start` y un `min-width` para que las 30 barras mantengan tamaño tocable.
- [ ] `ChartRenderer` recibe un prop nuevo `scrollableDays?: boolean` (default `false`); sin él, el
      comportamiento visual actual NO cambia (7 días / 4 semanas / 6 meses igual que hoy).
- [ ] KPIs (Ingresado/Gastado/Ganancia), selección de barra y filtro de detalle siguen funcionando.
- [ ] `npm run build` limpio y `npx tsc --noEmit` sin errores.

## Capas afectadas
- frontend: `src/components/views/GraficasView.tsx`, `src/components/views/InicioView.tsx`,
  `src/components/ChartRenderer.tsx`.

## Plan
1. `ChartRenderer`: soporte `scrollableDays` (solo para tipo `barras` : satura el área de gráfica con
   `overflow-x-auto snap-x snap-mandatory`, las barras usan `flex-shrink-0 min-w-[46px] snap-start`
   y el eje de la gráfica `min-w-max`).
2. `GraficasView`: "Día" pasa de 7 a 30 días con HOY en la posición 0 (izquierda) y pasa
   `scrollableDays={period === 'dia' && chartType === 'barras'}`.
3. `InicioView`: ídem para la Mini Gráfica (`profitChartPeriod === 'dia'`).
4. QA: build + tsc + smoke + regresión de periodos.
5. Reviewer: revisión del diff.

## Resultado
- Implementado: 'dia' = 30 días (hoy en índice 0, visible sin scroll), contenedor `overflow-x-auto`
  + `snap-x snap-mandatory`, barras min-w 46px con `snap-start` (prop `scrollableDays` en ChartRenderer,
  default false = cero regresión). Aplica a GraficasView y Dashboard (Mini Gráfica).
- QA: 5/5 ✅ (build, tsc, estático, smoke en puerto libre, regresión sem/mes).
- Reviewer: APROBADO ✅. 🟡 futura: líneas/puntos en 'dia' comprimen 30 puntos (no bloquea).
- Commit propuesto: `feat: graficas de 30 dias con scroll horizontal y snap tactil`.