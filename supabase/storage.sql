-- Moon Sport — bucket privado para los respaldos diarios.
-- Correr una vez en el SQL Editor (o crear el bucket "backups" a mano
-- desde Storage en el dashboard, marcado como privado).

insert into storage.buckets (id, name, public)
values ('backups', 'backups', false)
on conflict (id) do nothing;

-- Sin políticas adicionales: por defecto nadie (ni authenticated) puede
-- leer/escribir en un bucket privado salvo con la service_role key, que
-- es justo lo que usa la Edge Function de respaldo. Para revisar o
-- bajar un respaldo, hazlo desde Storage en el dashboard de Supabase.

-- Bucket público para fotos de producto (se muestran directo en la app).
insert into storage.buckets (id, name, public)
values ('product-photos', 'product-photos', true)
on conflict (id) do nothing;

create policy "public read product photos" on storage.objects
  for select using (bucket_id = 'product-photos');
create policy "authenticated upload product photos" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-photos');
create policy "authenticated update product photos" on storage.objects
  for update to authenticated using (bucket_id = 'product-photos');
create policy "authenticated delete product photos" on storage.objects
  for delete to authenticated using (bucket_id = 'product-photos');
