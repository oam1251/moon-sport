import type { BusinessSettings, Customer, Layaway, Product, Sale } from '../types';

export interface MockStore {
  products: Product[];
  sales: Sale[];
  customers: Customer[];
  layaways: Layaway[];
  settings: BusinessSettings;
  nextProductId: number;
  nextSaleId: number;
  nextSaleItemId: number;
  nextCustomerId: number;
  nextLayawayId: number;
  nextLayawayItemId: number;
  nextLayawayPaymentId: number;
}

// v2: agrega clientes, apartados, foto de producto y meta
// mensual. Se cambia la llave para no intentar migrar datos de ejemplo
// viejos — total costo cero, simplemente se vuelve a sembrar.
const STORE_KEY = 'moon-sport-mock-data-v2';

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function seedStore(): MockStore {
  const products: Product[] = [
    {
      id: 1,
      name: 'Playera Moon Sport Negra',
      category: 'Playeras',
      size: 'M',
      color: 'Negro',
      sku: 'PL-NEG-M',
      costPrice: 120,
      sellPrice: 250,
      stock: 18,
      minStock: 5,
      photoUrl: null,
      createdAt: daysAgo(45),
      updatedAt: daysAgo(2),
    },
    {
      id: 2,
      name: 'Playera Moon Sport Blanca',
      category: 'Playeras',
      size: 'M',
      color: 'Blanco',
      sku: 'PL-BLA-M',
      costPrice: 120,
      sellPrice: 250,
      stock: 3,
      minStock: 5,
      photoUrl: null,
      createdAt: daysAgo(45),
      updatedAt: daysAgo(1),
    },
    {
      id: 3,
      name: 'Short deportivo',
      category: 'Shorts',
      size: 'L',
      color: 'Gris',
      sku: 'SH-GRI-L',
      costPrice: 90,
      sellPrice: 220,
      stock: 12,
      minStock: 4,
      photoUrl: null,
      createdAt: daysAgo(40),
      updatedAt: daysAgo(3),
    },
    {
      id: 4,
      name: 'Gorra Moon Sport',
      category: 'Accesorios',
      size: null,
      color: 'Dorado',
      sku: 'GO-DOR',
      costPrice: 60,
      sellPrice: 150,
      stock: 25,
      minStock: 6,
      photoUrl: null,
      createdAt: daysAgo(38),
      updatedAt: daysAgo(10),
    },
    {
      id: 5,
      name: 'Tenis running',
      category: 'Calzado',
      size: '27',
      color: 'Negro/Dorado',
      sku: 'TE-NEG-27',
      costPrice: 450,
      sellPrice: 899,
      stock: 2,
      minStock: 3,
      photoUrl: null,
      createdAt: daysAgo(30),
      updatedAt: daysAgo(2),
    },
  ];

  const customers: Customer[] = [
    { id: 1, name: 'Ana López', phone: '5512345678', note: null, createdAt: daysAgo(20) },
    { id: 2, name: 'Carla Ruiz', phone: '5598765432', note: null, createdAt: daysAgo(12) },
  ];

  const sales: Sale[] = [
    {
      id: 1,
      date: daysAgo(0),
      total: 650,
      totalCost: 300,
      profit: 350,
      paymentMethod: 'Efectivo',
      note: null,
      customerId: 1,
      customerName: 'Ana López',
      items: [
        {
          id: 1,
          saleId: 1,
          productId: 1,
          productName: 'Playera Moon Sport Negra',
          qty: 2,
          unitPrice: 250,
          unitCost: 120,
        },
        {
          id: 2,
          saleId: 1,
          productId: 4,
          productName: 'Gorra Moon Sport',
          qty: 1,
          unitPrice: 150,
          unitCost: 60,
        },
      ],
    },
    {
      id: 2,
      date: daysAgo(2),
      total: 1119,
      totalCost: 540,
      profit: 579,
      paymentMethod: 'Tarjeta',
      note: null,
      customerId: null,
      customerName: null,
      items: [
        {
          id: 3,
          saleId: 2,
          productId: 3,
          productName: 'Short deportivo',
          qty: 1,
          unitPrice: 220,
          unitCost: 90,
        },
        {
          id: 4,
          saleId: 2,
          productId: 5,
          productName: 'Tenis running',
          qty: 1,
          unitPrice: 899,
          unitCost: 450,
        },
      ],
    },
    {
      id: 3,
      date: daysAgo(10),
      total: 450,
      totalCost: 180,
      profit: 270,
      paymentMethod: 'Transferencia',
      note: null,
      customerId: null,
      customerName: null,
      items: [
        {
          id: 5,
          saleId: 3,
          productId: 4,
          productName: 'Gorra Moon Sport',
          qty: 3,
          unitPrice: 150,
          unitCost: 60,
        },
      ],
    },
  ];

  const layaways: Layaway[] = [
    {
      id: 1,
      date: daysAgo(4),
      customerId: 2,
      customerName: 'Carla Ruiz',
      status: 'abierto',
      total: 899,
      totalCost: 450,
      deposit: 300,
      note: null,
      items: [
        {
          id: 1,
          layawayId: 1,
          productId: 5,
          productName: 'Tenis running',
          qty: 1,
          unitPrice: 899,
          unitCost: 450,
        },
      ],
      payments: [{ id: 1, layawayId: 1, date: daysAgo(4), amount: 300, method: 'Efectivo' }],
    },
  ];

  const settings: BusinessSettings = { monthlyGoal: 15000 };

  return {
    products,
    sales,
    customers,
    layaways,
    settings,
    nextProductId: 6,
    nextSaleId: 4,
    nextSaleItemId: 6,
    nextCustomerId: 3,
    nextLayawayId: 2,
    nextLayawayItemId: 2,
    nextLayawayPaymentId: 2,
  };
}

export function getStore(): MockStore {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw) as MockStore;
  } catch {
    // ignora datos corruptos y reinicia
  }
  const fresh = seedStore();
  setStore(fresh);
  return fresh;
}

export function setStore(store: MockStore): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    // localStorage no disponible — no persiste entre recargas, pero no truena.
  }
}
