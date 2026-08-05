import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  formatMoney,
  getProductTotalStock,
  calculateFifoAllocation,
} from '../../utils/calculations';
import { Product, SaleExpenseItem } from '../../types';

interface VenderViewProps {
  preselectedProductId?: string | null;
  onSaleSuccess: () => void;
  onGoToHistory: () => void;
  onOpenNuevoProducto?: () => void;
}

export const VenderView: React.FC<VenderViewProps> = ({
  preselectedProductId,
  onSaleSuccess,
  onGoToHistory,
  onOpenNuevoProducto,
}) => {
  const { settings, products, batches, addSale } = useApp();
  const { displayCurrency, exchangeRate } = settings;

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<number | string>(1);
  const [unitPrice, setUnitPrice] = useState<string>('');
  const [expenses, setExpenses] = useState<SaleExpenseItem[]>([]);
  const [notes, setNotes] = useState<string>('');

  // UI sheets / modals
  const [isProductSheetOpen, setIsProductSheetOpen] = useState<boolean>(false);
  const [sheetSearch, setSheetSearch] = useState<string>('');
  const [isSuccessScreen, setIsSuccessScreen] = useState<boolean>(false);
  const [lastCompletedSaleInfo, setLastCompletedSaleInfo] = useState<{
    revenue: number;
    profit: number;
    productName: string;
    quantity: number;
    unitPrice: number;
    marginPct: number;
    expenses: SaleExpenseItem[];
    remainingStock: number;
  } | null>(null);

  // Preselect product if passed
  useEffect(() => {
    if (preselectedProductId) {
      const prod = products.find((p) => p.id === preselectedProductId);
      if (prod) {
        selectProduct(prod);
      }
    }
  }, [preselectedProductId]);

  const activeProducts = products.filter((p) => !p.archivado);

  const selectProduct = (p: Product) => {
    setSelectedProduct(p);
    setQuantity(1);
    setUnitPrice(p.precioSugerido != null ? String(p.precioSugerido) : '');
    setExpenses([]);
    setIsProductSheetOpen(false);
  };

  const handleClearProduct = () => {
    setSelectedProduct(null);
    setQuantity(1);
    setUnitPrice('');
    setExpenses([]);
  };

  const availableStock = selectedProduct
    ? getProductTotalStock(selectedProduct.id, batches)
    : 0;

  // Quantity handlers
  const handleQuantityChange = (val: number | string) => {
    if (typeof val === 'string') {
      setQuantity(val);
    } else {
      let q = val;
      if (q < 1) q = 1;
      if (availableStock > 0 && q > availableStock) {
        q = availableStock;
      }
      setQuantity(q);
    }
  };

  // Add Expense
  const handleAddExpense = () => {
    setExpenses((prev) => [
      ...prev,
      { id: `se-${Date.now()}`, nombre: '', montoMXN: 0 },
    ]);
  };

  const handleUpdateExpense = (
    id: string,
    field: 'nombre' | 'montoMXN',
    value: any
  ) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  const handleRemoveExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  // Live Calculations
  const numericQty = Math.max(1, parseInt(String(quantity)) || 1);
  const numericPrice = parseFloat(unitPrice) || 0;
  const totalRevenue = numericQty * numericPrice;

  const fifoCalc = selectedProduct
    ? calculateFifoAllocation(selectedProduct.id, numericQty, batches)
    : { cogsMXN: 0 };

  const totalSaleExpenses = expenses.reduce((acc, e) => acc + (e.montoMXN || 0), 0);
  const totalCost = fifoCalc.cogsMXN + totalSaleExpenses;
  const profit = totalRevenue - totalCost;
  const marginPct = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

  // Confirm Sale
  const handleConfirmSale = () => {
    if (!selectedProduct) return;
    if (numericQty <= 0) return;

    const res = addSale({
      productoId: selectedProduct.id,
      cantidad: numericQty,
      precioVentaUnitarioMXN: numericPrice,
      gastosDeVenta: expenses.filter((e) => e.montoMXN > 0),
      metodoAsignacion: 'FIFO',
      fecha: new Date().toISOString(),
      notas: notes,
    });

    if (res.success && res.sale) {
      const remainingStock = availableStock - numericQty;
      setLastCompletedSaleInfo({
        revenue: res.sale.ingresoTotalMXN,
        profit: res.sale.gananciaVentaMXN,
        productName: selectedProduct.nombre,
        quantity: numericQty,
        unitPrice: numericPrice,
        marginPct,
        expenses: expenses.filter((e) => e.montoMXN > 0),
        remainingStock: Math.max(0, remainingStock),
      });
      setIsSuccessScreen(true);
      onSaleSuccess();
    }
  };

  const handleNewSale = () => {
    setIsSuccessScreen(false);
    setSelectedProduct(null);
    setQuantity(1);
    setUnitPrice('');
    setExpenses([]);
    setNotes('');
  };

  // Filter products in picker sheet
  const filteredSheetProducts = activeProducts.filter((p) => {
    const q = sheetSearch.toLowerCase();
    return (
      p.nombre.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q))
    );
  });

  if (isSuccessScreen && lastCompletedSaleInfo) {
    return (
      <div className="flex flex-col items-center text-center px-5 pt-8 pb-24 animate-fade-in max-w-lg mx-auto">
        {/* Success Icon */}
        <div className="relative flex items-center justify-center w-full h-32 mb-1">
          <div className="absolute bg-emerald-500/20 w-28 h-28 blur-3xl rounded-full animate-pulse"></div>
          <div className="relative z-10 w-20 h-20 bg-surface-container-highest rounded-full flex items-center justify-center shadow-xl border border-emerald-500/30">
            <span
              className="material-symbols-outlined text-[46px] text-emerald-400"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          Inventario Descontado por FIFO
        </span>

        <h1 className="text-2xl font-headline font-bold text-on-surface tracking-tight mb-1">
          ¡Venta Registrada Con Éxito!
        </h1>
        <p className="text-on-surface-variant text-xs max-w-[320px] mb-6">
          La transacción se guardó correctamente y el margen real fue calculado.
        </p>

        {/* Summary Card */}
        <div className="w-full bg-surface-container border border-outline-variant/60 rounded-2xl p-4 flex flex-col gap-3.5 shadow-md text-left mb-6">
          {/* Main Revenue Header */}
          <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
            <div>
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                Ingreso Total (Cobrado)
              </span>
              <span className="text-2xl font-headline font-extrabold text-on-surface">
                {formatMoney(lastCompletedSaleInfo.revenue, displayCurrency, exchangeRate)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                Margen Neto Real
              </span>
              <span className={`text-base font-extrabold ${lastCompletedSaleInfo.marginPct >= 0 ? 'text-emerald-400' : 'text-error'}`}>
                {lastCompletedSaleInfo.marginPct.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Product & Quantity details */}
          <div className="grid grid-cols-2 gap-3 bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/30">
            <div>
              <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block font-bold">
                Producto Vendido
              </span>
              <span className="text-xs font-bold text-on-surface truncate block">
                {lastCompletedSaleInfo.productName}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block font-bold">
                Cantidad / Precio Unitario
              </span>
              <span className="text-xs font-bold text-on-surface block">
                {lastCompletedSaleInfo.quantity} und. × {formatMoney(lastCompletedSaleInfo.unitPrice, displayCurrency, exchangeRate)}
              </span>
            </div>
          </div>

          {/* Profit Row */}
          <div className="flex items-center justify-between bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <span className="material-symbols-outlined text-[18px]">
                  trending_up
                </span>
              </div>
              <div>
                <span className="text-xs font-bold text-on-surface block">Utilidad Obtenida</span>
                <span className="text-[10px] text-on-surface-variant">Descontando costo FIFO y gastos</span>
              </div>
            </div>
            <span className="text-base font-extrabold text-emerald-400">
              +{formatMoney(lastCompletedSaleInfo.profit, displayCurrency, exchangeRate)}
            </span>
          </div>

          {/* Additional details */}
          <div className="space-y-1.5 text-xs text-on-surface-variant px-1 pt-1">
            <div className="flex items-center justify-between">
              <span>Stock Restante del Producto:</span>
              <span className="font-bold text-on-surface">
                {lastCompletedSaleInfo.remainingStock} unidades
              </span>
            </div>

            {lastCompletedSaleInfo.expenses && lastCompletedSaleInfo.expenses.length > 0 && (
              <div className="border-t border-outline-variant/20 pt-2 mt-2 space-y-1">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                  Gastos de Venta Aplicados ({lastCompletedSaleInfo.expenses.length})
                </span>
                {lastCompletedSaleInfo.expenses.map((exp, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px]">
                    <span>• {exp.nombre || 'Gasto'}:</span>
                    <span className="font-mono font-bold">
                      {formatMoney(exp.montoMXN, displayCurrency, exchangeRate)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            onClick={handleNewSale}
            className="flex-1 bg-primary text-on-primary font-bold text-xs py-3.5 rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <span
              className="material-symbols-outlined text-[18px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              add_circle
            </span>
            Registrar Otra Venta
          </button>

          <button
            onClick={onGoToHistory}
            className="flex-1 bg-surface-container border border-outline-variant text-on-surface font-bold text-xs py-3.5 rounded-xl hover:bg-surface-container-high transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">history</span>
            Ver Historial de Ventas
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full pb-[280px]">
      <div className="px-4 py-4 space-y-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-headline font-bold text-on-surface">
            Nueva Venta
          </h2>
          <p className="text-on-surface-variant text-xs">
            Registra la transacción y calcula el costo FIFO y margen al instante.
          </p>
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          {/* STEP 1: PRODUCT SELECTION */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-headline font-bold text-on-surface">
                Producto
              </h3>
              <span className="text-[10px] font-bold text-primary px-2 py-0.5 bg-primary/10 rounded-full border border-primary/20">
                Paso 1
              </span>
            </div>

            {!selectedProduct ? (
              <div
                onClick={() => setIsProductSheetOpen(true)}
                className="w-full bg-surface-container border border-outline-variant rounded-xl p-3.5 flex items-center justify-between cursor-pointer hover:border-primary/50 transition-colors shadow-sm"
              >
                <div className="flex items-center gap-3 text-on-surface-variant">
                  <span className="material-symbols-outlined">search</span>
                  <span className="text-xs font-medium">Buscar producto...</span>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">
                  arrow_drop_down
                </span>
              </div>
            ) : (
              <div className="bg-surface-container border border-outline-variant rounded-xl p-4 flex items-center gap-3 shadow-sm">
                <div className="w-12 h-12 rounded-lg bg-surface flex-shrink-0 flex items-center justify-center border border-outline-variant overflow-hidden">
                  {selectedProduct.imagen ? (
                    <img
                      src={selectedProduct.imagen}
                      alt={selectedProduct.nombre}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="material-symbols-outlined text-on-surface-variant">
                      inventory_2
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-on-surface font-bold text-xs truncate">
                    {selectedProduct.nombre}
                  </h4>
                  <p className="text-on-surface-variant text-[11px] truncate">
                    {selectedProduct.sku ? `SKU: ${selectedProduct.sku}` : 'Sin SKU'}
                  </p>
                </div>

                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-on-surface-variant">Stock</span>
                  <span
                    className={`font-bold text-xs ${
                      availableStock === 0 ? 'text-error' : 'text-on-surface'
                    }`}
                  >
                    {availableStock} und.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleClearProduct}
                  className="ml-2 w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            )}
          </section>

          {/* STEP 2: SALE DETAILS */}
          <section
            className={`space-y-3 transition-opacity duration-300 ${
              !selectedProduct ? 'opacity-40 pointer-events-none' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-headline font-bold text-on-surface">
                Detalles de Venta
              </h3>
              <span className="text-[10px] font-bold text-primary px-2 py-0.5 bg-primary/10 rounded-full border border-primary/20">
                Paso 2
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Quantity */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  Cantidad
                </label>
                <div className="flex items-center bg-surface-container border border-outline-variant rounded-xl overflow-hidden focus-within:border-primary transition-all">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(numericQty - 1)}
                    className="w-10 h-11 flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-variant transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      remove
                    </span>
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={availableStock}
                    value={quantity}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    onBlur={() => {
                      let q = parseInt(String(quantity));
                      if (isNaN(q) || q < 1) q = 1;
                      if (availableStock > 0 && q > availableStock) q = availableStock;
                      setQuantity(q);
                    }}
                    className="w-full h-11 bg-transparent text-center text-on-surface font-bold text-sm focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(numericQty + 1)}
                    className="w-10 h-11 flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-variant transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      add
                    </span>
                  </button>
                </div>
                {availableStock > 0 && numericQty >= availableStock && (
                  <p className="text-amber-500 text-[10px] font-bold">
                    Ajustado al stock máximo ({availableStock})
                  </p>
                )}
              </div>

              {/* Unit Price */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  Precio Unitario
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-on-surface-variant font-medium text-xs">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    className="w-full h-11 bg-surface-container border border-outline-variant text-on-surface rounded-xl pl-7 pr-3 text-right font-bold text-sm focus:outline-none focus:border-primary transition-all"
                  />
                </div>
                {selectedProduct?.precioSugerido && (
                  <p className="text-tertiary text-[10px] text-right font-medium">
                    Sugerido:{' '}
                    {formatMoney(
                      selectedProduct.precioSugerido,
                      displayCurrency,
                      exchangeRate
                    )}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* STEP 3: SALE EXPENSES */}
          <section
            className={`space-y-3 transition-opacity duration-300 ${
              !selectedProduct ? 'opacity-40 pointer-events-none' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <h3 className="text-sm font-headline font-bold text-on-surface">
                  Gastos de Venta
                </h3>
                <span className="text-[10px] text-on-surface-variant">
                  Envío cliente, comisión pasarela, empaque
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddExpense}
                className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                Añadir
              </button>
            </div>

            {expenses.length === 0 ? (
              <div className="py-4 border border-dashed border-outline-variant rounded-xl flex flex-col items-center justify-center gap-1 text-on-surface-variant">
                <span className="material-symbols-outlined text-outline text-xl">
                  receipt_long
                </span>
                <span className="text-xs">Sin gastos adicionales de venta</span>
              </div>
            ) : (
              <div className="space-y-2">
                {expenses.map((exp) => (
                  <div key={exp.id} className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Concepto (ej. Envío)"
                      value={exp.nombre}
                      onChange={(e) =>
                        handleUpdateExpense(exp.id, 'nombre', e.target.value)
                      }
                      className="flex-1 h-10 bg-surface-container border border-outline-variant text-on-surface rounded-lg px-3 text-xs focus:outline-none focus:border-primary"
                    />
                    <div className="relative w-28">
                      <span className="absolute left-2.5 top-2.5 text-on-surface-variant text-xs">
                        $
                      </span>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={exp.montoMXN || ''}
                        onChange={(e) =>
                          handleUpdateExpense(
                            exp.id,
                            'montoMXN',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-full h-10 bg-surface-container border border-outline-variant text-on-surface rounded-lg pl-6 pr-2 text-xs text-right font-bold focus:outline-none focus:border-primary"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveExpense(exp.id)}
                      className="w-8 h-10 flex items-center justify-center text-on-surface-variant hover:text-error transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        delete
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Optional Note */}
          {selectedProduct && (
            <div className="space-y-1">
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                Notas (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ej. Entregado en punto medio, transferencia..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full h-10 bg-surface-container border border-outline-variant text-on-surface rounded-lg px-3 text-xs focus:outline-none focus:border-primary"
              />
            </div>
          )}
        </form>
      </div>

      {/* STICKY BOTTOM SUMMARY PANEL */}
      {selectedProduct && (
        <div className="fixed bottom-[64px] left-0 right-0 max-w-lg mx-auto bg-surface-container/95 backdrop-blur-md border-t border-x border-outline-variant/60 rounded-t-2xl z-40 p-4 space-y-3 shadow-2xl">
          <div className="flex justify-between items-end">
            <div className="space-y-0.5">
              <span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">
                Ingreso Total
              </span>
              <div className="text-xl font-headline font-bold text-on-surface leading-none">
                {formatMoney(totalRevenue, displayCurrency, exchangeRate)}
              </div>
            </div>

            <div className="text-right space-y-0.5">
              <span className="text-[10px] text-on-surface-variant font-medium">
                Costo FIFO + Gastos
              </span>
              <div className="text-xs font-bold text-on-surface">
                -{formatMoney(totalCost, displayCurrency, exchangeRate)}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center bg-surface-container-lowest rounded-xl p-3 border border-outline-variant">
            <div className="flex items-center gap-2">
              <div className="w-7 h-8 rounded-full bg-tertiary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-tertiary text-[18px]">
                  trending_up
                </span>
              </div>
              <span className="text-xs font-bold text-on-surface">Ganancia</span>
            </div>

            <div className="text-right flex flex-col">
              <span
                className={`text-base font-headline font-bold ${
                  profit >= 0 ? 'text-tertiary' : 'text-error'
                }`}
              >
                {formatMoney(profit, displayCurrency, exchangeRate)}
              </span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded self-end mt-0.5 ${
                  profit >= 0
                    ? 'text-tertiary bg-tertiary/20'
                    : 'text-error bg-error/20'
                }`}
              >
                {marginPct.toFixed(1)}% MARGEN
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleConfirmSale}
            disabled={quantity <= 0 || availableStock === 0}
            className="w-full py-3.5 bg-primary text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20 hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
          >
            <span className="material-symbols-outlined text-[20px]">
              check_circle
            </span>
            Confirmar Venta
          </button>
        </div>
      )}

      {/* PRODUCT SELECTOR SHEET MODAL */}
      {isProductSheetOpen && (
        <>
          <div
            onClick={() => setIsProductSheetOpen(false)}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60]"
          ></div>
          <div className="fixed bottom-0 left-0 w-full h-[75vh] bg-surface-container-high rounded-t-2xl z-[70] flex flex-col border-t border-outline-variant shadow-2xl animate-fade-in">
            <div className="flex justify-center p-3">
              <div className="w-12 h-1.5 bg-outline rounded-full"></div>
            </div>

            <div className="px-4 pb-3 border-b border-outline-variant flex items-center gap-2">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                  search
                </span>
                <input
                  type="text"
                  autoFocus
                  value={sheetSearch}
                  onChange={(e) => setSheetSearch(e.target.value)}
                  placeholder="Buscar por nombre o SKU..."
                  className="w-full bg-surface-container border border-outline-variant text-on-surface text-xs rounded-xl py-2.5 pl-9 pr-3 focus:outline-none focus:border-primary"
                />
              </div>
              <button
                onClick={() => setIsProductSheetOpen(false)}
                className="text-xs font-bold text-on-surface-variant hover:text-on-surface"
              >
                Cancelar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredSheetProducts.length === 0 ? (
                <div className="text-center py-10 px-4 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center mx-auto text-on-surface-variant">
                    <span className="material-symbols-outlined text-2xl">search_off</span>
                  </div>
                  <p className="text-on-surface-variant text-xs">
                    No se encontraron productos en el catálogo.
                  </p>
                  {onOpenNuevoProducto && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsProductSheetOpen(false);
                        onOpenNuevoProducto();
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-md hover:bg-emerald-400 active:scale-95 transition-all"
                    >
                      <span className="material-symbols-outlined text-base">add</span>
                      + Agregar Nuevo Producto
                    </button>
                  )}
                </div>
              ) : (
                filteredSheetProducts.map((p) => {
                  const stock = getProductTotalStock(p.id, batches);
                  const isOutOfStock = stock === 0;

                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        if (!isOutOfStock) selectProduct(p);
                      }}
                      className={`flex items-center gap-3 p-3 rounded-xl border border-outline-variant/30 transition-all ${
                        isOutOfStock
                          ? 'opacity-40 grayscale pointer-events-none'
                          : 'hover:bg-surface-container hover:border-primary/50 cursor-pointer'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-surface flex-shrink-0 flex items-center justify-center overflow-hidden border border-outline-variant">
                        {p.imagen ? (
                          <img
                            src={p.imagen}
                            alt={p.nombre}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
                            inventory_2
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-on-surface font-bold text-xs truncate">
                          {p.nombre}
                        </div>
                        <div className="text-on-surface-variant text-[11px] truncate">
                          {p.sku || 'Sin SKU'}
                        </div>
                      </div>

                      <div className="text-right">
                        <div
                          className={`text-xs font-bold ${
                            isOutOfStock ? 'text-error' : 'text-on-surface'
                          }`}
                        >
                          {stock} u.
                        </div>
                        {p.precioSugerido && (
                          <div className="text-[10px] text-tertiary font-medium">
                            Sug:{' '}
                            {formatMoney(
                              p.precioSugerido,
                              displayCurrency,
                              exchangeRate
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
