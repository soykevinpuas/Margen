# 02 — El flujo de trabajo del equipo

Cada tarea atraviesa una **línea de montaje de 6 estaciones**, en orden. Nunca se salta una.

## El camino de una tarea

```
① Pides la tarea                 ej. "quiero ver el inventario en USD"
     ↓
② orquestador clarifica          hace preguntas → escribe docs/tasks/<fecha>-<tarea>.md
     ↓
③ architect revisa diseño        ¿colección nueva? ¿librería nueva? ¿reglas? da el OK o pide cambios
     ↓
④ backend-dev o frontend-dev     implementa SOLO su parte
     ↓
⑤ qa verifica (puerta)           npm run build limpio + tsc + flujos + casos borde
        ↳ si falla → vuelve a ④
     ↓
⑥ reviewer revisa (puerta)       seguridad Firestore, calidad, patrones
        ↳ si encuentra algo grave → vuelve a ④
     ↓
⑦ orquestador integra            resumen para Kevin, propone commit, commitea si aprueba
```

## Las puertas (gates)

- **Puerta QA** (`qa`): `npm run build` limpio, `npx tsc --noEmit`, smoke en `:3000`, flujos
  (login, producto, compra FIFO, venta, cancelar venta, ajuste, Excel, QR) y sus casos borde.
- **Puerta Reviewer** (`reviewer`): sin secretos, reglas Firestore por `uid`, escrituras atómicas,
  inputs validados, patrones respetados, comentarios breves en español, sin código muerto.
- **Puerta Kevin** (tú): al final decides tú. Apruebas, pides ajustes o replanteas.

## Cómo pedir una tarea bien

- Di qué quieres lograr, no cómo ("quiero alertas cuando un producto baje de stock").
- Si tienes una preferencia técnica, dilo ("usando la colección batches").
- No te preocupes por los detalles: `orchestrator` te va a preguntar lo necesario.

## Ejemplo real (alerta de stock mínimo)

1. Pides: *"quiero que me avise cuando un producto baje de su stock mínimo"*.
2. `orchestrator` pregunta: ¿aviso visual, notificación, o las dos? ¿qué cuenta como "bajo"?.
3. `architect` nota: no hace falta colección nueva; el dato ya está en cada `product` (`stockMinimo`).
   Fronteras: cálculo en `utils/calculations.ts`, aviso en la UI.
4. `frontend-dev` agrega el aviso visual en `InventarioView` usando `useApp()`.
5. `qa` prueba: baja el stock por debajo del mínimo → aparece aviso; otros flujos siguen vivos.
6. `reviewer` revisa que use el patrón del contexto y no rompa nada.
7. `orchestrator` te muestra un resumen y propone: `feat: alerta de stock minimo en inventario`.