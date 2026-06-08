/**
 * Vercel Serverless Function — Motor de execução dos Agentes IA
 *
 * Chamada via cron externo (cron-job.org) com o header:
 *   x-cron-secret: <CRON_SECRET>
 *
 * Variáveis de ambiente necessárias no Vercel:
 *   SUPABASE_URL              — URL do projeto Supabase
 *   SUPABASE_SERVICE_ROLE_KEY — Service Role Key (bypassa RLS)
 *   CRON_SECRET               — Segredo para autenticar chamadas do cron
 */

import { createClient } from '@supabase/supabase-js'

const META_BASE = 'https://graph.facebook.com/v21.0'

// ─── Meta API ────────────────────────────────────────────────────────────────

async function metaGet(path, token, params = {}) {
  const url = new URL(`${META_BASE}${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } })
  const data = await res.json()
  if (data.error) {
    if (data.error.code === 190) throw new Error('TOKEN_EXPIRED')
    throw new Error(`Meta API (${data.error.code}): ${data.error.message}`)
  }
  return data
}

async function metaPost(path, token, body) {
  const url = new URL(`${META_BASE}${path}`)
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (data.error) throw new Error(`Meta API: ${data.error.message}`)
  return data
}

// ─── IA: Claude (Anthropic) ───────────────────────────────────────────────────

async function callClaude(apiKey, model, prompt) {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const data = await res.json()
    return data.content?.[0]?.text || null
  } catch {
    return null
  }
}

// ─── IA: Gemini ────────────────────────────────────────────────────────────────

async function callGemini(apiKey, model, prompt) {
  try {
    const gemModel = model || 'gemini-2.0-flash'
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${gemModel}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    )
    const data = await res.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null
  } catch {
    return null
  }
}

// ─── Chama IA disponível (Claude tem prioridade) ──────────────────────────────

async function callAI(aiConfig, prompt) {
  if (aiConfig?.claudeApiKey) {
    const text = await callClaude(aiConfig.claudeApiKey, aiConfig.claudeModel, prompt)
    if (text) return { provider: 'claude', text }
  }
  if (aiConfig?.geminiApiKey) {
    const text = await callGemini(aiConfig.geminiApiKey, aiConfig.geminiModel, prompt)
    if (text) return { provider: 'gemini', text }
  }
  return null
}

// ─── Frequência ───────────────────────────────────────────────────────────────

function isDue(agent) {
  if (!agent.last_run_at) return true
  const h = (Date.now() - new Date(agent.last_run_at).getTime()) / 3_600_000
  switch (agent.frequency) {
    case 'realtime': return true
    case '1h':       return h >= 1
    case '6h':       return h >= 6
    case '12h':      return h >= 12
    case 'daily':    return h >= 24
    default:         return h >= 24
  }
}

// ─── Cálculo de métricas ──────────────────────────────────────────────────────

function calcMetric(metricKey, ins, primaryConversion) {
  const spend       = Number(ins?.spend       || 0)
  const impressions = Number(ins?.impressions  || 0)
  const clicks      = Number(ins?.clicks       || 0)
  const reach       = Number(ins?.reach        || 0)
  const actions     = ins?.actions     || []
  const actionVals  = ins?.action_values || []

  const conv = actions.find(a => a.action_type === primaryConversion)
  const conversions = conv ? Number(conv.value) : 0

  const revTypes = ['purchase', 'offsite_conversion.fb_pixel_purchase', primaryConversion]
  const revenue = actionVals.filter(a => revTypes.includes(a.action_type)).reduce((s, a) => s + Number(a.value), 0)

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
      if (currentStatus === 'PAUSED') return null
      await metaPost(`/${campaign.id}`, token, { status: 'PAUSED' })
      return `Campanha "${campaign.name}" pausada automaticamente`
    }
    case 'increase_budget': {
      const current = Number(campaign.daily_budget || 0)
      if (current <= 0) return null
      const newBudget = Math.round(current * (1 + pct / 100))
      await metaPost(`/${campaign.id}`, token, { daily_budget: String(newBudget) })
      return `Orçamento de "${campaign.name}" aumentado ${pct}% (R$${(current/100).toFixed(2)} → R$${(newBudget/100).toFixed(2)})`
    }
    case 'decrease_budget': {
      const current = Number(campaign.daily_budget || 0)
      if (current <= 0) return null
      const newBudget = Math.round(current * (1 - pct / 100))
      if (newBudget < 100) return null
      await metaPost(`/${campaign.id}`, token, { daily_budget: String(newBudget) })
      return `Orçamento de "${campaign.name}" reduzido ${pct}% (R$${(current/100).toFixed(2)} → R$${(newBudget/100).toFixed(2)})`
    }
    case 'send_notification':
    case 'send_email': {
      return `Alerta: ${rule.metric.toUpperCase()} de "${campaign.name}" atingiu threshold (${rule.operator} ${rule.value})`
    }
    default:
      return null
  }
}

// ─── Formata métricas para o prompt de IA ────────────────────────────────────

function formatMetricsForAI(campaigns, insightsMap, scopedIds, agent) {
  const lines = []
  for (const c of campaigns) {
    if (!scopedIds.includes(c.id)) continue
    const ins = insightsMap[c.id]
    if (!ins) {
      lines.push(`- ${c.name}: sem dados hoje (status: ${c.effective_status || c.status})`)
      continue
    }
    const spend   = Number(ins.spend || 0)
    const impr    = Number(ins.impressions || 0)
    const clicks  = Number(ins.clicks || 0)
    const reach   = Number(ins.reach || 0)
    const ctr     = impr > 0 ? ((clicks / impr) * 100).toFixed(2) : '0'
    const cpc     = clicks > 0 ? (spend / clicks).toFixed(2) : '0'
    const cpm     = impr > 0 ? ((spend / impr) * 1000).toFixed(2) : '0'
    const roas    = (() => {
      const revTypes = ['purchase', 'offsite_conversion.fb_pixel_purchase', agent.primary_conversion]
      const rev = (ins.action_values || []).filter(a => revTypes.includes(a.action_type)).reduce((s, a) => s + Number(a.value), 0)
      return spend > 0 && rev > 0 ? (rev / spend).toFixed(2) : '0'
    })()
    const convs   = (ins.actions || []).reduce((s, a) => s + Number(a.value), 0)
    lines.push(`- ${c.name} (${c.effective_status || c.status}): investido R$${spend.toFixed(2)}, alcance ${reach}, impressões ${impr}, CTR ${ctr}%, CPC R$${cpc}, CPM R$${cpm}, ROAS ${roas}, conversões ${Math.round(convs)}`)
  }
  return lines.join('\n')
}

// ─── Processa sugestões da IA ─────────────────────────────────────────────────

function parseAISuggestions(text) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    return JSON.parse(jsonMatch[0])
  } catch {
    return null
  }
}

// ─── Processamento de um agente ───────────────────────────────────────────────

async function processAgent(agent, conn, supabase, aiConfig) {
  const { access_token: token, account_id: accountId } = conn

  await supabase.from('agents').update({ last_run_at: new Date().toISOString() }).eq('id', agent.id)

  const [campaignsRes, insightsRes] = await Promise.all([
    metaGet(`/${accountId}/campaigns`, token, {
      fields: 'id,name,status,effective_status,daily_budget,lifetime_budget,objective',
      limit: 200,
    }),
    metaGet(`/${accountId}/insights`, token, {
      fields: 'campaign_id,spend,impressions,clicks,reach,frequency,ctr,cpc,cpm,actions,action_values',
      level: 'campaign',
      date_preset: 'today',
      limit: 200,
    }),
  ])

  const campaigns = campaignsRes.data || []
  const insightsMap = {}
  for (const ins of insightsRes.data || []) insightsMap[ins.campaign_id] = ins

  // Filtra pelo escopo do agente
  let scoped = campaigns
  if (agent.scope === 'active_only') {
    scoped = campaigns.filter(c => c.effective_status === 'ACTIVE' || c.status === 'ACTIVE')
  } else if (agent.scope === 'specific' && agent.scope_items?.length > 0) {
    scoped = campaigns.filter(c => agent.scope_items.includes(c.id))
  }

  const actionsTaken = []
  const now = new Date().toISOString()

  // ── 1. Execução de regras determinísticas ──────────────────────────────────
  for (const campaign of scoped) {
    const ins = insightsMap[campaign.id]
    if (!ins && !['pause_campaign', 'increase_budget', 'decrease_budget'].includes(agent.rules?.[0]?.action)) continue

    for (const rule of agent.rules || []) {
      if (!rule.metric || !rule.operator) continue
      const metricValue = calcMetric(rule.metric, ins, agent.primary_conversion)
      if (!evalRule(rule, metricValue)) continue

      try {
        const msg = await execAction({ ...rule, metricValue }, campaign, token)
        if (msg) {
          actionsTaken.push({
            campaign_id:   campaign.id,
            campaign_name: campaign.name,
            rule_action:   rule.action,
            rule_metric:   rule.metric,
            metric_value:  metricValue,
            threshold:     rule.value,
            message:       msg,
            source:        'rule',
          })
        }
      } catch (err) {
        console.error(`Regra falhou para campanha ${campaign.id}:`, err.message)
      }
    }
  }

  // ── 2. Análise de IA (Claude ou Gemini) ────────────────────────────────────
  let aiSummary = null
  const hasAI = aiConfig?.claudeApiKey || aiConfig?.geminiApiKey
  const hasCampaignsWithData = scoped.some(c => insightsMap[c.id])

  if (hasAI && hasCampaignsWithData) {
    const rulesText = (agent.rules || [])
      .filter(r => r.metric && r.operator)
      .map(r => `SE ${r.metric} ${r.operator} ${r.value} ENTÃO ${r.action}${r.actionValue ? ` em ${r.actionValue}%` : ''}`)
      .join('\n') || 'Nenhuma regra configurada'

    const metricsText = formatMetricsForAI(scoped, insightsMap, scoped.map(c => c.id), agent)

    const prompt = `Você é um especialista em Meta Ads (Facebook/Instagram). Analise as métricas abaixo e responda SOMENTE com JSON válido.

Agente: ${agent.name}
Objetivo: ${agent.goal_description || 'Otimizar performance das campanhas'}
Conversão principal: ${agent.primary_conversion || 'purchase'}
Frequência de análise: ${agent.frequency}

Regras configuradas:
${rulesText}

Métricas das campanhas hoje:
${metricsText}

Responda APENAS com este JSON (sem markdown, sem código block):
{
  "campaign_analysis": [
    {
      "campaign_id": "id_aqui",
      "status": "ok|attention|critical",
      "insight": "observação concisa em português (máx 100 chars)",
      "suggested_action": "none|pause_campaign|increase_budget|decrease_budget|send_notification",
      "reason": "motivo em português (máx 80 chars)"
    }
  ],
  "summary": "resumo geral da análise em português (máx 150 chars)"
}`

    const aiResult = await callAI(aiConfig, prompt)
    if (aiResult) {
      const parsed = parseAISuggestions(aiResult.text)
      if (parsed?.summary) aiSummary = parsed.summary

      // Registra insights da IA como logs de análise (não executa ações automaticamente de IA — segurança)
      if (parsed?.campaign_analysis?.length > 0) {
        for (const ca of parsed.campaign_analysis) {
          const camp = scoped.find(c => c.id === ca.campaign_id)
          if (!camp) continue
          if (ca.status === 'ok') continue // só loga se merece atenção

          actionsTaken.push({
            campaign_id:   ca.campaign_id,
            campaign_name: camp.name,
            rule_action:   'ai_analysis',
            rule_metric:   'ai',
            metric_value:  0,
            threshold:     '',
            message:       `[IA ${aiResult.provider.toUpperCase()}] ${ca.insight}${ca.suggested_action && ca.suggested_action !== 'none' ? ` → Sugestão: ${ca.suggested_action} (${ca.reason})` : ''}`,
            source:        'ai',
          })
        }
      }
    }
  }

  // ── 3. Persiste logs ────────────────────────────────────────────────────────
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
        executed_at:   now,
      }))
    )

    // Notificação consolidada — só para ações reais (não análise IA)
    const realActions = actionsTaken.filter(a => a.source === 'rule')
    if (realActions.length > 0) {
      const summary = [
        aiSummary ? `[IA] ${aiSummary}` : null,
        ...realActions.map(a => a.message),
      ].filter(Boolean).join('\n')

      await supabase.from('notifications').insert({
        user_id: agent.user_id,
        title: `Agente "${agent.name}" executou ${realActions.length} ação${realActions.length > 1 ? 'ões' : ''}`,
        message: summary,
        type: realActions.some(a => a.rule_action === 'pause_campaign') ? 'warning' : 'info',
      })
    } else if (aiSummary) {
      // Só análise de IA — notificação informativa
      await supabase.from('notifications').insert({
        user_id: agent.user_id,
        title: `[IA] Análise do agente "${agent.name}"`,
        message: aiSummary,
        type: 'info',
      })
    }

    const lastMsg = actionsTaken[actionsTaken.length - 1].message
    await supabase.from('agents').update({
      last_action:      lastMsg,
      last_action_at:   now,
      total_executions: (agent.total_executions || 0) + actionsTaken.length,
    }).eq('id', agent.id)
  }

  return {
    agentId:      agent.id,
    agentName:    agent.name,
    actionsCount: actionsTaken.filter(a => a.source === 'rule').length,
    aiAnalysis:   aiSummary,
    actions:      actionsTaken.map(a => a.message),
  }
}

// ─── Handler principal ────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return res.status(500).json({ error: 'CRON_SECRET não configurado' })

  const fromVercel   = req.headers['x-vercel-cron'] === '1'
  const fromExternal = req.headers['x-cron-secret'] === cronSecret

  if (!fromVercel && !fromExternal) return res.status(401).json({ error: 'Unauthorized' })

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  // Carrega configuração de IA do banco
  let aiConfig = null
  try {
    const { data } = await supabase.from('system_settings').select('value').eq('id', 'ai_config').single()
    if (data?.value) aiConfig = data.value
  } catch {}

  const specificAgentId = req.query?.agentId || req.body?.agentId || null

  try {
    let agentsQuery = supabase.from('agents').select('*').eq('is_active', true)
    if (specificAgentId) agentsQuery = agentsQuery.eq('id', specificAgentId)

    const [{ data: agents, error: agentsErr }, { data: connections, error: connErr }] =
      await Promise.all([
        agentsQuery,
        supabase.from('meta_connections').select('user_id, access_token, account_id').eq('is_active', true),
      ])

    if (agentsErr) throw new Error(agentsErr.message)
    if (connErr)   throw new Error(connErr.message)

    if (!agents?.length) return res.json({ ok: true, processed: 0, message: 'Nenhum agente ativo' })

    const connMap = {}
    for (const c of connections || []) connMap[c.user_id] = c

    const results = []
    let totalActions = 0

    for (const agent of agents) {
      const conn = connMap[agent.user_id]
      if (!conn) continue
      if (!isDue(agent)) continue

      try {
        const result = await processAgent(agent, conn, supabase, aiConfig)
        results.push(result)
        totalActions += result.actionsCount
      } catch (err) {
        const isExpired = err.message === 'TOKEN_EXPIRED'
        results.push({ agentId: agent.id, error: err.message })
        if (isExpired) {
          await supabase.from('meta_connections').update({ is_active: false }).eq('user_id', agent.user_id)
          await supabase.from('notifications').insert({
            user_id: agent.user_id,
            title: 'Reconexão necessária com o Meta Ads',
            message: 'Seu token de acesso expirou. Acesse Conexões e reconecte sua conta.',
            type: 'warning',
          })
        }
      }
    }

    return res.json({ ok: true, processed: results.length, totalActions, results, timestamp: new Date().toISOString() })
  } catch (err) {
    console.error('[run-agents] Erro fatal:', err)
    return res.status(500).json({ ok: false, error: err.message })
  }
}
