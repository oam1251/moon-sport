-- Moon Sport — programación del respaldo diario.
-- Correr en el SQL Editor DESPUÉS de desplegar la función
-- (supabase functions deploy daily-backup).
--
-- Reemplaza los dos valores marcados abajo antes de ejecutar:
--   <PROJECT-REF>         -- lo ves en la URL del dashboard o en Settings > General
--   <SERVICE-ROLE-KEY>    -- Settings > API > service_role (secreta, no la anon key)

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'moon-sport-daily-backup',
  '0 8 * * *', -- 08:00 UTC todos los días; ajusta la hora a tu gusto
  $$
  select net.http_post(
    url := 'https://<PROJECT-REF>.supabase.co/functions/v1/daily-backup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SERVICE-ROLE-KEY>'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Para revisar los respaldos programados:
--   select * from cron.job;
-- Para quitar el respaldo automático:
--   select cron.unschedule('moon-sport-daily-backup');
