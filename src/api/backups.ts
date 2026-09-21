import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { getStore } from './mockStore';

/**
 * Arma un respaldo completo (todas las tablas tal cual están en la
 * base) y lo descarga como un archivo .json al dispositivo.
 * Independiente del respaldo automático diario en Storage — para que
 * la dueña pueda guardar una copia cuando quiera, sin depender del cron.
 */
export async function downloadBackup(): Promise<void> {
  let backup: Record<string, unknown>;

  if (!isSupabaseConfigured) {
    const store = getStore();
    backup = {
      generated_at: new Date().toISOString(),
      products: store.products,
      sales: store.sales.map(({ items, ...sale }) => sale),
      sale_items: store.sales.flatMap((s) => s.items),
      customers: store.customers,
      purchases: store.purchases.map(({ items, ...purchase }) => purchase),
      purchase_items: store.purchases.flatMap((p) => p.items),
      layaways: store.layaways.map(({ items, payments, ...layaway }) => layaway),
      layaway_items: store.layaways.flatMap((l) => l.items),
      layaway_payments: store.layaways.flatMap((l) => l.payments),
      business_settings: store.settings,
    };
  } else {
    const [
      products,
      sales,
      saleItems,
      customers,
      purchases,
      purchaseItems,
      layaways,
      layawayItems,
      layawayPayments,
      businessSettings,
    ] = await Promise.all([
      supabase.from('products').select('*'),
      supabase.from('sales').select('*'),
      supabase.from('sale_items').select('*'),
      supabase.from('customers').select('*'),
      supabase.from('purchases').select('*'),
      supabase.from('purchase_items').select('*'),
      supabase.from('layaways').select('*'),
      supabase.from('layaway_items').select('*'),
      supabase.from('layaway_payments').select('*'),
      supabase.from('business_settings').select('*'),
    ]);

    for (const res of [
      products,
      sales,
      saleItems,
      customers,
      purchases,
      purchaseItems,
      layaways,
      layawayItems,
      layawayPayments,
      businessSettings,
    ]) {
      if (res.error) throw res.error;
    }

    backup = {
      generated_at: new Date().toISOString(),
      products: products.data,
      sales: sales.data,
      sale_items: saleItems.data,
      customers: customers.data,
      purchases: purchases.data,
      purchase_items: purchaseItems.data,
      layaways: layaways.data,
      layaway_items: layawayItems.data,
      layaway_payments: layawayPayments.data,
      business_settings: businessSettings.data,
    };
  }

  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateKey = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `moon-sport-respaldo-${dateKey}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
