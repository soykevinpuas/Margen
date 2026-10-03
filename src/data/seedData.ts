import {
  Category,
  Product,
  PurchaseBatch,
  Sale,
  OperatingExpense,
  AppSettings,
} from '../types';

export const initialSettings: AppSettings = {
  businessName: 'Margen',
  displayCurrency: 'MXN',
  exchangeRate: 20.0,
  inventoryViewMode: 'grouped',
  defaultMinStock: 3,
  timeZone: 'America/Mexico_City',
  primaryColor: 'emerald',
  backgroundColor: 'dark',
  chartType: 'barras',
};

export const initialCategories: Category[] = [
  { id: 'cat-1', nombre: 'Calzado & Tenis', archived: false, createdAt: '2026-01-01' },
  { id: 'cat-2', nombre: 'Electrónica & Tech', archived: false, createdAt: '2026-01-01' },
  { id: 'cat-3', nombre: 'Ropa & Moda', archived: false, createdAt: '2026-01-01' },
  { id: 'cat-4', nombre: 'Libros & Papelería', archived: false, createdAt: '2026-01-01' },
  { id: 'cat-5', nombre: 'Alimentos & Bebidas', archived: false, createdAt: '2026-01-01' },
  { id: 'cat-6', nombre: 'Hogar & Accesorios', archived: false, createdAt: '2026-01-01' },
];

export const initialProducts: Product[] = [
  {
    id: 'prod-1',
    nombre: 'Tenis Nike Air Max 97',
    categoriaId: 'cat-1',
    descripcion: 'Metallic Silver Bullet - Edición especial',
    sku: 'NK-AM97-SLV',
    precioSugerido: 2800,
    stockMinimo: 3,
    imagen:
      'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=600&q=80',
    archivado: false,
    createdAt: '2026-01-10',
  },
  {
    id: 'prod-2',
    nombre: 'Libro Rayuela - Julio Cortázar',
    categoriaId: 'cat-4',
    descripcion: 'Edición conmemorativa con pasta dura',
    sku: 'LIB-RAY-01',
    precioSugerido: 450,
    stockMinimo: 3,
    imagen:
      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
    archivado: false,
    createdAt: '2026-01-12',
  },
  {
    id: 'prod-3',
    nombre: 'Teclado Mecánico K6 RGB',
    categoriaId: 'cat-2',
    descripcion: 'Teclado hot-swappable switches red',
    sku: 'TEC-K6-RGB',
    precioSugerido: 1450,
    stockMinimo: 2,
    imagen:
      'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80',
    archivado: false,
    createdAt: '2026-01-15',
  },
  {
    id: 'prod-4',
    nombre: 'Taza Cerámica Matte',
    categoriaId: 'cat-6',
    descripcion: 'Taza café estilo nórdico negro mate 350ml',
    sku: 'TAZ-CER-01',
    precioSugerido: 180,
    stockMinimo: 5,
    imagen:
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
    archivado: false,
    createdAt: '2026-01-18',
  },
  {
    id: 'prod-5',
    nombre: 'Café Orgánico Tostado 250g',
    categoriaId: 'cat-5',
    descripcion: 'Granos de altura Chiapas tostado medio',
    sku: 'CAF-ORG-250',
    precioSugerido: 150,
    stockMinimo: 4,
    imagen:
      'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=600&q=80',
    archivado: false,
    createdAt: '2026-01-20',
  },
  {
    id: 'prod-6',
    nombre: 'Cuaderno Punteado Obsidian',
    categoriaId: 'cat-4',
    descripcion: 'Bullet journal 160 GSM pasta negra',
    sku: 'CUA-OBS-01',
    precioSugerido: 250,
    stockMinimo: 3,
    imagen:
      'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=600&q=80',
    archivado: false,
    createdAt: '2026-01-22',
  },
];

export const initialBatches: PurchaseBatch[] = [
  {
    id: 'L-4928',
    productoId: 'prod-1',
    cantidadComprada: 12,
    cantidadDisponible: 8,
    costoProductoUnitarioMXN: 1350,
    costoProductosMXN: 16200,
    gastosDeCompra: [
      { id: 'ge-1', nombre: 'Envío proveedor', montoMXN: 800 },
      { id: 'ge-2', nombre: 'Empaque protector', montoMXN: 400 },
    ],
    costoTotalMXN: 17400,
    costoUnitarioRealMXN: 1450, // (16200 + 1200) / 12
    fecha: '2026-04-08',
    proveedor: 'Nike México S.A. de C.V.',
    notas: 'Lote importado directo con guía express',
    esInventarioInicial: false,
    locked: true,
    createdAt: '2026-04-08T10:00:00Z',
  },
  {
    id: 'L-4927',
    productoId: 'prod-1',
    cantidadComprada: 5,
    cantidadDisponible: 4,
    costoProductoUnitarioMXN: 1380,
    costoProductosMXN: 6900,
    gastosDeCompra: [{ id: 'ge-3', nombre: 'Flete local', montoMXN: 200 }],
    costoTotalMXN: 7100,
    costoUnitarioRealMXN: 1420,
    fecha: '2026-04-02',
    proveedor: 'Nike México S.A. de C.V.',
    notas: 'Reposición rápida',
    esInventarioInicial: false,
    locked: true,
    createdAt: '2026-04-02T14:30:00Z',
  },
  {
    id: 'L-4902',
    productoId: 'prod-2',
    cantidadComprada: 10,
    cantidadDisponible: 2,
    costoProductoUnitarioMXN: 220,
    costoProductosMXN: 2200,
    gastosDeCompra: [{ id: 'ge-4', nombre: 'Envío paquetería', montoMXN: 100 }],
    costoTotalMXN: 2300,
    costoUnitarioRealMXN: 230,
    fecha: '2026-03-25',
    proveedor: 'Editorial Alfaguara',
    notas: 'Stock librería',
    esInventarioInicial: false,
    locked: true,
    createdAt: '2026-03-25T09:15:00Z',
  },
  {
    id: 'L-4890',
    productoId: 'prod-3',
    cantidadComprada: 15,
    cantidadDisponible: 12,
    costoProductoUnitarioMXN: 780,
    costoProductosMXN: 11700,
    gastosDeCompra: [
      { id: 'ge-5', nombre: 'Importación aduana', montoMXN: 900 },
      { id: 'ge-6', nombre: 'Envío nacional', montoMXN: 600 },
    ],
    costoTotalMXN: 13200,
    costoUnitarioRealMXN: 880,
    fecha: '2026-03-20',
    proveedor: 'TechImports Latam',
    notas: 'Lote tec hot-swap',
    esInventarioInicial: false,
    locked: true,
    createdAt: '2026-03-20T11:20:00Z',
  },
  {
    id: 'L-4885',
    productoId: 'prod-4',
    cantidadComprada: 20,
    cantidadDisponible: 8,
    costoProductoUnitarioMXN: 70,
    costoProductosMXN: 1400,
    gastosDeCompra: [{ id: 'ge-7', nombre: 'Empaque burbuja', montoMXN: 100 }],
    costoTotalMXN: 1500,
    costoUnitarioRealMXN: 75,
    fecha: '2026-03-15',
    proveedor: 'Distribuidora Cerámica',
    notas: 'Lote tazas mate',
    esInventarioInicial: false,
    locked: true,
    createdAt: '2026-03-15T16:00:00Z',
  },
  {
    id: 'L-4870',
    productoId: 'prod-5',
    cantidadComprada: 10,
    cantidadDisponible: 0, // Out of stock
    costoProductoUnitarioMXN: 80,
    costoProductosMXN: 800,
    gastosDeCompra: [{ id: 'ge-8', nombre: 'Envío paquete', montoMXN: 50 }],
    costoTotalMXN: 850,
    costoUnitarioRealMXN: 85,
    fecha: '2026-03-10',
    proveedor: 'Finca Chiapas',
    notas: 'Inventario inicial agotado',
    esInventarioInicial: true,
    locked: true,
    createdAt: '2026-03-10T10:00:00Z',
  },
  {
    id: 'L-4860',
    productoId: 'prod-6',
    cantidadComprada: 30,
    cantidadDisponible: 24,
    costoProductoUnitarioMXN: 110,
    costoProductosMXN: 3300,
    gastosDeCompra: [{ id: 'ge-9', nombre: 'Envío', montoMXN: 150 }],
    costoTotalMXN: 3450,
    costoUnitarioRealMXN: 115,
    fecha: '2026-03-05',
    proveedor: 'Papelería Obsidian',
    notas: 'Lote cuadernos',
    esInventarioInicial: false,
    locked: true,
    createdAt: '2026-03-05T12:00:00Z',
  },
];

const getTodayISO = (hoursAgo = 0) => {
  const d = new Date();
  d.setHours(d.getHours() - hoursAgo);
  return d.toISOString();
};

const getDaysAgoISO = (days: number, hoursAgo = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(d.getHours() - hoursAgo);
  return d.toISOString();
};

const getDaysAgoDateKey = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const initialSales: Sale[] = [
  {
    id: 'V-8942',
    productoId: 'prod-1',
    cantidad: 2,
    precioVentaUnitarioMXN: 2700,
    ingresoTotalMXN: 5400,
    asignacionesLotes: [
      {
        loteId: 'L-4928',
        cantidadTomada: 2,
        costoUnitarioLoteSnapshotMXN: 1450,
      },
    ],
    costoUnidadesVendidasMXN: 2900,
    gastosDeVenta: [{ id: 'se-1', nombre: 'Comisión Mercadopago', montoMXN: 232 }],
    gastosDeVentaTotalMXN: 232,
    gananciaVentaMXN: 2268, // 5400 - 2900 - 232 = 2268
    margenPorcentaje: 42.0,
    fecha: getTodayISO(2),
    metodoAsignacion: 'FIFO',
    estado: 'confirmada',
    notas: 'Cliente recurrente entrega personal',
    createdAt: getTodayISO(2),
  },
  {
    id: 'V-8941',
    productoId: 'prod-3',
    cantidad: 1,
    precioVentaUnitarioMXN: 1450,
    ingresoTotalMXN: 1450,
    asignacionesLotes: [
      {
        loteId: 'L-4890',
        cantidadTomada: 1,
        costoUnitarioLoteSnapshotMXN: 880,
      },
    ],
    costoUnidadesVendidasMXN: 880,
    gastosDeVenta: [{ id: 'se-2', nombre: 'Envío cliente DHL', montoMXN: 150 }],
    gastosDeVentaTotalMXN: 150,
    gananciaVentaMXN: 420, // 1450 - 880 - 150 = 420
    margenPorcentaje: 28.97,
    fecha: getTodayISO(5),
    metodoAsignacion: 'FIFO',
    estado: 'confirmada',
    createdAt: getTodayISO(5),
  },
  {
    id: 'V-8940',
    productoId: 'prod-4',
    cantidad: 2,
    precioVentaUnitarioMXN: 180,
    ingresoTotalMXN: 360,
    asignacionesLotes: [
      {
        loteId: 'L-4885',
        cantidadTomada: 2,
        costoUnitarioLoteSnapshotMXN: 75,
      },
    ],
    costoUnidadesVendidasMXN: 150,
    gastosDeVenta: [],
    gastosDeVentaTotalMXN: 0,
    gananciaVentaMXN: 210,
    margenPorcentaje: 58.33,
    fecha: getDaysAgoISO(1, 2),
    metodoAsignacion: 'FIFO',
    estado: 'confirmada',
    createdAt: getDaysAgoISO(1, 2),
  },
  {
    id: 'V-8939',
    productoId: 'prod-2',
    cantidad: 1,
    precioVentaUnitarioMXN: 450,
    ingresoTotalMXN: 450,
    asignacionesLotes: [
      {
        loteId: 'L-4902',
        cantidadTomada: 1,
        costoUnitarioLoteSnapshotMXN: 230,
      },
    ],
    costoUnidadesVendidasMXN: 230,
    gastosDeVenta: [{ id: 'se-3', nombre: 'Empaque regalo', montoMXN: 20 }],
    gastosDeVentaTotalMXN: 20,
    gananciaVentaMXN: 200,
    margenPorcentaje: 44.44,
    fecha: getDaysAgoISO(2, 4),
    metodoAsignacion: 'FIFO',
    estado: 'confirmada',
    createdAt: getDaysAgoISO(2, 4),
  },
];

export const initialOperatingExpenses: OperatingExpense[] = [
  {
    id: 'op-1',
    concepto: 'Renta Local / Bodega',
    categoria: 'renta',
    montoMXN: 4500,
    fecha: getDaysAgoDateKey(5),
    esRecurrente: true,
    notas: 'Renta mensual espacio de almacenamiento',
    createdAt: getDaysAgoISO(5),
  },
  {
    id: 'op-2',
    concepto: 'CFE - Luz y Energía',
    categoria: 'servicios',
    montoMXN: 845,
    fecha: getDaysAgoDateKey(3),
    esRecurrente: true,
    notas: 'Recibo mensual oficina/almacén',
    createdAt: getDaysAgoISO(3),
  },
  {
    id: 'op-3',
    concepto: 'Anuncios Facebook & Instagram',
    categoria: 'marketing',
    montoMXN: 1200,
    fecha: getDaysAgoDateKey(1),
    esRecurrente: false,
    notas: 'Campaña tenis y calzado',
    createdAt: getDaysAgoISO(1),
  },
  {
    id: 'op-4',
    concepto: 'Cajas y Cinta de Empaque',
    categoria: 'insumos',
    montoMXN: 650,
    fecha: getDaysAgoDateKey(0),
    esRecurrente: false,
    notas: 'Lote 100 cajas de cartón corrugado',
    createdAt: getTodayISO(1),
  },
];
