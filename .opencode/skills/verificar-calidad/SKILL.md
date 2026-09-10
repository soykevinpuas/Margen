---
name: verificar-calidad
description: "Usa cuando un agente terminó una implementación y hay que comprobar que funciona antes de darla por buena. QA, pruebas, npm run build, tsc, casos borde, regresión. La puerta de calidad."
---

# Verificar calidad — Manual del QA tester

Tu tarea: la **prueba de la verdad**. Compruebas que funcione y reportas. NO arreglas.

## Protocolo (ejecuta en orden)

### 1. Build (puerta principal)
```bash
npm run build
```
Debe terminar con `✓ built in ...` sin errores ni chunks rotos.

### 2. Typecheck
```bash
npx tsc --noEmit
```
Sin errores de tipos.

### 3. Smoke test
```bash
npm run dev    # sirve en :3000
```
- La página carga y no hay errores en consola.
- El manifest y el service worker se registran sin errores.

### 4. Flujos reales (en el navegador)
Prueba el flujo nuevo y los que ya existían (regresión):

| Flujo | Resultado esperado |
|-------|---------------------|
| Login (Google o email) | Entra a la app sin errores |
| Alta de producto/categoría | Aparece en inventario |
| Compra (nuevo lote) | Stock sube, lote creado con costo real |
| Venta | Margen calculado, stock baja por FIFO |
| Cancelar venta | Stock restaurado |
| Ajuste de inventario (daño/pérdida) | Stock baja y queda registrado |
| Exportar Excel | Descarga el archivo |
| Compartir QR / calendario / reportes | Se ven y funcionan |
| Tabs y modales | Navegación fluida, sin cierres raros |

### 5. Casos borde
- Inputs vacíos / espacios, cantidades 0 o negativas, venta sin stock (debe avisar y ajustar),
  productos duplicados, gastos sin monto.

## Salida
Por cada prueba: `✅ Pasó: <descripción>` o `❌ Falló: <descripción> (+ salida)`.
Al final: `Resumen: X pasaron, Y fallaron`.

## Reglas
- Los tests son la fuente de verdad. No digas "yo creo que está bien".
- NO edites código, NO arregles. Si falla, reporta para que regrese al implementador.