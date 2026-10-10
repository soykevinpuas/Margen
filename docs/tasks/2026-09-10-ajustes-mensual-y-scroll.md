# Ajustes: scroll de gráficas invertido + números del mes

Fecha: 2026-09-10
Estado: ✅ done

## Qué quiere Kevin
1. En las gráficas de 30 días el día actual debe quedar a la **DERECHA** (como apps financieras), y la
   gráfica debe cargar mostrando HOY sin que el usuario tenga que scrollear.
2. Todos los valores de ganancias y gastos del Dashboard trabajan **por meses**: se reinician cada mes.
   "Siempre trabajamos por meses."

## Criterios de aceptación
- [ ] Scroll horizontal: índice mayor (última barra) = HOY (derecha); índice 0 = 29 días antes (izquierda).
- [ ] Al abrir la gráfica (o cambiar a periodo Día) el contenedor queda **scrolleado a la derecha** (HOY visible).
- [ ] Dashboard: el bloque superior de KPIs muestra **"Este Mes"** (Ingresado, Gastado, Ganancia del mes) en
      lugar de "Hoy"; título indica el mes/año actual.
- [ ] "Ventas Registradas" cuenta las ventas de **este mes** (ya no all-time).
- [ ] En "Ver más": "Ganancia Total" pasa a ser **Ganancia del Mes** (ya no acumulada de todo el historial).
- [ ] "Total Gastado" ya era por Día/Sem/Mes (default Mes): se conserva.
- [ ] Regresión: el resto del dashboard y GraficasView (periodos Sem/Mes) intactos.
- [ ] `npm run build` limpio y `npx tsc --noEmit` sin errores.

## Capas afectadas
- frontend: `ChartRenderer.tsx` (auto-scroll a la derecha), `InicioView.tsx` (KPIs del mes),
  `GraficasView.tsx` (orden del array 'dia').

## Plan
1. ChartRenderer: cuando `scrollableDays`, useEffect + ref que posiciona el scroll del área de gráfica a la
   derecha (scrollLeft = scrollWidth) al montar y al cambiar la cantidad de datos.
2. GraficasView e InicioView: la rama 'dia' invierte el orden (índice 29 = hoy, isToday = i === 29).
3. InicioView: KPIs superiores → Este Mes (misma lógica de getLocalDateKey pero startsWith YYYY-MM);
   contador "Ventas Registradas" mensual; "Ganancia del Mes" en lugar de la histórica.
4. QA + reviewer.

## Resultado
- ChartRenderer: auto-scroll a la derecha (scrollLeft = scrollWidth) con rAF solo cuando scrollableDays.
- Ramas 'dia' (GraficasView + InicioView) invertidas: HOY en índice 29 (derecha).
- Dashboard por meses: KPIs "Este Mes · Septiembre 2026", Ventas Registradas mensual, Ganancia del Mes en
  "Ver más" (se eliminaron consts all-time sin uso).
- QA ✅ build/tsc/smoke + regresión Fase 1; reviewer ✅ APROBADO (3 🟡 no bloqueantes).
- Commit propuesto: `fix: scroll de graficas con hoy a la derecha y dashboard por meses`.