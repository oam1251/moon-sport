import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { getStore, setStore } from './mockStore';
import type { CartLine, Layaway, LayawayItem, LayawayPayment, PaymentMethod } from '../types';

function mapLayawayRow(row: any): Omit<Layaway, 'items' | 'payments'> {
  return {
    id: row.id,
    date: row.date,
    customerId: row.customer_id,
    customerName: row.customer_name,
    status: row.status,
    total: row.total,
    totalCost: row.total_cost,
    deposit: row.deposit,
    note: row.note,
  };
}

function mapItemRow(row: any): LayawayItem {
  return {
    id: row.id,
    layawayId: row.layaway_id,
    productId: row.product_id,
    productName: row.product_name,
    qty: row.qty,
    unitPrice: row.unit_price,
    unitCost: row.unit_cost,
  };
}

function mapPaymentRow(row: any): LayawayPayment {
  return {
    id: row.id,
    layawayId: row.layaway_id,
    date: row.date,
    amount: row.amount,
    method: row.method,
  };
}

export async function listLayaways(): Promise<Layaway[]> {
  if (!isSupabaseConfigured) {
    return [...getStore().layaways].sort((a, b) => (a.date < b.date ? 1 : -1));
  }

  const { data: rows, error } = await supabase
    .from('layaways')
    .select('*')
    .order('date', { ascending: false });
  if (error) throw error;

  const layaways = (rows ?? []).map(mapLayawayRow);
  if (layaways.length === 0) return [];

  const ids = layaways.map((l) => l.id);
  const [{ data: itemRows, error: itemsError }, { data: paymentRows, error: paymentsError }] =
    await Promise.all([
      supabase.from('layaway_items').select('*').in('layaway_id', ids),
      supabase.from('layaway_payments').select('*').in('layaway_id', ids),
    ]);
  if (itemsError) throw itemsError;
  if (paymentsError) throw paymentsError;

  const items = (itemRows ?? []).map(mapItemRow);
  const payments = (paymentRows ?? []).map(mapPaymentRow);

  return layaways.map((l) => ({
    ...l,
    items: items.filter((it) => it.layawayId === l.id),
    payments: payments.filter((p) => p.layawayId === l.id),
  }));
}

export async function getLayaway(id: number): Promise<Layaway | null> {
  const all = await listLayaways();
  return all.find((l) => l.id === id) ?? null;
}

export interface NewLayawayInput {
  lines: CartLine[];
  customerId?: number | null;
  customerName?: string | null;
  deposit: number;
  paymentMethod: PaymentMethod;
  note?: string;
}

/**
 * Crea un apartado: reserva stock (igual que una venta) y registra el
 * primer abono si viene con depósito. Ver `create_layaway` en
 * supabase/functions.sql para la versión real (transacción atómica).
 */
export async function createLayaway(input: NewLayawayInput): Promise<number> {
  if (input.lines.length === 0) {
    throw new Error('El apartado necesita al menos un producto.');
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

    const layawayId = store.nextLayawayId++;
    const items: LayawayItem[] = input.lines.map((line) => {
      const product = store.products.find((p) => p.id === line.product.id)!;
      product.stock -= line.qty;
      product.updatedAt = new Date().toISOString();
      return {
        id: store.nextLayawayItemId++,
        layawayId,
        productId: product.id,
        productName: product.name,
        qty: line.qty,
        unitPrice: product.sellPrice,
        unitCost: product.costPrice,
      };
    });

    const total = items.reduce((s, it) => s + it.unitPrice * it.qty, 0);
    const totalCost = items.reduce((s, it) => s + it.unitCost * it.qty, 0);
    const payments: LayawayPayment[] = [];

    if (input.deposit > 0) {
      payments.push({
        id: store.nextLayawayPaymentId++,
        layawayId,
        date: new Date().toISOString(),
        amount: input.deposit,
        method: input.paymentMethod,
      });
    }

    store.layaways.push({
      id: layawayId,
      date: new Date().toISOString(),
      customerId: input.customerId ?? null,
      customerName: input.customerName?.trim() || null,
      status: 'abierto',
      total,
      totalCost,
      deposit: input.deposit,
      note: input.note?.trim() || null,
      items,
      payments,
    });

    setStore(store);
    return layawayId;
  }

  const items = input.lines.map((l) => ({ product_id: l.product.id, qty: l.qty }));
  const { data, error } = await supabase.rpc('create_layaway', {
    p_items: items,
    p_customer_id: input.customerId ?? null,
    p_customer_name: input.customerName?.trim() || null,
    p_deposit: input.deposit,
    p_payment_method: input.paymentMethod,
    p_note: input.note?.trim() || null,
  });
  if (error) throw new Error(error.message);
  return data as number;
}

export async function addLayawayPayment(
  layawayId: number,
  amount: number,
  method: PaymentMethod
): Promise<void> {
  if (amount <= 0) throw new Error('El abono debe ser mayor a cero.');

  if (!isSupabaseConfigured) {
    const store = getStore();
    const layaway = store.layaways.find((l) => l.id === layawayId);
    if (!layaway) throw new Error('El apartado ya no existe.');
    layaway.payments.push({
      id: store.nextLayawayPaymentId++,
      layawayId,
      date: new Date().toISOString(),
      amount,
      method,
    });
    layaway.deposit += amount;
    setStore(store);
    return;
  }

  const { error } = await supabase.rpc('add_layaway_payment', {
    p_layaway_id: layawayId,
    p_amount: amount,
    p_method: method,
  });
  if (error) throw new Error(error.message);
}

/** Marca el apartado como completado y lo convierte en una venta real. */
export async function completeLayaway(layawayId: number): Promise<number> {
  if (!isSupabaseConfigured) {
    const store = getStore();
    const layaway = store.layaways.find((l) => l.id === layawayId);
    if (!layaway) throw new Error('El apartado ya no existe.');
    if (layaway.status !== 'abierto') throw new Error(`Este apartado ya está ${layaway.status}.`);

    const lastMethod = layaway.payments.at(-1)?.method ?? 'Efectivo';
    const saleId = store.nextSaleId++;
    const saleItems = layaway.items.map((it) => ({
      id: store.nextSaleItemId++,
      saleId,
      productId: it.productId,
      productName: it.productName,
      qty: it.qty,
      unitPrice: it.unitPrice,
      unitCost: it.unitCost,
    }));

    store.sales.push({
      id: saleId,
      date: new Date().toISOString(),
      total: layaway.total,
      totalCost: layaway.totalCost,
      profit: layaway.total - layaway.totalCost,
      paymentMethod: lastMethod,
      note: layaway.note,
      customerId: layaway.customerId,
      customerName: layaway.customerName,
      items: saleItems,
    });

    layaway.status = 'completado';
    setStore(store);
    return saleId;
  }

  const { data, error } = await supabase.rpc('complete_layaway', { p_layaway_id: layawayId });
  if (error) throw new Error(error.message);
  return data as number;
}

/** Cancela un apartado abierto y repone el stock reservado. */
export async function cancelLayaway(layawayId: number): Promise<void> {
  if (!isSupabaseConfigured) {
    const store = getStore();
    const layaway = store.layaways.find((l) => l.id === layawayId);
    if (!layaway) throw new Error('El apartado ya no existe.');
    if (layaway.status !== 'abierto') throw new Error(`Este apartado ya está ${layaway.status}.`);

    for (const item of layaway.items) {
      if (item.productId != null) {
        const product = store.products.find((p) => p.id === item.productId);
        if (product) {
          product.stock += item.qty;
          product.updatedAt = new Date().toISOString();
        }
      }
    }
    layaway.status = 'cancelado';
    setStore(store);
    return;
  }

  const { error } = await supabase.rpc('cancel_layaway', { p_layaway_id: layawayId });
  if (error) throw new Error(error.message);
}
