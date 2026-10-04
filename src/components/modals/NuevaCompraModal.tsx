import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { formatMoney } from '../../utils/calculations';
import { ExpenseItem } from '../../types';
import { TicketModal } from './TicketModal';

interface NuevaCompraModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedProductId?: string;
  onOpenNuevoProducto?: () => void;
  /** Abre el modal de Historial de Compras (los modales viven en App) */
  onViewHistorial?: () => void;
}

export const NuevaCompraModal: React.FC<NuevaCompraModalProps> = ({
  isOpen,
  onClose,
  preselectedProductId,
  onOpenNuevoProducto,
  onViewHistorial,
}) => {
  const { settings, products, addPurchaseBatch } = useApp();
  const { displayCurrency, exchangeRate } = settings;

  const activeProducts = products.filter((p) => !p.archivado);

  const [selectedProductId, setSelectedProductId] = useState<string>(
    preselectedProductId || (activeProducts[0] ? activeProducts[0].id : '')
  );

  const [quantity, setQuantity] = useState<number | string>(1);
  const [unitCost, setUnitCost] = useState<string>('');
  const [totalProductCost, setTotalProductCost] = useState<string>('');
  const [lastEditedSource, setLastEditedSource] = useState<'unit' | 'total'>('unit');

  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [date, setDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [supplier, setSupplier] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isInitialInventory, setIsInitialInventory] = useState<boolean>(false);

  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);
  const [lastPurchaseInfo, setLastPurchaseInfo] = useState<{
    batchId?: string;
    productName: string;
    quantity: number;
    productCostMXN: number;
    realTotalCostMXN: number;
    realUnitCostMXN: number;
    supplier?: string;
    expenses: ExpenseItem[];
    isInitialInventory?: boolean;
    date: string;
    notas?: string;
  } | null>(null);

  // Reset all modal form fields
  const resetFormFields = () => {
    setQuantity(1);
    setUnitCost('');
    setTotalProductCost('');
    setExpenses([]);
    setDate(new Date().toISOString().split('T')[0]);
    setSupplier('');
    setNotes('');
    setIsInitialInventory(false);
    setIsConfirmed(false);
    setLastPurchaseInfo(null);
  };

  // Synchronize selectedProductId and reset fields when modal opens
  useEffect(() => {
    if (isOpen) {
      resetFormFields();
      if (preselectedProductId) {
        setSelectedProductId(preselectedProductId);
      } else if (activeProducts.length > 0) {
        setSelectedProductId(activeProducts[0].id);
      } else {
        setSelectedProductId('');
      }
    }
  }, [isOpen, preselectedProductId]);

  if (!isOpen) return null;

  // Handlers for assisted cost capture
  const handleQuantityChange = (valStr: string | number) => {
    const rawVal = String(valStr);
    setQuantity(rawVal);

    const parsedQty = parseInt(rawVal);
    if (!isNaN(parsedQty) && parsedQty > 0) {
      if (lastEditedSource === 'unit') {
        const u = parseFloat(unitCost) || 0;
        setTotalProductCost((u * parsedQty).toFixed(2));
      } else {
        const t = parseFloat(totalProductCost) || 0;
        setUnitCost((t / parsedQty).toFixed(2));
      }
    }
  };

  const handleUnitCostChange = (val: string) => {
    setUnitCost(val);
    setLastEditedSource('unit');
    const u = parseFloat(val) || 0;
    const q = Math.max(1, parseInt(String(quantity)) || 1);
    setTotalProductCost((u * q).toFixed(2));
  };

  const handleTotalProductCostChange = (val: string) => {
    setTotalProductCost(val);
    setLastEditedSource('total');
    const t = parseFloat(val) || 0;
    const q = Math.max(1, parseInt(String(quantity)) || 1);
    if (q > 0) {
      setUnitCost((t / q).toFixed(2));
    }
  };

  // Expenses handlers
  const handleAddExpense = () => {
    setExpenses((prev) => [
      ...prev,
      { id: `ge-${Date.now()}`, nombre: '', montoMXN: 0 },
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

  // Real Cost Calculations
  const numericQty = Math.max(1, parseInt(String(quantity)) || 1);
  const numericProductTotal = parseFloat(totalProductCost) || 0;
  const numericExpensesTotal = expenses.reduce(
    (acc, e) => acc + (e.montoMXN || 0),
    0
  );

  const realTotalCostMXN = numericProductTotal + numericExpensesTotal;
  const realUnitCostMXN = numericQty > 0 ? realTotalCostMXN / numericQty : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return;

    const numericUnitCost = parseFloat(unitCost) || 0;
    const selectedProd = products.find((p) => p.id === selectedProductId);

    const res = addPurchaseBatch({
      productoId: selectedProductId,
      cantidadComprada: numericQty,
      costoProductoUnitarioMXN: numericUnitCost,
      gastosDeCompra: expenses.filter((e) => e.montoMXN > 0),
      fecha: date,
      proveedor: supplier,
      notas: notes,
      esInventarioInicial: isInitialInventory,
    });

    // addPurchaseBatch regresa directamente el lote creado (no un { success })
    if (res) {
      setLastPurchaseInfo({
        batchId: res.id,
        productName: selectedProd ? selectedProd.nombre : 'Producto',
        quantity: res.cantidadComprada ?? numericQty,
        productCostMXN: res.costoProductosMXN ?? numericProductTotal,
        realTotalCostMXN: res.costoTotalMXN ?? realTotalCostMXN,
        realUnitCostMXN: res.costoUnitarioRealMXN ?? realUnitCostMXN,
        supplier,
        expenses: res.gastosDeCompra ?? expenses.filter((e) => e.montoMXN > 0),
        isInitialInventory,
        date: res.fecha ?? date,
        notas: res.notas ?? notes,
      });
      setIsConfirmed(true);
    } else {
      onClose();
    }
  };

  const handleResetForAnotherPurchase = () => {
    setIsConfirmed(false);
    setUnitCost('');
    setTotalProductCost('');
    setExpenses([]);
    setSupplier('');
    setNotes('');
    setIsInitialInventory(false);
  };

  // Ticket de la compra confirmada (recibo tipo ticket)
  if (isConfirmed && lastPurchaseInfo) {
    const info = lastPurchaseInfo;
    return (
      <TicketModal
        isOpen
        type="compra"
        title="¡Compra Registrada Con Éxito!"
        subtitle="Stock actualizado y costo unitario real recalculado"
        folio={info.batchId}
        fecha={info.date}
        lines={[
          { label: info.productName, text: `${info.quantity} und.` },
          { label: 'Costo producto', amount: info.productCostMXN },
          ...info.expenses.map((exp) => ({
            label: exp.nombre || 'Gasto de compra',
            amount: exp.montoMXN,
          })),
        ]}
        totalLabel="Total Invertido"
        totalAmount={info.realTotalCostMXN}
        meta={[
          {
            label: 'Costo unitario real',
            value: `${formatMoney(info.realUnitCostMXN, displayCurrency, exchangeRate)} / und.`,
          },
          { label: 'Proveedor', value: info.supplier || 'Sin especificar' },
          {
            label: 'Método',
            value: info.isInitialInventory ? 'Inventario inicial' : 'Compra de reposición',
          },
        ]}
        notas={info.notas}
        onSecondary={() => {
          setIsConfirmed(false);
          setLastPurchaseInfo(null);
          onClose();
          if (onViewHistorial) onViewHistorial();
        }}
        onPrimary={handleResetForAnotherPurchase}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-surface-container-high border border-outline-variant w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-4 py-3.5 border-b border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-lg">
                {isConfirmed ? 'check_circle' : 'local_mall'}
              </span>
            </div>
            <div>
              <h2 className="text-sm font-headline font-bold text-on-surface">
                {isConfirmed ? 'Compra Confirmada' : 'Agregar Compra (Lote)'}
              </h2>
              <p className="text-[10px] text-on-surface-variant">
                {isConfirmed
                  ? 'Transacción completada exitosamente'
                  : 'Captura asistida de mercancía y costos reales'}
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

          <form
            onSubmit={handleSubmit}
            className="p-4 space-y-4 overflow-y-auto flex-1 text-xs"
          >
            {/* Select Product */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block font-bold text-on-surface-variant uppercase tracking-wider text-[10px]">
                Producto *
              </label>
              {onOpenNuevoProducto && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenNuevoProducto();
                  }}
                  className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[13px]">add_box</span>
                  + Crear Nuevo Producto
                </button>
              )}
            </div>

            {activeProducts.length === 0 ? (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                <p className="text-amber-400 font-bold text-xs">
                  No tienes ningún producto creado en tu inventario.
                </p>
                <p className="text-on-surface-variant text-[11px]">
                  Para registrar una compra, primero debes agregar un producto al catálogo.
                </p>
                {onOpenNuevoProducto && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenNuevoProducto();
                    }}
                    className="w-full py-2 bg-emerald-500 text-slate-950 font-extrabold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Crear Primer Producto Ahora
                  </button>
                )}
              </div>
            ) : (
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full h-10 bg-surface-container border border-outline-variant text-on-surface font-bold rounded-lg px-3 text-xs focus:outline-none focus:border-primary"
              >
                {activeProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} {p.sku ? `(${p.sku})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Assisted Costs Capture */}
          <div className="bg-surface-container border border-outline-variant rounded-xl p-3 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-on-surface-variant uppercase tracking-wider text-[10px]">
                Detalles de Mercancía
              </label>
              <span className="text-[10px] text-primary font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">auto_awesome</span>
                Captura Asistida
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-medium text-on-surface-variant mb-1">
                  Cantidad Comprada
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  onBlur={() => {
                    const parsed = parseInt(String(quantity));
                    if (isNaN(parsed) || parsed < 1) {
                      handleQuantityChange(1);
                    }
                  }}
                  className="w-full h-9 bg-surface-container-lowest border border-outline-variant text-on-surface px-3 rounded-lg font-bold text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-on-surface-variant mb-1">
                  Costo Unitario Proveedor
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-2.5 text-on-surface-variant text-xs">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={unitCost}
                    onChange={(e) => handleUnitCostChange(e.target.value)}
                    className="w-full h-9 bg-surface-container-lowest border border-outline-variant text-on-surface pl-6 pr-2 text-right font-bold text-xs focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-medium text-on-surface-variant mb-1">
                Costo Total de Producto
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-2.5 text-on-surface-variant text-xs">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={totalProductCost}
                  onChange={(e) => handleTotalProductCostChange(e.target.value)}
                  className="w-full h-9 bg-surface-container-lowest border border-outline-variant text-on-surface pl-6 pr-2 text-right font-bold text-xs focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Purchase Expenses */}
          <div className="bg-surface-container border border-outline-variant rounded-xl p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-bold text-on-surface-variant uppercase tracking-wider text-[10px]">
                  Gastos de Compra
                </label>
                <p className="text-[9px] text-on-surface-variant">
                  Envío, aduana, empaque proveedor
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddExpense}
                className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">add</span>
                Añadir
              </button>
            </div>

            {expenses.length === 0 ? (
              <p className="text-[10px] text-on-surface-variant text-center py-2 italic">
                Sin gastos adicionales de compra
              </p>
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
                      className="flex-1 h-8 bg-surface-container-lowest border border-outline-variant text-on-surface rounded-lg px-2.5 text-xs focus:outline-none focus:border-primary"
                    />
                    <div className="relative w-28">
                      <span className="absolute left-2 top-2 text-on-surface-variant text-xs">
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
                        className="w-full h-8 bg-surface-container-lowest border border-outline-variant text-on-surface rounded-lg pl-5 pr-2 text-xs text-right font-bold focus:outline-none focus:border-primary"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveExpense(exp.id)}
                      className="w-7 h-8 flex items-center justify-center text-on-surface-variant hover:text-error transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        delete
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Real Totals Card */}
          <div className="bg-primary-container text-on-primary-container rounded-xl p-4 shadow-md space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-wider opacity-80">
              Costo Real Final Calculado
            </h3>

            <div className="flex justify-between items-end border-b border-on-primary-container/20 pb-2">
              <span className="text-xs">Total Real Compra</span>
              <span className="text-xl font-headline font-bold">
                {formatMoney(realTotalCostMXN, displayCurrency, exchangeRate)}
              </span>
            </div>

            <div className="flex justify-between items-end">
              <span className="text-xs font-bold">Costo Unitario Real</span>
              <span className="text-2xl font-headline font-bold text-tertiary-fixed">
                {formatMoney(realUnitCostMXN, displayCurrency, exchangeRate)}
              </span>
            </div>
          </div>

          {/* Supplier, Date, Notes & Initial Stock Checkbox */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                Proveedor (Opcional)
              </label>
              <input
                type="text"
                placeholder="Nombre proveedor"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full h-9 bg-surface-container border border-outline-variant text-on-surface rounded-lg px-3 text-xs focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                Fecha
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-9 bg-surface-container border border-outline-variant text-on-surface rounded-lg px-2.5 text-xs focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
              Notas Adicionales
            </label>
            <input
              type="text"
              placeholder="Ej. Guía express, proveedor retrasó envío..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-9 bg-surface-container border border-outline-variant text-on-surface rounded-lg px-3 text-xs focus:outline-none focus:border-primary"
            />
          </div>

          {/* Initial Inventory Checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="initialStock"
              checked={isInitialInventory}
              onChange={(e) => setIsInitialInventory(e.target.checked)}
              className="w-4 h-4 rounded accent-primary cursor-pointer"
            />
            <label
              htmlFor="initialStock"
              className="text-xs text-on-surface font-medium cursor-pointer"
            >
              Registrar como Inventario Inicial (ya existente)
            </label>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!selectedProductId || realTotalCostMXN <= 0}
              className="w-full py-3 bg-primary text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20 hover:opacity-95 active:scale-95 transition-all text-xs flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
            >
              <span className="material-symbols-outlined text-base">
                check_circle
              </span>
              Confirmar Compra
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
