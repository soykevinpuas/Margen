export type Currency = 'MXN' | 'USD';

export interface AppSettings {
  businessName: string;
  displayCurrency: Currency;
  exchangeRate: number; // 1 USD = X MXN
  inventoryViewMode: 'grouped' | 'list';
  defaultMinStock: number;
  timeZone: string;
  primaryColor?: string;
  backgroundColor?: string;
  chartType?: 'barras' | 'lineas' | 'puntos' | 'radial';
}

export interface Category {
  id: string;
  nombre: string;
  archived: boolean;
  createdAt: string;
}

export type ProductBadge = '🔥' | '💰' | '↗' | '⚠';

export interface Product {
  id: string;
  nombre: string;
  categoriaId: string;
  descripcion?: string;
  sku?: string;
  precioSugerido?: number; // In MXN
  stockMinimo: number;
  imagen?: string;
  archivado: boolean;
  createdAt: string;
}

export interface ExpenseItem {
  id: string;
  nombre: string;
  montoMXN: number;
}

export interface PurchaseBatch {
  id: string; // e.g., "L-4928"
  productoId: string;
  cantidadComprada: number;
  cantidadDisponible: number;
  costoProductoUnitarioMXN: number;
  costoProductosMXN: number;
  gastosDeCompra: ExpenseItem[];
  costoTotalMXN: number;
  costoUnitarioRealMXN: number;
  fecha: string; // YYYY-MM-DD
  proveedor?: string;
  notas?: string;
  esInventarioInicial: boolean;
  locked: boolean; // locked once allocated in sales
  createdAt: string;
}

export interface BatchAllocation {
  loteId: string;
  cantidadTomada: number;
  costoUnitarioLoteSnapshotMXN: number;
}

export interface SaleExpenseItem {
  id: string;
  nombre: string;
  montoMXN: number;
}

export interface Sale {
  id: string; // e.g., "V-8942"
  productoId: string;
  cantidad: number;
  precioVentaUnitarioMXN: number;
  ingresoTotalMXN: number;
  asignacionesLotes: BatchAllocation[];
  costoUnidadesVendidasMXN: number;
  gastosDeVenta: SaleExpenseItem[];
  gastosDeVentaTotalMXN: number;
  gananciaVentaMXN: number;
  margenPorcentaje: number;
  fecha: string; // ISO string
  metodoAsignacion: 'FIFO' | 'MANUAL';
  estado: 'confirmada' | 'cancelada';
  notas?: string;
  createdAt: string;
}

export type ExpenseCategory =
  | 'renta'
  | 'servicios'
  | 'nomina'
  | 'mantenimiento'
  | 'insumos'
  | 'marketing'
  | 'otros';

export interface OperatingExpense {
  id: string;
  concepto: string;
  categoria: ExpenseCategory;
  montoMXN: number;
  fecha: string; // YYYY-MM-DD
  esRecurrente: boolean;
  notas?: string;
  createdAt: string;
}

export type AdjustmentReason = 'daño' | 'pérdida' | 'uso_personal' | 'regalo' | 'otro';

export interface InventoryAdjustment {
  id: string;
  productoId: string;
  loteId: string;
  cantidad: number;
  tipoMotivo: AdjustmentReason;
  costoUnitarioSnapshotMXN: number;
  perdidaTotalMXN: number;
  fecha: string;
  notas?: string;
  createdAt: string;
}
