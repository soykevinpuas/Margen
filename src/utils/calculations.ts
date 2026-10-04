import {
  Currency,
  Product,
  PurchaseBatch,
  Sale,
  BatchAllocation,
  ProductBadge,
  OperatingExpense,
} from '../types';

/**
 * Converts MXN amount to target currency
 */
export function convertCurrency(
  montoMXN: number,
  targetCurrency: Currency,
  exchangeRate: number
): number {
  if (targetCurrency === 'USD') {
    return exchangeRate > 0 ? montoMXN / exchangeRate : montoMXN;
  }
  return montoMXN;
}

/**
 * Formats currency display (e.g., "$42,850.00" or "$2,142.50 USD")
 */
export function formatMoney(
  montoMXN: number,
  currency: Currency,
  exchangeRate: number,
  showSymbol: boolean = true
): string {
  const converted = convertCurrency(montoMXN, currency, exchangeRate);
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(converted);

  if (!showSymbol) return formatted;
  return `$${formatted}${currency === 'USD' ? ' USD' : ''}`;
}

/**
 * Short currency format for tight KPI boxes (e.g. "$128k")
 */
export function formatMoneyCompact(
  montoMXN: number,
  currency: Currency,
  exchangeRate: number
): string {
  const converted = convertCurrency(montoMXN, currency, exchangeRate);
  const sign = converted < 0 ? '-' : '';
  const abs = Math.abs(converted);
  if (abs >= 1000000) {
    return `${sign}$${(abs / 1000000).toFixed(1)}M`;
  }
  if (abs >= 1000) {
    return `${sign}$${(abs / 1000).toFixed(0)}k`;
  }
  return `${sign}$${abs.toFixed(0)}`;
}

/**
 * Calculates stock for a product from its batches
 */
export function getProductTotalStock(
  productId: string,
  batches: PurchaseBatch[]
): number {
  return batches
    .filter((b) => b.productoId === productId)
    .reduce((acc, b) => acc + b.cantidadDisponible, 0);
}

/**
 * Calculates weighted average real unit cost for a product
 */
export function getProductAverageCost(
  productId: string,
  batches: PurchaseBatch[]
): number {
  const productBatches = batches.filter(
    (b) => b.productoId === productId && b.cantidadDisponible > 0
  );
  const totalStock = productBatches.reduce(
    (acc, b) => acc + b.cantidadDisponible,
    0
  );
  if (totalStock === 0) {
    // Fallback to last batch cost or 0
    const allBatches = batches.filter((b) => b.productoId === productId);
    if (allBatches.length > 0) {
      return allBatches[allBatches.length - 1].costoUnitarioRealMXN;
    }
    return 0;
  }
  const totalValue = productBatches.reduce(
    (acc, b) => acc + b.cantidadDisponible * b.costoUnitarioRealMXN,
    0
  );
  return totalValue / totalStock;
}

/**
 * Performs FIFO batch allocation for a proposed sale
 */
export function calculateFifoAllocation(
  productId: string,
  requestedQuantity: number,
  allBatches: PurchaseBatch[]
): {
  allocations: BatchAllocation[];
  allocatedQuantity: number;
  cogsMXN: number;
  totalAvailableStock: number;
  hasInsufficientStock: boolean;
} {
  const activeBatches = allBatches
    .filter((b) => b.productoId === productId && b.cantidadDisponible > 0)
    .sort((a, b) => {
      // Order: Date ASC -> CreatedAt ASC -> ID ASC
      if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
      if (a.createdAt !== b.createdAt) return a.createdAt.localeCompare(b.createdAt);
      return a.id.localeCompare(b.id);
    });

  const totalAvailableStock = activeBatches.reduce(
    (sum, b) => sum + b.cantidadDisponible,
    0
  );
  const cappedQuantity = Math.min(requestedQuantity, totalAvailableStock);
  const hasInsufficientStock = requestedQuantity > totalAvailableStock;

  let remainingToAllocate = cappedQuantity;
  const allocations: BatchAllocation[] = [];
  let cogsMXN = 0;

  for (const batch of activeBatches) {
    if (remainingToAllocate <= 0) break;
    const takeFromBatch = Math.min(batch.cantidadDisponible, remainingToAllocate);
    if (takeFromBatch > 0) {
      allocations.push({
        loteId: batch.id,
        cantidadTomada: takeFromBatch,
        costoUnitarioLoteSnapshotMXN: batch.costoUnitarioRealMXN,
      });
      cogsMXN += takeFromBatch * batch.costoUnitarioRealMXN;
      remainingToAllocate -= takeFromBatch;
    }
  }

  return {
    allocations,
    allocatedQuantity: cappedQuantity,
    cogsMXN,
    totalAvailableStock,
    hasInsufficientStock,
  };
}

/**
 * Calculates product badges/insignias dynamically
 */
export function getProductBadges(
  product: Product,
  batches: PurchaseBatch[],
  sales: Sale[]
): ProductBadge[] {
  const badges: ProductBadge[] = [];
  const confirmedSales = sales.filter(
    (s) => s.productoId === product.id && s.estado === 'confirmada'
  );
  const totalStock = getProductTotalStock(product.id, batches);
  const totalQtySold = confirmedSales.reduce((acc, s) => acc + s.cantidad, 0);

  // 🔥 Top Sellers / High Movement
  if (totalQtySold >= 5) {
    badges.push('🔥');
  }

  // 💰 High Profitability
  const totalProfit = confirmedSales.reduce((acc, s) => acc + s.gananciaVentaMXN, 0);
  const totalRevenue = confirmedSales.reduce((acc, s) => acc + s.ingresoTotalMXN, 0);
  const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  if (avgMargin >= 35 || totalProfit > 1000) {
    badges.push('💰');
  }

  // ↗ Improving
  if (badges.length < 2 && confirmedSales.length >= 2) {
    badges.push('↗');
  }

  // ⚠ No movement
  if (badges.length < 2 && totalStock > 0 && confirmedSales.length === 0) {
    badges.push('⚠');
  }

  return badges.slice(0, 2);
}

/* ============================================================
 * PERIOD HELPERS (día / semana / mes)
 * ============================================================ */

/** Temporalities used by the dashboard KPIs and charts. */
export type MetricPeriod = 'dia' | 'sem' | 'mes';

/** Human readable label for each temporalidad (chip display). */
export const METRIC_PERIOD_LABEL: Record<MetricPeriod, string> = {
  mes: 'Mes',
  sem: 'Semana',
  dia: 'Día',
};

/**
 * Returns the inclusive YYYY-MM-DD range for a period, relative to `reference`.
 * - 'dia'  -> today
 * - 'sem'  -> rolling last 7 days (today included)
 * - 'mes'  -> current calendar month
 */
export function getPeriodRange(
  period: MetricPeriod,
  reference: Date = new Date()
): { startKey: string; endKey: string } {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const day = reference.getDate();
  // Noon anchor avoids DST / timezone drift when building local dates
  const keyOf = (y: number, m: number, d: number) =>
    getLocalDateKey(new Date(y, m, d, 12, 0, 0));

  if (period === 'dia') {
    const todayKey = keyOf(year, month, day);
    return { startKey: todayKey, endKey: todayKey };
  }

  if (period === 'sem') {
    return {
      startKey: keyOf(year, month, day - 6),
      endKey: keyOf(year, month, day),
    };
  }

  return {
    startKey: keyOf(year, month, 1),
    endKey: keyOf(year, month + 1, 0),
  };
}

/** Checks if a date (ISO string, YYYY-MM-DD or Date) falls inside a period. */
export function isDateInPeriod(
  dateInput: string | Date | undefined,
  period: MetricPeriod,
  reference: Date = new Date()
): boolean {
  const key = getLocalDateKey(dateInput);
  if (!key) return false;
  const { startKey, endKey } = getPeriodRange(period, reference);
  return key >= startKey && key <= endKey;
}

export interface PeriodTotals {
  /** Money actually received (confirmed sales). */
  ingresosMXN: number;
  /** Cost of the units sold. */
  cogsMXN: number;
  /** Operating expenses of the business. */
  gastosOperativosMXN: number;
  /** COGS + operating expenses. */
  gastoMXN: number;
  /** ingresos - gasto (net result of the period). */
  gananciaMXN: number;
  ventasCount: number;
  /** ganancia / ingresos * 100 */
  margenPct: number;
}

/**
 * Aggregates sales + operating expenses for a period (día / semana / mes).
 * Uses only confirmed sales.
 */
export function getPeriodTotals(
  sales: Sale[],
  operatingExpenses: OperatingExpense[],
  period: MetricPeriod,
  reference: Date = new Date()
): PeriodTotals {
  const { startKey, endKey } = getPeriodRange(period, reference);
  const inRange = (dateInput?: string) => {
    const key = getLocalDateKey(dateInput);
    return key !== '' && key >= startKey && key <= endKey;
  };

  const periodSales = sales.filter(
    (s) => s.estado === 'confirmada' && inRange(s.fecha)
  );
  const ingresosMXN = periodSales.reduce((acc, s) => acc + s.ingresoTotalMXN, 0);
  const cogsMXN = periodSales.reduce(
    (acc, s) => acc + s.costoUnidadesVendidasMXN,
    0
  );
  const gastosOperativosMXN = operatingExpenses
    .filter((e) => inRange(e.fecha))
    .reduce((acc, e) => acc + e.montoMXN, 0);

  const gastoMXN = cogsMXN + gastosOperativosMXN;
  const gananciaMXN = ingresosMXN - gastoMXN;

  return {
    ingresosMXN,
    cogsMXN,
    gastosOperativosMXN,
    gastoMXN,
    gananciaMXN,
    ventasCount: periodSales.length,
    margenPct: ingresosMXN > 0 ? (gananciaMXN / ingresosMXN) * 100 : 0,
  };
}

/**
 * Returns 'YYYY-MM-DD' in local timezone for any valid date input (ISO string, YYYY-MM-DD, or Date object)
 */
export function getLocalDateKey(dateInput?: string | Date): string {
  if (!dateInput) return '';
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    // Only return trimmed directly if it's strictly a plain date string "YYYY-MM-DD" without time component
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
  }
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

