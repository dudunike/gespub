-- ============================================================
-- GESPUB.AI — Update: Add ad_account_id to agents
-- Execute este SQL no Supabase Dashboard
-- SQL Editor → New Query → Cole → Run
-- ============================================================

-- Adiciona a coluna ad_account_id na tabela agents
-- Permitimos que seja nulo temporariamente para não quebrar agentes antigos, 
-- mas a interface agora exigirá que a conta seja selecionada para todos os novos.
alter table agents
  add column if not exists ad_account_id text;
