-- Moon Sport — esquema de base de datos
-- Correr esto una vez en el SQL Editor del proyecto de Supabase.

create table if not exists products (
  id bigint generated always as identity primary key,
  name text not null,
  category text not null default 'General',
  size text,
  color text,
  sku text,
  cost_price numeric not null default 0,
  sell_price numeric not null default 0,
  stock integer not null default 0,
  min_stock integer not null default 3,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists customers (
  id bigint generated always as identity primary key,
  name text not null,
  phone text,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists sales (
  id bigint generated always as identity primary key,
  date timestamptz not null default now(),
  total numeric not null default 0,
  total_cost numeric not null default 0,
  profit numeric not null default 0,
  payment_method text not null default 'Efectivo',
  note text,
  customer_id bigint references customers(id) on delete set null,
  customer_name text
);

create table if not exists sale_items (
  id bigint generated always as identity primary key,
  sale_id bigint not null references sales(id) on delete cascade,
  product_id bigint references products(id) on delete set null,
  product_name text not null,
  qty integer not null,
  unit_price numeric not null,
  unit_cost numeric not null
);

alter table products add column if not exists photo_url text;

create table if not exists purchases (
  id bigint generated always as identity primary key,
  date timestamptz not null default now(),
  supplier text,
  note text,
  total_cost numeric not null default 0
);

create table if not exists purchase_items (
  id bigint generated always as identity primary key,
  purchase_id bigint not null references purchases(id) on delete cascade,
  product_id bigint not null references products(id) on delete cascade,
  product_name text not null,
  qty integer not null,
  unit_cost numeric not null
);

create table if not exists layaways (
  id bigint generated always as identity primary key,
  date timestamptz not null default now(),
  customer_id bigint references customers(id) on delete set null,
  customer_name text,
  status text not null default 'abierto', -- abierto | completado | cancelado
  total numeric not null default 0,
  total_cost numeric not null default 0,
  deposit numeric not null default 0,
  note text
);

create table if not exists layaway_items (
  id bigint generated always as identity primary key,
  layaway_id bigint not null references layaways(id) on delete cascade,
  product_id bigint references products(id) on delete set null,
  product_name text not null,
  qty integer not null,
  unit_price numeric not null,
  unit_cost numeric not null
);

create table if not exists layaway_payments (
  id bigint generated always as identity primary key,
  layaway_id bigint not null references layaways(id) on delete cascade,
  date timestamptz not null default now(),
  amount numeric not null,
  method text not null default 'Efectivo'
);

create table if not exists business_settings (
  id boolean primary key default true,
  monthly_goal numeric not null default 0,
  constraint business_settings_singleton check (id)
);
insert into business_settings (id, monthly_goal)
values (true, 0)
on conflict (id) do nothing;

create index if not exists idx_sales_date on sales(date);
create index if not exists idx_sale_items_sale_id on sale_items(sale_id);
create index if not exists idx_purchase_items_purchase_id on purchase_items(purchase_id);
create index if not exists idx_layaway_items_layaway_id on layaway_items(layaway_id);
create index if not exists idx_layaway_payments_layaway_id on layaway_payments(layaway_id);
create index if not exists idx_layaways_status on layaways(status);

-- RLS: negocio de un solo usuario. Cualquier cuenta autenticada
-- (solo existe la de la dueña) puede leer y escribir todo.
alter table products enable row level security;
alter table sales enable row level security;
alter table sale_items enable row level security;
alter table customers enable row level security;
alter table purchases enable row level security;
alter table purchase_items enable row level security;
alter table layaways enable row level security;
alter table layaway_items enable row level security;
alter table layaway_payments enable row level security;
alter table business_settings enable row level security;

create policy "authenticated full access" on products
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on sales
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on sale_items
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on customers
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on purchases
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on purchase_items
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on layaways
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on layaway_items
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on layaway_payments
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on business_settings
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
