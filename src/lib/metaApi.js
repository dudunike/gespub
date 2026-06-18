// Meta Graph API — leitura e edição de campanhas, conjuntos e anúncios

import { supabase } from './supabaseClient'

async function apiFetch(path, params = {}, method = 'GET', body = null) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Usuário não autenticado')

  const res = await fetch('/api/meta-proxy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ path, params, method, body })
  })

  const data = await res.json()

  if (data.error && data.error.message) {
    const msg = data.error.message || 'Erro desconhecido na Meta API'
    const code = data.error.code
    if (code === 190) throw new Error('Token expirado. Reconecte sua conta Meta.')
    if (code === 100) throw new Error(`Parâmetro inválido: ${msg}`)
    throw new Error(`Meta API (${code}): ${msg}`)
  } else if (data.error) {
    throw new Error(data.error)
  }
  return data
}

// ---------- VALIDAÇÃO DE TOKEN ----------

// Verifica se o token ainda é válido consultando /me
export async function checkTokenValid() {
  try {
    await apiFetch('/me', { fields: 'id' })
    return true
  } catch (err) {
    if (err.message.includes('Token expirado') || err.message.includes('190') || err.message.includes('expirou')) {
      return false
    }
    console.warn('[checkTokenValid] Falhou, mas assumindo válido para evitar deleção acidental:', err.message)
    return true
  }
}

// ---------- CONTAS DE ANÚNCIOS ----------

export async function getAdAccounts() {
  const data = await apiFetch('/me/adaccounts', {
    fields: 'id,name,account_id,currency,account_status,business',
    limit: 50,
  })
  return data.data || []
}

// ---------- CAMPANHAS ----------

export async function getCampaigns(accountId) {
  const data = await apiFetch(`/${accountId}/campaigns`, {
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
export async function getCampaignInsights(accountId, datePreset = 'last_30d', timeRange = null) {
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

  const data = await apiFetch(`/${accountId}/insights`, {
    fields,
    level: 'campaign',
    ...dateParams(datePreset, timeRange),
    limit: 200,
  })
  return data.data || []
}

// Pausar ou ativar campanha
export async function updateCampaignStatus(campaignId, status) {
  return apiFetch(`/${campaignId}`, {}, 'POST', { status })
}

// Atualizar orçamento diário de campanha (valor em centavos da moeda local)
export async function updateCampaignBudget(campaignId, dailyBudgetCents) {
  return apiFetch(`/${campaignId}`, {}, 'POST', {
    daily_budget: String(dailyBudgetCents),
  })
}

// ---------- CONJUNTOS DE ANÚNCIOS ----------

export async function getAdSets(accountId, campaignId = null) {
  const path = campaignId ? `/${campaignId}/adsets` : `/${accountId}/adsets`
  const data = await apiFetch(path, {
    fields: 'id,name,status,effective_status,campaign_id,daily_budget,lifetime_budget,optimization_goal,bid_strategy,created_time',
    limit: 200,
  })
  return data.data || []
}

export async function getAdSetInsights(accountId, datePreset = 'last_30d', timeRange = null) {
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

  const data = await apiFetch(`/${accountId}/insights`, {
    fields,
    level: 'adset',
    ...dateParams(datePreset, timeRange),
    limit: 200,
  })
  return data.data || []
}

export async function updateAdSetStatus(adSetId, status) {
  return apiFetch(`/${adSetId}`, {}, 'POST', { status })
}

export async function updateAdSetBudget(adSetId, dailyBudgetCents) {
  return apiFetch(`/${adSetId}`, {}, 'POST', {
    daily_budget: String(dailyBudgetCents),
  })
}

// ---------- ANÚNCIOS ----------

export async function getAds(accountId) {
  const data = await apiFetch(`/${accountId}/ads`, {
    fields: 'id,name,status,effective_status,adset_id,campaign_id,created_time',
    limit: 200,
  })
  return data.data || []
}

// Busca anúncios com criativos (thumbnail, imagem, vídeo, tipo)
// Pede campos extras para obter imagens em alta resolução
export async function getAdsWithCreatives(accountId) {
  const creativeFields = [
    'thumbnail_url',
    'image_url',
    'image_hash',
    'video_id',
    'object_type',
    'body',
    'title',
    'call_to_action_type',
    'object_story_spec',
    'asset_feed_spec',
    'effective_object_story_id',
  ].join(',')

  const data = await apiFetch(`/${accountId}/ads`, {
    fields: `id,name,status,effective_status,adset_id,adset{name},campaign_id,campaign{name},created_time,creative{${creativeFields}}`,
    limit: 200,
  })
  return data.data || []
}

export async function getAdInsights(accountId, datePreset = 'last_30d', timeRange = null) {
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

  const data = await apiFetch(`/${accountId}/insights`, {
    fields,
    level: 'ad',
    ...dateParams(datePreset, timeRange),
    limit: 200,
  })
  return data.data || []
}

export async function updateAdStatus(adId, status) {
  return apiFetch(`/${adId}`, {}, 'POST', { status })
}

// ---------- HELPERS ----------

// Descobre o page_id real que uma conta de anúncios utiliza
async function findPageForAccount(accountId) {
  // Método 1: Campanhas com promoted_object (mais confiável)
  try {
    const campData = await apiFetch(`/${accountId}/campaigns`, {
      fields: 'promoted_object',
      limit: 20
    })
    for (const camp of (campData.data || [])) {
      if (camp.promoted_object?.page_id) {
        return camp.promoted_object.page_id
      }
    }
  } catch (err) {}

  // Método 2: Anúncios com effective_object_story_id (formato pageId_postId)
  try {
    const adsData = await apiFetch(`/${accountId}/ads`, {
      fields: 'effective_object_story_id',
      limit: 20
    })
    for (const ad of (adsData.data || [])) {
      if (ad.effective_object_story_id) {
        const pageId = ad.effective_object_story_id.split('_')[0]
        if (pageId && /^\d+$/.test(pageId)) {
          return pageId
        }
      }
    }
  } catch (err) {}

  // Método 3: Criativos com object_story_spec.page_id
  try {
    const creativeData = await apiFetch(`/${accountId}/adcreatives`, {
      fields: 'object_story_spec',
      limit: 10
    })
    for (const c of (creativeData.data || [])) {
      if (c.object_story_spec?.page_id) {
        return c.object_story_spec.page_id
      }
    }
  } catch (err) {}

  return null
}

// Seguidores reais: páginas Facebook + Instagram Business vinculado
export async function getPageFollowers(accountId = null) {
  try {
    const data = await apiFetch('/me/accounts', {
      fields: 'id,name,fan_count,instagram_business_account{id,username,followers_count}',
      limit: 10,
    })
    let pages = data.data || []

    if (accountId) {
      const activePageId = await findPageForAccount(accountId)

      if (activePageId) {
        pages = pages.filter(p => p.id === activePageId)
      } else {
        pages = [] // Sem vínculo confirmado, não mostra dados de outra conta
      }
    }

    let fbFollowers = 0
    let igFollowers = 0
    let igUsername = null
    let igLinked = false
    pages.forEach((page) => {
      fbFollowers += Number(page.fan_count || 0)
      if (page.instagram_business_account) {
        igLinked = true
        igFollowers += Number(page.instagram_business_account.followers_count || 0)
        if (!igUsername) igUsername = page.instagram_business_account.username
      }
    })
    return { fbFollowers, igFollowers, igUsername, igLinked, pages, loaded: true }
  } catch (err) {
    return { fbFollowers: 0, igFollowers: 0, igUsername: null, igLinked: false, pages: [], loaded: false, error: err?.message }
  }
}

// Curtidas e comentários nas publicações do Instagram Business vinculado
// Requer permissão instagram_basic (normalmente incluída no token de negócios)
export async function getInstagramPostStats(accountId = null) {
  try {
    const data = await apiFetch('/me/accounts', {
      fields: 'id,name,instagram_business_account{id,username,followers_count,media_count}',
      limit: 10,
    })
    let pages = data.data || []

    if (accountId) {
      const activePageId = await findPageForAccount(accountId)

      if (activePageId) {
        pages = pages.filter(p => p.id === activePageId)
      } else {
        pages = [] // Sem vínculo confirmado, não mostra dados de outra conta
      }
    }

    let igId = null, igUsername = null, igFollowers = 0, igMediaCount = 0
    for (const page of pages) {
      if (page.instagram_business_account?.id) {
        igId        = page.instagram_business_account.id
        igUsername  = page.instagram_business_account.username
        igFollowers = Number(page.instagram_business_account.followers_count || 0)
        igMediaCount = Number(page.instagram_business_account.media_count  || 0)
        break
      }
    }
    if (!igId) return { available: false, reason: 'no_ig_linked' }

    const mediaData = await apiFetch(`/${igId}/media`, {
      fields: 'id,like_count,comments_count,timestamp,media_type',
      limit: 12,
    })
    const media = mediaData.data || []
    const totalLikes    = media.reduce((s, m) => s + Number(m.like_count    || 0), 0)
    const totalComments = media.reduce((s, m) => s + Number(m.comments_count || 0), 0)
    return { available: true, igId, igUsername, igFollowers, igMediaCount, media, totalLikes, totalComments }
  } catch (e) {
    const msg = e.message || ''
    const reason = msg.includes('190') || msg.includes('permission') || msg.includes('OAuthException') ? 'no_permission' : 'error'
    return { available: false, reason, error: msg }
  }
}

export function getActionCount(actions, actionType) {
  if (!Array.isArray(actions)) return 0
  const a = actions.find((x) => x.action_type === actionType)
  return a ? Number(a.value) : 0
}

// Contagem de compras: mesma lógica de prioridade que getPurchaseValue
export function getPurchaseCount(actions) {
  if (!Array.isArray(actions) || actions.length === 0) return 0
  const PRIORITY = [
    'omni_purchase',
    'offsite_conversion.fb_pixel_purchase',
    'onsite_conversion.fb_pixel_purchase',
    'purchase',
    'offsite_conversion.purchase',
  ]
  for (const type of PRIORITY) {
    const a = actions.find((x) => x.action_type === type)
    if (a && Number(a.value) > 0) return Number(a.value)
  }
  const entries = actions.filter(
    (x) => typeof x.action_type === 'string' &&
            x.action_type.toLowerCase().includes('purchase') &&
            Number(x.value) > 0
  )
  return entries.length > 0 ? Math.max(...entries.map((x) => Number(x.value))) : 0
}

export function getActionValue(actionValues, actionType) {
  if (!Array.isArray(actionValues)) return 0
  const av = actionValues.find((x) => x.action_type === actionType)
  return av ? Number(av.value) : 0
}

// Retorna o valor de vendas/compras correspondente ao que o Meta Ads Manager exibe.
// Ordem de prioridade: omni_purchase (todos canais, Meta v17+) → pixel website →
// onsite (Facebook/Instagram shop) → purchase genérico → offsite genérico →
// fallback dinâmico: qualquer action_type com "purchase", pegando o maior valor.
export function getPurchaseValue(actionValues) {
  if (!Array.isArray(actionValues) || actionValues.length === 0) return 0

  const PRIORITY = [
    'omni_purchase',
    'offsite_conversion.fb_pixel_purchase',
    'onsite_conversion.fb_pixel_purchase',
    'purchase',
    'offsite_conversion.purchase',
  ]

  for (const type of PRIORITY) {
    const av = actionValues.find((x) => x.action_type === type)
    if (av && Number(av.value) > 0) return Number(av.value)
  }

  // Fallback: qualquer entrada com "purchase" no nome — usa o maior para pegar omni
  const purchaseEntries = actionValues.filter(
    (x) => typeof x.action_type === 'string' &&
            x.action_type.toLowerCase().includes('purchase') &&
            Number(x.value) > 0
  )
  if (purchaseEntries.length > 0) {
    return Math.max(...purchaseEntries.map((x) => Number(x.value)))
  }

  return 0
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
