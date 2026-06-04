-- Tabela de configurações globais do sistema
create table if not exists system_settings (
  id text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

alter table system_settings enable row level security;

-- Política 1: Leitura pública apenas para chaves não sensíveis
create policy "Leitura publica de configuracoes basicas"
  on system_settings for select
  using (id in ('plan_limits', 'system_config'));

-- Política 2: Admin lê tudo (incluindo webhook, AI, etc)
create policy "Admin le tudo"
  on system_settings for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Política 3: Admin edita/insere tudo
create policy "Admin gerencia configuracoes"
  on system_settings for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );
