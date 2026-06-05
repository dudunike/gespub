---
título: Roadmap
atualizado: 2026-06-04
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
- [x] MetaContext: OAuth redirect flow, múltiplas contas, trocar conta ativa, remover conta
- [x] AppContext: notificações realtime via Supabase Realtime
- [x] ErrorBoundary global

---

## Fase 3 — Integração Meta Ads ✅ Funcional

- [x] OAuth 2.0 Implicit Flow via redirect (sem popup)
- [x] App ID: `2072345476678142` — **modo Live** (publicado)
- [x] Scope: `ads_management, pages_show_list, pages_read_engagement`
- [x] Dashboard: spend, impressões, cliques, CTR, CPC, ROAS, CPA, frequência
- [x] Engajamento Social: seguidores reais FB/IG, curtidas, comentários por criativo
- [x] Campanhas: listar, insights, pausar/ativar, alterar orçamento
- [x] Conjuntos de Anúncios: listar, insights com CPA e conversões, pausar/ativar
- [x] Anúncios/Criativos: grid e lista, preview HD (object_story_spec + image_url prioritário)
- [x] Análises (Insights): AI via Gemini + fallback algoritmo
- [x] **Múltiplas contas Meta por plano** (basic=1, pro=3, advanced=5, enterprise=∞)
- [x] **Data Deletion Callback** — `api/meta-deletion.js` (obrigatório App Review)
- [ ] **App Review Meta** — ⏳ pendente (solicitar Acesso Avançado para `ads_management`)
- [ ] Exchange por Long-Lived Token (requer Edge Function)
- [ ] Execução automática de agentes (Edge Function + cron)

---

## Fase 4 — Agentes IA ✅ Funcional

- [x] Frequências disponíveis: 1h · 6h · 12h · 24h
- [x] Templates: Guardião de ROAS, Conversor WhatsApp, Sentinela de CPA
- [x] Regras SE → ENTÃO com métricas e ações configuráveis
- [x] Histórico de execuções com timeout anti-hang (8s)
- [x] Toggle ativo/inativo com persistência no Supabase

---

## Fase 5 — Painel Admin ✅ Funcional com dados reais

- [x] AdminOverview: KPIs reais, gráfico 7 dias, pie planos, activity feed real
- [x] AdminUsers: listagem, drawer de edição, criação manual, resumo MRR por plano
- [x] AdminAgentsRules: todos os agentes, regras expansíveis, ranking ações (30d)
- [x] AdminLogs: tabela real com filtros, paginação, export CSV
- [x] AdminSettings: limites de plano dinâmicos via Supabase, webhook, Gemini key

---

## Fase 6 — Planos & Limites

| Plano      | Preço      | Contas Meta | Agentes | Regras | Frequência  |
|------------|-----------|-------------|---------|--------|-------------|
| Básico     | R$ 29,90  | 1           | 3       | 3      | A cada 24h  |
| Pro        | R$ 67,90  | 3           | 10      | 15     | A cada 6h   |
| Avançado   | R$ 147,00 | 5           | 25      | 40     | A cada 1h   |
| Enterprise | —         | ∞           | ∞       | ∞      | A cada 1h   |

---

## Fase 7 — Próximas Etapas

- [ ] **App Review Meta** — solicitar Acesso Avançado (`ads_management`, `ads_read`, `pages_show_list`, `pages_read_engagement`)
- [ ] **VPS** — migrar de Vercel para VPS (código pronto, `ecosystem.config.cjs` configurado)
- [ ] Edge Function Supabase: exchange short-lived → long-lived token
- [ ] Edge Function + cron: execução automática de agentes no servidor
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
| Meta App ID | `2072345476678142` (Live ✅)           |
| VPS         | Pronto para migrar (PM2 + Nginx configurados) |
