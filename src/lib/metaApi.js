// Meta Graph API — leitura e edição de campanhas, conjuntos e anúncios

const BASE = 'https://graph.facebook.com/v21.0'

async function apiFetch(path, token, params = {}, method = 'GET', body = null) {
  const url = new URL(`${BASE}${path}`)
  if (method === 'GET') {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))
  }

  const options = {
    method,
    headers: { Authorization: `Bearer ${token}` },
  }
  if (body && method !== 'GET') {
    options.headers['Content-Type'] = 'application/json'
    options.body = JSON.stringify(body)
  }

  const res = await fetch(url.toString(), options)
  const data = await res.json()

  if (data.error) {
    const msg = data.error.message || 'Erro desconhecido na Meta API'
    const code = data.error.code
    if (code === 190) throw new Error('Token expirado. Reconecte sua conta Meta.')
    if (code === 100) throw new Error(`Parâmetro inválido: ${msg}`)
    throw new Error(`Meta API (${code}): ${msg}`)
  }
  return data
}

// ---------- VALIDAÇÃO DE TOKEN ----------

// Verifica se o token ainda é válido consultando /me
export async function checkTokenValid(token) {
  try {
    await apiFetch('/me', token, { fields: 'id' })
    return true
  } catch {
    return false
  }
}

// ---------- CONTAS DE ANÚNCIOS ----------

export async function getAdAccounts(token) {
  const data = await apiFetch('/me/adaccounts', token, {
    fields: 'id,name,account_id,currency,account_status,business',
    limit: 50,
  })
  return data.data || []
}

// ---------- CAMPANHAS ----------

export async function getCampaigns(accountId, token) {
  const data = await apiFetch(`/${accountId}/campaigns`, token, {
    fields: 'id,name,status,effective_status,objective,daily_budget,lifetime_budget,start_time,stop_time,created_time',
    limit: 200,
  })
  return data.data || []
}

// Monta parâmetro de data — preset OU range personalizado
function dateParams(datePreset, timeRange) {
  if (timeRange?.since && timeRange?.until) {
    return { time_range: JSON.stringify({ since: timeRange.since, until: timeRange.until }) }
  }
  return { date_preset: datePreset || 'last_30d' }
}

// Insights de campanhas (métricas reais, últimos 30 dias por padrão)
export async function getCampaignInsights(accountId, token, datePreset = 'last_30d', timeRange = null) {
  const fields = [
    'campaign_id',
    'campaign_name',
    'spend',
    'impressions',
    'clicks',
    'ctr',
    'cpc',
    'cpm',
    'reach',
    'frequency',
    'actions',
    'action_values',
    'cost_per_action_type',
  ].join(',')

  const data = await apiFetch(`/${accountId}/insights`, token, {
    fields,
    level: 'campaign',
    ...dateParams(datePreset, timeRange),
    limit: 200,
  })
  return data.data || []
}

// Pausar ou ativar campanha
export async function updateCampaignStatus(campaignId, token, status) {
  return apiFetch(`/${campaignId}`, token, {}, 'POST', { status })
}

// Atualizar orçamento diário de campanha (valor em centavos da moeda local)
export async function updateCampaignBudget(campaignId, token, dailyBudgetCents) {
  return apiFetch(`/${campaignId}`, token, {}, 'POST', {
    daily_budget: String(dailyBudgetCents),
  })
}

// ---------- CONJUNTOS DE ANÚNCIOS ----------

export async function getAdSets(accountId, token, campaignId = null) {
  const path = campaignId ? `/${campaignId}/adsets` : `/${accountId}/adsets`
  const data = await apiFetch(path, token, {
    fields: 'id,name,status,effective_status,campaign_id,daily_budget,lifetime_budget,optimization_goal,bid_strategy,created_time',
    limit: 200,
  })
  return data.data || []
}

export async function getAdSetInsights(accountId, token, datePreset = 'last_30d', timeRange = null) {
  const fields = [
    'adset_id',
    'adset_name',
    'campaign_id',
    'campaign_name',
    'spend',
    'impressions',
    'clicks',
    'ctr',
    'cpc',
    'cpm',
    'reach',
    'frequency',
    'actions',
    'action_values',
  ].join(',')

  const data = await apiFetch(`/${accountId}/insights`, token, {
    fields,
    level: 'adset',
    ...dateParams(datePreset, timeRange),
    limit: 200,
  })
  return data.data || []
}

export async function updateAdSetStatus(adSetId, token, status) {
  return apiFetch(`/${adSetId}`, token, {}, 'POST', { status })
}

export async function updateAdSetBudget(adSetId, token, dailyBudgetCents) {
  return apiFetch(`/${adSetId}`, token, {}, 'POST', {
    daily_budget: String(dailyBudgetCents),
  })
}

// ---------- ANÚNCIOS ----------

export async function getAds(accountId, token) {
  const data = await apiFetch(`/${accountId}/ads`, token, {
    fields: 'id,name,status,effective_status,adset_id,campaign_id,created_time',
    limit: 200,
  })
  return data.data || []
}

// Busca anúncios com criativos (thumbnail, imagem, vídeo, tipo)
export async function getAdsWithCreatives(accountId, token) {
  const creativeFields = [
    'thumbnail_url',
    'image_url',
    'video_id',
    'object_type',
    'body',
    'title',
    'call_to_action_type',
  ].join(',')

  const data = await apiFetch(`/${accountId}/ads`, token, {
    fields: `id,name,status,effective_status,adset_id,adset{name},campaign_id,campaign{name},created_time,creative{${creativeFields}}`,
    limit: 200,
  })
  return data.data || []
}

export async function getAdInsights(accountId, token, datePreset = 'last_30d', timeRange = null) {
  const fields = [
    'ad_id',
    'ad_name',
    'adset_id',
    'adset_name',
    'campaign_id',
    'campaign_name',
    'spend',
    'impressions',
    'clicks',
    'ctr',
    'cpc',
    'cpm',
    'reach',
    'frequency',
    'actions',
    'action_values',
  ].join(',')

  const data = await apiFetch(`/${accountId}/insights`, token, {
    fields,
    level: 'ad',
    ...dateParams(datePreset, timeRange),
    limit: 200,
  })
  return data.data || []
}

export async function updateAdStatus(adId, token, status) {
  return apiFetch(`/${adId}`, token, {}, 'POST', { status })
}

// ---------- HELPERS ----------

export function getActionCount(actions, actionType) {
  if (!Array.isArray(actions)) return 0
  const a = actions.find((x) => x.action_type === actionType)
  return a ? Number(a.value) : 0
}

export function getActionValue(actionValues, actionType) {
  if (!Array.isArray(actionValues)) return 0
  const av = actionValues.find((x) => x.action_type === actionType)
  return av ? Number(av.value) : 0
}

// Conversões disponíveis no Meta para agentes e filtros
export const META_CONVERSIONS = [
  { id: 'purchase', label: 'Compras (Purchase)' },
  { id: 'offsite_conversion.fb_pixel_purchase', label: 'Compras via Pixel' },
  { id: 'onsite_conversion.messaging_conversation_started_7d', label: 'WhatsApp / Messenger (7d)' },
  { id: 'lead', label: 'Leads' },
  { id: 'offsite_conversion.fb_pixel_lead', label: 'Leads via Pixel' },
  { id: 'landing_page_view', label: 'Visualizações da página de destino' },
  { id: 'omni_initiated_checkout', label: 'Checkouts iniciados' },
  { id: 'omni_add_to_cart', label: 'Adições ao carrinho' },
  { id: 'link_click', label: 'Cliques no link' },
  { id: 'video_view', label: 'Visualizações de vídeo (3s)' },
  { id: 'ThruPlay', label: 'ThruPlay' },
]

export const META_STATUS_LABELS = {
  ACTIVE: 'Ativa',
  PAUSED: 'Pausada',
  DELETED: 'Excluída',
  ARCHIVED: 'Arquivada',
  IN_PROCESS: 'Processando',
  WITH_ISSUES: 'Com problemas',
}

export const META_OBJECTIVE_LABELS = {
  OUTCOME_TRAFFIC: 'Tráfego',
  OUTCOME_ENGAGEMENT: 'Engajamento',
  OUTCOME_LEADS: 'Leads',
  OUTCOME_SALES: 'Vendas',
  OUTCOME_AWARENESS: 'Reconhecimento',
  OUTCOME_APP_PROMOTION: 'App',
  CONVERSIONS: 'Conversões',
  LEAD_GENERATION: 'Geração de leads',
  LINK_CLICKS: 'Cliques',
  BRAND_AWARENESS: 'Reconhecimento',
  REACH: 'Alcance',
  VIDEO_VIEWS: 'Vídeo',
  MESSAGES: 'Mensagens',
  POST_ENGAGEMENT: 'Engajamento',
}

// Presets de data para filtros
export const DATE_PRESETS = [
  { id: 'today', label: 'Hoje' },
  { id: 'yesterday', label: 'Ontem' },
  { id: 'last_7d', label: 'Últimos 7 dias' },
  { id: 'last_14d', label: 'Últimos 14 dias' },
  { id: 'last_30d', label: 'Últimos 30 dias' },
  { id: 'this_month', label: 'Este mês' },
  { id: 'last_month', label: 'Mês passado' },
]
