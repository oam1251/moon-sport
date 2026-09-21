import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { getStore, setStore } from './mockStore';
import type { Purchase, PurchaseItem, PurchaseLine } from '../types';

function mapPurchaseRow(row: any): Omit<Purchase, 'items'> {
  return {
    id: row.id,
    date: row.date,
    supplier: row.supplier,
    note: row.note,
    totalCost: row.total_cost,
  };
}

function mapItemRow(row: any): PurchaseItem {
  return {
    id: row.id,
    purchaseId: row.purchase_id,
    productId: row.product_id,
    productName: row.product_name,
    qty: row.qty,
    unitCost: row.unit_cost,
  };
}

export async function listPurchases(limit = 100): Promise<Purchase[]> {
  if (!isSupabaseConfigured) {
    return [...getStore().purchases].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, limit);
  }

  const { data: purchaseRows, error } = await supabase
    .from('purchases')
    .select('*')
    .order('date', { ascending: false })
    .limit(limit);
  if (error) throw error;

  const purchases = (purchaseRows ?? []).map(mapPurchaseRow);
  if (purchases.length === 0) return [];

  const ids = purchases.map((p) => p.id);
  const { data: itemRows, error: itemsError } = await supabase
    .from('purchase_items')
    .select('*')
    .in('purchase_id', ids);
  if (itemsError) throw itemsError;

  const items = (itemRows ?? []).map(mapItemRow);
  return purchases.map((purchase) => ({
    ...purchase,
    items: items.filter((it) => it.purchaseId === purchase.id),
  }));
}

export interface NewPurchaseInput {
  lines: PurchaseLine[];
  supplier?: string;
  note?: string;
  updateCost: boolean;
}

/**
 * Registra una compra completa (renglones + aumento de stock) de forma
 * atómica en `register_purchase` de Postgres (ver supabase/functions.sql).
 */
export async function registerPurchase(input: NewPurchaseInput): Promise<number> {
  if (input.lines.length === 0) {
    throw new Error('La compra necesita al menos un producto.');
  }

  if (!isSupabaseConfigured) {
    const store = getStore();

    for (const line of input.lines) {
      if (line.qty <= 0) throw new Error(`Cantidad inválida para ${line.product.name}.`);
    }

    const purchaseId = store.nextPurchaseId++;
    const items: PurchaseItem[] = input.lines.map((line) => {
      const product = store.products.find((p) => p.id === line.product.id);
      if (!product) throw new Error(`El producto ${line.product.name} ya no existe.`);
      product.stock += line.qty;
      if (input.updateCost) product.costPrice = line.unitCost;
      product.updatedAt = new Date().toISOString();
      return {
        id: store.nextPurchaseItemId++,
        purchaseId,
        productId: product.id,
        productName: product.name,
        qty: line.qty,
        unitCost: line.unitCost,
      };
    });

    const totalCost = items.reduce((s, it) => s + it.unitCost * it.qty, 0);

    store.purchases.push({
      id: purchaseId,
      date: new Date().toISOString(),
      supplier: input.supplier?.trim() || null,
      note: input.note?.trim() || null,
      totalCost,
      items,
    });

    setStore(store);
    return purchaseId;
  }

  const items = input.lines.map((l) => ({
    product_id: l.product.id,
    qty: l.qty,
    unit_cost: l.unitCost,
  }));

  const { data, error } = await supabase.rpc('register_purchase', {
    p_items: items,
    p_supplier: input.supplier?.trim() || null,
    p_note: input.note?.trim() || null,
    p_update_cost: input.updateCost,
  });
  if (error) throw new Error(error.message);
  return data as number;
}
