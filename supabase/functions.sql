-- Moon Sport — funciones de negocio (RPC)
-- Correr después de schema.sql en el SQL Editor del proyecto.
--
-- Todos los parámetros usan el prefijo p_ para que nunca choquen por
-- nombre con una columna de la tabla que insertan/actualizan — en
-- PL/pgSQL, un parámetro con el mismo nombre que una columna dentro de
-- un INSERT/UPDATE es ambiguo y Postgres lo rechaza en tiempo de
-- ejecución.

-- Registra una venta completa (renglones + descuento de stock) de forma
-- atómica. `p_items` es un arreglo [{"product_id": 1, "qty": 2}, ...].
-- Los precios se toman del catálogo actual, no del cliente.
create or replace function register_sale(
  p_items jsonb,
  p_payment_method text,
  p_note text default null,
  p_customer_id bigint default null,
  p_customer_name text default null
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_id bigint;
  v_total numeric := 0;
  v_total_cost numeric := 0;
  item jsonb;
  v_product products%rowtype;
  v_qty integer;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta necesita al menos un producto.';
  end if;

  insert into sales (date, total, total_cost, profit, payment_method, note, customer_id, customer_name)
  values (now(), 0, 0, 0, p_payment_method, nullif(trim(coalesce(p_note, '')), ''), p_customer_id, p_customer_name)
  returning id into v_sale_id;

  for item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (item->>'qty')::integer;

    select * into v_product from products
      where id = (item->>'product_id')::bigint
      for update;

    if not found then
      raise exception 'El producto % ya no existe.', item->>'product_id';
    end if;
    if v_qty <= 0 then
      raise exception 'Cantidad inválida para %.', v_product.name;
    end if;
    if v_product.stock < v_qty then
      raise exception 'Stock insuficiente para %: quedan %.', v_product.name, v_product.stock;
    end if;

    insert into sale_items (sale_id, product_id, product_name, qty, unit_price, unit_cost)
    values (v_sale_id, v_product.id, v_product.name, v_qty, v_product.sell_price, v_product.cost_price);

    update products set stock = stock - v_qty, updated_at = now() where id = v_product.id;

    v_total := v_total + v_product.sell_price * v_qty;
    v_total_cost := v_total_cost + v_product.cost_price * v_qty;
  end loop;

  update sales set total = v_total, total_cost = v_total_cost, profit = v_total - v_total_cost
  where id = v_sale_id;

  return v_sale_id;
end;
$$;

-- Borra una venta y repone el stock de sus renglones.
create or replace function delete_sale(p_sale_id bigint) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item record;
begin
  for item in select product_id, qty from sale_items where sale_id = p_sale_id loop
    if item.product_id is not null then
      update products set stock = stock + item.qty, updated_at = now() where id = item.product_id;
    end if;
  end loop;
  delete from sale_items where sale_id = p_sale_id;
  delete from sales where id = p_sale_id;
end;
$$;

-- Resumen de ingresos/costos/ganancia desde una fecha (para Dashboard/Reportes).
create or replace function get_period_summary(p_since timestamptz)
returns table (
  revenue numeric,
  cost numeric,
  gross_profit numeric,
  sales_count bigint
)
language sql
stable
set search_path = public
as $$
  select coalesce(sum(total), 0) as revenue,
         coalesce(sum(total_cost), 0) as cost,
         coalesce(sum(total), 0) - coalesce(sum(total_cost), 0) as gross_profit,
         count(*) as sales_count
  from sales where date >= p_since;
$$;

-- Productos más vendidos desde una fecha.
create or replace function get_top_products(p_since timestamptz, p_limit integer default 5)
returns table (
  product_name text,
  qty_sold bigint,
  revenue numeric
)
language sql
stable
set search_path = public
as $$
  select si.product_name,
         sum(si.qty) as qty_sold,
         sum(si.qty * si.unit_price) as revenue
  from sale_items si
  join sales s on s.id = si.sale_id
  where s.date >= p_since
  group by si.product_name
  order by qty_sold desc
  limit p_limit;
$$;

-- Registra una compra (renglones + aumento de stock) de forma atómica.
-- `p_items` es [{"product_id": 1, "qty": 5, "unit_cost": 100}, ...].
-- Si `p_update_cost` es true, el costo del producto se actualiza al
-- último costo de compra.
create or replace function register_purchase(
  p_items jsonb,
  p_supplier text default null,
  p_note text default null,
  p_update_cost boolean default true
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purchase_id bigint;
  v_total_cost numeric := 0;
  item jsonb;
  v_product products%rowtype;
  v_qty integer;
  v_unit_cost numeric;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'La compra necesita al menos un producto.';
  end if;

  insert into purchases (date, supplier, note, total_cost)
  values (now(), nullif(trim(coalesce(p_supplier, '')), ''), nullif(trim(coalesce(p_note, '')), ''), 0)
  returning id into v_purchase_id;

  for item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (item->>'qty')::integer;
    v_unit_cost := (item->>'unit_cost')::numeric;

    select * into v_product from products
      where id = (item->>'product_id')::bigint
      for update;

    if not found then
      raise exception 'El producto % ya no existe.', item->>'product_id';
    end if;
    if v_qty <= 0 then
      raise exception 'Cantidad inválida para %.', v_product.name;
    end if;

    insert into purchase_items (purchase_id, product_id, product_name, qty, unit_cost)
    values (v_purchase_id, v_product.id, v_product.name, v_qty, v_unit_cost);

    update products set
      stock = stock + v_qty,
      cost_price = case when p_update_cost then v_unit_cost else cost_price end,
      updated_at = now()
    where id = v_product.id;

    v_total_cost := v_total_cost + v_unit_cost * v_qty;
  end loop;

  update purchases set total_cost = v_total_cost where id = v_purchase_id;

  return v_purchase_id;
end;
$$;

-- Crea un apartado: reserva stock (igual que una venta) y registra el
-- primer abono si viene con depósito.
create or replace function create_layaway(
  p_items jsonb,
  p_customer_id bigint default null,
  p_customer_name text default null,
  p_deposit numeric default 0,
  p_payment_method text default 'Efectivo',
  p_note text default null
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_layaway_id bigint;
  v_total numeric := 0;
  v_total_cost numeric := 0;
  item jsonb;
  v_product products%rowtype;
  v_qty integer;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'El apartado necesita al menos un producto.';
  end if;

  insert into layaways (date, customer_id, customer_name, status, total, total_cost, deposit, note)
  values (now(), p_customer_id, p_customer_name, 'abierto', 0, 0, 0,
          nullif(trim(coalesce(p_note, '')), ''))
  returning id into v_layaway_id;

  for item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (item->>'qty')::integer;

    select * into v_product from products
      where id = (item->>'product_id')::bigint
      for update;

    if not found then
      raise exception 'El producto % ya no existe.', item->>'product_id';
    end if;
    if v_qty <= 0 then
      raise exception 'Cantidad inválida para %.', v_product.name;
    end if;
    if v_product.stock < v_qty then
      raise exception 'Stock insuficiente para %: quedan %.', v_product.name, v_product.stock;
    end if;

    insert into layaway_items (layaway_id, product_id, product_name, qty, unit_price, unit_cost)
    values (v_layaway_id, v_product.id, v_product.name, v_qty, v_product.sell_price, v_product.cost_price);

    update products set stock = stock - v_qty, updated_at = now() where id = v_product.id;

    v_total := v_total + v_product.sell_price * v_qty;
    v_total_cost := v_total_cost + v_product.cost_price * v_qty;
  end loop;

  update layaways set total = v_total, total_cost = v_total_cost where id = v_layaway_id;

  if p_deposit > 0 then
    insert into layaway_payments (layaway_id, date, amount, method)
    values (v_layaway_id, now(), p_deposit, p_payment_method);
    update layaways set deposit = deposit + p_deposit where id = v_layaway_id;
  end if;

  return v_layaway_id;
end;
$$;

-- Agrega un abono a un apartado abierto.
create or replace function add_layaway_payment(
  p_layaway_id bigint,
  p_amount numeric,
  p_method text default 'Efectivo'
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_amount <= 0 then
    raise exception 'El abono debe ser mayor a cero.';
  end if;

  insert into layaway_payments (layaway_id, date, amount, method)
  values (p_layaway_id, now(), p_amount, p_method);

  update layaways set deposit = deposit + p_amount where id = p_layaway_id;
end;
$$;

-- Marca un apartado como completado y lo convierte en una venta real
-- (sin volver a tocar stock, ya se reservó al crearlo).
create or replace function complete_layaway(p_layaway_id bigint) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_layaway layaways%rowtype;
  v_sale_id bigint;
  v_last_method text;
begin
  select * into v_layaway from layaways where id = p_layaway_id for update;
  if not found then
    raise exception 'El apartado ya no existe.';
  end if;
  if v_layaway.status <> 'abierto' then
    raise exception 'Este apartado ya está %.', v_layaway.status;
  end if;

  select method into v_last_method from layaway_payments
    where layaway_id = p_layaway_id order by date desc limit 1;

  insert into sales (date, total, total_cost, profit, payment_method, note, customer_id, customer_name)
  values (now(), v_layaway.total, v_layaway.total_cost, v_layaway.total - v_layaway.total_cost,
          coalesce(v_last_method, 'Efectivo'), v_layaway.note, v_layaway.customer_id, v_layaway.customer_name)
  returning id into v_sale_id;

  insert into sale_items (sale_id, product_id, product_name, qty, unit_price, unit_cost)
  select v_sale_id, product_id, product_name, qty, unit_price, unit_cost
  from layaway_items where layaway_id = p_layaway_id;

  update layaways set status = 'completado' where id = p_layaway_id;

  return v_sale_id;
end;
$$;

-- Cancela un apartado abierto y repone el stock reservado.
create or replace function cancel_layaway(p_layaway_id bigint) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  item record;
begin
  select status into v_status from layaways where id = p_layaway_id for update;
  if not found then
    raise exception 'El apartado ya no existe.';
  end if;
  if v_status <> 'abierto' then
    raise exception 'Este apartado ya está %.', v_status;
  end if;

  for item in select product_id, qty from layaway_items where layaway_id = p_layaway_id loop
    if item.product_id is not null then
      update products set stock = stock + item.qty, updated_at = now() where id = item.product_id;
    end if;
  end loop;

  update layaways set status = 'cancelado' where id = p_layaway_id;
end;
$$;

revoke all on function register_sale(jsonb, text, text, bigint, text) from public;
revoke all on function delete_sale(bigint) from public;
revoke all on function get_period_summary(timestamptz) from public;
revoke all on function get_top_products(timestamptz, integer) from public;
revoke all on function register_purchase(jsonb, text, text, boolean) from public;
revoke all on function create_layaway(jsonb, bigint, text, numeric, text, text) from public;
revoke all on function add_layaway_payment(bigint, numeric, text) from public;
revoke all on function complete_layaway(bigint) from public;
revoke all on function cancel_layaway(bigint) from public;

grant execute on function register_sale(jsonb, text, text, bigint, text) to authenticated;
grant execute on function delete_sale(bigint) to authenticated;
grant execute on function get_period_summary(timestamptz) to authenticated;
grant execute on function get_top_products(timestamptz, integer) to authenticated;
grant execute on function register_purchase(jsonb, text, text, boolean) to authenticated;
grant execute on function create_layaway(jsonb, bigint, text, numeric, text, text) to authenticated;
grant execute on function add_layaway_payment(bigint, numeric, text) to authenticated;
grant execute on function complete_layaway(bigint) to authenticated;
grant execute on function cancel_layaway(bigint) to authenticated;
