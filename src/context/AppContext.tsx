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
import { calculateFifoAllocation, getLocalDateKey } from '../utils/calculations';

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
  updatePurchaseBatch: (
    id: string,
    batchData: {
      cantidadComprada?: number;
      costoProductoUnitarioMXN?: number;
      gastosDeCompra?: ExpenseItem[];
      fecha?: string;
      proveedor?: string;
      notas?: string;
    }
  ) => void;
  deletePurchaseBatch: (id: string) => { success: boolean; message: string };
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
  updateSaleDate: (saleId: string, newFecha: string) => void;
  updateBatchDate: (batchId: string, newFecha: string) => void;
  resetToSeedData: () => void;
  clearAllData: () => Promise<void>;
}

const LOCAL_STORAGE_KEY = 'margen_app_state_v1';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_settings`);
    if (saved) {
      try {
        return { ...initialSettings, ...JSON.parse(saved) };
      } catch (e) {
        console.error('Error parsing saved settings', e);
      }
    }
    return initialSettings;
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
    let loaded: Sale[] = saved ? JSON.parse(saved) : initialSales;

    // Check if sales are from old static dates (e.g., 2026-08-04) and shift them if no sales exist today
    const todayKey = getLocalDateKey(new Date());
    const hasSaleToday = loaded.some((s) => s.fecha && getLocalDateKey(s.fecha) === todayKey);

    if (!hasSaleToday && loaded.length > 0) {
      const newestSaleKey = loaded.reduce((max, s) => {
        const key = getLocalDateKey(s.fecha);
        return key > max ? key : max;
      }, '');

      if (newestSaleKey && newestSaleKey < todayKey) {
        // Shift sales from newestSaleKey to today
        loaded = loaded.map((s) => {
          if (getLocalDateKey(s.fecha) === newestSaleKey) {
            return { ...s, fecha: new Date().toISOString() };
          }
          return s;
        });
        localStorage.setItem(`${LOCAL_STORAGE_KEY}_sales`, JSON.stringify(loaded));
      }
    }

    return loaded;
  });

  const [operatingExpenses, setOperatingExpenses] = useState<OperatingExpense[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_expenses`);
    let loaded: OperatingExpense[] = saved ? JSON.parse(saved) : initialOperatingExpenses;

    const todayKey = getLocalDateKey(new Date());
    const hasExpToday = loaded.some((e) => e.fecha && getLocalDateKey(e.fecha) === todayKey);

    if (!hasExpToday && loaded.length > 0) {
      const newestExpKey = loaded.reduce((max, e) => {
        const key = getLocalDateKey(e.fecha);
        return key > max ? key : max;
      }, '');

      if (newestExpKey && newestExpKey < todayKey) {
        loaded = loaded.map((e) => {
          if (getLocalDateKey(e.fecha) === newestExpKey) {
            return { ...e, fecha: todayKey };
          }
          return e;
        });
        localStorage.setItem(`${LOCAL_STORAGE_KEY}_expenses`, JSON.stringify(loaded));
      }
    }

    return loaded;
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
        const loaded = snapshot.data() as AppSettings;
        setSettings((prev) => {
          const merged = { ...initialSettings, ...prev, ...loaded };
          localStorage.setItem(`${LOCAL_STORAGE_KEY}_settings`, JSON.stringify(merged));
          return merged;
        });
      } else {
        setSettings((current) => {
          const merged = { ...initialSettings, ...current };
          safeSetDoc(doc(db, 'users', uid, 'settings', 'config'), merged);
          return merged;
        });
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

  // Always save settings to LocalStorage for persistence across sessions/logouts
  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_settings`, JSON.stringify(settings));
  }, [settings]);

  // Apply custom primary theme color and background color
  useEffect(() => {
    const colorMap: Record<string, { primary: string; onPrimary: string }> = {
      emerald: { primary: '#10b981', onPrimary: '#022c22' },
      violet: { primary: '#8b5cf6', onPrimary: '#1e1b4b' },
      blue: { primary: '#3b82f6', onPrimary: '#172554' },
      amber: { primary: '#f59e0b', onPrimary: '#451a03' },
      rose: { primary: '#f43f5e', onPrimary: '#4c0519' },
      teal: { primary: '#14b8a6', onPrimary: '#042f2e' },
    };

    const colorKey = settings.primaryColor || 'emerald';
    const selected =
      colorMap[colorKey] ||
      (colorKey.startsWith('#')
        ? { primary: colorKey, onPrimary: '#ffffff' }
        : colorMap.emerald);

    document.documentElement.style.setProperty('--color-primary', selected.primary);
    document.documentElement.style.setProperty('--color-on-primary', selected.onPrimary);

    // Background color palette
    const bgMap: Record<string, { bg: string; surface: string; container: string }> = {
      dark: { bg: '#090d16', surface: '#111827', container: '#1f2937' },
      black: { bg: '#000000', surface: '#111111', container: '#1c1c1c' },
      charcoal: { bg: '#121212', surface: '#1e1e1e', container: '#2a2a2a' },
      midnight: { bg: '#0b132b', surface: '#1c2541', container: '#2b3a55' },
      zinc: { bg: '#18181b', surface: '#27272a', container: '#3f3f46' },
      warm: { bg: '#1c1917', surface: '#292524', container: '#44403c' },
      slate: { bg: '#0f172a', surface: '#1e293b', container: '#334155' },
      emerald_dark: { bg: '#051c14', surface: '#0a2e22', container: '#134e3a' },
    };

    const bgKey = settings.backgroundColor || 'dark';
    const selectedBg =
      bgMap[bgKey] ||
      (bgKey.startsWith('#')
        ? { bg: bgKey, surface: '#111827', container: '#1f2937' }
        : bgMap.dark);

    document.documentElement.style.setProperty('--color-background', selectedBg.bg);
    document.documentElement.style.setProperty('--color-surface', selectedBg.surface);
    document.documentElement.style.setProperty('--color-surface-container', selectedBg.container);

    // Apply directly to root html, body and meta theme-color to prevent static color on scroll/overscroll
    document.documentElement.style.backgroundColor = selectedBg.bg;
    if (document.body) {
      document.body.style.backgroundColor = selectedBg.bg;
    }
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.setAttribute('content', selectedBg.bg);
    }
  }, [settings.primaryColor, settings.backgroundColor]);

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
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_settings`, JSON.stringify(updated));
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

  const updatePurchaseBatch = (
    id: string,
    batchData: {
      cantidadComprada?: number;
      costoProductoUnitarioMXN?: number;
      gastosDeCompra?: ExpenseItem[];
      fecha?: string;
      proveedor?: string;
      notas?: string;
    }
  ) => {
    const existing = batches.find((b) => b.id === id);
    if (!existing) return;

    const cantidadComprada = batchData.cantidadComprada ?? existing.cantidadComprada;
    const costoProductoUnitarioMXN =
      batchData.costoProductoUnitarioMXN ?? existing.costoProductoUnitarioMXN;
    const gastosDeCompra = batchData.gastosDeCompra ?? existing.gastosDeCompra;
    const fecha = batchData.fecha ?? existing.fecha;
    const proveedor = batchData.proveedor ?? existing.proveedor;
    const notas = batchData.notas ?? existing.notas;

    // Calculate how many units were sold from this batch so far
    const soldUnits = existing.cantidadComprada - existing.cantidadDisponible;
    const cantidadDisponible = Math.max(0, cantidadComprada - soldUnits);

    const costoProductosMXN = cantidadComprada * costoProductoUnitarioMXN;
    const gastosTotal = gastosDeCompra.reduce((acc, g) => acc + (g.montoMXN || 0), 0);
    const costoTotalMXN = costoProductosMXN + gastosTotal;
    const costoUnitarioRealMXN = cantidadComprada > 0 ? costoTotalMXN / cantidadComprada : 0;

    const updated: PurchaseBatch = {
      ...existing,
      cantidadComprada,
      cantidadDisponible,
      costoProductoUnitarioMXN,
      costoProductosMXN,
      gastosDeCompra,
      costoTotalMXN,
      costoUnitarioRealMXN,
      fecha,
      proveedor,
      notas,
    };

    setBatches((prev) => prev.map((b) => (b.id === id ? updated : b)));
    if (user) {
      setDoc(doc(db, 'users', user.uid, 'batches', id), updated);
    }
  };

  const deletePurchaseBatch = (id: string): { success: boolean; message: string } => {
    const batch = batches.find((b) => b.id === id);
    if (!batch) {
      return { success: false, message: 'El lote especificado no existe.' };
    }

    const soldUnits = batch.cantidadComprada - batch.cantidadDisponible;
    if (soldUnits > 0) {
      return {
        success: false,
        message: `Este lote no se puede eliminar completamente porque ya se han vendido ${soldUnits} unidades del mismo.`,
      };
    }

    setBatches((prev) => prev.filter((b) => b.id !== id));
    if (user) {
      deleteDoc(doc(db, 'users', user.uid, 'batches', id));
    }
    return { success: true, message: 'Lote de compra eliminado correctamente.' };
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

  const updateSaleDate = (saleId: string, newFecha: string) => {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return;
    const updatedSale: Sale = { ...sale, fecha: newFecha };
    const newSales = sales.map((s) => (s.id === saleId ? updatedSale : s));
    setSales(newSales);
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_sales`, JSON.stringify(newSales));
    if (user) {
      safeSetDoc(doc(db, 'users', user.uid, 'sales', saleId), updatedSale);
    }
  };

  const updateBatchDate = (batchId: string, newFecha: string) => {
    const batch = batches.find((b) => b.id === batchId);
    if (!batch) return;
    const updatedBatch: PurchaseBatch = { ...batch, fecha: newFecha };
    const newBatches = batches.map((b) => (b.id === batchId ? updatedBatch : b));
    setBatches(newBatches);
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_batches`, JSON.stringify(newBatches));
    if (user) {
      safeSetDoc(doc(db, 'users', user.uid, 'batches', batchId), updatedBatch);
    }
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
        updatePurchaseBatch,
        deletePurchaseBatch,
        addSale,
        cancelSale,
        updateSaleDate,
        updateBatchDate,
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
