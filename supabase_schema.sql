-- =========================================================================
--  PORTAL DE LAS ALITAS — Simplified Schema (CLEAN)
--  Copia y pega esto en el SQL Editor de Supabase y haz clic en RUN
-- =========================================================================

-- 1. LIMPIEZA TOTAL
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user cascade;

drop table if exists public.pedidos cascade;
drop table if exists public.oferta cascade;
drop table if exists public.tipos_arroz cascade;
drop table if exists public.bebidas cascade;
drop table if exists public.combos cascade;
drop table if exists public.inventario cascade;
drop table if exists public.profiles cascade;

-- 2. TABLAS BASE
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  nombre text not null,
  email text not null,
  rol text not null default 'user',
  created_at timestamptz default now()
);

create table public.combos (
  id serial primary key,
  nombre text not null,
  precio numeric(8,2) not null,
  alitas int not null,
  descripcion text default '',
  estado text not null default 'disponible',
  es_jueves boolean default false,
  emoji text default '🍗',
  created_at timestamptz default now()
);

create table public.bebidas (
  id serial primary key,
  nombre text not null,
  precio numeric(8,2) not null,
  tipo text not null default 'normal',
  emoji text default '🥤',
  activa boolean default true,
  created_at timestamptz default now()
);

create table public.tipos_arroz (
  id serial primary key,
  nombre text not null,
  precio numeric(8,2) not null default 1.00,
  emoji text default '🍚',
  activo boolean default true,
  created_at timestamptz default now()
);

create table public.pedidos (
  id serial primary key,
  usuario_id uuid references public.profiles(id) on delete set null,
  combo_id int references public.combos(id) on delete set null,
  combo_precio numeric(8,2) default 0,
  total numeric(8,2) default 0,
  tipo text not null default 'servir',
  mesa text default '',
  direccion text default '',
  mensaje text default '',
  estado text not null default 'pendiente',
  arroz jsonb default '{}',
  adicional jsonb default '{"arroz": 0, "bebidas": 0, "items": []}',
  es_extra boolean default false,
  tipo_extra text default null,
  modificado boolean default false,
  telefono text default null,
  ultima_mod timestamptz default now(),
  created_at timestamptz default now()
);

create table public.pedido_salsas (
  id serial primary key,
  pedido_id int references public.pedidos(id) on delete cascade,
  tipo_salsa text not null,
  cantidad int not null,
  created_at timestamptz default now()
);

create table public.pedido_extras (
  id serial primary key,
  pedido_id int references public.pedidos(id) on delete cascade,
  nombre text not null,
  cantidad int not null,
  precio numeric(8,2) not null,
  tipo text not null,
  created_at timestamptz default now()
);

create table public.oferta (
  id serial primary key,
  titulo text not null,
  descripcion text default '',
  precio numeric(8,2) not null,
  alitas int not null,
  emoji text default '🔥',
  fecha_fin timestamptz not null,
  activa boolean default true,
  created_at timestamptz default now()
);

create table public.inventario (
  id serial primary key,
  clave text not null unique,
  valor int not null default 0,
  updated_at timestamptz default now()
);

create table public.store_settings (
  id serial primary key,
  is_open boolean not null default true,
  updated_at timestamptz default now()
);

-- Insert initial setting
insert into public.store_settings (id, is_open) values (1, true);

-- 3. DESACTIVAR RLS (Para desarrollo sin errores de permisos)
alter table public.profiles disable row level security;
alter table public.combos disable row level security;
alter table public.bebidas disable row level security;
alter table public.tipos_arroz disable row level security;
alter table public.pedidos disable row level security;
alter table public.pedido_salsas disable row level security;
alter table public.pedido_extras disable row level security;
alter table public.oferta disable row level security;
alter table public.inventario disable row level security;
alter table public.store_settings disable row level security;

-- 4. REALTIME
alter publication supabase_realtime add table public.pedidos;
alter publication supabase_realtime add table public.pedido_salsas;
alter publication supabase_realtime add table public.pedido_extras;
