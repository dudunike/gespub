import { createClient } from '@supabase/supabase-js'

const META_BASE = 'https://graph.facebook.com/v21.0'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Auth via Supabase JWT
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('[meta-proxy] Supabase env vars missing')
    return res.status(500).json({ error: 'Configuração do servidor incompleta' })
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: auth } }
  })

  const { data: { user }, error: authErr } = await supabase.auth.getUser(auth.replace('Bearer ', ''))
  if (authErr || !user) return res.status(401).json({ error: 'Token inválido' })

  const { path, params = {}, method = 'GET', body = null } = req.body
  if (!path) return res.status(400).json({ error: 'path é obrigatório' })

  // 1. Whitelist de paths permitidos para evitar SSRF
  const ALLOWED_PATHS_REGEX = [
    /^\/me$/,
    /^\/me\/accounts$/,
    /^\/me\/adaccounts$/,
    /^\/me\/businesses$/,
    /^\/act_[0-9]+$/,
    /^\/act_[0-9]+\/campaigns$/,
    /^\/act_[0-9]+\/adsets$/,
    /^\/act_[0-9]+\/ads$/,
    /^\/act_[0-9]+\/insights$/,
    /^\/[0-9]+$/, // ID específico (campanha, conjunto, ad)
  ]

  const INTERNAL_PATHS = ['/add-account', '/pending-accounts']

  if (!INTERNAL_PATHS.includes(path)) {
    if (!path.startsWith('/')) return res.status(400).json({ error: 'Path inválido' })
    if (path.includes('..') || path.includes('://')) return res.status(400).json({ error: 'Path malicioso' })

    const isAllowed = ALLOWED_PATHS_REGEX.some(regex => regex.test(path))
    if (!isAllowed) {
      console.warn(`[meta-proxy] SSRF bloqueado: tentativa de acessar ${path}`)
      return res.status(403).json({ error: 'Acesso negado a este endpoint' })
    }
  }

  // Retorna lista de contas disponíveis usando o token do registro PENDING
  if (path === '/pending-accounts') {
    const { data: pending } = await supabase
      .from('meta_connections')
      .select('access_token')
      .eq('user_id', user.id)
      .eq('account_id', 'PENDING')
      .single()

    if (!pending?.access_token) {
      return res.status(404).json({ error: 'Nenhuma conexão pendente encontrada. Tente reconectar.' })
    }

    const accountsRes = await fetch(
      `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_id,currency,account_status&limit=50&access_token=${pending.access_token}`
    )
    const accountsData = await accountsRes.json()

    if (accountsData.error) {
      console.error('[meta-proxy] pending-accounts Meta error:', accountsData.error)
      return res.status(400).json({ error: accountsData.error.message || 'Erro ao buscar contas no Facebook' })
    }

    return res.status(200).json({ accounts: accountsData.data || [] })
  }

  if (path === '/add-account') {
    // 2. Verifica Limite de Contas no Servidor (bypass prevention)
    const [ { data: profile }, { data: existingConns }, { data: settings } ] = await Promise.all([
      supabase.from('profiles').select('plan, role').eq('id', user.id).single(),
      supabase.from('meta_connections').select('id, account_id, is_active, access_token').eq('user_id', user.id),
      supabase.from('system_settings').select('value').eq('id', 'plan_limits').single()
    ])

    const planId = profile?.plan || 'basic'
    let limit = 1 // default basic
    
    if (profile?.role === 'admin') {
      limit = 999
    } else if (settings?.value?.[planId]?.accounts) {
      limit = settings.value[planId].accounts
    } else {
      // Fallback estático caso settings falhe
      const defaults = { starter: 1, basic: 1, pro: 3, advanced: 5, enterprise: 999 }
      limit = defaults[planId] || 1
    }

    const validConns = existingConns ? existingConns.filter(c => c.account_id !== 'PENDING') : []
    if (validConns.length >= limit) {
      return res.status(403).json({ error: `Limite do plano atingido: máximo de ${limit} contas` })
    }

    // Busca token ativo para usar na nova conexão
    const activeConn = existingConns.find(c => c.is_active) || existingConns[0]
    if (!activeConn || !activeConn.access_token) return res.status(400).json({ error: 'Nenhuma conexão ativa para reaproveitar token' })
    
    await supabase.from('meta_connections').update({ is_active: false }).eq('user_id', user.id)
    
    const { data, error: err } = await supabase.from('meta_connections').upsert({
      user_id: user.id,
      access_token: activeConn.access_token,
      account_id: body.id,
      account_name: body.name,
      currency: body.currency || 'BRL',
      connected_at: new Date().toISOString(),
      is_active: true
    }, { onConflict: 'user_id,account_id' }).select('id, user_id, account_id, account_name, currency, connected_at, is_active').single()
    
    // Remove a conexão PENDING temporária, se existir
    await supabase.from('meta_connections').delete().eq('user_id', user.id).eq('account_id', 'PENDING')

    if (err) return res.status(500).json({ error: err.message })
    return res.status(200).json(data)
  }

  // Busca o access_token da conexão ativa do usuário
  const { data: conn } = await supabase
    .from('meta_connections')
    .select('access_token')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!conn || !conn.access_token) {
    return res.status(400).json({ error: 'Nenhuma conexão ativa do Meta encontrada' })
  }

  try {
    const url = new URL(`${META_BASE}${path}`)
    if (method === 'GET') {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))
    }

    const options = {
      method,
      headers: { Authorization: `Bearer ${conn.access_token}` },
    }
    if (body && method !== 'GET') {
      options.headers['Content-Type'] = 'application/json'
      options.body = JSON.stringify(body)
    }

    const metaRes = await fetch(url.toString(), options)
    const data = await metaRes.json()

    return res.status(metaRes.status).json(data)
  } catch (err) {
    console.error('[meta-proxy] Erro:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
