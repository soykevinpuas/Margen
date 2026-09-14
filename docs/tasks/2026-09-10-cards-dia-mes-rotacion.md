# Cards del dashboard: Día ⇄ Mes con rotación suave

Fecha: 2026-09-10
Estado: ✅ done

## Qué quiere Kevin
En las 3 cards de KPIs del dashboard principal (Ingresado / Gastado / Ganancia):
- Al **tocarlas** → muestran los **datos del DIA** (ingresado/gasto/ganancia del día).
- Al **tocarlas de nuevo** → vuelven a los **datos del MES**.
- Si **no se tocan**, los valores rotan solos (mes → día → mes…) lentamente y de forma **suave**
  (animación fluida del número, no salto seco).

## Diseño
- En InicioView hay `monthIngresado/monthGastado/monthGanancia` (mes) y `monthSales`. Añadir la versión
  diaria usando `todayKey = getLocalDateKey(new Date())`:
  - `dayIngresado`/`dayCogs` de ventas confirmadas de hoy, `dayOpExp` de gastos de hoy,
    `dayGastado = dayCogs + dayOpExp`, `dayGanancia = dayIngresado − dayGastado`, `daySales` (n° ventas de hoy).
- Estado `kpiMode: 'mes' | 'dia'` (las 3 cards juntas, coherente). Toque en las cards = toggle dia/mes.
- Auto-rotación `setInterval` (~7 s): si el usuario NO ha tocado recientemente, alterna el modo.
  Al tocar, se fija el modo elegido y se reinicia el timer (la rotación se reanuda sola pasados unos
  segundos sin contacto → objetivo: no pelear con el dedo; se queda ~10 s en lo elegido).
- **Suavidad**: componente `AnimatedNumber`: con rAF anima el valor mostrado hacia el objetivo con easing
  easeInOut (~700 ms). Etiqueta/chip indica qué se ve: "MES" o "DÍA" (y en Ingresado, el contador
  "N ventas del mes / N ventas hoy" que corresponda).
- NO cambiar el resto del dashboard.

## Criterios de aceptación
- [ ] Tap en las cards: día → mes → día… y el contador de ventas cambia acorde.
- [ ] Sin tocar, cada ~7 s los números cambian solos con animación suave (no parpadeo).
- [ ] Después de un tap, no cambia de golpe en el siguiente tick (respetar la interacción un rato).
- [ ] `npx tsc --noEmit` limpio y `npm run build` limpio.

## Capas afectadas
- frontend: SOLO `src/components/views/InicioView.tsx` (+ componente pequeño AnimatedNumber dentro del mismo archivo).

## Plan
1. Cálculos diarios + AnimatedNumber + estado kpiMode + intervalo.
2. QA + reviewer. 3. Commit + deploy.

## Resultado
(se llena al final)
## Resultado
- Cards de KPIs alternan MES↔DIA al tocarlas (chip + toque en cards), con AnimatedNumber (rAF, easeInOut ~700ms) para transicion suave sin libs nuevas.
- Auto-rotacion ~7s cuando hay 10s+ sin contacto; tras tocar respeta la eleccion un rato.
- Contador de ventas: "ventas" vs "ventas hoy". QA+reviewer APROBADO (2 sugerencias a11y no bloqueantes).
- Commit propuesto: `feat: cards del dashboard alternan dia/mes con rotacion suave`.
