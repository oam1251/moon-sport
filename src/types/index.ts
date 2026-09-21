export interface Product {
  id: number;
  name: string;
  category: string;
  size: string | null;
  color: string | null;
  sku: string | null;
  costPrice: number;
  sellPrice: number;
  stock: number;
  minStock: number;
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ProductInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;

export interface SaleItem {
  id: number;
  saleId: number;
  productId: number | null;
  productName: string;
  qty: number;
  unitPrice: number;
  unitCost: number;
}

export interface Sale {
  id: number;
  date: string;
  total: number;
  totalCost: number;
  profit: number;
  paymentMethod: PaymentMethod;
  note: string | null;
  customerId: number | null;
  customerName: string | null;
  items: SaleItem[];
}

export type PaymentMethod = 'Efectivo' | 'Tarjeta' | 'Transferencia' | 'Otro';

export const PAYMENT_METHODS: PaymentMethod[] = [
  'Efectivo',
  'Tarjeta',
  'Transferencia',
  'Otro',
];

export interface CartLine {
  product: Product;
  qty: number;
}

export type PeriodKey = 'today' | 'week' | 'month';

export interface PeriodSummary {
  revenue: number;
  cost: number;
  grossProfit: number;
  salesCount: number;
}

export interface TopProduct {
  productName: string;
  qtySold: number;
  revenue: number;
}

export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  note: string | null;
  createdAt: string;
}

export type CustomerInput = Omit<Customer, 'id' | 'createdAt'>;

export interface PurchaseItem {
  id: number;
  purchaseId: number;
  productId: number;
  productName: string;
  qty: number;
  unitCost: number;
}

export interface Purchase {
  id: number;
  date: string;
  supplier: string | null;
  note: string | null;
  totalCost: number;
  items: PurchaseItem[];
}

export interface PurchaseLine {
  product: Product;
  qty: number;
  unitCost: number;
}

export type LayawayStatus = 'abierto' | 'completado' | 'cancelado';

export interface LayawayPayment {
  id: number;
  layawayId: number;
  date: string;
  amount: number;
  method: PaymentMethod;
}

export interface LayawayItem {
  id: number;
  layawayId: number;
  productId: number | null;
  productName: string;
  qty: number;
  unitPrice: number;
  unitCost: number;
}

export interface Layaway {
  id: number;
  date: string;
  customerId: number | null;
  customerName: string | null;
  status: LayawayStatus;
  total: number;
  totalCost: number;
  deposit: number;
  note: string | null;
  items: LayawayItem[];
  payments: LayawayPayment[];
}

export interface BusinessSettings {
  monthlyGoal: number;
}
