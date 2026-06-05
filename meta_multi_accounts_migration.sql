-- Migração: suporte a múltiplas contas Meta por usuário (baseado no plano)
-- Execute no SQL Editor do Supabase

-- 1. Adiciona coluna is_active (conta ativa no momento)
ALTER TABLE meta_connections
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Marca todas as conexões existentes como ativas
UPDATE meta_connections SET is_active = TRUE WHERE is_active IS NULL;

-- 3. Remove a constraint UNIQUE em user_id (permitia apenas 1 conta por usuário)
ALTER TABLE meta_connections
  DROP CONSTRAINT IF EXISTS meta_connections_user_id_key;

-- 4. Adiciona constraint UNIQUE em (user_id, account_id) — 1 registro por conta por usuário
ALTER TABLE meta_connections
  ADD CONSTRAINT IF NOT EXISTS meta_connections_user_account_key
  UNIQUE (user_id, account_id);
