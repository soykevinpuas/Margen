import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  doc,
  collection,
  setDoc,
  deleteDoc,
  deleteField,
  onSnapshot,
  getDocs,
  getDoc,
  writeBatch,
  type DocumentReference,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { syncVitrinaIndex } from '../lib/vitrina';
import { useAuth } from './AuthContext';
import {
  AppSettings,
  Business,
  UserProfile,
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
  VitrinaConfig,
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

  // Multi-business
  businesses: Business[];
  currentBusinessId: string | null;
  businessLoading: boolean;
  createBusiness: (nombre: string) => Promise<Business>;
  switchBusiness: (id: string) => Promise<void>;

  // Actions
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  /** Guarda la config de la vitrina y sincroniza el índice público vitrinas/{slug} */
  actualizarVitrina: (config: VitrinaConfig) => void;
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
  /** Elimina una venta de forma definitiva y, si estaba confirmada, repone el stock de sus lotes */
  deleteSale: (saleId: string) => { success: boolean; message: string };
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
  /** Edita campos de una venta y recalcula ingreso, ganancia y margen */
  updateSale: (
    saleId: string,
    patch: Partial<Pick<Sale, 'cantidad' | 'precioVentaUnitarioMXN' | 'notas' | 'fecha'>>
  ) => void;
  /** Edita campos de un gasto operativo y lo persiste */
  updateOperatingExpense: (
    id: string,
    patch: Partial<
      Pick<
        OperatingExpense,
        'concepto' | 'categoria' | 'montoMXN' | 'fecha' | 'notas' | 'esRecurrente'
      >
    >
  ) => void;
  resetToSeedData: () => void;
  clearAllData: () => Promise<void>;
}

const LOCAL_STORAGE_KEY = 'margen_app_state_v1';
const DEFAULT_BUSINESS_ID = 'default';

// Guest mode keys (namespaced per business)
const GUEST_BUSINESSES_KEY = `${LOCAL_STORAGE_KEY}_businesses`;
const GUEST_ACTIVE_KEY = `${LOCAL_STORAGE_KEY}_activeBusiness`;

// The 7 per-business stores
const DATA_SUFFIXES = [
  'settings',
  'categories',
  'products',
  'batches',
  'sales',
  'expenses',
  'adjustments',
] as const;

// Legacy (v1) flat collections under users/{uid}/...
const LEGACY_COLLECTIONS = [
  'products',
  'batches',
  'sales',
  'expenses',
  'categories',
  'adjustments',
] as const;

const FIRESTORE_WRITE_CHUNK = 400;

const bizStorageKey = (businessId: string, suffix: string) =>
  `${LOCAL_STORAGE_KEY}_${businessId}_${suffix}`;

function readStorageJSON<T>(key: string): T | null {
  const raw = localStorage.getItem(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    console.error('Error parsing localStorage key', key, e);
    return null;
  }
}

function readBizValue(businessId: string, suffix: string): unknown {
  return readStorageJSON<unknown>(bizStorageKey(businessId, suffix));
}

/** Initializes a brand-new (guest) business with empty lists — no seed/demo data. */
function initEmptyBizStorage(businessId: string) {
  const emptyListSuffixes = DATA_SUFFIXES.filter((s) => s !== 'settings');
  for (const suffix of emptyListSuffixes) {
    const key = bizStorageKey(businessId, suffix);
    if (localStorage.getItem(key) === null) {
      localStorage.setItem(key, '[]');
    }
  }
}

/**
 * Ensures the guest (unauthenticated) user has at least one local business.
 * Also migrates legacy non-namespaced keys (margen_app_state_v1_*) into the
 * default business namespace so old local data is not lost.
 */
function ensureGuestBusinesses(): Business[] {
  const stored = readStorageJSON<Business[]>(GUEST_BUSINESSES_KEY);
  if (Array.isArray(stored) && stored.length > 0) return stored;

  const legacySettings = readStorageJSON<Partial<AppSettings>>(
    `${LOCAL_STORAGE_KEY}_settings`
  );
  const business: Business = {
    id: DEFAULT_BUSINESS_ID,
    nombre: legacySettings?.businessName?.trim() || 'Mi Negocio',
    createdAt: new Date().toISOString(),
  };

  for (const suffix of DATA_SUFFIXES) {
    const legacyValue = localStorage.getItem(`${LOCAL_STORAGE_KEY}_${suffix}`);
    const namespacedKey = bizStorageKey(DEFAULT_BUSINESS_ID, suffix);
    if (localStorage.getItem(namespacedKey) !== null) continue;
    if (legacyValue !== null) {
      // Preserve legacy (v1) guest data inside the default business namespace
      localStorage.setItem(namespacedKey, legacyValue);
    } else if (suffix !== 'settings') {
      // The default business is born EMPTY (no seed/demo lists)
      localStorage.setItem(namespacedKey, '[]');
    }
  }

  localStorage.setItem(GUEST_BUSINESSES_KEY, JSON.stringify([business]));
  if (!localStorage.getItem(GUEST_ACTIVE_KEY)) {
    localStorage.setItem(GUEST_ACTIVE_KEY, DEFAULT_BUSINESS_ID);
  }
  return [business];
}

// Shifts seeded/static sales dates to today (guest seed behaviour)
function shiftSalesDates(loaded: Sale[]): Sale[] {
  const todayKey = getLocalDateKey(new Date());
  const hasSaleToday = loaded.some((s) => s.fecha && getLocalDateKey(s.fecha) === todayKey);
  if (hasSaleToday || loaded.length === 0) return loaded;

  const newestSaleKey = loaded.reduce((max, s) => {
    const key = getLocalDateKey(s.fecha);
    return key > max ? key : max;
  }, '');

  if (!newestSaleKey || newestSaleKey >= todayKey) return loaded;

  return loaded.map((s) =>
    getLocalDateKey(s.fecha) === newestSaleKey ? { ...s, fecha: new Date().toISOString() } : s
  );
}

function shiftExpensesDates(loaded: OperatingExpense[]): OperatingExpense[] {
  const todayKey = getLocalDateKey(new Date());
  const hasExpToday = loaded.some((e) => e.fecha && getLocalDateKey(e.fecha) === todayKey);
  if (hasExpToday || loaded.length === 0) return loaded;

  const newestExpKey = loaded.reduce((max, e) => {
    const key = getLocalDateKey(e.fecha);
    return key > max ? key : max;
  }, '');

  if (!newestExpKey || newestExpKey >= todayKey) return loaded;

  return loaded.map((e) =>
    getLocalDateKey(e.fecha) === newestExpKey ? { ...e, fecha: todayKey } : e
  );
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();

  // ---------- Data state ----------
  const [settings, setSettings] = useState<AppSettings>(() => ({ ...initialSettings }));
  const [categories, setCategories] = useState<Category[]>(() => [...initialCategories]);
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<PurchaseBatch[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [operatingExpenses, setOperatingExpenses] = useState<OperatingExpense[]>([]);
  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>([]);

  // ---------- Multi-business state ----------
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [currentBusinessId, setCurrentBusinessId] = useState<string | null>(null);
  const [businessLoading, setBusinessLoading] = useState<boolean>(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [guestHydrated, setGuestHydrated] = useState(false);
  /** Business id the in-memory guest state belongs to (guards cross-business writes) */
  const [guestHydratedBizId, setGuestHydratedBizId] = useState<string | null>(null);
  const onboardingRef = useRef(false);
  /** Generation counter: invalidates stale onSnapshot callbacks after a business switch */
  const genRef = useRef(0);
  /** uid the onboarding belongs to (cancels retries after logout/user change) */
  const activeUidRef = useRef<string | null>(null);
  const onboardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---------- Firestore path helpers (per business) ----------
  const bizCol = (colName: string) => {
    if (!user || !currentBusinessId) return null;
    return collection(db, 'users', user.uid, 'businesses', currentBusinessId, colName);
  };

  const bizDoc = (colName: string, docId: string) => {
    if (!user || !currentBusinessId) return null;
    return doc(db, 'users', user.uid, 'businesses', currentBusinessId, colName, docId);
  };

  const profileDocRef = () => (user ? doc(db, 'users', user.uid, 'profile', 'main') : null);

  // Helper to remove undefined properties before sending to Firestore
  const safeSetDoc = (
    docRef: DocumentReference<DocumentData>,
    data: unknown,
    options?: Parameters<typeof setDoc>[2]
  ) => {
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
    return setDoc(docRef, cleanForFirestore(data), options).catch((err) =>
      console.error('Firestore setDoc error:', err)
    );
  };

  const resetDataState = () => {
    setSettings({ ...initialSettings });
    setCategories([]);
    setProducts([]);
    setBatches([]);
    setSales([]);
    setOperatingExpenses([]);
    setAdjustments([]);
  };

  // ---------- Guest mode: resolve local business list ----------
  useEffect(() => {
    if (authLoading || user) return;
    const list = ensureGuestBusinesses();
    const storedActive = localStorage.getItem(GUEST_ACTIVE_KEY);
    const active =
      storedActive && list.some((b) => b.id === storedActive) ? storedActive : list[0].id;
    setBusinesses(list);
    setCurrentBusinessId(active);
  }, [authLoading, user]);

  // ---------- Guest mode: hydrate data for the active local business ----------
  useEffect(() => {
    if (authLoading || user || !currentBusinessId) return;
    // While hydrating, the in-memory state does NOT belong to the active business yet
    setGuestHydrated(false);
    const businessId = currentBusinessId;

    const savedSettings = readBizValue(businessId, 'settings');
    setSettings(
      savedSettings
        ? { ...initialSettings, ...(savedSettings as Partial<AppSettings>) }
        : { ...initialSettings }
    );

    const savedCategories = readBizValue(businessId, 'categories');
    setCategories(
      Array.isArray(savedCategories) ? (savedCategories as Category[]) : [...initialCategories]
    );

    const savedProducts = readBizValue(businessId, 'products');
    setProducts(
      Array.isArray(savedProducts) ? (savedProducts as Product[]) : [...initialProducts]
    );

    const savedBatches = readBizValue(businessId, 'batches');
    setBatches(Array.isArray(savedBatches) ? (savedBatches as PurchaseBatch[]) : [...initialBatches]);

    const savedSales = readBizValue(businessId, 'sales');
    setSales(
      shiftSalesDates(
        Array.isArray(savedSales) ? (savedSales as Sale[]) : [...initialSales]
      )
    );

    const savedExpenses = readBizValue(businessId, 'expenses');
    setOperatingExpenses(
      shiftExpensesDates(
        Array.isArray(savedExpenses)
          ? (savedExpenses as OperatingExpense[])
          : [...initialOperatingExpenses]
      )
    );

    const savedAdjustments = readBizValue(businessId, 'adjustments');
    setAdjustments(
      Array.isArray(savedAdjustments) ? (savedAdjustments as InventoryAdjustment[]) : []
    );

    localStorage.setItem(GUEST_ACTIVE_KEY, businessId);
    setGuestHydratedBizId(businessId);
    setGuestHydrated(true);
    setBusinessLoading(false);
  }, [authLoading, user, currentBusinessId]);

  // ---------- Lazy migration + default business creation ----------
  const onboardUser = async (uid: string, attempt = 0) => {
    if (onboardingRef.current) return;
    onboardingRef.current = true;

    try {
      const businessesRef = collection(db, 'users', uid, 'businesses');
      const existing = await getDocs(businessesRef);
      if (!existing.empty) return; // already onboarded (idempotent)

      type WriteOp = {
        ref: DocumentReference<DocumentData>;
        data: DocumentData;
        merge?: boolean;
      };
      const ops: WriteOp[] = [];
      let hasLegacyData = false;

      // 1) Copy legacy v1 data into businesses/default/...
      for (const colName of LEGACY_COLLECTIONS) {
        const snap = await getDocs(collection(db, 'users', uid, colName));
        if (!snap.empty) hasLegacyData = true;
        snap.forEach((d) => {
          ops.push({
            ref: doc(db, 'users', uid, 'businesses', DEFAULT_BUSINESS_ID, colName, d.id),
            data: d.data(),
          });
        });
      }

      const legacySettingsRef = doc(db, 'users', uid, 'settings', 'config');
      const legacySettingsSnap = await getDoc(legacySettingsRef);
      const legacySettings = legacySettingsSnap.exists()
        ? (legacySettingsSnap.data() as Partial<AppSettings>)
        : null;
      if (legacySettingsSnap.exists()) {
        hasLegacyData = true;
        ops.push({
          ref: doc(
            db,
            'users',
            uid,
            'businesses',
            DEFAULT_BUSINESS_ID,
            'settings',
            'config'
          ),
          data: legacySettingsSnap.data(),
        });
      }

      // 2) The default business doc itself
      const now = new Date().toISOString();
      const business: Business = {
        id: DEFAULT_BUSINESS_ID,
        nombre: legacySettings?.businessName?.trim() || 'Mi Negocio',
        createdAt: now,
      };
      ops.push({
        ref: doc(businessesRef, DEFAULT_BUSINESS_ID),
        data: business as unknown as DocumentData,
      });

      // 3) Profile pointing at the default business (+ migration marker)
      const profileData: UserProfile = {
        activeBusinessId: DEFAULT_BUSINESS_ID,
        createdAt: now,
        updatedAt: now,
        ...(hasLegacyData ? { migratedFrom: 'v1' as const } : {}),
      };
      ops.push({
        ref: doc(db, 'users', uid, 'profile', 'main'),
        data: profileData as unknown as DocumentData,
        merge: true,
      });

      // 4) Commit in chunks (writeBatch limit is 500 ops)
      for (let i = 0; i < ops.length; i += FIRESTORE_WRITE_CHUNK) {
        const chunk = writeBatch(db);
        ops.slice(i, i + FIRESTORE_WRITE_CHUNK).forEach((op) => {
          chunk.set(op.ref, op.data, op.merge ? { merge: true } : undefined);
        });
        await chunk.commit();
      }
    } catch (err) {
      // Retry with exponential backoff (1s, 2s, 4s) — the guard above allows a new run
      const maxAttempts = 4;
      console.error(
        `Error creating/migrating default business (attempt ${attempt + 1}/${maxAttempts}):`,
        err
      );
      onboardingRef.current = false;
      if (attempt + 1 < maxAttempts && activeUidRef.current === uid) {
        const delay = 1000 * 2 ** attempt;
        if (onboardTimerRef.current) clearTimeout(onboardTimerRef.current);
        onboardTimerRef.current = setTimeout(() => {
          onboardTimerRef.current = null;
          if (activeUidRef.current === uid) void onboardUser(uid, attempt + 1);
        }, delay);
      }
    }
  };

  // ---------- Authenticated: subscribe profile + businesses ----------
  useEffect(() => {
    if (authLoading || !user) return;
    const uid = user.uid;

    setBusinessLoading(true);
    setGuestHydrated(false);
    setGuestHydratedBizId(null);
    setProfile(null);
    setProfileLoaded(false);
    setBusinesses([]);
    setCurrentBusinessId(null);
    resetDataState();
    onboardingRef.current = false;
    activeUidRef.current = uid;
    if (onboardTimerRef.current) {
      clearTimeout(onboardTimerRef.current);
      onboardTimerRef.current = null;
    }

    const unsubProfile = onSnapshot(
      doc(db, 'users', uid, 'profile', 'main'),
      (snapshot) => {
        setProfile(snapshot.exists() ? (snapshot.data() as UserProfile) : null);
        setProfileLoaded(true);
      },
      (err) => {
        console.error('Profile snapshot error:', err);
        setProfileLoaded(true);
      }
    );

    const unsubBusinesses = onSnapshot(
      collection(db, 'users', uid, 'businesses'),
      (snapshot) => {
        const list: Business[] = [];
        snapshot.forEach((d) => list.push({ ...d.data(), id: d.id } as Business));
        setBusinesses(list);
        if (snapshot.empty) {
          // No business yet: create (and migrate legacy data into) 'default'
          void onboardUser(uid);
        }
      },
      (err) => console.error('Businesses snapshot error:', err)
    );

    return () => {
      unsubProfile();
      unsubBusinesses();
      if (activeUidRef.current === uid) activeUidRef.current = null;
      if (onboardTimerRef.current) {
        clearTimeout(onboardTimerRef.current);
        onboardTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  // ---------- Resolve the active business from profile ----------
  useEffect(() => {
    if (authLoading || !user || !profileLoaded) return;

    const target =
      profile && businesses.some((b) => b.id === profile.activeBusinessId)
        ? profile.activeBusinessId
        : businesses[0]?.id ?? null;

    if (!target) return;
    if (currentBusinessId !== target) setCurrentBusinessId(target);

    if (!profile || profile.activeBusinessId !== target) {
      const pRef = profileDocRef();
      if (pRef) {
        const now = new Date().toISOString();
        setProfile((prev) => ({
          ...(prev ?? { createdAt: now }),
          activeBusinessId: target,
          updatedAt: now,
        }));
        safeSetDoc(pRef, { activeBusinessId: target, updatedAt: now }, { merge: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, profileLoaded, profile, businesses, currentBusinessId]);

  // ---------- Authenticated: subscribe the 7 collections of the active business ----------
  useEffect(() => {
    if (authLoading || !user || !currentBusinessId) return;

    const uid = user.uid;
    const bizId = currentBusinessId;

    // Generation guard: callbacks from a previous business/subscription are stale
    const gen = ++genRef.current;
    const isStale = () => gen !== genRef.current;

    // Reset everything when the active business changes
    setBusinessLoading(true);
    resetDataState();

    const settingsRef = doc(db, 'users', uid, 'businesses', bizId, 'settings', 'config');
    const mkCol = (colName: string) => collection(db, 'users', uid, 'businesses', bizId, colName);
    const categoriesRef = mkCol('categories');
    const productsRef = mkCol('products');
    const batchesRef = mkCol('batches');
    const salesRef = mkCol('sales');
    const expensesRef = mkCol('expenses');
    const adjustmentsRef = mkCol('adjustments');

    // businessLoading stays true until every listener has delivered its first snapshot
    const pending = new Set<string>([
      'settings',
      'categories',
      'products',
      'batches',
      'sales',
      'expenses',
      'adjustments',
    ]);
    const markReady = (key: string) => {
      if (isStale()) return;
      pending.delete(key);
      if (pending.size === 0) setBusinessLoading(false);
    };
    const onErr = (label: string, key: string) => (err: unknown) => {
      if (isStale()) return;
      console.error(`${label} snapshot error:`, err);
      markReady(key);
    };

    const unsubSettings = onSnapshot(
      settingsRef,
      (snapshot) => {
        if (isStale()) return;
        if (snapshot.exists()) {
          const loaded = snapshot.data() as AppSettings;
          setSettings((prev) => ({ ...initialSettings, ...prev, ...loaded }));
        } else {
          const fresh: AppSettings = { ...initialSettings };
          setSettings(fresh);
          safeSetDoc(settingsRef, fresh);
        }
        markReady('settings');
      },
      onErr('Settings', 'settings')
    );

    const unsubCategories = onSnapshot(
      categoriesRef,
      (snapshot) => {
        if (isStale()) return;
        if (!snapshot.empty) {
          const list: Category[] = [];
          snapshot.forEach((d) => list.push(d.data() as Category));
          setCategories(list);
        } else {
          // Default minimal category for new businesses
          const defaultCat: Category = {
            id: 'cat-general',
            nombre: 'General',
            archived: false,
            createdAt: new Date().toISOString(),
          };
          setDoc(doc(categoriesRef, defaultCat.id), defaultCat).catch((err) =>
            console.error('Firestore setDoc error:', err)
          );
        }
        markReady('categories');
      },
      onErr('Categories', 'categories')
    );

    const unsubProducts = onSnapshot(
      productsRef,
      (snapshot) => {
        if (isStale()) return;
        const list: Product[] = [];
        snapshot.forEach((d) => list.push(d.data() as Product));
        setProducts(list);
        markReady('products');
      },
      onErr('Products', 'products')
    );

    const unsubBatches = onSnapshot(
      batchesRef,
      (snapshot) => {
        if (isStale()) return;
        const list: PurchaseBatch[] = [];
        snapshot.forEach((d) => list.push(d.data() as PurchaseBatch));
        setBatches(list);
        markReady('batches');
      },
      onErr('Batches', 'batches')
    );

    const unsubSales = onSnapshot(
      salesRef,
      (snapshot) => {
        if (isStale()) return;
        const list: Sale[] = [];
        snapshot.forEach((d) => list.push(d.data() as Sale));
        setSales(list);
        markReady('sales');
      },
      onErr('Sales', 'sales')
    );

    const unsubExpenses = onSnapshot(
      expensesRef,
      (snapshot) => {
        if (isStale()) return;
        const list: OperatingExpense[] = [];
        snapshot.forEach((d) => list.push(d.data() as OperatingExpense));
        setOperatingExpenses(list);
        markReady('expenses');
      },
      onErr('Expenses', 'expenses')
    );

    const unsubAdjustments = onSnapshot(
      adjustmentsRef,
      (snapshot) => {
        if (isStale()) return;
        const list: InventoryAdjustment[] = [];
        snapshot.forEach((d) => list.push(d.data() as InventoryAdjustment));
        setAdjustments(list);
        markReady('adjustments');
      },
      onErr('Adjustments', 'adjustments')
    );

    return () => {
      genRef.current += 1; // invalidate in-flight callbacks immediately
      unsubSettings();
      unsubCategories();
      unsubProducts();
      unsubBatches();
      unsubSales();
      unsubExpenses();
      unsubAdjustments();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentBusinessId, authLoading]);

  // Settings cache (works for guests and as a cache for authenticated users)
  useEffect(() => {
    if (!currentBusinessId) return;
    if (!user && (!guestHydrated || guestHydratedBizId !== currentBusinessId)) return;
    localStorage.setItem(bizStorageKey(currentBusinessId, 'settings'), JSON.stringify(settings));
  }, [settings, currentBusinessId, user, guestHydrated, guestHydratedBizId]);

  // Denormaliza stockDisponible en products para la vitrina pública (debounced ~1s)
  useEffect(() => {
    if (!user || !currentBusinessId) return;
    const uid = user.uid;
    const bizId = currentBusinessId;

    const timer = setTimeout(() => {
      // Suma de cantidadDisponible por producto (sin lotes → undefined)
      const sumas = new Map<string, number>();
      batches.forEach((b) => {
        sumas.set(b.productoId, (sumas.get(b.productoId) ?? 0) + (b.cantidadDisponible ?? 0));
      });

      // Solo escribe productos cuyo stockDisponible cambió
      const cambios: Array<{ ref: DocumentReference; data: DocumentData }> = [];
      products.forEach((p) => {
        const stock = sumas.has(p.id) ? (sumas.get(p.id) as number) : undefined;
        if (p.stockDisponible === stock) return;
        cambios.push({
          ref: doc(db, 'users', uid, 'businesses', bizId, 'products', p.id),
          data:
            stock === undefined
              ? { stockDisponible: deleteField() } // sin lotes: quita el campo
              : { stockDisponible: stock },
        });
      });
      if (cambios.length === 0) return;

      // Multi-doc en chunks (writeBatch admite hasta 500 operaciones)
      void (async () => {
        for (let i = 0; i < cambios.length; i += FIRESTORE_WRITE_CHUNK) {
          const batch = writeBatch(db);
          cambios
            .slice(i, i + FIRESTORE_WRITE_CHUNK)
            .forEach((c) => batch.update(c.ref, c.data));
          try {
            await batch.commit();
          } catch (err) {
            console.error('Error denormalizando stockDisponible:', err);
          }
        }
      })();
    }, 1000);

    return () => clearTimeout(timer);
  }, [batches, products, user, currentBusinessId]);

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

  // ---------- Guest persistence (namespaced by businessId) ----------
  const persistGuest = (suffix: string, value: unknown) => {
    if (user || !guestHydrated || !currentBusinessId) return;
    // Only persist once the in-memory state actually belongs to the active business
    if (guestHydratedBizId !== currentBusinessId) return;
    try {
      localStorage.setItem(bizStorageKey(currentBusinessId, suffix), JSON.stringify(value));
    } catch (e) {
      console.error('Error persisting guest data', suffix, e);
    }
  };

  useEffect(() => {
    persistGuest('categories', categories);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, user, guestHydrated, guestHydratedBizId, currentBusinessId]);

  useEffect(() => {
    persistGuest('products', products);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, user, guestHydrated, guestHydratedBizId, currentBusinessId]);

  useEffect(() => {
    persistGuest('batches', batches);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batches, user, guestHydrated, guestHydratedBizId, currentBusinessId]);

  useEffect(() => {
    persistGuest('sales', sales);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales, user, guestHydrated, guestHydratedBizId, currentBusinessId]);

  useEffect(() => {
    persistGuest('expenses', operatingExpenses);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operatingExpenses, user, guestHydrated, guestHydratedBizId, currentBusinessId]);

  useEffect(() => {
    persistGuest('adjustments', adjustments);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adjustments, user, guestHydrated, guestHydratedBizId, currentBusinessId]);

  // ---------- Business actions ----------
  const createBusiness = async (nombre: string): Promise<Business> => {
    const trimmed = nombre.trim() || 'Mi Negocio';
    const id = `b-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const business: Business = {
      id,
      nombre: trimmed,
      createdAt: new Date().toISOString(),
    };

    if (user) {
      const now = new Date().toISOString();

      // 1) Optimistic updates BEFORE any await: without them the resolver effect
      //    could see a stale `businesses` list and revert profile.activeBusinessId
      setBusinesses((prev) => (prev.some((b) => b.id === id) ? prev : [...prev, business]));
      setProfile((prev) => ({
        ...(prev ?? { createdAt: now }),
        activeBusinessId: id,
        updatedAt: now,
      }));

      // 2) If onboarding is stuck (businessLoading && no active business) switch
      //    right away so the UI is not blocked waiting for the migration
      if (businessLoading && currentBusinessId === null) {
        setCurrentBusinessId(id);
      }

      // 3) Persist business + profile
      await safeSetDoc(
        doc(db, 'users', user.uid, 'businesses', id),
        business as unknown as DocumentData
      );
      const pRef = profileDocRef();
      if (pRef) await safeSetDoc(pRef, { activeBusinessId: id, updatedAt: now }, { merge: true });

      // 4) Activate it (no-op if step 2 already did it)
      setCurrentBusinessId(id);
    } else {
      const list = [...businesses, business];
      setBusinesses(list);
      localStorage.setItem(GUEST_BUSINESSES_KEY, JSON.stringify(list));
      // New guest businesses are born EMPTY (no seed/demo lists)
      initEmptyBizStorage(id);
      localStorage.setItem(GUEST_ACTIVE_KEY, id);
      setCurrentBusinessId(id);
    }

    return business;
  };

  const switchBusiness = async (id: string) => {
    if (id === currentBusinessId) return;
    if (!businesses.some((b) => b.id === id)) return;

    if (user) {
      const now = new Date().toISOString();
      // Persist first, then move the UI: avoids out-of-order writes / resolver races
      const pRef = profileDocRef();
      if (pRef) await safeSetDoc(pRef, { activeBusinessId: id, updatedAt: now }, { merge: true });
      setProfile((prev) => ({
        ...(prev ?? { createdAt: now }),
        activeBusinessId: id,
        updatedAt: now,
      }));
      setCurrentBusinessId(id);
    } else {
      localStorage.setItem(GUEST_ACTIVE_KEY, id);
      setCurrentBusinessId(id);
    }
  };

  // ---------- Data actions ----------
  const updateSettings = (newSettings: Partial<AppSettings>) => {
    // Functional update: concurrent updates can't clobber each other
    setSettings((prev) => ({ ...prev, ...newSettings }));
    const ref = bizDoc('settings', 'config');
    // merge:true so we never wipe fields not included in this patch
    if (ref) safeSetDoc(ref, newSettings, { merge: true });
  };

  const actualizarVitrina = (config: VitrinaConfig) => {
    // Optimista: merge del bloque vitrina en settings (local + Firestore)
    updateSettings({ vitrina: config });
    if (user && currentBusinessId) {
      // syncVitrinaIndex es la única escritora de settings/vitrina + vitrinas/{slug}
      void syncVitrinaIndex(
        db,
        user.uid,
        currentBusinessId,
        config,
        settings.businessName
      ).catch((err) => console.error('Error sincronizando vitrina:', err));
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
    const ref = bizDoc('categories', newCategory.id);
    if (ref) safeSetDoc(ref, newCategory);
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
    const ref = bizDoc('products', newProduct.id);
    if (ref) safeSetDoc(ref, newProduct);
    return newProduct;
  };

  const updateProduct = (id: string, productData: Partial<Product>) => {
    const existing = products.find((p) => p.id === id);
    if (!existing) return;
    const updated = { ...existing, ...productData };
    setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    const ref = bizDoc('products', id);
    if (ref) safeSetDoc(ref, updated);
  };

  const archiveProduct = (id: string) => {
    const existing = products.find((p) => p.id === id);
    if (!existing) return;
    const updated = { ...existing, archivado: !existing.archivado };
    setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    const ref = bizDoc('products', id);
    if (ref) safeSetDoc(ref, updated);
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
    const ref = bizDoc('products', id);
    if (ref) deleteDoc(ref);
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
    const ref = bizDoc('batches', newBatch.id);
    if (ref) safeSetDoc(ref, newBatch);
    return newBatch;
  };

  const updateBatchNotes = (id: string, notas: string) => {
    const existing = batches.find((b) => b.id === id);
    if (!existing) return;
    const updated = { ...existing, notas };
    setBatches((prev) => prev.map((b) => (b.id === id ? updated : b)));
    const ref = bizDoc('batches', id);
    if (ref) safeSetDoc(ref, updated);
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
    const ref = bizDoc('batches', id);
    if (ref) safeSetDoc(ref, updated);
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
        message: `Este lote no se puede eliminar porque ya se han vendido ${soldUnits} unidades del mismo. Elimina o anula primero las ventas de ese lote (Historial de Ventas) para liberarlo.`,
      };
    }

    setBatches((prev) => prev.filter((b) => b.id !== id));
    const ref = bizDoc('batches', id);
    if (ref) deleteDoc(ref);
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

    const saleRef = bizDoc('sales', newSale.id);
    if (saleRef) safeSetDoc(saleRef, newSale);
    allocations.forEach((alloc) => {
      const b = updatedBatches.find((x) => x.id === alloc.loteId);
      if (b) {
        const batchRef = bizDoc('batches', b.id);
        if (batchRef) safeSetDoc(batchRef, b);
      }
    });

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

    const saleRef = bizDoc('sales', saleId);
    if (saleRef) safeSetDoc(saleRef, updatedSale);
    sale.asignacionesLotes.forEach((alloc) => {
      const b = updatedBatches.find((x) => x.id === alloc.loteId);
      if (b) {
        const batchRef = bizDoc('batches', b.id);
        if (batchRef) safeSetDoc(batchRef, b);
      }
    });

    return { success: true, message: 'Venta cancelada y stock restaurado con éxito.' };
  };

  /**
   * Elimina una venta de forma definitiva.
   * - Si estaba confirmada, repone en cada lote sus unidades (asignacionesLotes) y
   *   recalcula `locked` (queda desbloqueado cuando ya no queda ninguna unidad vendida).
   * - `gastosDeVenta` vive embebido dentro del documento de la venta, así que basta
   *   con borrar la venta (no hay colección de gastos de venta que limpiar).
   */
  const deleteSale = (saleId: string): { success: boolean; message: string } => {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return { success: false, message: 'Venta no encontrada.' };

    if (sale.estado === 'confirmada') {
      // Otras ventas confirmadas (distintas a la que se borra) que siguen consumiendo cada lote
      const otherConfirmed = sales.filter((s) => s.id !== saleId && s.estado === 'confirmada');

      const updatedBatches = batches.map((batch) => {
        const alloc = sale.asignacionesLotes.find((a) => a.loteId === batch.id);
        if (!alloc) return batch;

        const cantidadDisponible = Math.min(
          batch.cantidadComprada,
          batch.cantidadDisponible + alloc.cantidadTomada
        );

        const stillSoldByOthers = otherConfirmed.some((s) =>
          s.asignacionesLotes.some((a) => a.loteId === batch.id && a.cantidadTomada > 0)
        );

        return { ...batch, cantidadDisponible, locked: stillSoldByOthers };
      });

      setBatches(updatedBatches);

      sale.asignacionesLotes.forEach((alloc) => {
        const b = updatedBatches.find((x) => x.id === alloc.loteId);
        if (!b) return;
        const batchRef = bizDoc('batches', b.id);
        if (batchRef) safeSetDoc(batchRef, b);
      });
    }

    setSales((prev) => prev.filter((s) => s.id !== saleId));
    const saleRef = bizDoc('sales', saleId);
    if (saleRef) {
      deleteDoc(saleRef).catch((err) => console.error('Firestore deleteDoc error:', err));
    }

    return {
      success: true,
      message:
        sale.estado === 'confirmada'
          ? `Venta ${saleId} eliminada y stock repuesto en sus lotes.`
          : `Venta ${saleId} eliminada.`,
    };
  };

  const updateSaleDate = (saleId: string, newFecha: string) => {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return;
    const updatedSale: Sale = { ...sale, fecha: newFecha };
    setSales((prev) => prev.map((s) => (s.id === saleId ? updatedSale : s)));
    const ref = bizDoc('sales', saleId);
    if (ref) safeSetDoc(ref, updatedSale);
  };

  const updateBatchDate = (batchId: string, newFecha: string) => {
    const batch = batches.find((b) => b.id === batchId);
    if (!batch) return;
    const updatedBatch: PurchaseBatch = { ...batch, fecha: newFecha };
    setBatches((prev) => prev.map((b) => (b.id === batchId ? updatedBatch : b)));
    const ref = bizDoc('batches', batchId);
    if (ref) safeSetDoc(ref, updatedBatch);
  };

  const updateSale = (
    saleId: string,
    patch: Partial<Pick<Sale, 'cantidad' | 'precioVentaUnitarioMXN' | 'notas' | 'fecha'>>
  ) => {
    const existing = sales.find((s) => s.id === saleId);
    if (!existing) return;

    const precioVentaUnitarioMXN =
      patch.precioVentaUnitarioMXN !== undefined && Number.isFinite(patch.precioVentaUnitarioMXN)
        ? Math.max(0, patch.precioVentaUnitarioMXN)
        : existing.precioVentaUnitarioMXN;
    const notas = patch.notas !== undefined ? patch.notas : existing.notas;
    const fecha = patch.fecha && patch.fecha.trim() !== '' ? patch.fecha : existing.fecha;

    const requestedQty =
      patch.cantidad !== undefined && Number.isFinite(patch.cantidad)
        ? Math.max(1, Math.floor(patch.cantidad))
        : null;

    let cantidad = existing.cantidad;
    let asignacionesLotes = existing.asignacionesLotes;
    let costoUnidadesVendidasMXN = existing.costoUnidadesVendidasMXN;
    let metodoAsignacion = existing.metodoAsignacion;
    let nextBatches: PurchaseBatch[] | null = null;

    // Si cambió la cantidad de una venta confirmada hay que rehacer el stock:
    // 1) devolver al lote sus unidades asignadas, 2) reasignar por FIFO,
    // 3) volver a descontar del stock. Si no hay stock suficiente se ajusta
    // a lo disponible (igual que al registrar la venta).
    if (requestedQty !== null && requestedQty !== existing.cantidad) {
      if (existing.estado === 'confirmada') {
        const restored = batches.map((batch) => {
          const alloc = existing.asignacionesLotes.find((a) => a.loteId === batch.id);
          if (!alloc) return batch;
          return {
            ...batch,
            cantidadDisponible: Math.max(
              0,
              batch.cantidadDisponible + alloc.cantidadTomada
            ),
          };
        });

        const fifo = calculateFifoAllocation(existing.productoId, requestedQty, restored);
        if (fifo.allocatedQuantity > 0) {
          cantidad = fifo.allocatedQuantity;
          asignacionesLotes = fifo.allocations;
          costoUnidadesVendidasMXN = fifo.cogsMXN;
          metodoAsignacion = 'FIFO';
          nextBatches = restored.map((batch) => {
            const alloc = fifo.allocations.find((a) => a.loteId === batch.id);
            if (!alloc) return batch;
            return {
              ...batch,
              cantidadDisponible: Math.max(0, batch.cantidadDisponible - alloc.cantidadTomada),
              locked: true,
            };
          });
        }
      } else {
        // Venta cancelada: su stock ya fue devuelto, no se mueve inventario.
        cantidad = requestedQty;
      }
    }

    const ingresoTotalMXN = cantidad * precioVentaUnitarioMXN;
    const gastosDeVentaTotalMXN = (existing.gastosDeVenta || []).reduce(
      (acc, g) => acc + (g.montoMXN || 0),
      0
    );
    const gananciaVentaMXN = ingresoTotalMXN - costoUnidadesVendidasMXN - gastosDeVentaTotalMXN;
    const margenPorcentaje = ingresoTotalMXN > 0 ? (gananciaVentaMXN / ingresoTotalMXN) * 100 : 0;

    const updatedSale: Sale = {
      ...existing,
      cantidad,
      precioVentaUnitarioMXN,
      notas,
      fecha,
      asignacionesLotes,
      costoUnidadesVendidasMXN,
      metodoAsignacion,
      ingresoTotalMXN,
      gastosDeVentaTotalMXN,
      gananciaVentaMXN,
      margenPorcentaje,
    };

    setSales((prev) => prev.map((s) => (s.id === saleId ? updatedSale : s)));
    const ref = bizDoc('sales', saleId);
    if (ref) safeSetDoc(ref, updatedSale);

    if (nextBatches) {
      const finalBatches = nextBatches;
      setBatches(finalBatches);
      const touchedIds = new Set([
        ...existing.asignacionesLotes.map((a) => a.loteId),
        ...asignacionesLotes.map((a) => a.loteId),
      ]);
      touchedIds.forEach((id) => {
        const b = finalBatches.find((x) => x.id === id);
        if (!b) return;
        const batchRef = bizDoc('batches', id);
        if (batchRef) safeSetDoc(batchRef, b);
      });
    }
  };

  const updateOperatingExpense = (
    id: string,
    patch: Partial<
      Pick<
        OperatingExpense,
        'concepto' | 'categoria' | 'montoMXN' | 'fecha' | 'notas' | 'esRecurrente'
      >
    >
  ) => {
    const existing = operatingExpenses.find((e) => e.id === id);
    if (!existing) return;

    const updated: OperatingExpense = { ...existing };
    if (patch.concepto !== undefined) updated.concepto = patch.concepto;
    if (patch.categoria !== undefined) updated.categoria = patch.categoria;
    if (patch.montoMXN !== undefined && Number.isFinite(patch.montoMXN)) {
      updated.montoMXN = Math.max(0, patch.montoMXN);
    }
    if (patch.fecha !== undefined && patch.fecha.trim() !== '') updated.fecha = patch.fecha;
    if (patch.notas !== undefined) updated.notas = patch.notas;
    if (patch.esRecurrente !== undefined) updated.esRecurrente = patch.esRecurrente;

    setOperatingExpenses((prev) => prev.map((e) => (e.id === id ? updated : e)));
    const ref = bizDoc('expenses', id);
    if (ref) safeSetDoc(ref, updated);
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
    const ref = bizDoc('expenses', newExpense.id);
    if (ref) safeSetDoc(ref, newExpense);
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

    const adjRef = bizDoc('adjustments', newAdjustment.id);
    if (adjRef) safeSetDoc(adjRef, newAdjustment);
    const batchRef = bizDoc('batches', batch.id);
    if (batchRef) safeSetDoc(batchRef, updatedBatch);

    return { success: true, message: 'Ajuste de inventario registrado correctamente.' };
  };

  const clearAllData = async () => {
    setProducts([]);
    setBatches([]);
    setSales([]);
    setOperatingExpenses([]);
    setAdjustments([]);

    if (bizCol('products')) {
      const collectionsToClear = ['products', 'batches', 'sales', 'expenses', 'adjustments'];
      for (const colName of collectionsToClear) {
        const colRef = bizCol(colName);
        if (!colRef) continue;
        const snap = await getDocs(colRef);
        if (!snap.empty) {
          const b = writeBatch(db);
          snap.forEach((d) => b.delete(d.ref));
          await b.commit();
        }
      }
    } else if (currentBusinessId) {
      (['products', 'batches', 'sales', 'expenses', 'adjustments'] as const).forEach((suffix) => {
        localStorage.removeItem(bizStorageKey(currentBusinessId, suffix));
      });
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

    if (user && currentBusinessId) {
      const cfgRef = bizDoc('settings', 'config');
      if (cfgRef) safeSetDoc(cfgRef, initialSettings);

      const b = writeBatch(db);
      const put = (colName: string, id: string, data: unknown) => {
        const ref = bizDoc(colName, id);
        if (ref) b.set(ref, data as unknown as DocumentData);
      };
      initialCategories.forEach((c) => put('categories', c.id, c));
      initialProducts.forEach((p) => put('products', p.id, p));
      initialBatches.forEach((bt) => put('batches', bt.id, bt));
      initialSales.forEach((s) => put('sales', s.id, s));
      initialOperatingExpenses.forEach((e) => put('expenses', e.id, e));
      b.commit().catch((err) => console.error('Firestore batch error:', err));
    } else if (currentBusinessId) {
      DATA_SUFFIXES.forEach((suffix) => {
        localStorage.removeItem(bizStorageKey(currentBusinessId, suffix));
      });
      // Persist effects will write the seed state back right away
      localStorage.setItem(
        bizStorageKey(currentBusinessId, 'settings'),
        JSON.stringify(initialSettings)
      );
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
        businesses,
        currentBusinessId,
        businessLoading,
        createBusiness,
        switchBusiness,
        updateSettings,
        actualizarVitrina,
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
        deleteSale,
        updateSaleDate,
        updateBatchDate,
        updateSale,
        updateOperatingExpense,
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
