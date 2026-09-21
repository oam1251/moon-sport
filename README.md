# Moon Sport — App de inventario, ventas y apartados

Web app para que la dueña de Moon Sport controle su inventario,
registre ventas, apartados y compras, y vea de un vistazo cuánto está
ganando. Se abre desde cualquier navegador (celular, tablet o
computadora) — no requiere tiendas de apps ni instalación — y se puede
"agregar a la pantalla de inicio" del celular para que se sienta como
una app.

Hecha con **React + Vite** en el frontend y **Supabase** (Postgres +
Auth + Storage) como backend, para que los datos vivan en la nube y no
dependan de un solo celular, con **respaldos diarios automáticos**.

## Qué incluye esta versión

- **Inicio**: resumen del día y del mes (ventas, ganancia), barra de
  progreso hacia la meta mensual, y alertas de productos con poco stock.
- **Inventario**: alta, edición y baja de productos (nombre, categoría,
  talla, color, SKU, foto, costo, precio de venta, existencias y
  mínimo de stock). Búsqueda rápida.
- **Compras**: registrar entradas de mercancía (proveedor, cantidad y
  costo por producto), que aumentan el stock y opcionalmente
  actualizan el costo del producto.
- **Ventas**: registrar una venta o un **apartado** (layaway) eligiendo
  productos y cantidades; se calcula automáticamente el total y la
  ganancia, se descuenta el stock solo, y se puede compartir el ticket
  por WhatsApp. Los apartados llevan su propio historial de abonos y
  se convierten en venta al completarse.
- **Clientes**: contacto básico (nombre, teléfono) para asociar a
  ventas y apartados.
- **Reportes**: comparativo de ingresos, costo de mercancía y ganancia
  por día/semana/mes, y los productos más vendidos.
- **Ajustes**: meta de ventas del mes, gestión de clientes, y descarga
  de un respaldo manual en cualquier momento (además del respaldo
  automático diario). Solo se llega aquí desde el ícono de engrane en
  Inicio.

## 1. Crear el proyecto de Supabase (una sola vez)

1. Crea una cuenta y un proyecto nuevo en [supabase.com](https://supabase.com).
2. Ve a **SQL Editor** y corre, en este orden, el contenido de:
   - `supabase/schema.sql` (tablas + seguridad)
   - `supabase/functions.sql` (ventas, apartados, compras, reportes)
   - `supabase/storage.sql` (buckets de respaldos y fotos de producto)
3. Ve a **Authentication → Users** y crea manualmente el usuario de la
   dueña (correo + contraseña). Es el único login que necesita la app.
4. Ve a **Settings → API** y copia:
   - `Project URL` → será `VITE_SUPABASE_URL`
   - `anon public` key → será `VITE_SUPABASE_ANON_KEY`

## 2. Configurar y correr la app en tu máquina

Necesitas [Node.js](https://nodejs.org) 20 o más reciente.

```bash
cd ~/Proyectos/Oz/moon-sport
npm install
cp .env.example .env.local
```

Abre `.env.local` y pega ahí la URL y la anon key del paso anterior.
Luego:

```bash
npm run dev
```

Abre la URL que aparece en la terminal (normalmente
`http://localhost:5173`) e inicia sesión con el usuario que creaste.

Si `.env.local` no existe o está vacío, la app arranca igual pero con
datos de ejemplo guardados en el navegador (sin login) — útil para
probar o presentar sin tener el backend listo (ver `src/api/mockStore.ts`).

## 3. Respaldo diario automático

1. Instala el [CLI de Supabase](https://supabase.com/docs/guides/cli) y
   entra a tu proyecto (`supabase login`, `supabase link`).
2. Despliega la función de respaldo:

   ```bash
   supabase functions deploy daily-backup
   ```

3. En el **SQL Editor**, abre `supabase/cron.sql`, reemplaza
   `<PROJECT-REF>` (lo ves en la URL del dashboard) y
   `<SERVICE-ROLE-KEY>` (Settings → API → `service_role`, es secreta)
   y corre el archivo. Esto programa la función para correr todos los
   días a las 08:00 UTC (ajusta la hora dentro del archivo si quieres).

Cada respaldo queda en **Storage → backups** como un archivo
`YYYY-MM-DD.json` con todas las tablas; se guardan los últimos 60 días.
Desde **Ajustes** en la app, la dueña también puede descargar un
respaldo manual a su dispositivo cuando quiera (a Drive, correo, etc.),
sin depender del cron.

## 4. Publicar el sitio

Sube este repo a GitHub y conéctalo a **Vercel**, **Netlify** o
**Cloudflare Pages** (cualquiera funciona sin configuración extra: el
comando de build es `npm run build`, la carpeta de salida `dist/`).
En el panel del hosting, agrega las mismas dos variables de entorno
(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) que usaste en
`.env.local`.

Una vez publicado, la dueña abre la URL desde su celular y puede
"Agregar a pantalla de inicio" para que quede como un ícono más, igual
que una app instalada.

## Estructura del proyecto

```text
index.html, vite.config.ts        Configuración de Vite (+ PWA)
supabase/
  schema.sql                      Tablas y seguridad (RLS)
  functions.sql                   Funciones de negocio (ventas, apartados, compras, reportes)
  storage.sql                     Buckets de respaldos y fotos de producto
  cron.sql                        Programación del respaldo diario
  functions/daily-backup/         Edge Function del respaldo
src/
  lib/supabaseClient.ts           Cliente de Supabase (o modo sin backend)
  context/AuthContext.tsx         Sesión de la dueña
  api/                            products, sales, layaways, purchases, customers, reports, settings, backups
  api/mockStore.ts                Datos de ejemplo cuando no hay Supabase configurado
  types/                          Tipos de datos (Producto, Venta, Apartado, Cliente, etc.)
  styles/global.css               Paleta y estilos (marca Moon Sport)
  components/                     Piezas reutilizables (botones, tarjetas, badges, etc.)
  pages/                          Cada pantalla (Inicio, Inventario, Compras, Ventas, Apartados, Clientes, Reportes, Ajustes)
public/                           Ícono y logo de Moon Sport (favicon + PWA)
```

## Ideas para cuando la app crezca

- Cuentas de usuario si hay más de una persona vendiendo (ya con
  Supabase Auth es cuestión de crear más usuarios).
- Código de barras / QR para dar de alta y vender productos más rápido
  (la cámara del celular es accesible desde el navegador).
- Exportar reportes a Excel/PDF para compartir con un contador.
- Notificaciones (recordatorio de apartados por vencer, stock bajo).

Ninguno de estos cambios rompe lo que ya está construido: los datos y
las funciones de negocio ya viven en Supabase, organizados para poder
agregarlos después.
