---
título: Roadmap
atualizado: 2026-06-03
status: em andamento
---

# Roadmap — GesPub.ai

## Fase 1 — Fundação & UI/UX ✅ Concluída

- [x] Estrutura React 19 + Vite + Tailwind CSS
- [x] Design system imutável: paleta brand/status/surface/txt
- [x] Componentes UI: Button, Input, Modal, Select, Badge, Avatar, Toggle, Drawer, Tabs, KpiCard, DateFilter
- [x] PlatformLayout (sidebar + topbar + content)
- [x] AdminLayout (sidebar escura #1E1B4B + topbar admin)
- [x] Proteção de rotas: Público / Cliente / Admin
- [x] Responsividade mobile com sidebar colapsável

---

## Fase 2 — Backend & Autenticação ✅ Concluída

- [x] Supabase Auth (login, logout, reset de senha)
- [x] Tabelas com RLS: `profiles`, `meta_connections`, `agents`, `agent_logs`, `notifications`
- [x] AuthContext: login com Promise.race (timeout 10s), logout, perfil, admin
- [x] Login com timeout anti-hang: `Promise.race([authPromise, timeout10s])`
- [x] MetaContext: OAuth redirect flow, salvar conexão, desconectar, validar token
- [x] AppContext: notificações realtime via Supabase Realtime
- [x] ErrorBoundary global

---

## Fase 3 — Integração Meta Ads ✅ Funcional

- [x] OAuth 2.0 Implicit Flow via redirect (sem popup)
- [x] App ID: `2072345476678142` (novo app verificado — precisa ir para modo LIVE no Meta)
- [x] Scope: `ads_management, pages_show_list, pages_read_engagement, instagram_basic`
- [x] Dashboard: spend, impressões, cliques, CTR, CPC, ROAS, CPA, frequência
- [x] Engajamento Social: seguidores reais FB/IG via `/me/accounts`, curtidas, comentários
- [x] Campanhas: listar, insights, CPA por campanha, pausar/ativar, alterar orçamento
- [x] Conjuntos de Anúncios: listar, insights com CPA e conversões, pausar/ativar, orçamento
- [x] Anúncios/Criativos: grid e lista com curtidas/seguidores por criativo
- [x] Análises (Insights): AI via Gemini + fallback algoritmo, tabela performance por campanha com totais
- [x] `getPageFollowers()` busca seguidores reais FB + Instagram Business Account
- [ ] Exchange por Long-Lived Token (requer Edge Function)
- [ ] Execução automática de agentes (Edge Function + cron)

---

## Fase 4 — Agentes IA ✅ Funcional

- [x] Frequências disponíveis: 1h · 6h · 12h · 24h (sem "tempo real")
- [x] Templates: Guardião de ROAS, Conversor WhatsApp, Sentinela de CPA
- [x] Regras SE → ENTÃO com métricas e ações configuráveis
- [x] Histórico de execuções com timeout anti-hang (8s)
- [x] Toggle ativo/inativo com persistência no Supabase

---

## Fase 5 — Painel Admin ✅ Funcional com dados reais

- [x] AdminOverview: KPIs reais (usuários, agentes, execuções, MRR), gráfico 7 dias, pie planos, activity feed real
- [x] AdminUsers: listagem, drawer de edição, criação manual, resumo MRR por plano
- [x] AdminAgentsRules: todos os agentes, regras expansíveis, ranking ações/agentes (30d)
- [x] AdminLogs: tabela real com filtros, paginação, export CSV — join profiles via dois queries (sem FK direta)
- [x] AdminSettings: limites de plano, webhook, alertas, Gemini API key

---

## Fase 6 — Planos & Preços

| Plano      | Preço      | Agentes | Regras | Frequência  |
|------------|-----------|---------|--------|-------------|
| Básico     | R$ 29,90  | 3       | 3      | A cada 24h  |
| Pro        | R$ 67,90  | 10      | 15     | A cada 6h   |
| Avançado   | R$ 147,00 | 25      | 40     | A cada 1h   |
| Enterprise | Admin     | ∞       | ∞      | A cada 1h   |

---

## Fase 7 — Pendente / Próximas Etapas

- [ ] **Ativar App Meta `2072345476678142` para modo Live** (Meta Developer Console)
- [ ] Edge Function Supabase: exchange short-lived → long-lived token
- [ ] Edge Function + cron: execução automática de agentes
- [ ] Sistema de pagamentos (Stripe ou integração nacional)
- [ ] Google Ads integration
- [ ] TikTok Ads integration
- [ ] Otimização de bundle (code splitting por rota)

---

## Deploy atual

| Item        | Valor                                  |
|-------------|----------------------------------------|
| Hosting     | Vercel (deploy automático via main)    |
| Domínio     | gespub.online                          |
| Repositório | github.com/dudunike/gespub             |
| Branch      | main                                   |
| DB/Auth     | Supabase (lbfsulolgqsxeagdxqwh)       |
| Meta App ID | 2072345476678142 (modo Dev — ativar!)  |
