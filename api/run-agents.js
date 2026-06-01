/**
 * Vercel Serverless Function — Motor de execução dos Agentes IA
 *
 * Chamada via cron externo (cron-job.org) com o header:
 *   x-cron-secret: <CRON_SECRET>
 *
 * Variáveis de ambiente necessárias no Vercel:
 *   SUPABASE_URL             — URL do projeto Supabase
 *   SUPABASE_SERVICE_ROLE_KEY — Service Role Key (bypassa RLS)
 *   CRON_SECRET              — Segredo para autenticar chamadas do cron
 */

import { createClient } from '@supabase/supabase-js'

const META_BASE = 'https://graph.facebook.com/v21.0'

// ─── Meta API ────────────────────────────────────────────────────────────────

async function metaGet(path, token, params = {}) {
  const url = new URL(`${META_BASE}${path}`)
  url.searchParams.set('access_token', token)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))
  const res = await fetch(url.toString())
  const data = await res.json()
  if (data.error) {
    const code = data.error.code
    if (code === 190) throw new Error('TOKEN_EXPIRED')
    throw new Error(`Meta API (${code}): ${data.error.message}`)
  }
  return data
}

async function metaPost(path, token, body) {
  const url = new URL(`${META_BASE}${path}`)
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (data.error) throw new Error(`Meta API: ${data.error.message}`)
  return data
}

// ─── Frequência ───────────────────────────────────────────────────────────────

function isDue(agent) {
  if (!agent.last_run_at) return true
  const msSince = Date.now() - new Date(agent.last_run_at).getTime()
  const h = msSince / 3_600_000
  switch (agent.frequency) {
    case 'realtime': return true
    case '6h':       return h >= 6
    case '12h':      return h >= 12
    case 'daily':    return h >= 24
    default:         return h >= 24
  }
}

// ─── Cálculo de métricas ──────────────────────────────────────────────────────

function calcMetric(metricKey, ins, primaryConversion) {
  const spend       = Number(ins?.spend        || 0)
  const impressions = Number(ins?.impressions   || 0)
  const clicks      = Number(ins?.clicks        || 0)
  const reach       = Number(ins?.reach         || 0)
  const actions     = ins?.actions      || []
  const actionVals  = ins?.action_values || []

  // Conversões da métrica primária do agente
  const conv = actions.find(a => a.action_type === primaryConversion)
  const conversions = conv ? Number(conv.value) : 0

  // Receita para ROAS — soma de purchase e variantes
  const revTypes = [
    'purchase',
    'offsite_conversion.fb_pixel_purchase',
    primaryConversion,
  ]
  const revenue = actionVals
    .filter(a => revTypes.includes(a.action_type))
    .reduce((s, a) => s + Number(a.value), 0)

  switch (metricKey) {
    case 'spend':       return spend
    case 'impressions': return impressions
    case 'clicks':      return clicks
    case 'reach':       return reach
    case 'ctr':         return impressions > 0 ? (clicks / impressions) * 100 : 0
    case 'cpc':         return clicks > 0 ? spend / clicks : 0
    case 'cpm':         return impressions > 0 ? (spend / impressions) * 1000 : 0
    case 'frequency':   return reach > 0 ? impressions / reach : 0
    case 'roas':        return spend > 0 ? revenue / spend : 0
    case 'cpa':         return conversions > 0 ? spend / conversions : 0
    case 'conversions': return conversions
    default:            return 0
  }
}

// ─── Avaliação de regra ────────────────────────────────────────────────────────

function evalRule(rule, value) {
  const t = Number(rule.value)
  switch (rule.operator) {
    case 'gt':  return value > t
    case 'lt':  return value < t
    case 'gte': return value >= t
    case 'lte': return value <= t
    case 'eq':  return Math.abs(value - t) < 0.0001
    default:    return false
  }
}

// ─── Execução de ação ─────────────────────────────────────────────────────────

async function execAction(rule, campaign, token) {
  const pct = Math.abs(Number(rule.actionValue) || 10)

  switch (rule.action) {
    case 'pause_campaign': {
      const currentStatus = campaign.effective_status || campaign.status
      if (currentStatus === 'PAUSED') return null // já pausada
      await metaPost(`/${campaign.id}`, token, { status: 'PAUSED' })
      return `Campanha "${campaign.name}" pausada automaticamente`
    }

    case 'increase_budget': {
      const current = Number(campaign.daily_budget || 0)
      if (current <= 0) return null
      const newBudget = Math.round(current * (1 + pct / 100))
      await metaPost(`/${campaign.id}`, token, { daily_budget: String(newBudget) })
      const currFmt = (current / 100).toFixed(2)
      const newFmt  = (newBudget / 100).toFixed(2)
      return `Orçamento de "${campaign.name}" aumentado ${pct}% (R$${currFmt} → R$${newFmt})`
    }

    case 'decrease_budget': {
      const current = Number(campaign.daily_budget || 0)
      if (current <= 0) return null
      const newBudget = Math.round(current * (1 - pct / 100))
      const minBudget = 100 // 1 real mínimo
      if (newBudget < minBudget) return null
      await metaPost(`/${campaign.id}`, token, { daily_budget: String(newBudget) })
      const currFmt = (current / 100).toFixed(2)
      const newFmt  = (newBudget / 100).toFixed(2)
      return `Orçamento de "${campaign.name}" reduzido ${pct}% (R$${currFmt} → R$${newFmt})`
    }

    case 'send_notification':
    case 'send_email': {
      const metricLabel = rule.metric.toUpperCase()
      const val = rule.metricValue !== undefined
        ? Number(rule.metricValue).toFixed(2)
        : '—'
      return `Alerta: ${metricLabel} de "${campaign.name}" atingiu threshold (${rule.operator} ${rule.value})`
    }

    default:
      return null
  }
}

// ─── Processamento de um agente ───────────────────────────────────────────────

async function processAgent(agent, conn, supabase) {
  const { access_token: token, account_id: accountId } = conn

  // Marca como executando agora
  await supabase.from('agents')
    .update({ last_run_at: new Date().toISOString() })
    .eq('id', agent.id)

  // Busca campanhas (com orçamento) e insights de hoje em paralelo
  const [campaignsRes, insightsRes] = await Promise.all([
    metaGet(`/${accountId}/campaigns`, token, {
      fields: 'id,name,status,effective_status,daily_budget,lifetime_budget,objective',
      limit: 200,
    }),
    metaGet(`/${accountId}/insights`, token, {
      fields: [
        'campaign_id',
        'spend',
        'impressions',
        'clicks',
        'reach',
        'frequency',
        'ctr',
        'cpc',
        'cpm',
        'actions',
        'action_values',
      ].join(','),
      level: 'campaign',
      date_preset: 'today',
      limit: 200,
    }),
  ])

  const campaigns = campaignsRes.data || []

  // Indexa insights por campaign_id
  const insightsMap = {}
  for (const ins of insightsRes.data || []) {
    insightsMap[ins.campaign_id] = ins
  }

  // Filtra campanhas pelo escopo do agente
  let scoped = campaigns
  if (agent.scope === 'active_only') {
    scoped = campaigns.filter(c =>
      c.effective_status === 'ACTIVE' || c.status === 'ACTIVE'
    )
  } else if (agent.scope === 'specific' && agent.scope_items?.length > 0) {
    scoped = campaigns.filter(c => agent.scope_items.includes(c.id))
  }

  const actionsTaken = []

  for (const campaign of scoped) {
    const ins = insightsMap[campaign.id]

    // Se a campanha não tem dados de hoje, pula
    if (!ins && !['pause_campaign', 'increase_budget', 'decrease_budget'].includes(
      agent.rules?.[0]?.action
    )) continue

    for (const rule of agent.rules || []) {
      const metricValue = calcMetric(rule.metric, ins, agent.primary_conversion)

      if (!evalRule(rule, metricValue)) continue

      // Regra disparou — executa ação
      try {
        const msg = await execAction(
          { ...rule, metricValue },
          campaign,
          token
        )
        if (msg) {
          actionsTaken.push({
            campaign_id:   campaign.id,
            campaign_name: campaign.name,
            rule_action:   rule.action,
            rule_metric:   rule.metric,
            metric_value:  metricValue,
            threshold:     rule.value,
            message:       msg,
          })
        }
      } catch (err) {
        console.error(`Ação falhou para campanha ${campaign.id}:`, err.message)
      }
    }
  }

  // Persiste logs
  if (actionsTaken.length > 0) {
    await supabase.from('agent_logs').insert(
      actionsTaken.map(a => ({
        agent_id:      agent.id,
        user_id:       agent.user_id,
        campaign_id:   a.campaign_id,
        campaign_name: a.campaign_name,
        action:        a.rule_action,
        metric_key:    a.rule_metric,
        metric_value:  a.metric_value,
        threshold:     a.threshold,
        message:       a.message,
        executed_at:   new Date().toISOString(),
      }))
    )

    // Notificação consolidada para o usuário
    const summary = actionsTaken.map(a => a.message).join('\n')
    await supabase.from('notifications').insert({
      user_id: agent.user_id,
      title: `Agente "${agent.name}" executou ${actionsTaken.length} ação${actionsTaken.length > 1 ? 'ões' : ''}`,
      message: summary,
      type: actionsTaken.some(a => a.rule_action === 'pause_campaign') ? 'warning' : 'info',
    })

    // Atualiza contadores do agente
    await supabase.from('agents').update({
      last_action:       actionsTaken[actionsTaken.length - 1].message,
      last_action_at:    new Date().toISOString(),
      total_executions:  (agent.total_executions || 0) + actionsTaken.length,
    }).eq('id', agent.id)
  }

  return {
    agentId:      agent.id,
    agentName:    agent.name,
    actionsCount: actionsTaken.length,
    actions:      actionsTaken.map(a => a.message),
  }
}

// ─── Handler principal ────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const cronSecret  = process.env.CRON_SECRET || 'gespub-cron-2026'
  const fromVercel  = req.headers['x-vercel-cron'] === '1'                  // Vercel Cron nativo
  const fromExternal = req.headers['x-cron-secret'] === cronSecret          // pg_cron / externo
  const fromQuery   = req.query?.secret === cronSecret                       // query param fallback

  if (!fromVercel && !fromExternal && !fromQuery) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Se agentId vier como query param, executa só aquele agente
  const specificAgentId = req.query?.agentId || req.body?.agentId || null

  try {
    let agentsQuery = supabase.from('agents').select('*').eq('is_active', true)
    if (specificAgentId) agentsQuery = agentsQuery.eq('id', specificAgentId)

    const [{ data: agents, error: agentsErr }, { data: connections, error: connErr }] =
      await Promise.all([
        agentsQuery,
        supabase.from('meta_connections').select('user_id, access_token, account_id'),
      ])

    if (agentsErr) throw new Error(agentsErr.message)
    if (connErr)   throw new Error(connErr.message)

    if (!agents?.length) {
      return res.json({ ok: true, processed: 0, message: 'Nenhum agente ativo' })
    }

    // Mapa de conexões por user_id
    const connMap = {}
    for (const c of connections || []) connMap[c.user_id] = c

    const results = []
    let totalActions = 0

    for (const agent of agents) {
      const conn = connMap[agent.user_id]
      if (!conn) continue      // usuário sem conta Meta conectada
      if (!isDue(agent)) continue // não está na hora de executar

      try {
        const result = await processAgent(agent, conn, supabase)
        results.push(result)
        totalActions += result.actionsCount
      } catch (err) {
        const isExpired = err.message === 'TOKEN_EXPIRED'
        results.push({ agentId: agent.id, error: err.message })

        // Se token expirou, desconecta o usuário
        if (isExpired) {
          await supabase.from('meta_connections').delete().eq('user_id', agent.user_id)
          await supabase.from('notifications').insert({
            user_id: agent.user_id,
            title: 'Reconexão necessária com o Meta Ads',
            message: 'Seu token de acesso expirou. Acesse Conexões e reconecte sua conta.',
            type: 'warning',
          })
        }
      }
    }

    return res.json({
      ok: true,
      processed:    results.length,
      totalActions,
      results,
      timestamp:    new Date().toISOString(),
    })
  } catch (err) {
    console.error('[run-agents] Erro fatal:', err)
    return res.status(500).json({ ok: false, error: err.message })
  }
}
