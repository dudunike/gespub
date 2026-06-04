/**
 * Insights IA com Google Gemini
 * Recebe métricas reais do Meta Ads e retorna análise inteligente em português
 *
 * Env var: GEMINI_API_KEY
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Auth via Supabase JWT
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: { user }, error: authErr } = await supabase.auth.getUser(auth.replace('Bearer ', ''))
  if (authErr || !user) return res.status(401).json({ error: 'Token inválido' })

  const { campaigns, dateLabel, currency = 'BRL' } = req.body
  if (!campaigns?.length) return res.status(400).json({ error: 'campaigns é obrigatório' })

  let apiKey = process.env.GEMINI_API_KEY
  let aiModel = 'gemini-1.5-flash'
  
  const { data: aiConfig } = await supabase.from('system_settings').select('value').eq('id', 'ai_config').single()
  if (aiConfig?.value) {
    if (aiConfig.value.geminiApiKey) apiKey = aiConfig.value.geminiApiKey
    if (aiConfig.value.geminiModel) aiModel = aiConfig.value.geminiModel
  }

  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY não configurada' })

  // Formata métricas para o prompt
  const currencySymbol = currency === 'BRL' ? 'R$' : currency === 'USD' ? 'US$' : currency
  const formatMoney = (v) => `${currencySymbol} ${Number(v).toFixed(2)}`
  const pct = (v) => `${Number(v).toFixed(2)}%`

  const metricsText = campaigns.map((c) => {
    const spend       = Number(c.spend || 0)
    const impressions = Number(c.impressions || 0)
    const clicks      = Number(c.clicks || 0)
    const ctr         = Number(c.ctr || 0)
    const cpc         = Number(c.cpc || 0)
    const cpm         = Number(c.cpm || 0)
    const frequency   = Number(c.frequency || 0)
    const reach       = Number(c.reach || 0)

    // Conversões
    const actions = c.actions || []
    const actionVals = c.action_values || []
    const purchases = actions.find(a => a.action_type === 'purchase')?.value || 0
    const leads     = actions.find(a => a.action_type === 'lead')?.value || 0
    const whatsapp  = actions.find(a => a.action_type?.includes('messaging'))?.value || 0
    const revenue   = actionVals.find(a => a.action_type === 'purchase')?.value || 0
    const conversions = Number(purchases) + Number(leads) + Number(whatsapp)
    const roas = spend > 0 && revenue > 0 ? (Number(revenue) / spend).toFixed(2) : null
    const cpa  = spend > 0 && conversions > 0 ? (spend / conversions).toFixed(2) : null

    return `
Campanha: "${c.campaign_name}"
- Investimento: ${formatMoney(spend)} | Período: ${dateLabel || 'últimos 30 dias'}
- Impressões: ${Number(impressions).toLocaleString('pt-BR')} | Alcance: ${Number(reach).toLocaleString('pt-BR')} | Frequência: ${frequency.toFixed(1)}×
- Cliques: ${Number(clicks).toLocaleString('pt-BR')} | CTR: ${pct(ctr)} | CPC: ${formatMoney(cpc)} | CPM: ${formatMoney(cpm)}
- Compras: ${purchases} | Leads: ${leads} | WhatsApp: ${whatsapp}${revenue > 0 ? ` | Receita: ${formatMoney(revenue)}` : ''}
${roas ? `- ROAS: ${roas}× | CPA: ${cpa ? formatMoney(cpa) : '—'}` : '- Sem conversões rastreadas'}`
  }).join('\n\n')

  const prompt = `Você é um especialista em gestão de tráfego pago no Meta Ads (Facebook e Instagram).
Analise as métricas abaixo e retorne um JSON com insights acionáveis em português do Brasil.

${metricsText}

Retorne EXATAMENTE este JSON (sem markdown, sem backticks, apenas o JSON):
{
  "resumo": "parágrafo curto com visão geral do período",
  "insights": [
    {
      "tipo": "oportunidade" ou "alerta" ou "info",
      "titulo": "título curto e direto",
      "campanha": "nome da campanha ou null se geral",
      "analise": "análise detalhada com contexto e raciocínio (2-4 frases)",
      "acao_recomendada": "o que fazer agora, de forma específica",
      "prioridade": 1 a 5 (1=urgente, 5=baixo)
    }
  ],
  "proximos_passos": ["ação 1", "ação 2", "ação 3"]
}

Regras:
- Foque no que tem maior impacto financeiro
- Seja específico (cite valores, %, nomes de campanhas)
- Priorize alertas de campanhas com alto investimento e baixo retorno
- Identifique oportunidades de escala em campanhas eficientes
- Máximo de 6 insights
- Responda APENAS com o JSON, sem explicações adicionais`

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: aiModel })

    const result = await model.generateContent(prompt)
    const text   = result.response.text().trim()

    // Remove eventual markdown se vier com backticks
    const clean = text.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim()

    let parsed
    try {
      parsed = JSON.parse(clean)
    } catch {
      // Fallback: tenta extrair JSON do texto
      const match = clean.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Gemini não retornou JSON válido')
      parsed = JSON.parse(match[0])
    }

    // Registra uso de insights no perfil do usuário
    await supabase.rpc('increment_insights_used', { uid: user.id }).catch(() => {})

    return res.json({ ok: true, ...parsed })
  } catch (err) {
    console.error('[insights-ai] Erro:', err.message)
    return res.status(500).json({ error: 'Erro ao gerar insights: ' + err.message })
  }
}
