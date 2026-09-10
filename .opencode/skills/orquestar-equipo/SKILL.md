---
name: orquestar-equipo
description: "Usa cuando Kevin pida una tarea, funcionalidad o corrección y haya que dividirla en subtareas, armar el plan, delegar a los agentes (architect, backend-dev, frontend-dev, qa, reviewer, devops) y cerrar con commit. Plan del equipo, acceptance criteria, delegate, verify, commit."
---

# Orquestar trabajo — Manual del orquestador

Pasos que sigue el `orchestrator` en cada tarea. No se salta ninguno.

## 1. Clarifica con Kevin

Pregunta una cosa a la vez hasta entender QUÉ se quiere lograr. Acepta: "no lo sé" como respuesta (decide por ellos, luego validarán). Etiqueta cada pregunta con `Pregunta:`.

## 2. Guarda la spec

Crea `docs/tasks/<YYYY-MM-DD>-<slug>.md` con:

```
# <tarea>
Fecha: <date>
Estado: 🔵 en progreso / 🟡 esperando / ✅ done / 🔴 bloqueada

## Qué quiere Kevin
(una línea clara)

## Criterios de aceptación
- [ ] Condición 1
- [ ] Condición 2
- [ ] npm run build limpio
- [ ] qa aprueba
- [ ] reviewer aprueba

## Capas afectadas
- backend (datos/Firebase) / frontend (UI) / ambos

## Plan
1. Architect diseña...
2. Backend/Frontend implementa...
3. QA verifica...
4. Reviewer revisa...

## Resultado
(ellí al final)
```

## 3. Enruta a architect (si toca diseño)

Cuando la tarea afecta: colecciones nuevas en Firestore, cambios de reglas, librería nueva, o estructura de módulos.
El `architect` responde con un diseño; el `orchestrator` lo guarda en la spec y pasa al paso 4.
Si NO toca diseño (un botón, un texto, un cálculo simple), salta a 4.

## 4. Delega implementación

Llama a `backend-dev` (datos/Firebase) o `frontend-dev` (UI), o ambos secuencialmente, con:
- La spec + el diseño de architect.
- Nombre del archivo a tocar, ruta exacta del cambio.
- "Sigue los patrones existentes; usa únicamente las librerías ya instaladas".

## 5. Invoca QA (puerta)

Llama a `qa` y pásale la spec completa + los archivos que se tocaron.
QA ejecuta verificación (build + typecheck + flujos). Si falla → regresa al paso 4 con los hallazgos.

## 6. Invoca reviewer (puerta)

Llama a `reviewer` y pásale el diff o el resultado de `git diff`.
Reviewer reporta. Si hay 🔴 → regresa al paso 4.

## 7. Integra y cierra

Resume a Kevin en español claro:
- Qué se hizo.
- Cómo probarlo.
- Propone un commit `conventional` (`feat: ...`, `fix: ...`, `chore: ...`).
- Espera aprobación de Kevin antes de commitar.

## Regla de oro

NO marques una tarea como terminada sin que pasen las puertas `qa` y `reviewer`.