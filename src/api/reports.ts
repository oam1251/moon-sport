import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { getStore } from './mockStore';
import type { PeriodKey, PeriodSummary, TopProduct } from '../types';

/** Devuelve el inicio (00:00:00) del periodo solicitado, en ISO. */
export function periodStart(period: PeriodKey): string {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (period === 'week') {
    // Lunes como inicio de semana.
    const day = start.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    start.setDate(start.getDate() + diff);
  } else if (period === 'month') {
    start.setDate(1);
  }
  return start.toISOString();
}

export async function getPeriodSummary(period: PeriodKey): Promise<PeriodSummary> {
  const since = periodStart(period);

  if (!isSupabaseConfigured) {
    const store = getStore();
    const sales = store.sales.filter((s) => s.date >= since);
    const revenue = sales.reduce((s, sale) => s + sale.total, 0);
    const cost = sales.reduce((s, sale) => s + sale.totalCost, 0);
    return {
      revenue,
      cost,
      grossProfit: revenue - cost,
      salesCount: sales.length,
    };
  }

  const { data, error } = await supabase.rpc('get_period_summary', { p_since: since }).single();
  if (error) throw error;
  const row = data as any;
  return {
    revenue: row.revenue,
    cost: row.cost,
    grossProfit: row.gross_profit,
    salesCount: row.sales_count,
  };
}

export async function getTopProducts(period: PeriodKey, limit = 5): Promise<TopProduct[]> {
  const since = periodStart(period);

  if (!isSupabaseConfigured) {
    const store = getStore();
    const totals = new Map<string, { qtySold: number; revenue: number }>();
    for (const sale of store.sales) {
      if (sale.date < since) continue;
      for (const item of sale.items) {
        const entry = totals.get(item.productName) ?? { qtySold: 0, revenue: 0 };
        entry.qtySold += item.qty;
        entry.revenue += item.qty * item.unitPrice;
        totals.set(item.productName, entry);
      }
    }
    return Array.from(totals.entries())
      .map(([productName, t]) => ({ productName, ...t }))
      .sort((a, b) => b.qtySold - a.qtySold)
      .slice(0, limit);
  }

  const { data, error } = await supabase.rpc('get_top_products', {
    p_since: since,
    p_limit: limit,
  });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    productName: row.product_name,
    qtySold: row.qty_sold,
    revenue: row.revenue,
  }));
}
