# 01 — El equipo: quién es quién

Margen se desarrolla como un equipo completo, pero **100% interpretado por la IA** (yo), un rol a la vez.
Kevin es el **dueño del producto**: él dice QUÉ se construye y aprueba el resultado final. La IA ejecuta.

## Los 7 roles

| # | Rol | Agente | Equivale a | Qué hace (en Margen) | Permisos |
|---|-----|--------|-----------|----------------------|----------|
| 0 | Orquestador | `orchestrator` (principal) | Product Owner + Tech Lead | Clarifica con preguntas, divide en subtareas, delega, integra, propone commit | No escribe código él mismo: lo delega |
| 1 | Arquitecto | `architect` | Arquitecto de software | Diseña el esquema de Firestore, fronteras entre módulos, reglas de seguridad y elección de librerías | Solo lectura |
| 2 | Backend (datos) | `backend-dev` | Ing. de datos / Firebase | Acciones de datos, sincronización Firestore, seedData, tipios, reglas de seguridad | Edita `context/`, `data/`, `lib/`, `firestore.rules` |
| 3 | Frontend | `frontend-dev` | Ing. Frontend | Vistas, modales, componentes, navegación, estilos y PWA | Edita `components/`, `App.tsx`, `public/` |
| 4 | QA | `qa` | QA Engineer | Verifica que funcione (build + typecheck + flujos) y busca casos borde | Solo verifica, no arregla |
| 5 | Reviewer | `reviewer` | Senior Reviewer | Revisa el diff: seguridad (Firestore), calidad, mantenibilidad | Solo lectura |
| 6 | DevOps | `devops` | DevOps | Build de producción, tamaño del bundle, PWA/offline, hosting | Edita config de build/deploy |

## Ayudantes que ya vienen con opencode

| Agente | Para qué usarlo |
|--------|-----------------|
| `explore` | Buscar archivos y entender el código existente sin tocarlo |
| `general` | Investigación y tareas multipaso de propósito general |

## Reglas de oro

1. Un rol a la vez por tarea.
2. `orchestrator` siempre clarifica antes de que alguien toque código.
3. `qa` y `reviewer` son puertas: si fallan, el trabajo regresa al implementador.
4. Nadie hace commit sin que Kevin lo vea y lo apruebe.

## Cómo se eligió este equipo (2026)

- El patrón probado de equipos multi-agente es SDD (*Subagent-Driven Development*):
  **orquestador → implementadores → QA → reviewer** (Code Crafter's Den, ArceApps, docs de opencode).
- QA no es opcional: en IA se vuelve la verificación automática (`npm run build` + typecheck).
- El **reviewer es el rol que más se valora**: con IA generando código, lo escaso es quien lo juzga.