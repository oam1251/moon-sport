import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { getStore, setStore } from './mockStore';
import type { CartLine, PaymentMethod, Sale, SaleItem } from '../types';

function mapSaleRow(row: any): Omit<Sale, 'items'> {
  return {
    id: row.id,
    date: row.date,
    total: row.total,
    totalCost: row.total_cost,
    profit: row.profit,
    paymentMethod: row.payment_method,
    note: row.note,
    customerId: row.customer_id,
    customerName: row.customer_name,
  };
}

function mapItemRow(row: any): SaleItem {
  return {
    id: row.id,
    saleId: row.sale_id,
    productId: row.product_id,
    productName: row.product_name,
    qty: row.qty,
    unitPrice: row.unit_price,
    unitCost: row.unit_cost,
  };
}

export async function listSales(limit = 100): Promise<Sale[]> {
  if (!isSupabaseConfigured) {
    return [...getStore().sales].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, limit);
  }

  const { data: saleRows, error } = await supabase
    .from('sales')
    .select('*')
    .order('date', { ascending: false })
    .limit(limit);
  if (error) throw error;

  const sales = (saleRows ?? []).map(mapSaleRow);
  if (sales.length === 0) return [];

  const ids = sales.map((s) => s.id);
  const { data: itemRows, error: itemsError } = await supabase
    .from('sale_items')
    .select('*')
    .in('sale_id', ids);
  if (itemsError) throw itemsError;

  const items = (itemRows ?? []).map(mapItemRow);
  return sales.map((sale) => ({
    ...sale,
    items: items.filter((it) => it.saleId === sale.id),
  }));
}

export interface NewSaleInput {
  lines: CartLine[];
  paymentMethod: PaymentMethod;
  note?: string;
  customerId?: number | null;
  customerName?: string | null;
}

/**
 * Registra una venta completa. La inserción de renglones y el descuento
 * de stock ocurren en la función `register_sale` de Postgres, dentro de
 * una sola transacción (ver supabase/functions.sql). Sin Supabase
 * configurado, se hace lo mismo contra el store de datos de ejemplo.
 */
export async function registerSale(input: NewSaleInput): Promise<number> {
  if (input.lines.length === 0) {
    throw new Error('La venta necesita al menos un producto.');
  }

  if (!isSupabaseConfigured) {
    const store = getStore();

    for (const line of input.lines) {
      const product = store.products.find((p) => p.id === line.product.id);
      if (!product) throw new Error(`El producto ${line.product.name} ya no existe.`);
      if (product.stock < line.qty) {
        throw new Error(`Stock insuficiente para ${product.name}: quedan ${product.stock}.`);
      }
    }

    const saleId = store.nextSaleId++;
    const items: SaleItem[] = input.lines.map((line) => {
      const product = store.products.find((p) => p.id === line.product.id)!;
      product.stock -= line.qty;
      product.updatedAt = new Date().toISOString();
      return {
        id: store.nextSaleItemId++,
        saleId,
        productId: product.id,
        productName: product.name,
        qty: line.qty,
        unitPrice: product.sellPrice,
        unitCost: product.costPrice,
      };
    });

    const total = items.reduce((s, it) => s + it.unitPrice * it.qty, 0);
    const totalCost = items.reduce((s, it) => s + it.unitCost * it.qty, 0);

    store.sales.push({
      id: saleId,
      date: new Date().toISOString(),
      total,
      totalCost,
      profit: total - totalCost,
      paymentMethod: input.paymentMethod,
      note: input.note?.trim() || null,
      customerId: input.customerId ?? null,
      customerName: input.customerName?.trim() || null,
      items,
    });

    setStore(store);
    return saleId;
  }

  const items = input.lines.map((l) => ({
    product_id: l.product.id,
    qty: l.qty,
  }));

  const { data, error } = await supabase.rpc('register_sale', {
    p_items: items,
    p_payment_method: input.paymentMethod,
    p_note: input.note?.trim() || null,
    p_customer_id: input.customerId ?? null,
    p_customer_name: input.customerName?.trim() || null,
  });
  if (error) throw new Error(error.message);
  return data as number;
}

export async function deleteSale(id: number): Promise<void> {
  if (!isSupabaseConfigured) {
    const store = getStore();
    const sale = store.sales.find((s) => s.id === id);
    if (!sale) return;
    for (const item of sale.items) {
      if (item.productId != null) {
        const product = store.products.find((p) => p.id === item.productId);
        if (product) {
          product.stock += item.qty;
          product.updatedAt = new Date().toISOString();
        }
      }
    }
    store.sales = store.sales.filter((s) => s.id !== id);
    setStore(store);
    return;
  }

  const { error } = await supabase.rpc('delete_sale', { p_sale_id: id });
  if (error) throw new Error(error.message);
}
