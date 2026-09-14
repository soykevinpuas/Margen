# Header KPIs limpio + modo semana

Fecha: 2026-09-10
Estado: ✅ done

## Qué quiere Kevin
En la parte de arriba del dashboard los KPIs (donde estaban "Este Mes · fecha", el botón de tipo de tiempo y
el de Calendario) están muy amontonados:
1. **Agregar SEMANA** como tercer tipo de tiempo (junto a Mes y Día).
2. **Limpiar el encabezado**: quitar el icono de calendario y el título "Este Mes · fecha" (los primeros 2
   elementos de esa sección). Debe quedar muy limpio: solo el **selector de tiempo** (Mes/Sem/Día) y el
   **botón Calendario**, bien espaciados.

## Diseño
- Modos: `kpiMode: 'mes' | 'semana' | 'dia'`. Semana = últimos 7 días (hoy − 6 días), consistente con el
  periodo 'sem' ya usado en el total gastado: `diff = (hoy − fecha)/86400000` con `diff >= 0 && diff < 7`.
- Cálculos semana: `weekSales`, `weekExpenses`, `weekIngresado`, `weekCogs`, `weekOpExp`, `weekGastado`,
  `weekGanancia`, `weekSalesCount`.
- Resolución: kpiIngresado/Gastado/Ganancia/SalesCount según modo; etiquetas: mes → "ventas", semana →
  "ventas esta semana", día → "ventas hoy".
- Encabezado nuevo (sin el titulo ni el icono "today"):
  - Un **segmented control** de 3 opciones pequeñas y redondeadas: MES | SEM | DÍA (la activa = fondo
    primary, texto on-primary; inactivas = surface/borde). Al tocar una, `setKpiMode` + actualiza lastTouch.
  - A la derecha el **chip Calendario** (botón propio) que abre CalendarioMesModal.
  - `justify-between`, espaciado limpio, sin elementos de sobra.
- Cards KPI: al tocarlas ciclan el modo (mes → sem → día → mes) y respetan el tema de rotación existente.
- Rotación automática: ahora cicla mes → sem → día → mes cada 7 s si no hay toque en 10 s+ (igual que hoy).
- Ayuda bajo las cards: "Toca las cards para cambiar la vista".

## Criterios de aceptación
- [ ] Selector con 3 opciones funcional; semana calcula 7 días correctos.
- [ ] Encabezado limpio (sin "Este Mes" ni icono de calendario); botón Calendario sigue abriendo el modal.
- [ ] Rotación suave sigue funcionando (3 modos) y respeta toques recientes.
- [ ] `npx tsc --noEmit` limpio y `npm run build` limpio.

## Capas afectadas
- frontend: SOLO `src/components/views/InicioView.tsx`.

## Plan
1. Cálculos semana + kpiMode tri-estado + resolución.
2. Encabezado limpio: segmented control + chip Calendario.
3. QA + reviewer. 4. Commit + deploy.

## Resultado
(se llena al final)
## Resultado
- Encabezado limpio: segmented control MES/SEM/DIA + chip Calendario (sin "Este Mes" ni icono).
- Modo semana (ultimos 7 dias) tri-estado con rotacion 7s y AnimatedNumber.
- QA+reviewer APROBADO (2 sugerencias menores al limite de semana y TZ).
- Commit propuesto: `feat: modo semana en KPIs y encabezado limpio`.
