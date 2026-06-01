-- ============================================================
-- GESPUB.AI — Execute este SQL no Supabase Dashboard
-- SQL Editor → New Query → Cole → Run
-- ============================================================

-- 1. Tabela de conexões Meta Ads (uma por usuário)
create table if not exists meta_connections (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null unique,
  access_token text not null,
  account_id  text not null,
  account_name text,
  currency    text default 'BRL',
  connected_at timestamptz default now(),
  updated_at  timestamptz default now()
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

create policy "Leitura pública de perfis"
  on profiles for select
  using (true);

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
