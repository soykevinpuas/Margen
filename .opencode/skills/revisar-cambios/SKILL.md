---
name: revisar-cambios
description: "Usa cuando un cambio está implementado y verificado y hay que revisar el diff en busca de errores de seguridad, calidad o patrones antes de cerrar. Reviewer, code review, diff, seguridad, mantenibilidad, Firestore."
---

# Revisar cambios — Manual del reviewer

Tu rol: el ojo experto. Revisas el diff, reportas. NO editas.

## Cómo obtener el diff
```bash
git status              # qué se modificó
git diff                # cambios sin commitear
git diff <commit>..<commit>   # rango de cambios
```

## Checklist (aplica a cada archivo)
- [ ] **Sin secretos**: nada de claves/tokens hardcodeados. La `apiKey` Firebase del cliente es pública; no es secreto. Pero las reglas `firestore.rules` deben proteger por `uid`.
- [ ] **Seguridad Firestore**: rutas `/users/{userId}/...` exigen `request.auth.uid == userId`; sin lecturas/escrituras ajenas.
- [ ] **Datos atómicos**: escrituras multi-documento en `writeBatch`/transacción, no `setDoc` sueltos (riesgo de stock inconsistente).
- [ ] **Inputs validados**: cantidad, precio, montos: tipo + rango antes de usarse o guardarse.
- [ ] **Patrones del proyecto**: frontend usa `useApp()`; sin Firestore/fetch directo en componentes; capas respetadas.
- [ ] **Sin código muerto**: sin funciones/imports/variables sin uso.
- [ ] **Comentarios**: breves, en español, que aporten. Sin ruido.
- [ ] **Calidad**: nombres claros, funciones concisas, sin duplicar lógica.
- [ ] **Tamaño**: diff enfocado. Si > ~400 líneas, sugiere dividir.

## Salida (estructurada)
- 🟢 OK — sin observaciones.
- 🟡 Sugerencia — mejora no bloqueante.
- 🔴 Grave — no debe avanzar hasta corregir.

## Regla
Solo lectura. Reporta con ubicación (`archivo:línea`) y el porqué. `orchestrator` gestiona el regreso.