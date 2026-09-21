import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { getStore, setStore } from './mockStore';
import type { BusinessSettings } from '../types';

export async function getBusinessSettings(): Promise<BusinessSettings> {
  if (!isSupabaseConfigured) {
    return { ...getStore().settings };
  }
  const { data, error } = await supabase
    .from('business_settings')
    .select('monthly_goal')
    .single();
  if (error) throw error;
  return { monthlyGoal: data.monthly_goal };
}

export async function updateBusinessSettings(input: BusinessSettings): Promise<void> {
  if (!isSupabaseConfigured) {
    const store = getStore();
    store.settings = { ...input };
    setStore(store);
    return;
  }
  const { error } = await supabase
    .from('business_settings')
    .update({ monthly_goal: input.monthlyGoal })
    .eq('id', true);
  if (error) throw error;
}
