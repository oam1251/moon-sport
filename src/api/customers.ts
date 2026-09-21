import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { getStore, setStore } from './mockStore';
import type { Customer, CustomerInput } from '../types';

function mapRow(row: any): Customer {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    note: row.note,
    createdAt: row.created_at,
  };
}

export async function listCustomers(): Promise<Customer[]> {
  if (!isSupabaseConfigured) {
    return [...getStore().customers].sort((a, b) => a.name.localeCompare(b.name));
  }
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function getCustomer(id: number): Promise<Customer | null> {
  if (!isSupabaseConfigured) {
    return getStore().customers.find((c) => c.id === id) ?? null;
  }
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

export async function createCustomer(input: CustomerInput): Promise<number> {
  if (!isSupabaseConfigured) {
    const store = getStore();
    const id = store.nextCustomerId++;
    store.customers.push({
      id,
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      note: input.note?.trim() || null,
      createdAt: new Date().toISOString(),
    });
    setStore(store);
    return id;
  }

  const { data, error } = await supabase
    .from('customers')
    .insert({
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      note: input.note?.trim() || null,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateCustomer(id: number, input: CustomerInput): Promise<void> {
  if (!isSupabaseConfigured) {
    const store = getStore();
    const customer = store.customers.find((c) => c.id === id);
    if (!customer) throw new Error('Cliente no encontrado.');
    Object.assign(customer, {
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      note: input.note?.trim() || null,
    });
    setStore(store);
    return;
  }

  const { error } = await supabase
    .from('customers')
    .update({
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      note: input.note?.trim() || null,
    })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteCustomer(id: number): Promise<void> {
  if (!isSupabaseConfigured) {
    const store = getStore();
    store.customers = store.customers.filter((c) => c.id !== id);
    setStore(store);
    return;
  }
  const { error } = await supabase.from('customers').delete().eq('id', id);
  if (error) throw error;
}
