// Edge Function: respaldo diario de Moon Sport.
// Lee todas las tablas, arma un JSON y lo sube al bucket privado
// "backups". Se invoca por el cron programado en supabase/cron.sql,
// pero también puede llamarse a mano desde el dashboard para probarla.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const BUCKET = 'backups';
const KEEP_DAYS = 60;
const TABLES = [
  'products',
  'sales',
  'sale_items',
  'customers',
  'layaways',
  'layaway_items',
  'layaway_payments',
  'business_settings',
] as const;

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const results = await Promise.all(TABLES.map((table) => supabase.from(table).select('*')));

  const backup: Record<string, unknown> = {};
  for (let i = 0; i < TABLES.length; i++) {
    const res = results[i];
    if (res.error) {
      return new Response(
        JSON.stringify({ ok: false, table: TABLES[i], error: res.error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    backup[TABLES[i]] = res.data;
  }

  const now = new Date();
  const dateKey = now.toISOString().slice(0, 10); // YYYY-MM-DD
  backup.generated_at = now.toISOString();

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(`${dateKey}.json`, JSON.stringify(backup, null, 2), {
      contentType: 'application/json',
      upsert: true,
    });

  if (uploadError) {
    return new Response(JSON.stringify({ ok: false, error: uploadError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Poda respaldos viejos.
  const { data: files } = await supabase.storage.from(BUCKET).list();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - KEEP_DAYS);

  const stale = (files ?? [])
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f.name))
    .filter((f) => new Date(f.name.replace('.json', '')) < cutoff)
    .map((f) => f.name);

  if (stale.length > 0) {
    await supabase.storage.from(BUCKET).remove(stale);
  }

  return new Response(
    JSON.stringify({ ok: true, file: `${dateKey}.json`, pruned: stale.length }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
