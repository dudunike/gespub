-- ============================================================
-- GESPUB.AI — Execute este SQL no Supabase Dashboard
-- SQL Editor → New Query → Cole → Run
-- ============================================================

-- 1. Tabela de conexões Meta Ads (uma por usuário)
create table if not exists meta_connections (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references auth.users(id) on delete cascade not null unique,
  access_token text not null,
  account_id   text not null,
  account_name text,
  currency     text default 'BRL',
  -- token_expires_at: null = token longo sem expiração conhecida
  token_expires_at timestamptz,
  connected_at timestamptz default now(),
  updated_at   timestamptz default now()
);

alter table meta_connections enable row level security;

create policy "Usuário gerencia própria conexão"
  on meta_connections for all
  using (auth.uid() = user_id);

-- 2. Tabela de agentes IA por usuário
create table if not exists agents (
  id                uuid default gen_random_uuid() primary key,
  user_id           uuid references auth.users(id) on delete cascade not null,
  name              text not null,
  description       text,
  goal_description  text,
  function          text,
  metrics           text[]   default '{}',
  primary_conversion text,
  rules             jsonb    default '[]',
  frequency         text     default 'daily',
  scope             text     default 'all',
  scope_items       text[]   default '{}',
  is_active         boolean  default true,
  last_action       text,
  last_action_at    timestamptz,
  total_executions  int      default 0,
  created_at        timestamptz default now()
);

alter table agents enable row level security;

create policy "Usuário gerencia próprios agentes"
  on agents for all
  using (auth.uid() = user_id);

-- 3. (Opcional) Verificar se a tabela profiles tem RLS correta
-- Se não existir, crie:
create table if not exists profiles (
  id     uuid references auth.users(id) on delete cascade primary key,
  name   text,
  role   text default 'user',
  plan   text default 'pro',
  status text default 'active',
  created_at timestamptz default now()
);

alter table profiles enable row level security;

-- Usuário lê apenas o próprio perfil; admin lê todos
create policy "Usuário lê próprio perfil"
  on profiles for select
  using (
    auth.uid() = id
    or exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Usuário edita próprio perfil"
  on profiles for update
  using (auth.uid() = id);

-- ============================================================
-- ATUALIZAÇÃO: Colunas de plano na tabela profiles
-- Execute separadamente se profiles já existir
-- ============================================================

alter table profiles
  add column if not exists plan_start_at   timestamptz,
  add column if not exists plan_expires_at timestamptz,
  add column if not exists insights_used_month int default 0,
  add column if not exists insights_reset_at   timestamptz default now();

-- ============================================================
-- ATUALIZAÇÃO: coluna de expiração do token Meta
-- Execute separadamente se meta_connections já existir
-- ============================================================

alter table meta_connections
  add column if not exists token_expires_at timestamptz;

-- ============================================================
-- 4. Tabela de notificações
-- ============================================================

create table if not exists notifications (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users(id) on delete cascade not null,
  title      text not null,
  message    text,
  type       text default 'info',   -- info, warning, success, error
  read       boolean default false,
  created_at timestamptz default now()
);

alter table notifications enable row level security;

create policy "Usuário gerencia próprias notificações"
  on notifications for all
  using (auth.uid() = user_id);

-- ============================================================
-- 5. Coluna de avatar na tabela profiles
-- Execute separadamente se profiles já existir
-- ============================================================

alter table profiles
  add column if not exists avatar_url text;

-- ============================================================
-- 6. Bucket de storage para fotos de perfil
-- Execute no Supabase Dashboard → Storage → New Bucket
-- OU cole este SQL no SQL Editor
-- ============================================================

insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

-- Política: usuário faz upload apenas no próprio path (user_id.ext)
create policy "Upload próprio avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = split_part(name, '.', 1)
  );

create policy "Update próprio avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = split_part(name, '.', 1)
  );

-- Leitura pública das fotos (URLs públicas funcionam)
create policy "Leitura pública de avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');
