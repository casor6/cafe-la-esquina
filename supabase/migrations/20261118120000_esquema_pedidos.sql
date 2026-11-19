create type public.estado_pedido as enum ('recibido', 'preparando', 'listo', 'entregado');

create table public.categorias (
  id smallint generated always as identity primary key,
  nombre text not null unique,
  orden smallint not null default 0
);

create table public.productos (
  id integer generated always as identity primary key,
  categoria_id smallint not null references public.categorias (id),
  nombre text not null,
  detalle text not null default '',
  precio numeric(8, 2) not null check (precio >= 0),
  disponible boolean not null default true,
  orden smallint not null default 0
);

create index productos_categoria_idx on public.productos (categoria_id);

create table public.grupos_opciones (
  id smallint generated always as identity primary key,
  nombre text not null unique,
  obligatorio boolean not null default false
);

create table public.opciones (
  id integer generated always as identity primary key,
  grupo_id smallint not null references public.grupos_opciones (id) on delete cascade,
  nombre text not null,
  precio numeric(8, 2) not null default 0 check (precio >= 0),
  disponible boolean not null default true,
  orden smallint not null default 0
);

create index opciones_grupo_idx on public.opciones (grupo_id);

create table public.producto_grupos (
  producto_id integer not null references public.productos (id) on delete cascade,
  grupo_id smallint not null references public.grupos_opciones (id) on delete cascade,
  primary key (producto_id, grupo_id)
);

create index producto_grupos_grupo_idx on public.producto_grupos (grupo_id);

create table public.horarios (
  dia smallint primary key check (dia between 0 and 6),
  abre time not null,
  cierra time not null,
  check (cierra > abre)
);

create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  folio integer not null,
  nombre text not null,
  telefono text not null,
  recoger_a timestamptz not null,
  estado public.estado_pedido not null default 'recibido',
  total numeric(10, 2) not null default 0,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (fecha, folio)
);

create index pedidos_fecha_estado_idx on public.pedidos (fecha, estado);
create index pedidos_telefono_fecha_idx on public.pedidos (telefono, fecha);
create index pedidos_creado_idx on public.pedidos (creado_en);

create table public.pedido_articulos (
  id bigint generated always as identity primary key,
  pedido_id uuid not null references public.pedidos (id) on delete cascade,
  producto_id integer references public.productos (id) on delete set null,
  nombre text not null,
  opciones text[] not null default '{}',
  precio_unitario numeric(8, 2) not null,
  cantidad smallint not null check (cantidad between 1 and 20)
);

create index pedido_articulos_pedido_idx on public.pedido_articulos (pedido_id);
create index pedido_articulos_producto_idx on public.pedido_articulos (producto_id);

create table public.administradores (
  user_id uuid primary key references auth.users (id) on delete cascade
);

alter table public.categorias enable row level security;
alter table public.productos enable row level security;
alter table public.grupos_opciones enable row level security;
alter table public.opciones enable row level security;
alter table public.producto_grupos enable row level security;
alter table public.horarios enable row level security;
alter table public.pedidos enable row level security;
alter table public.pedido_articulos enable row level security;
alter table public.administradores enable row level security;

revoke all on
  public.categorias,
  public.productos,
  public.grupos_opciones,
  public.opciones,
  public.producto_grupos,
  public.horarios,
  public.pedidos,
  public.pedido_articulos,
  public.administradores
from anon, authenticated;

grant select on
  public.categorias,
  public.productos,
  public.grupos_opciones,
  public.opciones,
  public.producto_grupos,
  public.horarios
to anon, authenticated;

create policy "Catálogo visible para todos" on public.categorias for select to anon, authenticated using (true);
create policy "Catálogo visible para todos" on public.productos for select to anon, authenticated using (true);
create policy "Catálogo visible para todos" on public.grupos_opciones for select to anon, authenticated using (true);
create policy "Catálogo visible para todos" on public.opciones for select to anon, authenticated using (true);
create policy "Catálogo visible para todos" on public.producto_grupos for select to anon, authenticated using (true);
create policy "Catálogo visible para todos" on public.horarios for select to anon, authenticated using (true);

create function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.administradores where user_id = (select auth.uid())
  );
$$;

revoke all on function public.es_admin() from public, anon, authenticated;
grant execute on function public.es_admin() to authenticated;

grant select, update (estado) on public.pedidos to authenticated;
grant select on public.pedido_articulos to authenticated;

create policy "Administradores ven pedidos" on public.pedidos
  for select to authenticated using ((select public.es_admin()));

create policy "Administradores cambian estado" on public.pedidos
  for update to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

create policy "Administradores ven artículos" on public.pedido_articulos
  for select to authenticated using ((select public.es_admin()));

create function public.validar_cambio_estado()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_estados public.estado_pedido[] := enum_range(null::public.estado_pedido);
begin
  if new.estado is distinct from old.estado
     and abs(array_position(v_estados, new.estado) - array_position(v_estados, old.estado)) <> 1 then
    raise exception using errcode = 'P0001', message = 'cambio_de_estado_invalido';
  end if;
  new.actualizado_en := now();
  return new;
end;
$$;

revoke all on function public.validar_cambio_estado() from public, anon, authenticated;

create trigger pedidos_cambio_estado
  before update on public.pedidos
  for each row execute function public.validar_cambio_estado();

create function public.crear_pedido(
  p_nombre text,
  p_telefono text,
  p_hora time,
  p_articulos jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_zona constant text := 'America/Mexico_City';
  v_anticipacion constant interval := interval '15 minutes';
  v_cierre_pedidos constant interval := interval '30 minutes';
  v_ahora timestamp := now() at time zone v_zona;
  v_hoy date := (now() at time zone v_zona)::date;
  v_nombre text := btrim(regexp_replace(coalesce(p_nombre, ''), '\s+', ' ', 'g'));
  v_telefono text := regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g');
  v_horario public.horarios;
  v_recoger timestamp;
  v_pedido_id uuid;
  v_folio integer;
  v_total numeric(10, 2) := 0;
  v_item jsonb;
  v_producto public.productos;
  v_cantidad numeric;
  v_opcion_ids integer[];
  v_opciones_nombres text[];
  v_opciones_precio numeric;
  v_opciones_encontradas integer;
  v_grupos_distintos integer;
  v_faltantes integer;
begin
  if char_length(v_nombre) not between 2 and 60 then
    raise exception using errcode = 'P0001', message = 'nombre_invalido';
  end if;

  if v_telefono ~ '^52\d{10}$' then
    v_telefono := substr(v_telefono, 3);
  end if;
  if v_telefono !~ '^\d{10}$' then
    raise exception using errcode = 'P0001', message = 'telefono_invalido';
  end if;

  if p_articulos is null
     or jsonb_typeof(p_articulos) <> 'array'
     or jsonb_array_length(p_articulos) not between 1 and 30 then
    raise exception using errcode = 'P0001', message = 'articulos_invalidos';
  end if;

  select * into v_horario from public.horarios where dia = extract(dow from v_hoy)::smallint;
  if not found then
    raise exception using errcode = 'P0001', message = 'cerrado_hoy';
  end if;

  if p_hora is null
     or p_hora < v_horario.abre
     or p_hora > v_horario.cierra - v_cierre_pedidos
     or extract(minute from p_hora)::integer % 15 <> 0
     or extract(second from p_hora) <> 0 then
    raise exception using errcode = 'P0001', message = 'hora_fuera_de_horario';
  end if;

  v_recoger := v_hoy + p_hora;
  if v_recoger < v_ahora + v_anticipacion then
    raise exception using errcode = 'P0001', message = 'hora_muy_pronto';
  end if;

  if (
    select count(*) from public.pedidos
    where telefono = v_telefono and fecha = v_hoy and estado <> 'entregado'
  ) >= 3 then
    raise exception using errcode = 'P0001', message = 'demasiados_pedidos';
  end if;

  if (
    select count(*) from public.pedidos where creado_en > now() - interval '10 minutes'
  ) >= 40 then
    raise exception using errcode = 'P0001', message = 'saturado';
  end if;

  perform pg_advisory_xact_lock(hashtext('public.pedidos.folio'));

  select coalesce(max(folio), 0) + 1 into v_folio from public.pedidos where fecha = v_hoy;

  insert into public.pedidos (fecha, folio, nombre, telefono, recoger_a)
  values (v_hoy, v_folio, v_nombre, v_telefono, v_recoger at time zone v_zona)
  returning id into v_pedido_id;

  for v_item in select value from jsonb_array_elements(p_articulos) loop
    if jsonb_typeof(v_item) <> 'object'
       or jsonb_typeof(v_item -> 'producto_id') is distinct from 'number'
       or jsonb_typeof(v_item -> 'cantidad') is distinct from 'number'
       or (v_item ? 'opciones' and jsonb_typeof(v_item -> 'opciones') <> 'array') then
      raise exception using errcode = 'P0001', message = 'articulos_invalidos';
    end if;

    v_cantidad := (v_item ->> 'cantidad')::numeric;
    if v_cantidad <> trunc(v_cantidad) or v_cantidad not between 1 and 20 then
      raise exception using errcode = 'P0001', message = 'articulos_invalidos';
    end if;

    select * into v_producto
    from public.productos
    where id = (v_item ->> 'producto_id')::integer and disponible;
    if not found then
      raise exception using errcode = 'P0001', message = 'producto_no_disponible';
    end if;

    select coalesce(array_agg(distinct x::integer), '{}')
    into v_opcion_ids
    from jsonb_array_elements_text(coalesce(v_item -> 'opciones', '[]'::jsonb)) as x;

    select
      count(*),
      count(distinct o.grupo_id),
      coalesce(sum(o.precio), 0),
      coalesce(array_agg(o.nombre order by g.id), '{}')
    into v_opciones_encontradas, v_grupos_distintos, v_opciones_precio, v_opciones_nombres
    from public.opciones o
    join public.grupos_opciones g on g.id = o.grupo_id
    join public.producto_grupos pg on pg.grupo_id = o.grupo_id and pg.producto_id = v_producto.id
    where o.id = any (v_opcion_ids) and o.disponible;

    if v_opciones_encontradas <> cardinality(v_opcion_ids)
       or v_grupos_distintos <> v_opciones_encontradas then
      raise exception using errcode = 'P0001', message = 'opcion_invalida';
    end if;

    select count(*) into v_faltantes
    from public.producto_grupos pg
    join public.grupos_opciones g on g.id = pg.grupo_id
    where pg.producto_id = v_producto.id
      and g.obligatorio
      and not exists (
        select 1 from public.opciones o where o.grupo_id = g.id and o.id = any (v_opcion_ids)
      );
    if v_faltantes > 0 then
      raise exception using errcode = 'P0001', message = 'falta_opcion';
    end if;

    insert into public.pedido_articulos (pedido_id, producto_id, nombre, opciones, precio_unitario, cantidad)
    values (
      v_pedido_id,
      v_producto.id,
      v_producto.nombre,
      v_opciones_nombres,
      v_producto.precio + v_opciones_precio,
      v_cantidad::smallint
    );

    v_total := v_total + (v_producto.precio + v_opciones_precio) * v_cantidad;
  end loop;

  update public.pedidos set total = v_total where id = v_pedido_id;

  return jsonb_build_object(
    'id', v_pedido_id,
    'folio', v_folio,
    'total', v_total,
    'recoger_a', v_recoger at time zone v_zona
  );
exception
  when data_exception then
    raise exception using errcode = 'P0001', message = 'articulos_invalidos';
end;
$$;

revoke all on function public.crear_pedido(text, text, time, jsonb) from public, anon, authenticated;
grant execute on function public.crear_pedido(text, text, time, jsonb) to anon, authenticated;

create function public.consultar_pedido(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'folio', p.folio,
    'nombre', split_part(p.nombre, ' ', 1),
    'recoger_a', p.recoger_a,
    'estado', p.estado,
    'total', p.total,
    'articulos', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'nombre', a.nombre,
          'opciones', a.opciones,
          'cantidad', a.cantidad,
          'precio_unitario', a.precio_unitario
        )
        order by a.id
      )
      from public.pedido_articulos a
      where a.pedido_id = p.id
    ), '[]'::jsonb)
  )
  from public.pedidos p
  where p.id = p_id;
$$;

revoke all on function public.consultar_pedido(uuid) from public, anon, authenticated;
grant execute on function public.consultar_pedido(uuid) to anon, authenticated;

alter publication supabase_realtime add table public.pedidos;
