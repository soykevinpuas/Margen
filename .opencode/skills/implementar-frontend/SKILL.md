---
name: implementar-frontend
description: "Usa cuando una tarea toque la interfaz: vistas, modales, componentes, navegación, estilos PWA o el App.tsx en src/components/ y public/. React, Vite, Tailwind, componentes, UI, modales, vistas, PWA."
---

# Implementar frontend — Manual del frontend developer

## Antes de empezar
- [ ] Leí la spec (`docs/tasks/*.md`) y el diseño de `architect`.
- [ ] Reviso los componentes existentes en `src/components/` antes de crear uno nuevo.
- [ ] Uso solo librerías ya instaladas: React, Vite, Tailwind v4, motion, lucide-react, xlsx, qrcode.react.

## Patrones a seguir

### Vistas (`src/components/views/`)
- Cada pestaña tiene una vista: `InicioView`, `InventarioView`, `VenderView`, `GraficasView`, `MasView`. `LandingPage` es la pública (sin login).

### Modales (`src/components/modals/`)
- Todo modal recibe `isOpen` y `onClose` por props y se controla desde `App.tsx`.
- Usa `DetalleProductoModal` / `NuevaCompraModal` como referencia de estructura.
- Los modales pesados (ExportExcel, QR) idealmente cargan con `import()` dinámico para no inflar el bundle inicial.

### Datos
- NUNCA llamar Firestore/fetch directo en un componente: usa `useApp()` (contexto) y sus acciones (`addSale`, `addPurchaseBatch`, etc.).
- Lee los datos del contexto; no guardes copias locales que se desincronicen con Firestore.

### Estado
- `useState` para UI local, `useEffect` para sincronizar, `useCallback` para funciones estables.

### Estilo
- Tailwind v4 con el tema de `src/index.css` (fondo slate oscuro, acentos emerald/teal).
- Iconos de `lucide-react`, animaciones con `motion`.

## Verificación obligatoria (antes de entregar)
```bash
npm run build                # DEBE pasar limpio
npx tsc --noEmit             # sin errores
```
- Prueba en el navegador con `npm run dev` en `:3000`.
- No dejes warnings ni errores en consola.

## Estilo de código
- Comentarios breves en español: `// Abre el modal de nueva compra`.
- Nombres claros. Reutiliza componentes. Respeta el tema y los patrones existentes.