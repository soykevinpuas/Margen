# Tarea #3 — Auditoría UX del Dashboard + propuesta de rediseño (para Kevin)

Autor: frontend-dev. Solo lectura: esta propuesta no toca código hasta que Kevin la apruebe.

---

## 1. Diagrama del dashboard actual (orden de aparición)

Pantalla Inicio, de arriba a abajo:

1. **Cinta Calendario** — franja decorativa con la fecha de hoy. Al tocarla abre el `CalendarioMesModal`. Trabajo: "para saber algo más hay que tocarme, pero no sé qué esperar".
2. **Ganancia Total (KPI expandible)** — tarjeta a todo el ancho. Muestra la **ganancia histórica de todas las ventas** (no de hoy). Al tocarla se convierte en mini-gráfica (Día/Semana/Mes) y vuelve. Además trae mini-texto "Ingresado… Gastado…". Trabajo: el usuario debe interpretar que "Total" = desde siempre, y decidir si toca para ver la gráfica o no.
3. **Ventas Registradas** — tarjeta con el **total histórico** de ventas confirmadas (el código no filtra por mes) y enlace "Historial de Ventas". Al tocarla va a la pestaña Vender… pero a la vista **Registrar**, no al historial. Trabajo: interpretar un conteo sin periodo y descubrir que el enlace no lleva donde dice.
4. **Valor Inventario (con mini lista)** — valor total del inventario (costo × unidades). Al tocarla muestra una mini-lista de **los primeros 4 productos** (no los más valiosos ni los críticos). Trabajo: tocarla para "ver", y volver a tocar para recuperar el total.
5. **Total Gastado** — selector Día/Semana/Mes (por defecto Mes) del costo (mercancía vendida + gastos op.). Trabajo: advertir que aquí "Gastado" significa otra cosa que el "Gastado" del bloque 2 (all-time). Números en rosa, con paréntesis explicativo.
6. **Acciones Rápidas** — 3 botones: Vender (va a la pestaña Vender), Compra (modal), Gasto (modal). Único bloque puramente "accionable". Queda **debajo del pliegue**.
7. **Alertas de Stock** — acordeón colapsado: contador "Agotados / Stock Bajo". Cada item tiene "Reponer", que abre el modal de compra **genérico** (sin el producto pre-cargado).
8. **Top Ventas** — 2 productos más vendidos (histórico por unidades) con imagen y badge. Sin dinero ni margen. Al tocar abre el detalle del producto.

*(Fuera de pantalla: el `CalendarioMesModal` que solo aparece si tocas la cinta.)*

---

## 2. Problemas detectados (priorizados)

| # | Bloque | Diagnóstico | Prioridad |
|---|--------|-------------|-----------|
| P1 | Global — sin cifras de **HOY** | Ningún número de la primera pantalla corresponde al día actual; el dueño abre la app y no ve "¿cómo me fue hoy?". KPI principal = histórico | **A** |
| P2 | Ganancia Total (bloque 2) | Tarjeta doble estado (número ⇄ gráfica) esconde el número al tocarla; gráfica duplica la pestaña Gráficas; etiqueta "Total" sin periodo atribuible. Además los selectores de periodo de la gráfica son de ~18px (target < 44px) | **A** |
| P3 | Acciones Rápidas (bloque 6) | La acción del día (Vender) queda bajo el pliegue: entre abrir la app y tocar "Vender" el usuario recorre 4 bloques. El botón de Vender además solo "navega" (1 tap extra). | **A** |
| P4 | Ventas Registradas (bloque 3) | Conteo **_all-time_** etiquetado sin periodo; el enlace dice "Historial de Ventas" pero lleva a la vista Registrar. Mismatch navegación. | **B** |
| P5 | Total Gastado (bloque 5) | "Gastado" aparece 2 veces en pantalla con periodos distintos (bloque 2 = histórico, bloque 5 = Mes por defecto). El usuario no puede cuadrar sus cuentas rápido. | **B** |
| P6 | Valor Inventario (bloque 4) | La mini-lista muestra `slice(0,4)` (productos arbitrarios, no valiosos/críticos). Doble estado otra vez. | **B** |
| P7 | Alertas de Stock (bloque 7) | "Reponer" abre el modal de compra genérico (hay que re-seleccionar el producto). Botones/link de 10px. El único flujo de trabajo real es lento aquí. | **B** |
| P8 | Cinta Calendario (bloque 1) | Decora y ocupa el primer lugar de la pantalla; el calendario es consulta de baja frecuencia. | **C** |
| P9 | Top Ventas (bloque 8) | No muestra $ ni margen: útil para conocer, no para decidir. Baja frecuencia diaria. | **C** |
| P10 | Header | 3 controles (moneda + cuenta + ajustes) + título en 64px: ruido para una app de bolsillo; el cambio de moneda es rareza. | B (var. 2) |

**Resumen:** el dashboard hoy es un "panel de control histórico escondido tras interacciones de doble estado"; la persona que más lo va a usar (el dueño, de pie detrás del mostrador) quiere: ¿cuánto hoy? y tocar Vender ya.

---

## 3. Propuesta de dashboard móvil-útil

### Variante 1 — "Mínima alteración" (reordenar y agrupar lo existente)

Orden nuevo de la pantalla:

1. **KPI del DÍA (1 tarjeta compacta a todo el ancho, ancho completo):**
   - Número grande: **Ganancia de hoy**.
   - Debajo: `Ventas de hoy: $X (N ventas)` — calculado con el mismo `getLocalDateKey` ya usado (agregar ~10 líneas, no es lógica nueva).
2. **Acciones Rápidas** (suben a la posición 2, tocables sin scroll):
   - Vender (destacado) · Compra · Gasto.
3. **Alertas de Stock** (colapsado de fábrica, con contador en el header del acordeón).
4. **Top Ventas** (igual, solo se reordena).
5. **"Ver más…"** (acordeón nuevo, abajo) que engloba lo que era consulta ocasional:
   - Ganancia histórica + mini-gráfica (bloque actual), Valor Inventario + mini-lista, Total Gastado (selector), Ventas Registradas, Cinta Calendario.

- **Se conserva:** todos los componentes y cálculos; solo se reordena `<section>` y se envuelve lo secundario en un `<details>`/estado `showMore`.
- **Se mueve:** Acciones Rápidas arriba; lo de consulta al final.
- **Se quita (de la vista principal):** la doble aparición de "Gastado" se resuelve dejando solo el KPI del día + Total Gastado dentro de "Ver más". La Cinta Calendario deja de ser lo primero.
- **Navbar/Header:** sin cambios. Solo se cambia el label "Ganancia Total" → "Ganancia de Hoy".
- **Costo en líneas:** `InicioView.tsx` ~ −100 reordenando + ~35 nuevos (KPI de hoy + acordeón).

Ventajas: riesgo bajo, se conserva el trabajo ya construido (gráfica, calendario). Desventaja: sigue habiendo doble estado dentro de "Ver más" y el bloque 2 de Mini-lista; la persona que quiere solo HOY+ACCIÓN aún ve un poco de ruido al final.

### Variante 2 — "Rediseño objetivo" (más agresiva)

Pantalla de Inicio reducida a lo esencial:

1. **3 KPIs del día, en fila (tarjetas grandes):**
   `Ingresado hoy · Gastado hoy · Ganancia hoy` (mismo patrón visual de 3 KPIs que ya existe en `GraficasView`). Con un `N de ventas de hoy` discreto abajo del Ingresado.
2. **Acción primaria GIGANTE "Vender"** (botón ancho, alto, del color primary) — 1 tap desde la pantalla principal, sin desplazamiento.
3. **Acciones secundarias en fila:** Compra · Gasto · Ajuste.
4. **Secciones desplegables** (`<details>`):
   - **Stock:** alertas (con contador) — expandido de fábrica solo si hay agotados.
   - **Ventas:** Top vendidos (ahora con $ y margen %) · Historial.
   - **Análisis:** mini-gráfica + ganancia histórica … → en la práctica apunta a la pestaña Gráficas.
   - **Más:** calendario, valor inventario, total gastado.

- **Se conserva:** los cálculos y casi todo el JSX de las tarjetas; se **extrae** el bloque "3 KPIs del día" para reusarlo (En Inicio y Gráficas tienen el mismo colorido ya).
- **Se mueve:** todo lo de consulta a secciones plegables; el select MXN/USD sale del Header y va a Configuración.
- **Se quita:** el doble estado de la tarjeta Ganancia (la gráfica ya vive en Gráficas), la mini-lista arbitraria del inventario (deja solo el total), la etiqueta ambigua "Ventas Registradas" (vive en Historial), la cinta calendario como elemento principal.
- **Navbar/Header:** Header pierde el switch de moneda (−~20 líneas, queda título + cuenta + ajustes). Navbar se mantiene (Vender ya está destacado en el centro).
- **Costo en líneas:** `InicioView.tsx` reescritura del orden + secciones ~ −180 / +140; nuevo componente compartido `DailyKpis.tsx` ~60–80; `Header.tsx` ~ −20; `GraficasView.tsx` usa el componente compartido ~ −10; `App.tsx` sin cambios.

Ventajas: cumple 3 criterios (10s, números claros, apariencia simple). Desventaja: el doble estado de la gráfica en Inicio se pierde (se delega a Gráficas), lo que puede sorprender si alguien ya le toma cariño.

---

## 4. Recomendación

**Híbrido con foco en Variante 2, implementado en 2 fases:**

- **Fase 1 (bajo riesgo, esta semana):** adoptar el esqueleto de la Variante 2 pero reutilizando las tarjetas existentes: KPIs del día arriba → botón Vender gigante + Compra/Gasto → secciones plegables (Stock, Ventas, Análisis). Es la mitad del trabajo de la V2 y ya mueve la aguja.
- **Fase 2 (mejora):** extraer `DailyKpis`, mover moneda a Configuración, enriquecer Top Ventas con $ y margen, y pre-cargar el producto en "Reponer" de stock.

Justificación por criterio:
- **Menos de 10 s hasta registrar:** hoy Vender está bajo el pliegue (P3). Con KPI del día + botón Vender en la primera pantalla, el dueño toca Vender en el tap 1; el resto del tiempo depende del propio VenderView, no del dashboard.
- **Números claros:** un solo "hoy" a la vista elimina la ambigüedad P2/P4/P5 (histórico vs mes vs día).
- **Apariencia simple:** se acaba el "núcleo de la tarjeta que se transforma"; los paneles de consulta viven plegados. La app se ve simple aunque los cálculos (FIFO, margen, gastos) sigan siendo robustos — que es la filosofía guía del proyecto.

**Archivos que se tocarían (estimación):**

| Archivo | Cambio | Líneas (±) |
|---|---|---|
| `src/components/views/InicioView.tsx` | Reordenar secciones, KPI de hoy, secciones plegables | −180 / +150 (Fase 1: −100/+60) |
| `src/components/DailyKpis.tsx` (nuevo) | Tarjeta compartida de los 3 KPIs del día | +60–80 |
| `src/components/views/GraficasView.tsx` | Reusar `DailyKpis` | −10 |
| `src/components/Header.tsx` | Quitar switch de moneda (va a Configuración) | −20 |
| `src/App.tsx` | Sin cambios o solo prueba | 0 |
| Seeds/datos | Ninguno | 0 |
---
## Estado: ✅ done (Fase 1 implementada)
Fase 1 aplicada en InicioView.tsx: KPIs de Hoy arriba (getLocalDateKey), botón Vender gigante, Alertas y Top Ventas arriba, resto en "Ver más" plegado (sin eliminar funcionalidad). QA 13/13 + re-verificación del delta; reviewer APROBADO. Fase 2 pendiente (DailyKpis, moneda a Config, Top Ventas con \$/margen, Reponer pre-cargado).
