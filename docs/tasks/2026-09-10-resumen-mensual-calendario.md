# Resumen mensual en el Calendario Financiero

Fecha: 2026-09-10
Estado: ✅ done

## Qué quiere Kevin
En el modal "Calendario Financiero Mensual" (`CalendarioMesModal`), cuando NO haya ningún día
seleccionado, mostrar debajo del grid del mes un **resumen completo del mes en curso del calendario**
(no all-time): total ingresado, ganancia, gasto, artículos vendidos del mes y demás datos importantes.
Al navegar a un mes anterior/psgiguiente con las flechas, el resumen debe corresponder a ESE mes.

## Datos a mostrar (resumen mensual)
- KPIs principales (mismo patrón violeta/rosa/esmeralda del modal):
  - **Ingresado** (suma de ingresoTotalMXN de las ventas confirmadas del mes)
  - **Gastado** (costo de lo vendido del mes + gastos operativos del mes)
  - **Ganancia libre** (Ingresado − Gastado, color esmeralda/rosa según signo)
- Datos secundarios en una fila de mini-celdas:
  - **Ventas** (n° de transacciones del mes)
  - **Artículos vendidos** (suma de `cantidad` de esas ventas, unidades)
  - **Ticket promedio** (Ingresado ÷ ventas)
  - **Gastos operativos** (n° y monto)
  - **Lotes comprados** (lotes con `fecha` en el mes)
  - **Días con movimiento** (n° de días del mes con venta/gasto/lote)

## Criterios de aceptación
- [ ] Solo se muestra el panel cuando `!selectedDayKey` (al seleccionar un día se ve el detalle del día, al
      cerrar se regresa el resumen mensual).
- [ ] El cálculo usa el `month`/`year` del `currentDate` (mesh visible), vía prefix `YYYY-MM` de
      `getLocalDateKey` — igual que en InicioView.
- [ ] Estética coherente con el modal (rounded-xl, border, animate-fade-in); sin desbordes en móvil.
- [ ] `npx tsc --noEmit` limpio y `npm run build` limpio.

## Capas afectadas
- frontend: SOLO `src/components/modals/CalendarioMesModal.tsx`.

## Plan
1. Añadir cálculos `monthSales/monthExpenses/monthBatches` + derivados (ingresado, cogs, opExp, gastado,
   ganancia, unidades, ticket, días con movimiento).
2. Render del panel de resumen bajo el grid cuando no hay día seleccionado.
3. QA + reviewer. 4. Commit + deploy propuestos.

## Resultado
- Resumen mensual en CalendarioMesModal visible cuando no hay dia seleccionado: KPIs Ingresado/Gastado/Ganancia Libre + Ventas, Articulos vendidos, Ticket promedio, Gastos op, Lotes, Dias con movimiento.
- Filtros por prefix YYYY-MM del mes visible (navegacion de meses incluida).
- QA + reviewer APROBADO (2 sugerencias menores cosmeticas).
- Commit propuesto: `feat: resumen mensual en el calendario financiero`.
