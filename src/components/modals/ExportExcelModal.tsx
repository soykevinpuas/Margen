import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { useApp } from '../../context/AppContext';
import { Sale, OperatingExpense, PurchaseBatch } from '../../types';

interface ExportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMonth?: string; // e.g. "2026-08" or "ALL"
}

export const ExportExcelModal: React.FC<ExportExcelModalProps> = ({
  isOpen,
  onClose,
  initialMonth = 'ALL',
}) => {
  const { settings, products, batches, sales, operatingExpenses, categories } = useApp();
  const { businessName, displayCurrency, exchangeRate } = settings;

  // Selected Month Filter
  const [selectedPeriod, setSelectedPeriod] = useState<string>(initialMonth);

  // Column / Section Checkboxes
  const [includeSummary, setIncludeSummary] = useState(true);

  const [includeSales, setIncludeSales] = useState(true);
  const [salesCols, setSalesCols] = useState({
    folio: true,
    fecha: true,
    producto: true,
    sku: true,
    cantidad: true,
    precioUnitario: true,
    ingresoTotal: true,
    costoUnidades: true,
    gastosVenta: true,
    ganancia: true,
    margen: true,
    estado: true,
    notas: true,
  });

  const [includeInventory, setIncludeInventory] = useState(true);
  const [invCols, setInvCols] = useState({
    loteId: true,
    producto: true,
    proveedor: true,
    fecha: true,
    compradas: true,
    disponibles: true,
    costoUnitarioBase: true,
    gastosCompra: true,
    costoUnitarioReal: true,
    costoTotal: true,
    notas: true,
  });

  const [includeProducts, setIncludeProducts] = useState(true);
  const [prodCols, setProdCols] = useState({
    nombre: true,
    categoria: true,
    sku: true,
    precioSugerido: true,
    stockMinimo: true,
    stockActual: true,
    valorInventario: true,
  });

  const [includeExpenses, setIncludeExpenses] = useState(true);
  const [expCols, setExpCols] = useState({
    id: true,
    fecha: true,
    concepto: true,
    categoria: true,
    monto: true,
    recurrente: true,
    notas: true,
  });

  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  if (!isOpen) return null;

  // Generate available unique months list from sales & expenses
  const getAvailableMonths = () => {
    const monthsSet = new Set<string>();
    const now = new Date();
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    monthsSet.add(currentKey);

    sales.forEach((s) => {
      if (s.fecha) {
        const d = new Date(s.fecha);
        if (!isNaN(d.getTime())) {
          monthsSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        }
      }
    });

    operatingExpenses.forEach((e) => {
      if (e.fecha) {
        const d = new Date(e.fecha);
        if (!isNaN(d.getTime())) {
          monthsSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        }
      }
    });

    return Array.from(monthsSet).sort().reverse();
  };

  const availableMonths = getAvailableMonths();

  const getMonthLabel = (monthKey: string) => {
    if (monthKey === 'ALL') return 'Todo el Historial Completo';
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();
  };

  // Filter Data by Selected Period
  const filterByPeriod = <T extends { fecha?: string }>(items: T[]): T[] => {
    if (selectedPeriod === 'ALL') return items;
    return items.filter((item) => {
      if (!item.fecha) return false;
      const d = new Date(item.fecha);
      if (isNaN(d.getTime())) return false;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return key === selectedPeriod;
    });
  };

  const filteredSales = filterByPeriod<Sale>(sales);
  const filteredExpenses = filterByPeriod<OperatingExpense>(operatingExpenses);
  const filteredBatches = filterByPeriod<PurchaseBatch>(batches);

  // Perform Excel Generation
  const handleExport = async () => {
    setIsExporting(true);
    await new Promise((resolve) => setTimeout(resolve, 300));

    try {
      const wb = XLSX.utils.book_new();
      const currentCompany = (businessName || 'Mi Negocio').trim().toUpperCase();
      const nowStr = new Date().toLocaleString('es-MX', {
        dateStyle: 'long',
        timeStyle: 'short',
      });
      const periodLabel = getMonthLabel(selectedPeriod);

      // --- SHEET 1: RESUMEN EJECUTIVO ---
      if (includeSummary) {
        const confirmedSales = filteredSales.filter((s) => s.estado === 'confirmada');
        const totalIngresosMXN = confirmedSales.reduce((sum, s) => sum + s.ingresoTotalMXN, 0);
        const totalCogsMXN = confirmedSales.reduce(
          (sum, s) => sum + s.costoUnidadesVendidasMXN,
          0
        );
        const totalSalesExpensesMXN = confirmedSales.reduce(
          (sum, s) => sum + s.gastosDeVentaTotalMXN,
          0
        );
        const totalOpExpensesMXN = filteredExpenses.reduce((sum, e) => sum + e.montoMXN, 0);
        const totalEgresosMXN = totalCogsMXN + totalSalesExpensesMXN + totalOpExpensesMXN;
        const gananciaNetaMXN = totalIngresosMXN - totalEgresosMXN;
        const margenNetoPct =
          totalIngresosMXN > 0 ? (gananciaNetaMXN / totalIngresosMXN) * 100 : 0;

        const summaryRows: any[][] = [
          [`DOCUMENTO OFICIAL DE ESTADO FINANCIERO - ${currentCompany}`],
          [`Empresa / Marca:`, currentCompany],
          [`Fecha de Emisión:`, nowStr],
          [`Período de Reporte:`, periodLabel],
          [`Moneda Base:`, 'MXN (Pesos Mexicanos)'],
          [],
          ['========================================================================'],
          ['RESUMEN FINANCIERO Y RESULTADOS DEL PERÍODO'],
          ['========================================================================'],
          ['Métrica Financiera', 'Monto en MXN', 'Porcentaje / Detalle'],
          ['Total Ingresos por Ventas', totalIngresosMXN, '100.00%'],
          ['Costo de Mercancía Vendida', totalCogsMXN, `${totalIngresosMXN > 0 ? ((totalCogsMXN / totalIngresosMXN) * 100).toFixed(2) : 0}%`],
          ['Gastos de Venta (Comisiones/Envíos)', totalSalesExpensesMXN, `${totalIngresosMXN > 0 ? ((totalSalesExpensesMXN / totalIngresosMXN) * 100).toFixed(2) : 0}%`],
          ['Gastos Operativos (Renta/Servicios)', totalOpExpensesMXN, `${totalIngresosMXN > 0 ? ((totalOpExpensesMXN / totalIngresosMXN) * 100).toFixed(2) : 0}%`],
          ['TOTAL EGRESOS DEL PERÍODO', totalEgresosMXN, `${totalIngresosMXN > 0 ? ((totalEgresosMXN / totalIngresosMXN) * 100).toFixed(2) : 0}%`],
          ['GANANCIA NETA DEL PERÍODO', gananciaNetaMXN, `${margenNetoPct.toFixed(2)}% Margen Neto`],
          [],
          ['INFORMACIÓN DE ACTIVIDAD'],
          ['Ventas Registradas (Unidades)', confirmedSales.reduce((s, x) => s + x.cantidad, 0)],
          ['Número de Transacciones', confirmedSales.length],
          ['Gastos Operativos Registrados', filteredExpenses.length],
          ['Lotes Comprados en Período', filteredBatches.length],
          [],
          ['------------------------------------------------------------------------'],
          [`Generado automáticamente por el Sistema Contable de ${currentCompany}`],
        ];

        const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
        // Column widths
        wsSummary['!cols'] = [{ wch: 40 }, { wch: 25 }, { wch: 30 }];
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen_Ejecutivo');
      }

      // --- SHEET 2: VENTAS ---
      if (includeSales) {
        const salesHeaders: string[] = [];
        if (salesCols.folio) salesHeaders.push('Folio Venta');
        if (salesCols.fecha) salesHeaders.push('Fecha y Hora');
        if (salesCols.producto) salesHeaders.push('Producto');
        if (salesCols.sku) salesHeaders.push('SKU');
        if (salesCols.cantidad) salesHeaders.push('Cantidad');
        if (salesCols.precioUnitario) salesHeaders.push('Precio Unit. (MXN)');
        if (salesCols.ingresoTotal) salesHeaders.push('Ingreso Total (MXN)');
        if (salesCols.costoUnidades) salesHeaders.push('Costo de Compra (MXN)');
        if (salesCols.gastosVenta) salesHeaders.push('Gastos Venta (MXN)');
        if (salesCols.ganancia) salesHeaders.push('Ganancia Neta (MXN)');
        if (salesCols.margen) salesHeaders.push('Margen %');
        if (salesCols.estado) salesHeaders.push('Estado');
        if (salesCols.notas) salesHeaders.push('Notas / Observaciones');

        const salesDataRows: any[][] = [
          [`REPORTE DETALLADO DE VENTAS - ${currentCompany}`],
          [`Período: ${periodLabel} | Generado: ${nowStr}`],
          [],
          salesHeaders,
        ];

        filteredSales.forEach((s) => {
          const prod = products.find((p) => p.id === s.productoId);
          const row: any[] = [];
          if (salesCols.folio) row.push(s.id);
          if (salesCols.fecha) row.push(s.fecha ? new Date(s.fecha).toLocaleString('es-MX') : '');
          if (salesCols.producto) row.push(prod?.nombre || 'Producto no encontrado');
          if (salesCols.sku) row.push(prod?.sku || '-');
          if (salesCols.cantidad) row.push(s.cantidad);
          if (salesCols.precioUnitario) row.push(s.precioVentaUnitarioMXN);
          if (salesCols.ingresoTotal) row.push(s.ingresoTotalMXN);
          if (salesCols.costoUnidades) row.push(s.costoUnidadesVendidasMXN);
          if (salesCols.gastosVenta) row.push(s.gastosDeVentaTotalMXN);
          if (salesCols.ganancia) row.push(s.gananciaVentaMXN);
          if (salesCols.margen) row.push(s.margenPorcentaje.toFixed(2) + '%');
          if (salesCols.estado) row.push(s.estado.toUpperCase());
          if (salesCols.notas) row.push(s.notas || '');

          salesDataRows.push(row);
        });

        // Totals Row
        const confirmedSalesList = filteredSales.filter((s) => s.estado === 'confirmada');
        const totCant = confirmedSalesList.reduce((acc, x) => acc + x.cantidad, 0);
        const totIng = confirmedSalesList.reduce((acc, x) => acc + x.ingresoTotalMXN, 0);
        const totCogs = confirmedSalesList.reduce((acc, x) => acc + x.costoUnidadesVendidasMXN, 0);
        const totGastV = confirmedSalesList.reduce((acc, x) => acc + x.gastosDeVentaTotalMXN, 0);
        const totGan = confirmedSalesList.reduce((acc, x) => acc + x.gananciaVentaMXN, 0);
        const totMarg = totIng > 0 ? ((totGan / totIng) * 100).toFixed(2) + '%' : '0%';

        const totalRow: any[] = [];
        if (salesCols.folio) totalRow.push('TOTALES (CONFIRMADAS)');
        if (salesCols.fecha) totalRow.push('-');
        if (salesCols.producto) totalRow.push('-');
        if (salesCols.sku) totalRow.push('-');
        if (salesCols.cantidad) totalRow.push(totCant);
        if (salesCols.precioUnitario) totalRow.push('-');
        if (salesCols.ingresoTotal) totalRow.push(totIng);
        if (salesCols.costoUnidades) totalRow.push(totCogs);
        if (salesCols.gastosVenta) totalRow.push(totGastV);
        if (salesCols.ganancia) totalRow.push(totGan);
        if (salesCols.margen) totalRow.push(totMarg);
        if (salesCols.estado) totalRow.push('-');
        if (salesCols.notas) totalRow.push('-');

        salesDataRows.push([]);
        salesDataRows.push(totalRow);

        const wsSales = XLSX.utils.aoa_to_sheet(salesDataRows);
        wsSales['!cols'] = salesHeaders.map(() => ({ wch: 18 }));
        XLSX.utils.book_append_sheet(wb, wsSales, 'Ventas');
      }

      // --- SHEET 3: INVENTARIO / LOTES ---
      if (includeInventory) {
        const invHeaders: string[] = [];
        if (invCols.loteId) invHeaders.push('Folio Lote');
        if (invCols.producto) invHeaders.push('Producto');
        if (invCols.proveedor) invHeaders.push('Proveedor');
        if (invCols.fecha) invHeaders.push('Fecha Compra');
        if (invCols.compradas) invHeaders.push('Cant. Comprada');
        if (invCols.disponibles) invHeaders.push('Cant. Disponible');
        if (invCols.costoUnitarioBase) invHeaders.push('Costo Base Unit. (MXN)');
        if (invCols.gastosCompra) invHeaders.push('Gastos Flete/Aduana (MXN)');
        if (invCols.costoUnitarioReal) invHeaders.push('Costo Real Unit. (MXN)');
        if (invCols.costoTotal) invHeaders.push('Costo Total Lote (MXN)');
        if (invCols.notas) invHeaders.push('Notas');

        const invRows: any[][] = [
          [`REPORTE DE LOTES DE COMPRA E INVENTARIO - ${currentCompany}`],
          [`Período: ${periodLabel} | Generado: ${nowStr}`],
          [],
          invHeaders,
        ];

        filteredBatches.forEach((b) => {
          const prod = products.find((p) => p.id === b.productoId);
          const gastosFlete = b.gastosDeCompra?.reduce((s, g) => s + (g.montoMXN || 0), 0) || 0;
          const row: any[] = [];

          if (invCols.loteId) row.push(b.id);
          if (invCols.producto) row.push(prod?.nombre || 'Producto no encontrado');
          if (invCols.proveedor) row.push(b.proveedor || '-');
          if (invCols.fecha) row.push(b.fecha || '');
          if (invCols.compradas) row.push(b.cantidadComprada);
          if (invCols.disponibles) row.push(b.cantidadDisponible);
          if (invCols.costoUnitarioBase) row.push(b.costoProductoUnitarioMXN);
          if (invCols.gastosCompra) row.push(gastosFlete);
          if (invCols.costoUnitarioReal) row.push(b.costoUnitarioRealMXN);
          if (invCols.costoTotal) row.push(b.costoTotalMXN);
          if (invCols.notas) row.push(b.notas || '');

          invRows.push(row);
        });

        const wsInv = XLSX.utils.aoa_to_sheet(invRows);
        wsInv['!cols'] = invHeaders.map(() => ({ wch: 18 }));
        XLSX.utils.book_append_sheet(wb, wsInv, 'Lotes_e_Inventario');
      }

      // --- SHEET 4: CATÁLOGO DE PRODUCTOS ---
      if (includeProducts) {
        const prodHeaders: string[] = [];
        if (prodCols.nombre) prodHeaders.push('Producto');
        if (prodCols.categoria) prodHeaders.push('Categoría');
        if (prodCols.sku) prodHeaders.push('SKU');
        if (prodCols.precioSugerido) prodHeaders.push('Precio Sugerido (MXN)');
        if (prodCols.stockMinimo) prodHeaders.push('Stock Mínimo');
        if (prodCols.stockActual) prodHeaders.push('Stock Actual');
        if (prodCols.valorInventario) prodHeaders.push('Valor Stock Actual (MXN)');

        const prodRows: any[][] = [
          [`CATÁLOGO COMPLETO DE PRODUCTOS - ${currentCompany}`],
          [`Generado: ${nowStr}`],
          [],
          prodHeaders,
        ];

        products.forEach((p) => {
          if (p.archivado) return;
          const cat = categories.find((c) => c.id === p.categoriaId);
          const pBatches = batches.filter((b) => b.productoId === p.id);
          const stockActual = pBatches.reduce((sum, b) => sum + b.cantidadDisponible, 0);
          const valorInventario = pBatches.reduce(
            (sum, b) => sum + b.cantidadDisponible * b.costoUnitarioRealMXN,
            0
          );

          const row: any[] = [];
          if (prodCols.nombre) row.push(p.nombre);
          if (prodCols.categoria) row.push(cat?.nombre || 'General');
          if (prodCols.sku) row.push(p.sku || '-');
          if (prodCols.precioSugerido) row.push(p.precioSugerido);
          if (prodCols.stockMinimo) row.push(p.stockMinimo);
          if (prodCols.stockActual) row.push(stockActual);
          if (prodCols.valorInventario) row.push(valorInventario);

          prodRows.push(row);
        });

        const wsProd = XLSX.utils.aoa_to_sheet(prodRows);
        wsProd['!cols'] = prodHeaders.map(() => ({ wch: 20 }));
        XLSX.utils.book_append_sheet(wb, wsProd, 'Catalogo_Productos');
      }

      // --- SHEET 5: GASTOS OPERATIVOS ---
      if (includeExpenses) {
        const expHeaders: string[] = [];
        if (expCols.id) expHeaders.push('Folio Gasto');
        if (expCols.fecha) expHeaders.push('Fecha');
        if (expCols.concepto) expHeaders.push('Concepto');
        if (expCols.categoria) expHeaders.push('Categoría');
        if (expCols.monto) expHeaders.push('Monto (MXN)');
        if (expCols.recurrente) expHeaders.push('Recurrente');
        if (expCols.notas) expHeaders.push('Notas');

        const expRows: any[][] = [
          [`REPORTE DE GASTOS OPERATIVOS - ${currentCompany}`],
          [`Período: ${periodLabel} | Generado: ${nowStr}`],
          [],
          expHeaders,
        ];

        filteredExpenses.forEach((e) => {
          const row: any[] = [];
          if (expCols.id) row.push(e.id);
          if (expCols.fecha) row.push(e.fecha || '');
          if (expCols.concepto) row.push(e.concepto);
          if (expCols.categoria) row.push(e.categoria.toUpperCase());
          if (expCols.monto) row.push(e.montoMXN);
          if (expCols.recurrente) row.push(e.esRecurrente ? 'SÍ' : 'NO');
          if (expCols.notas) row.push(e.notas || '');

          expRows.push(row);
        });

        // Total Expenses
        const totMonto = filteredExpenses.reduce((s, x) => s + x.montoMXN, 0);
        const expTotalRow: any[] = [];
        if (expCols.id) expTotalRow.push('TOTAL GASTOS');
        if (expCols.fecha) expTotalRow.push('-');
        if (expCols.concepto) expTotalRow.push('-');
        if (expCols.categoria) expTotalRow.push('-');
        if (expCols.monto) expTotalRow.push(totMonto);
        if (expCols.recurrente) expTotalRow.push('-');
        if (expCols.notas) expTotalRow.push('-');

        expRows.push([]);
        expRows.push(expTotalRow);

        const wsExp = XLSX.utils.aoa_to_sheet(expRows);
        wsExp['!cols'] = expHeaders.map(() => ({ wch: 18 }));
        XLSX.utils.book_append_sheet(wb, wsExp, 'Gastos_Operativos');
      }

      // Write and download File
      const safeName = currentCompany.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Reporte_${safeName}_${selectedPeriod === 'ALL' ? 'Historial_Completo' : selectedPeriod}.xlsx`;

      XLSX.writeFile(wb, filename);

      setIsExporting(false);
      setExportSuccess(true);
      setTimeout(() => {
        setExportSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Error generating excel:', err);
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-surface-container-high border border-outline-variant w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-outline-variant flex items-center justify-between bg-surface-container">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <span className="material-symbols-outlined text-lg">description</span>
            </div>
            <div>
              <h2 className="text-sm font-headline font-bold text-on-surface">
                Generar Documento Excel (.xlsx)
              </h2>
              <p className="text-[10px] text-on-surface-variant">
                Formato corporativo con el nombre de <strong className="text-primary font-bold">{businessName || 'Tu Negocio'}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        <div className="p-4 space-y-4 text-xs overflow-y-auto flex-1">
          {/* Period Selector */}
          <div className="p-3 bg-surface-container border border-outline-variant/60 rounded-xl space-y-2">
            <label className="block font-bold text-on-surface uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px] text-primary">calendar_month</span>
              Selecciona el Mes / Período a Exportar:
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full h-10 bg-surface-container-highest border border-outline-variant text-on-surface rounded-lg px-3 font-bold text-xs focus:outline-none focus:border-primary"
            >
              <option value="ALL">🌟 Todo el Historial Registrado</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  📅 {getMonthLabel(m)}
                </option>
              ))}
            </select>
            <p className="text-[9px] text-on-surface-variant">
              Filtra las ventas, gastos y compras del mes seleccionado.
            </p>
          </div>

          {/* Form Checkboxes - Sections & Columns */}
          <div className="space-y-3">
            <span className="block font-bold text-on-surface-variant uppercase tracking-wider text-[10px]">
              Selecciona los módulos y columnas que deseas incluir:
            </span>

            {/* 1. Summary */}
            <div className="p-3 bg-surface-container border border-outline-variant/50 rounded-xl space-y-1">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-on-surface">
                <input
                  type="checkbox"
                  checked={includeSummary}
                  onChange={(e) => setIncludeSummary(e.target.checked)}
                  className="w-4 h-4 accent-primary rounded cursor-pointer"
                />
                <span className="material-symbols-outlined text-[16px] text-emerald-400">insights</span>
                Hoja 1: Resumen Ejecutivo y Estado Financiero
              </label>
              <p className="text-[10px] text-on-surface-variant pl-6">
                Incluye encabezado de marca con {businessName}, KPIs de ingresos, costos de mercancía, gastos operativos, ganancia neta y margen.
              </p>
            </div>

            {/* 2. Sales */}
            <div className="p-3 bg-surface-container border border-outline-variant/50 rounded-xl space-y-2">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-on-surface">
                <input
                  type="checkbox"
                  checked={includeSales}
                  onChange={(e) => setIncludeSales(e.target.checked)}
                  className="w-4 h-4 accent-primary rounded cursor-pointer"
                />
                <span className="material-symbols-outlined text-[16px] text-tertiary">shopping_cart</span>
                Hoja 2: Tabla de Ventas ({filteredSales.length} registros)
              </label>

              {includeSales && (
                <div className="pl-6 pt-1 grid grid-cols-2 gap-1.5 text-[10px]">
                  {Object.entries(salesCols).map(([key, val]) => (
                    <label key={key} className="flex items-center gap-1.5 text-on-surface-variant hover:text-on-surface cursor-pointer">
                      <input
                        type="checkbox"
                        checked={val}
                        onChange={(e) =>
                          setSalesCols({ ...salesCols, [key]: e.target.checked })
                        }
                        className="w-3 h-3 accent-primary rounded"
                      />
                      <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Batches / Inventory */}
            <div className="p-3 bg-surface-container border border-outline-variant/50 rounded-xl space-y-2">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-on-surface">
                <input
                  type="checkbox"
                  checked={includeInventory}
                  onChange={(e) => setIncludeInventory(e.target.checked)}
                  className="w-4 h-4 accent-primary rounded cursor-pointer"
                />
                <span className="material-symbols-outlined text-[16px] text-primary">inventory_2</span>
                Hoja 3: Lotes de Compras e Inventario ({filteredBatches.length} lotes)
              </label>

              {includeInventory && (
                <div className="pl-6 pt-1 grid grid-cols-2 gap-1.5 text-[10px]">
                  {Object.entries(invCols).map(([key, val]) => (
                    <label key={key} className="flex items-center gap-1.5 text-on-surface-variant hover:text-on-surface cursor-pointer">
                      <input
                        type="checkbox"
                        checked={val}
                        onChange={(e) =>
                          setInvCols({ ...invCols, [key]: e.target.checked })
                        }
                        className="w-3 h-3 accent-primary rounded"
                      />
                      <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Products */}
            <div className="p-3 bg-surface-container border border-outline-variant/50 rounded-xl space-y-2">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-on-surface">
                <input
                  type="checkbox"
                  checked={includeProducts}
                  onChange={(e) => setIncludeProducts(e.target.checked)}
                  className="w-4 h-4 accent-primary rounded cursor-pointer"
                />
                <span className="material-symbols-outlined text-[16px] text-amber-400">category</span>
                Hoja 4: Catálogo de Productos ({products.filter((p) => !p.archivado).length} productos)
              </label>

              {includeProducts && (
                <div className="pl-6 pt-1 grid grid-cols-2 gap-1.5 text-[10px]">
                  {Object.entries(prodCols).map(([key, val]) => (
                    <label key={key} className="flex items-center gap-1.5 text-on-surface-variant hover:text-on-surface cursor-pointer">
                      <input
                        type="checkbox"
                        checked={val}
                        onChange={(e) =>
                          setProdCols({ ...prodCols, [key]: e.target.checked })
                        }
                        className="w-3 h-3 accent-primary rounded"
                      />
                      <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* 5. Expenses */}
            <div className="p-3 bg-surface-container border border-outline-variant/50 rounded-xl space-y-2">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-on-surface">
                <input
                  type="checkbox"
                  checked={includeExpenses}
                  onChange={(e) => setIncludeExpenses(e.target.checked)}
                  className="w-4 h-4 accent-primary rounded cursor-pointer"
                />
                <span className="material-symbols-outlined text-[16px] text-rose-400">receipt_long</span>
                Hoja 5: Gastos Operativos ({filteredExpenses.length} gastos)
              </label>

              {includeExpenses && (
                <div className="pl-6 pt-1 grid grid-cols-2 gap-1.5 text-[10px]">
                  {Object.entries(expCols).map(([key, val]) => (
                    <label key={key} className="flex items-center gap-1.5 text-on-surface-variant hover:text-on-surface cursor-pointer">
                      <input
                        type="checkbox"
                        checked={val}
                        onChange={(e) =>
                          setExpCols({ ...expCols, [key]: e.target.checked })
                        }
                        className="w-3 h-3 accent-primary rounded"
                      />
                      <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Success message */}
        {exportSuccess && (
          <div className="mx-4 p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-center text-emerald-400 font-bold text-xs flex items-center justify-center gap-2 animate-fade-in">
            <span className="material-symbols-outlined text-lg">check_circle</span>
            <span>¡Documento Excel descargado correctamente!</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-4 border-t border-outline-variant bg-surface-container flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-surface-container-highest border border-outline-variant text-on-surface rounded-xl text-xs font-bold hover:bg-surface-variant transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isExporting}
            onClick={handleExport}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 active:scale-95 transition-all text-xs flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Generando Excel...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">download</span>
                <span>Descargar Reporte Excel (.xlsx)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
