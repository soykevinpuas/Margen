import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Product } from '../../types';

interface NuevoProductoModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingProductId?: string | null;
}

export const NuevoProductoModal: React.FC<NuevoProductoModalProps> = ({
  isOpen,
  onClose,
  editingProductId,
}) => {
  const { settings, categories, products, addProduct, updateProduct, addCategory } = useApp();

  const isEditing = !!editingProductId;
  const existingProduct = isEditing
    ? products.find((p) => p.id === editingProductId)
    : null;

  const [nombre, setNombre] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [sku, setSku] = useState('');
  const [precioSugerido, setPrecioSugerido] = useState('');
  const [stockMinimo, setStockMinimo] = useState<number | string>(settings.defaultMinStock ?? 3);
  const [imagen, setImagen] = useState('');

  // New category creation inline
  const [newCatName, setNewCatName] = useState('');
  const [isAddingNewCat, setIsAddingNewCat] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const defaultCatId = categories.find((c) => !c.archived)?.id || '';
      if (existingProduct) {
        setNombre(existingProduct.nombre);
        setCategoriaId(existingProduct.categoriaId || defaultCatId);
        setSku(existingProduct.sku || '');
        setPrecioSugerido(existingProduct.precioSugerido != null ? String(existingProduct.precioSugerido) : '');
        setStockMinimo(existingProduct.stockMinimo);
        setImagen(existingProduct.imagen || '');
      } else {
        setNombre('');
        setCategoriaId(defaultCatId);
        setSku('');
        setPrecioSugerido('');
        setStockMinimo(settings.defaultMinStock ?? 3);
        setImagen('');
      }
    }
  }, [isOpen, editingProductId, existingProduct, categories]);

  if (!isOpen) return null;

  const defaultCatId = categories.find((c) => !c.archived)?.id || '';
  const activeCategoriaId = categoriaId || defaultCatId;

  const handleCreateCategoryInline = () => {
    if (!newCatName.trim()) return;
    const cat = addCategory(newCatName.trim());
    setCategoriaId(cat.id);
    setNewCatName('');
    setIsAddingNewCat(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !activeCategoriaId || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await new Promise((r) => setTimeout(r, 200));

      const parsedStockMin = Math.max(0, parseInt(String(stockMinimo)) || 0);

      const productPayload: any = {
        nombre: nombre.trim(),
        categoriaId: activeCategoriaId,
        stockMinimo: parsedStockMin,
      };

      if (sku.trim()) productPayload.sku = sku.trim();
      if (precioSugerido && !isNaN(parseFloat(precioSugerido))) {
        productPayload.precioSugerido = parseFloat(precioSugerido);
      }
      if (imagen.trim()) productPayload.imagen = imagen.trim();

      if (isEditing && editingProductId) {
        updateProduct(editingProductId, productPayload);
      } else {
        addProduct(productPayload as Omit<Product, 'id' | 'createdAt' | 'archivado'>);
      }

      // Reset fields
      setNombre('');
      setSku('');
      setPrecioSugerido('');
      setImagen('');
    } catch (err) {
      console.error('Error al guardar el producto:', err);
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-surface-container-high border border-outline-variant w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-lg">
                {isEditing ? 'edit' : 'add_box'}
              </span>
            </div>
            <div>
              <h2 className="text-sm font-headline font-bold text-on-surface">
                {isEditing ? 'Editar Producto' : 'Crear Nuevo Producto'}
              </h2>
              <p className="text-[10px] text-on-surface-variant">
                Define especificaciones de catálogo y precio sugerido
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs overflow-y-auto flex-1">
          <div>
            <label className="block font-bold text-on-surface-variant uppercase tracking-wider text-[10px] mb-1">
              Nombre del Producto *
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Air Jordan 1 Retro, Cien Años de Soledad..."
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full h-10 bg-surface-container border border-outline-variant text-on-surface rounded-lg px-3 text-xs focus:outline-none focus:border-primary font-bold"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-bold text-on-surface-variant uppercase tracking-wider text-[10px]">
                Categoría *
              </label>
              <button
                type="button"
                onClick={() => setIsAddingNewCat(!isAddingNewCat)}
                className="text-[10px] font-bold text-primary hover:underline"
              >
                {isAddingNewCat ? 'Cancelar' : '+ Nueva Categoría'}
              </button>
            </div>

            {isAddingNewCat ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nombre categoría..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="flex-1 h-9 bg-surface-container border border-outline-variant text-on-surface rounded-lg px-3 text-xs"
                />
                <button
                  type="button"
                  onClick={handleCreateCategoryInline}
                  className="px-3 bg-primary text-on-primary font-bold rounded-lg text-xs"
                >
                  Crear
                </button>
              </div>
            ) : (
              <select
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                className="w-full h-10 bg-surface-container border border-outline-variant text-on-surface rounded-lg px-3 text-xs focus:outline-none focus:border-primary"
              >
                {categories
                  .filter((c) => !c.archived)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-on-surface-variant uppercase tracking-wider text-[10px] mb-1">
                SKU / Código (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ej. LIB-001"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full h-10 bg-surface-container border border-outline-variant text-on-surface rounded-lg px-3 text-xs focus:outline-none focus:border-primary uppercase"
              />
            </div>

            <div>
              <label className="block font-bold text-on-surface-variant uppercase tracking-wider text-[10px] mb-1">
                Precio Sugerido (MXN)
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-2.5 text-on-surface-variant text-xs">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={precioSugerido}
                  onChange={(e) => setPrecioSugerido(e.target.value)}
                  className="w-full h-10 bg-surface-container border border-outline-variant text-on-surface rounded-lg pl-6 pr-3 text-right font-bold text-xs focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-on-surface-variant uppercase tracking-wider text-[10px] mb-1">
                Stock Mínimo para Alerta
              </label>
              <input
                type="number"
                min="0"
                value={stockMinimo}
                onChange={(e) => setStockMinimo(e.target.value)}
                onBlur={() => {
                  const val = parseInt(String(stockMinimo));
                  if (isNaN(val) || val < 0) setStockMinimo(0);
                }}
                className="w-full h-10 bg-surface-container border border-outline-variant text-on-surface rounded-lg px-3 text-xs font-bold focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block font-bold text-on-surface-variant uppercase tracking-wider text-[10px] mb-1">
                URL Imagen (Opcional)
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={imagen}
                onChange={(e) => setImagen(e.target.value)}
                className="w-full h-10 bg-surface-container border border-outline-variant text-on-surface rounded-lg px-3 text-xs focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={!nombre.trim() || !activeCategoriaId || isSubmitting}
              className="w-full py-3 bg-primary text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20 hover:opacity-95 active:scale-95 transition-all text-xs flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div>
                  <span>Guardando producto...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">
                    check_circle
                  </span>
                  <span>{isEditing ? 'Guardar Cambios' : 'Crear Producto'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
