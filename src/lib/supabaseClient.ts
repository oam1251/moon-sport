import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Sin credenciales configuradas (.env.local vacío/ausente), la app usa
 * datos de ejemplo en memoria en vez de Supabase — ver src/api/mockStore.ts.
 * En cuanto se configuren VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY, pasa
 * a usar datos reales sin tocar nada más.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key'
);
