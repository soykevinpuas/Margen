# Importar compras desde Excel + Alta rápida de producto en compra

Fecha: 2026-09-10
Estado: ✅ done

## Qué quiere Kevin
"Registrar compras y dar de alta productos toma demasiado tiempo."
1. **Importar inventario/compra desde Excel (masivo)**: modal que lee un `.xlsx`, valida filas y crea
   productos + lote(s) de compra en una sola operación.
2. **Alta rápida de producto**: dentro del modal de compra (NuevaCompraModal), un mini-formulario
   "nombre + cantidad + precio" que crea el producto con valores por defecto y lo agrega al lote en curso.

Este documento es SOLO diseño. No toca código de la app.

---

## Diseño

### A) Importar desde Excel

#### A.1 Formato de la hoja (1 sola hoja, primera del archivo)
Headers exactos (fila 1). Se tolera trim y minúsculas/acentos en los headers, pero el título oficial es:

| Columna (header)   | Requerida | Tipo esperado                                                      | Rango / reglas                          |
| ------------------ | --------- | ------------------------------------------------------------------ | --------------------------------------- |
| `Nombre`           | ✔️ SÍ     | texto                                                              | 1–120 caracteres, no vacío, único en el archivo |
| `Categoria`        | no        | texto                                                              | 1–60 caracteres; si se omite → `General` |
| `Cantidad`         | ✔️ SÍ     | entero positivo                                                    | 1–10.000 unidades                      |
| `Costo unitario`   | ✔️ SÍ     | número con hasta 2 decimales, en **MXN**                           | ≥ 0                                     |
| `Precio venta`     | no        | número con hasta 2 decimales, en **MXN**                           | ≥ 0 → alimenta `precioSugerido`         |
| `Stock minimo`     | no        | entero ≥ 0                                                         | default = `settings.defaultMinStock` (3) |
| `Fecha compra`     | no        | fecha (Excel serial `NNNNN` o texto `YYYY-MM-DD` / `dd/mm/yyyy`)   | si se omite → fecha de hoy              |

- Si la hoja no tiene la fila de headers esperada (falta `Nombre`), se rechaza el archivo con mensaje claro.
- Columnas extra se ignoran.
- Moneda única MXN: coherente con `costoProductoUnitarioMXN` y `settings.displayCurrency`.

#### A.2 Validación fila por fila
- `Nombre` vacío → error.
- `Cantidad` no entero, ≤ 0 o > 10.000 → error.
- `Costo unitario` no numérico o < 0 → error.
- `Precio venta` / `Stock minimo` no numéricos o negativos → error.
- `Fecha compra` ilegible (ni serial ni formato fecha válido) → error.
- **Duplicados por nombre DENTRO del archivo** (trim + case-insensitive) → error en la 2ª aparición.
- Los errores se listan con su número de fila de Excel (fila 2 = primer dato) y descripción.
- **Política fail-fast**: si hay errores NO se importa nada; se muestra la lista y se reimporta tras corregir.

#### A.3 Comportamiento ante productos que ya existen
Regla: **si EXISTE un producto con el mismo nombre (trim + case-insensitive), NO se crea producto
nuevo; solo se agrega su lote de compra. Si está archivado, se reactiva.**

Por qué:
- El nombre es el identificador natural en un alta masiva (no hay SKU confiable en el Excel).
- Evita catálogo duplicado por errores de tipeo y mantiene el historial del FIFO en un solo producto.
- Casos de borde: si hay 2+ productos con el mismo nombre ya en catálogo → **error de ambigüedad**
  (esa fila no se importa) para no decidir arbitrariamente.

#### A.4 Categorías inexistentes
- Se buscan las categorías existentes por nombre (trim + case-insensitive).
- Si no existe → se crea con `id: cat-${Date.now()}-${idx}` (idx = índice del archivo, evita colisión
  por `Date.now()` en la misma operación), `archived: false`, `createdAt: now`.
- Si el campo `Categoria` está vacío → se usa la categoría `General` (`cat-general`), creada si no existe.

#### A.5 Construcción de los lotes
Regla: **una fila = un producto = un lote**, con `fecha` = `Fecha compra` de la fila (o hoy si vacío).
`gastosDeCompra = []`, `esInventarioInicial = false`, `locked = false`, mismo cálculo que
`addPurchaseBatch` (AppContext.tsx:483):
- `costoProductosMXN = cantidad × costo unitario`
- `costoTotalMXN = costoProductosMXN` (sin gastos)
- `costoUnitarioRealMXN = costoTotalMXN / cantidad`

Por qué:
- Coherente con el FIFO actual (`calculations.ts:116` ordena por `fecha` + `createdAt`): respeta las
  fechas reales de compra de la hoja, y cada lote conserva su costo.
- Un lote global colapsaría precios/fechas distintos y rompería el costo por lote.
- No hay columna de gastos en el Excel (masivo = simple); si Kevin necesita prorratear gastos, se
  edita el lote o se hace con el modal normal.

#### A.6 Costo de la operación
Regla: **acción nueva `importExcel` en AppContext que hace TODO con `writeBatch` (atómico)**.

- Firma: `importExcel(rows: ImportRow[]): { ok: boolean; creadosProductos: number; creadosLotes: number; creadasCategorias: number; mensaje: string }`.
- `ImportRow` = fila ya validada (nombre, categoriaId|nombre, cantidad, costoUnitario, precioSugerido?, stockMinimo, fecha).
- Dentro: calcula los ids (categorías, productos `prod-${Date.now()}-${idx}`, lotes `L-${Date.now()}-${idx}`),
  prepara `{categories, products, batches}`, los aplica al estado local en un solo setState y llama un
  `writeBatch` con todos los `set()` (patrón usado en `resetToSeedData`, AppContext.tsx:878).

Por qué:
- **Atómico**: reutilizar `addProduct` + `addPurchaseBatch` fila por fila = N+ escrituras separadas; si
  falla a mitad queda inventario parcial. `writeBatch` se confirma o no, sin estados a medias.
- Un solo setState local + un solo commit = consistente con el resto del app y con `onSnapshot`.
- Límite de Firestore: **500 escrituras por batch** → se valida antes: `writes = filasValidas×2 + categoriasNuevas`;
  si supera 500 se rechaza con mensaje (**máx. 250 filas por archivo**, y si `filas×2 + categoriasNuevas > 500`
  se pide partir el archivo o reusar categorías).
- **Offline**: si `navigator.onLine === false` → botón "Importar" deshabilitado con aviso. No se aceptan
  imports offline: `writeBatch` no se puede confirmar contra Firestore y el estado quedaría desincronizado.

#### A.7 Iteración 1 mínima (sin AI)
- Nuevo modal `ImportarExcelModal.tsx` (patrón de `ExportExcelModal.tsx`, mismos estilos de overlay/card).
- Botón de apertura en:
  - `MasView` junto al de "Exportar Excel",
  - `InventarioView` (cabecera, acción "Importar").
- Lectura: `<input type="file" accept=".xlsx">` → `FileReader.readAsArrayBuffer` →
  `XLSX.read(data, { type: 'array' })` → `XLSX.utils.sheet_to_json(hs, { defval: '' })` (library `xlsx`
  YA instalada; sin dependencias nuevas).
- Validación con **función pura nueva** en `src/utils/excelImport.ts` (`parseRows`, `validateRows`,
  `buildImportPayload`) SIN Firestore ni UI → testable con `node --check`.
- UI del modal: 1) selector de archivo, 2) vista previa en tabla (filas válidas con ✓, errores con ✗ y
  número de fila), 3) botón "Importar N filas".
- Límite de filas a leer del archivo: **250**.

#### A.8 Riesgos y límites
- Resumen del import SIEMPRE visible tras hacerlo (cuántos productos/lotes/categorías se crearon).
- Importar es **aditivo**; no existe deshacer masivo. Se sugiere exportar respaldo antes (ya existe).
- IDs con sufijo `-${idx}` evitan colisión por `Date.now()` y por el aleatorio `L-` de 4 dígitos.
- Sin detección de duplicados por SKU en iteración 1 (SKU no está en la hoja).
- Volumen: 250 filas máx y ≤ 500 escrituras.
- Concurrencia: un solo usuario de escritura por documento; dos imports simultáneos pueden re-crear
  categorías con el mismo nombre → aceptable en iteración 1 (se resuelve en revisión por duplicado).
- Offline: import bloqueado (A.6).

### B) Alta rápida de producto en compra

#### B.1 Campos mínimos y defaults para `Product` (types.ts:24)
El mini-formulario pide SOLO 3 campos (lo que pidió Kevin):
- `Nombre` (requerido) → `product.nombre`.
- `Cantidad` (requerido, entero ≥ 1) → cantidad del lote.
- `Precio` (requerido, ≥ 0) → interpretado como **Costo Unitario del lote** (el lote de compra lo
  exige; ver justificación abajo).

Defaults para el resto del `Product`:
| Campo (types.ts)   | Default                                        |
| ------------------ | ---------------------------------------------- |
| `categoriaId`      | `cat-general` (categoría "General")            |
| `stockMinimo`      | `settings.defaultMinStock` (3)                 |
| `precioSugerido`   | `costoUnitario × 2` (redondeado a centavos)    |
| `descripcion`      | omitido                                        |
| `sku`              | omitido                                        |
| `imagen`           | omitido                                        |
| `archivado`        | `false`                                        |
| `createdAt`        | `new Date().toISOString()`                     |

Por qué "Precio" = costo unitario: el lote necesita `costoProductoUnitarioMXN` para calcular
`costoUnitarioRealMXN` (AppContext.tsx:494). El precio de venta se autocompleta con 2× el costo como
punto de partida vendible, editable después en el catálogo.

#### B.2 Acción: REUSAR las existentes (`addProduct` + `addPurchaseBatch`)
Regla: **NO se crea acción nueva**. El modal llama en secuencia:
1. `addProduct({ nombre, categoriaId, stockMinimo, precioSugerido })` → devuelve el `Product` creado.
2. `addPurchaseBatch({ productoId: nuevo.id, cantidadComprada, costoProductoUnitarioMXN, gastosDeCompra, fecha, proveedor, esInventarioInicial })`.

Por qué:
- Cero cambios en AppContext: aprovecha el cálculo de lotes ya probado (costoUnitarioReal, locked,
  esInventarioInicial) y el flujo de confirmación existente del modal.
- La atomicidad no es crítica aquí (es 1 solo producto, no masivo): si el lote falla, el producto se
  ve al instante y es fácil archivar/editar.

#### B.3 Integración en NuevaCompraModal
- Toggle segmentado arriba del selector de producto: **"Elegir existente | + Alta rápida"** (estado
  local `modo: 'existente' | 'rapido'`).
- En modo rápido se reemplaza el `<select>` por 3 inputs: Nombre, Cantidad, Costo Unitario ($).
- El resto del modal (fecha, proveedor, gastos de compra, notas, inventario inicial, card de totales)
  queda igual y aplica AL lote.
- Al confirmar: se ejecuta B.2 y se muestra la misma pantalla "Compra Confirmada" con el producto nuevo.
- Tras alta rápida, el producto queda seleccionable en el modo "Elegir existente" para siguientes compras.

---

## Capas afectadas (implementación, fase posterior)
- **Nuevo**: `src/components/modals/ImportarExcelModal.tsx`, `src/utils/excelImport.ts`.
- **Nuevo**: `importExcel` en `src/context/AppContext.tsx` (+ interfaz en `AppContextType`).
- **Touch**: `src/components/modals/NuevaCompraModal.tsx` (toggle alta rápida),
  `src/components/views/MasView.tsx` e `InventarioView.tsx` (botón Importar).
- **Sin librerías nuevas**: `xlsx` ya está en uso (ExportExcelModal.tsx:2).

## Criterios de aceptación
- [ ] Import de .xlsx válido crea categorías, productos y lotes en **una** operación atómica; resumen final visible.
- [ ] Fila con error (nombre vacío, cantidad ≤ 0, duplicado) impide el import y detalla fila nº.
- [ ] Producto existente con mismo nombre → solo agrega lote (y reactiva si estaba archivado).
- [ ] Alta rápida crea producto (defaults de B.1) y su lote, con la confirmación estándar del modal.
- [ ] `npm run build` limpio y `npx tsc --noEmit` sin errores.

## QA (puerta)
- Fixture `.xlsx` con: filas válidas, nombre duplicado en archivo, producto ya existente, categoría nueva,
  fecha serial de Excel. Fluxes con `node --check` y build; contrato de `importExcel` verificado aislado.

---
## Resultado (implementado y verificado)
- `ImportExcelModal.tsx` (nuevo): parsea 1ª hoja, valida fail-fast (límite 250 filas), preview, requiere conexión.
- `importExcel` en AppContext con **un solo writeBatch atómico**; duplicados por nombre case-insensitive
  (solo agrega lote + reactiva), categorías auto, estado local aplicado solo tras commit OK.
- Alta rápida en NuevaCompraModal (toggle "Elegir existente | + Alta rápida"): Nombre/Cantidad/Costo,
  categoría General creada al vuelo si falta (fix 🔴 del reviewer), guard costo>0.
- Botón "Importar Excel" en InventarioView.
- QA 13/13 + re-verificación del delta 4/4 con build/tsc limpios; reviewer APROBADO.
- 🟡 futuras: botón deshabilitado también si costo unitario 0 en modo rápido; indentación cosmética.