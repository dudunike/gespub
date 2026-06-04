---
título: Visão Geral ADIM
atualizado: 2026-06-03
status: funcional com dados reais
---

# Painel Admin — GesPub.ai

## Acesso
Rota: `/admin` — exclusivo para usuários com `role = 'admin'` no Supabase.  
Qualquer outro usuário é redirecionado para `/dashboard`.

---

## Módulos

### 📊 Visão Geral (`/admin`)
- KPIs reais do Supabase: total usuários, agentes ativos, execuções hoje, MRR
- Gráfico de barras: execuções dos agentes por dia (últimos 7 dias) via `agent_logs`
- Pie chart: distribuição de usuários por plano (profiles)
- Feed de atividade: últimas 15 execuções com usuário, agente e ação
- Modal de notificação broadcast: envia para todos ou por plano

### 👥 Usuários (`/admin/usuarios`)
- Tabela real com filtros por plano, status, busca por nome/e-mail
- Cards de resumo: contagem + MRR por plano (Básico/Pro/Avançado) + MRR Total
- Drawer lateral: editar plano, status, datas de início/vencimento
- Barras de uso: agentes, contas, insights usados vs limite do plano
- Criar usuário manualmente: cria no Supabase Auth + insere em profiles
- Bloquear/desbloquear conta

### 🤖 Agentes & Regras (`/admin/agentes-regras`)
- KPIs: total agentes, execuções acumuladas, ações nos últimos 30 dias
- Lista expansível de todos os agentes de todos os usuários
- Detalhes ao expandir: regras SE→ENTÃO, métricas monitoradas, última ação
- Sidebar: ranking das ações mais executadas + top agentes por atividade (30d)

### 📋 Logs (`/admin/logs`)
- Dados reais da tabela `agent_logs`
- Join duplo: `agent_logs → agents (name)` + lookup separado em `profiles` (sem FK direta)
- Filtros: busca livre, usuário, tipo de ação, data de/até
- Paginação: 50 registros/página com contagem total real
- Export CSV funcional com BOM UTF-8

### ⚙️ Configurações (`/admin/configuracoes`)
- Edição de limites por plano
- Webhook de pagamento (URL + secret)
- Alertas automáticos (vencimento, uso)
- Chave Gemini AI
- Modo manutenção + mensagem global

---

## Queries importantes

```js
// Logs sem FK direta em profiles — abordagem correta:
const { data: logs } = await supabase
  .from('agent_logs')
  .select('id, action, message, executed_at, agent_id, user_id, agents(name, user_id)')

const uids = [...new Set(logs.map(l => l.user_id).filter(Boolean))]
const { data: profiles } = await supabase.from('profiles').select('id, name, email').in('id', uids)
const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]))
const enriched = logs.map(l => ({ ...l, profile: profileMap[l.user_id] || null }))
```

---

## Segurança
- `role = 'admin'` em `profiles` para acesso
- RLS no Supabase: admin vê todos os dados via service role ou políticas abertas para admins
- Sidebar escura (`bg-admin-sidebar: #1E1B4B`) diferencia visualmente do painel cliente
