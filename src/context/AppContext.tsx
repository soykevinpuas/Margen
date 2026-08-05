import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  doc,
  collection,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import {
  AppSettings,
  Category,
  Product,
  PurchaseBatch,
  Sale,
  OperatingExpense,
  InventoryAdjustment,
  BatchAllocation,
  ExpenseItem,
  SaleExpenseItem,
  AdjustmentReason,
} from '../types';
import {
  initialSettings,
  initialCategories,
  initialProducts,
  initialBatches,
  initialSales,
  initialOperatingExpenses,
} from '../data/seedData';
import { calculateFifoAllocation } from '../utils/calculations';

interface AppContextType {
  settings: AppSettings;
  categories: Category[];
  products: Product[];
  batches: PurchaseBatch[];
  sales: Sale[];
  operatingExpenses: OperatingExpense[];
  adjustments: InventoryAdjustment[];

  // Actions
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  addCategory: (nombre: string) => Category;
  addProduct: (productData: Omit<Product, 'id' | 'createdAt' | 'archivado'>) => Product;
  updateProduct: (id: string, productData: Partial<Product>) => void;
  archiveProduct: (id: string) => void;
  deleteProduct: (id: string) => { success: boolean; message: string };
  addPurchaseBatch: (batchData: {
    productoId: string;
    cantidadComprada: number;
    costoProductoUnitarioMXN: number;
    gastosDeCompra: ExpenseItem[];
    fecha: string;
    proveedor?: string;
    notas?: string;
    esInventarioInicial?: boolean;
  }) => PurchaseBatch;
  updateBatchNotes: (id: string, notas: string) => void;
  addSale: (saleData: {
    productoId: string;
    cantidad: number;
    precioVentaUnitarioMXN: number;
    gastosDeVenta: SaleExpenseItem[];
    metodoAsignacion?: 'FIFO' | 'MANUAL';
    customAllocations?: BatchAllocation[];
    fecha?: string;
    notas?: string;
  }) => { success: boolean; sale?: Sale; message?: string };
  cancelSale: (saleId: string) => { success: boolean; message: string };
  addOperatingExpense: (expenseData: {
    concepto: string;
    categoria: OperatingExpense['categoria'];
    montoMXN: number;
    fecha: string;
    esRecurrente: boolean;
    notas?: string;
  }) => OperatingExpense;
  addInventoryAdjustment: (adjustmentData: {
    productoId: string;
    loteId: string;
    cantidad: number;
    tipoMotivo: AdjustmentReason;
    fecha: string;
    notas?: string;
  }) => { success: boolean; message: string };
  resetToSeedData: () => void;
  clearAllData: () => Promise<void>;
}

const LOCAL_STORAGE_KEY = 'margen_app_state_v1';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_settings`);
    return saved ? JSON.parse(saved) : initialSettings;
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_categories`);
    return saved ? JSON.parse(saved) : initialCategories;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_products`);
    return saved ? JSON.parse(saved) : initialProducts;
  });

  const [batches, setBatches] = useState<PurchaseBatch[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_batches`);
    return saved ? JSON.parse(saved) : initialBatches;
  });

  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_sales`);
    return saved ? JSON.parse(saved) : initialSales;
  });

  const [operatingExpenses, setOperatingExpenses] = useState<OperatingExpense[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_expenses`);
    return saved ? JSON.parse(saved) : initialOperatingExpenses;
  });

  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_adjustments`);
    return saved ? JSON.parse(saved) : [];
  });

  // Sync with Firestore when user is authenticated
  useEffect(() => {
    if (!user) return;

    const uid = user.uid;

    // Settings
    const unsubSettings = onSnapshot(doc(db, 'users', uid, 'settings', 'config'), (snapshot) => {
      if (snapshot.exists()) {
        setSettings(snapshot.data() as AppSettings);
      } else {
        setDoc(doc(db, 'users', uid, 'settings', 'config'), initialSettings);
      }
    });

    // Categories
    const unsubCategories = onSnapshot(collection(db, 'users', uid, 'categories'), (snapshot) => {
      if (!snapshot.empty) {
        const list: Category[] = [];
        snapshot.forEach((d) => list.push(d.data() as Category));
        setCategories(list);
      } else {
        // Default minimal categories for new users
        const defaultCat: Category = {
          id: 'cat-general',
          nombre: 'General',
          archived: false,
          createdAt: new Date().toISOString(),
        };
        setDoc(doc(db, 'users', uid, 'categories', defaultCat.id), defaultCat);
      }
    });

    // Products
    const unsubProducts = onSnapshot(collection(db, 'users', uid, 'products'), (snapshot) => {
      const list: Product[] = [];
      snapshot.forEach((d) => list.push(d.data() as Product));
      setProducts(list);
    });

    // Batches
    const unsubBatches = onSnapshot(collection(db, 'users', uid, 'batches'), (snapshot) => {
      const list: PurchaseBatch[] = [];
      snapshot.forEach((d) => list.push(d.data() as PurchaseBatch));
      setBatches(list);
    });

    // Sales
    const unsubSales = onSnapshot(collection(db, 'users', uid, 'sales'), (snapshot) => {
      const list: Sale[] = [];
      snapshot.forEach((d) => list.push(d.data() as Sale));
      setSales(list);
    });

    // Expenses
    const unsubExpenses = onSnapshot(collection(db, 'users', uid, 'expenses'), (snapshot) => {
      const list: OperatingExpense[] = [];
      snapshot.forEach((d) => list.push(d.data() as OperatingExpense));
      setOperatingExpenses(list);
    });

    // Adjustments
    const unsubAdjustments = onSnapshot(collection(db, 'users', uid, 'adjustments'), (snapshot) => {
      const list: InventoryAdjustment[] = [];
      snapshot.forEach((d) => list.push(d.data() as InventoryAdjustment));
      setAdjustments(list);
    });

    return () => {
      unsubSettings();
      unsubCategories();
      unsubProducts();
      unsubBatches();
      unsubSales();
      unsubExpenses();
      unsubAdjustments();
    };
  }, [user]);

  // Save to LocalStorage when unauthenticated
  useEffect(() => {
    if (user) return;
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_settings`, JSON.stringify(settings));
  }, [settings, user]);

  useEffect(() => {
    if (user) return;
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_categories`, JSON.stringify(categories));
  }, [categories, user]);

  useEffect(() => {
    if (user) return;
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_products`, JSON.stringify(products));
  }, [products, user]);

  useEffect(() => {
    if (user) return;
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_batches`, JSON.stringify(batches));
  }, [batches, user]);

  useEffect(() => {
    if (user) return;
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_sales`, JSON.stringify(sales));
  }, [sales, user]);

  useEffect(() => {
    if (user) return;
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_expenses`, JSON.stringify(operatingExpenses));
  }, [operatingExpenses, user]);

  useEffect(() => {
    if (user) return;
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_adjustments`, JSON.stringify(adjustments));
  }, [adjustments, user]);

  // Helper to remove undefined properties before sending to Firestore
  const safeSetDoc = (docRef: any, data: any) => {
    const cleanForFirestore = (obj: any): any => {
      if (obj === null || obj === undefined) return null;
      if (Array.isArray(obj)) {
        return obj.map((item) => cleanForFirestore(item));
      }
      if (typeof obj === 'object') {
        const cleaned: Record<string, any> = {};
        for (const key of Object.keys(obj)) {
          if (obj[key] !== undefined) {
            cleaned[key] = cleanForFirestore(obj[key]);
          }
        }
        return cleaned;
      }
      return obj;
    };
    return setDoc(docRef, cleanForFirestore(data)).catch((err) =>
      console.error('Firestore setDoc error:', err)
    );
  };

  // Actions
  const updateSettings = (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    if (user) {
      safeSetDoc(doc(db, 'users', user.uid, 'settings', 'config'), updated);
    }
  };

  const addCategory = (nombre: string): Category => {
    const newCategory: Category = {
      id: `cat-${Date.now()}`,
      nombre: nombre.trim(),
      archived: false,
      createdAt: new Date().toISOString(),
    };
    setCategories((prev) => [...prev, newCategory]);
    if (user) {
      safeSetDoc(doc(db, 'users', user.uid, 'categories', newCategory.id), newCategory);
    }
    return newCategory;
  };

  const addProduct = (
    productData: Omit<Product, 'id' | 'createdAt' | 'archivado'>
  ): Product => {
    const newProduct: Product = {
      ...productData,
      id: `prod-${Date.now()}`,
      archivado: false,
      createdAt: new Date().toISOString(),
    };
    setProducts((prev) => [...prev, newProduct]);
    if (user) {
      safeSetDoc(doc(db, 'users', user.uid, 'products', newProduct.id), newProduct);
    }
    return newProduct;
  };

  const updateProduct = (id: string, productData: Partial<Product>) => {
    const existing = products.find((p) => p.id === id);
    if (!existing) return;
    const updated = { ...existing, ...productData };
    setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    if (user) {
      safeSetDoc(doc(db, 'users', user.uid, 'products', id), updated);
    }
  };

  const archiveProduct = (id: string) => {
    const existing = products.find((p) => p.id === id);
    if (!existing) return;
    const updated = { ...existing, archivado: !existing.archivado };
    setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    if (user) {
      safeSetDoc(doc(db, 'users', user.uid, 'products', id), updated);
    }
  };

  const deleteProduct = (id: string) => {
    const productBatches = batches.filter((b) => b.productoId === id);
    const productSales = sales.filter((s) => s.productoId === id);

    if (productBatches.length > 0 || productSales.length > 0) {
      archiveProduct(id);
      return {
        success: false,
        message: 'El producto tiene historial de movimientos, por lo que se archivó en lugar de eliminarse.',
      };
    }

    setProducts((prev) => prev.filter((p) => p.id !== id));
    if (user) {
      deleteDoc(doc(db, 'users', user.uid, 'products', id));
    }
    return { success: true, message: 'Producto eliminado correctamente.' };
  };

  const addPurchaseBatch = (batchData: {
    productoId: string;
    cantidadComprada: number;
    costoProductoUnitarioMXN: number;
    gastosDeCompra: ExpenseItem[];
    fecha: string;
    proveedor?: string;
    notas?: string;
    esInventarioInicial?: boolean;
  }): PurchaseBatch => {
    const cantidadComprada = Math.max(1, batchData.cantidadComprada);
    const costoProductosMXN = cantidadComprada * batchData.costoProductoUnitarioMXN;
    const gastosTotal = batchData.gastosDeCompra.reduce((acc, g) => acc + (g.montoMXN || 0), 0);
    const costoTotalMXN = costoProductosMXN + gastosTotal;
    const costoUnitarioRealMXN = costoTotalMXN / cantidadComprada;

    const newBatch: PurchaseBatch = {
      id: `L-${Math.floor(1000 + Math.random() * 9000)}`,
      productoId: batchData.productoId,
      cantidadComprada,
      cantidadDisponible: cantidadComprada,
      costoProductoUnitarioMXN: batchData.costoProductoUnitarioMXN,
      costoProductosMXN,
      gastosDeCompra: batchData.gastosDeCompra,
      costoTotalMXN,
      costoUnitarioRealMXN,
      fecha: batchData.fecha || new Date().toISOString().split('T')[0],
      proveedor: batchData.proveedor,
      notas: batchData.notas,
      esInventarioInicial: !!batchData.esInventarioInicial,
      locked: false,
      createdAt: new Date().toISOString(),
    };

    setBatches((prev) => [newBatch, ...prev]);
    if (user) {
      setDoc(doc(db, 'users', user.uid, 'batches', newBatch.id), newBatch);
    }
    return newBatch;
  };

  const updateBatchNotes = (id: string, notas: string) => {
    const existing = batches.find((b) => b.id === id);
    if (!existing) return;
    const updated = { ...existing, notas };
    setBatches((prev) => prev.map((b) => (b.id === id ? updated : b)));
    if (user) {
      setDoc(doc(db, 'users', user.uid, 'batches', id), updated);
    }
  };

  const addSale = (saleData: {
    productoId: string;
    cantidad: number;
    precioVentaUnitarioMXN: number;
    gastosDeVenta: SaleExpenseItem[];
    metodoAsignacion?: 'FIFO' | 'MANUAL';
    customAllocations?: BatchAllocation[];
    fecha?: string;
    notas?: string;
  }) => {
    const {
      productoId,
      cantidad,
      precioVentaUnitarioMXN,
      gastosDeVenta,
      metodoAsignacion = 'FIFO',
      customAllocations,
      fecha = new Date().toISOString(),
      notas,
    } = saleData;

    let allocations: BatchAllocation[] = [];
    let cogsMXN = 0;

    if (metodoAsignacion === 'MANUAL' && customAllocations && customAllocations.length > 0) {
      allocations = customAllocations;
      cogsMXN = allocations.reduce(
        (sum, a) => sum + a.cantidadTomada * a.costoUnitarioLoteSnapshotMXN,
        0
      );
    } else {
      const fifo = calculateFifoAllocation(productoId, cantidad, batches);
      if (fifo.allocatedQuantity <= 0) {
        return {
          success: false,
          message: 'No hay stock disponible para realizar esta venta.',
        };
      }
      allocations = fifo.allocations;
      cogsMXN = fifo.cogsMXN;
    }

    const actualQuantity = allocations.reduce((acc, a) => acc + a.cantidadTomada, 0);
    const ingresoTotalMXN = actualQuantity * precioVentaUnitarioMXN;
    const gastosDeVentaTotalMXN = gastosDeVenta.reduce((acc, g) => acc + (g.montoMXN || 0), 0);
    const gananciaVentaMXN = ingresoTotalMXN - cogsMXN - gastosDeVentaTotalMXN;
    const margenPorcentaje =
      ingresoTotalMXN > 0 ? (gananciaVentaMXN / ingresoTotalMXN) * 100 : 0;

    const newSale: Sale = {
      id: `V-${Math.floor(1000 + Math.random() * 9000)}`,
      productoId,
      cantidad: actualQuantity,
      precioVentaUnitarioMXN,
      ingresoTotalMXN,
      asignacionesLotes: allocations,
      costoUnidadesVendidasMXN: cogsMXN,
      gastosDeVenta,
      gastosDeVentaTotalMXN,
      gananciaVentaMXN,
      margenPorcentaje,
      fecha,
      metodoAsignacion,
      estado: 'confirmada',
      notas,
      createdAt: new Date().toISOString(),
    };

    // Deduct stock from allocated batches
    const updatedBatches = batches.map((batch) => {
      const alloc = allocations.find((a) => a.loteId === batch.id);
      if (alloc) {
        return {
          ...batch,
          cantidadDisponible: Math.max(0, batch.cantidadDisponible - alloc.cantidadTomada),
          locked: true,
        };
      }
      return batch;
    });

    setBatches(updatedBatches);
    setSales((prev) => [newSale, ...prev]);

    if (user) {
      setDoc(doc(db, 'users', user.uid, 'sales', newSale.id), newSale);
      allocations.forEach((alloc) => {
        const b = updatedBatches.find((x) => x.id === alloc.loteId);
        if (b) {
          setDoc(doc(db, 'users', user.uid, 'batches', b.id), b);
        }
      });
    }

    return {
      success: true,
      sale: newSale,
      message:
        actualQuantity < cantidad
          ? `La venta se ajustó a ${actualQuantity} unidades (máximo stock disponible).`
          : 'Venta registrada con éxito.',
    };
  };

  const cancelSale = (saleId: string) => {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return { success: false, message: 'Venta no encontrada.' };
    if (sale.estado === 'cancelada') {
      return { success: false, message: 'La venta ya fue cancelada anteriormente.' };
    }

    const updatedBatches = batches.map((batch) => {
      const alloc = sale.asignacionesLotes.find((a) => a.loteId === batch.id);
      if (alloc) {
        return {
          ...batch,
          cantidadDisponible: batch.cantidadDisponible + alloc.cantidadTomada,
        };
      }
      return batch;
    });

    const updatedSale: Sale = { ...sale, estado: 'cancelada' };

    setBatches(updatedBatches);
    setSales((prev) => prev.map((s) => (s.id === saleId ? updatedSale : s)));

    if (user) {
      setDoc(doc(db, 'users', user.uid, 'sales', saleId), updatedSale);
      sale.asignacionesLotes.forEach((alloc) => {
        const b = updatedBatches.find((x) => x.id === alloc.loteId);
        if (b) {
          setDoc(doc(db, 'users', user.uid, 'batches', b.id), b);
        }
      });
    }

    return { success: true, message: 'Venta cancelada y stock restaurado con éxito.' };
  };

  const addOperatingExpense = (expenseData: {
    concepto: string;
    categoria: OperatingExpense['categoria'];
    montoMXN: number;
    fecha: string;
    esRecurrente: boolean;
    notas?: string;
  }): OperatingExpense => {
    const newExpense: OperatingExpense = {
      ...expenseData,
      id: `G-${Math.floor(100 + Math.random() * 900)}`,
      createdAt: new Date().toISOString(),
    };

    setOperatingExpenses((prev) => [newExpense, ...prev]);
    if (user) {
      setDoc(doc(db, 'users', user.uid, 'expenses', newExpense.id), newExpense);
    }
    return newExpense;
  };

  const addInventoryAdjustment = (adjustmentData: {
    productoId: string;
    loteId: string;
    cantidad: number;
    tipoMotivo: AdjustmentReason;
    fecha: string;
    notas?: string;
  }) => {
    const batch = batches.find((b) => b.id === adjustmentData.loteId);
    if (!batch) return { success: false, message: 'Lote no encontrado.' };

    const qtyToDeduct = Math.min(adjustmentData.cantidad, batch.cantidadDisponible);
    if (qtyToDeduct <= 0) {
      return { success: false, message: 'El lote seleccionado no tiene unidades disponibles.' };
    }

    const perdidaTotalMXN = qtyToDeduct * batch.costoUnitarioRealMXN;

    const newAdjustment: InventoryAdjustment = {
      id: `ADJ-${Date.now()}`,
      productoId: adjustmentData.productoId,
      loteId: adjustmentData.loteId,
      cantidad: qtyToDeduct,
      tipoMotivo: adjustmentData.tipoMotivo,
      costoUnitarioSnapshotMXN: batch.costoUnitarioRealMXN,
      perdidaTotalMXN,
      fecha: adjustmentData.fecha || new Date().toISOString().split('T')[0],
      notas: adjustmentData.notas,
      createdAt: new Date().toISOString(),
    };

    const updatedBatch = {
      ...batch,
      cantidadDisponible: batch.cantidadDisponible - qtyToDeduct,
    };

    setBatches((prev) => prev.map((b) => (b.id === batch.id ? updatedBatch : b)));
    setAdjustments((prev) => [newAdjustment, ...prev]);

    if (user) {
      setDoc(doc(db, 'users', user.uid, 'adjustments', newAdjustment.id), newAdjustment);
      setDoc(doc(db, 'users', user.uid, 'batches', batch.id), updatedBatch);
    }

    return { success: true, message: 'Ajuste de inventario registrado correctamente.' };
  };

  const clearAllData = async () => {
    setProducts([]);
    setBatches([]);
    setSales([]);
    setOperatingExpenses([]);
    setAdjustments([]);

    if (user) {
      const uid = user.uid;
      const collectionsToClear = ['products', 'batches', 'sales', 'expenses', 'adjustments'];
      for (const colName of collectionsToClear) {
        const snap = await getDocs(collection(db, 'users', uid, colName));
        if (!snap.empty) {
          const b = writeBatch(db);
          snap.forEach((d) => b.delete(d.ref));
          await b.commit();
        }
      }
    } else {
      localStorage.removeItem(`${LOCAL_STORAGE_KEY}_products`);
      localStorage.removeItem(`${LOCAL_STORAGE_KEY}_batches`);
      localStorage.removeItem(`${LOCAL_STORAGE_KEY}_sales`);
      localStorage.removeItem(`${LOCAL_STORAGE_KEY}_expenses`);
      localStorage.removeItem(`${LOCAL_STORAGE_KEY}_adjustments`);
    }
  };

  const resetToSeedData = () => {
    setSettings(initialSettings);
    setCategories(initialCategories);
    setProducts(initialProducts);
    setBatches(initialBatches);
    setSales(initialSales);
    setOperatingExpenses(initialOperatingExpenses);
    setAdjustments([]);

    if (user) {
      const uid = user.uid;
      setDoc(doc(db, 'users', uid, 'settings', 'config'), initialSettings);

      const b = writeBatch(db);
      initialCategories.forEach((c) => b.set(doc(db, 'users', uid, 'categories', c.id), c));
      initialProducts.forEach((p) => b.set(doc(db, 'users', uid, 'products', p.id), p));
      initialBatches.forEach((bt) => b.set(doc(db, 'users', uid, 'batches', bt.id), bt));
      initialSales.forEach((s) => b.set(doc(db, 'users', uid, 'sales', s.id), s));
      initialOperatingExpenses.forEach((e) => b.set(doc(db, 'users', uid, 'expenses', e.id), e));
      b.commit();
    } else {
      localStorage.clear();
    }
  };

  return (
    <AppContext.Provider
      value={{
        settings,
        categories,
        products,
        batches,
        sales,
        operatingExpenses,
        adjustments,
        updateSettings,
        addCategory,
        addProduct,
        updateProduct,
        archiveProduct,
        deleteProduct,
        addPurchaseBatch,
        updateBatchNotes,
        addSale,
        cancelSale,
        addOperatingExpense,
        addInventoryAdjustment,
        resetToSeedData,
        clearAllData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
