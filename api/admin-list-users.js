import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Token JWT necessário' })

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey     = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Configuração do servidor incompleta' })
  }

  // Verifica que o chamador é admin
  const anonClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: auth } } })
  const { data: { user }, error: authErr } = await anonClient.auth.getUser(auth.replace('Bearer ', ''))
  if (authErr || !user) return res.status(401).json({ error: 'Não autorizado' })

  const adminClient = createClient(supabaseUrl, serviceKey)
  const { data: callerProfile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
  if (!callerProfile || callerProfile.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado (requer admin)' })
  }

  // ─── Overview: KPIs + logs recentes (todos os usuários) ─────────────────────
  if (req.query?.action === 'overview') {
    const since7d  = new Date(Date.now() - 7 * 86400000).toISOString()
    const todayStr = new Date().toISOString().slice(0, 10)

    const [profilesRes, agentsRes, recentLogsRes, chartLogsRes] = await Promise.all([
      adminClient.from('profiles').select('plan, status'),
      adminClient.from('agents').select('id', { count: 'exact', head: true }).eq('is_active', true),
      adminClient.from('agent_logs')
        .select('id, action, message, executed_at, agent_id, user_id, agents(name)')
        .order('executed_at', { ascending: false })
        .limit(15),
      adminClient.from('agent_logs')
        .select('executed_at, action')
        .gte('executed_at', since7d)
        .order('executed_at', { ascending: true }),
    ])

    const profiles     = profilesRes.data || []
    const agentsActive = agentsRes.count  || 0
    const logsToday    = (chartLogsRes.data || []).filter(l => l.executed_at?.startsWith(todayStr)).length

    const PRICES = { basic: 27, pro: 47, advanced: 97, enterprise: 297 }
    const mrr = profiles.filter(p => p.status === 'active').reduce((s, p) => s + (PRICES[p.plan] || 0), 0)

    const planCount = {}
    profiles.forEach(p => { planCount[p.plan] = (planCount[p.plan] || 0) + 1 })

    const days = {}
    for (let i = 6; i >= 0; i--) {
      const d   = new Date(Date.now() - i * 86400000)
      const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      days[key] = 0
    }
    ;(chartLogsRes.data || []).forEach(l => {
      const key = new Date(l.executed_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      if (key in days) days[key]++
    })
    const chartData = Object.entries(days).map(([dia, total]) => ({ dia, total }))

    const uids = [...new Set((recentLogsRes.data || []).map(l => l.user_id).filter(Boolean))]
    const pMap = {}
    if (uids.length > 0) {
      const { data: pData } = await adminClient.from('profiles').select('id, name').in('id', uids)
      ;(pData || []).forEach(p => { pMap[p.id] = { name: p.name } })
      const { data: authData } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
      ;(authData?.users || []).forEach(u => {
        if (pMap[u.id]) pMap[u.id].email = u.email
        else if (uids.includes(u.id)) pMap[u.id] = { email: u.email }
      })
    }
    const recentLogs = (recentLogsRes.data || []).map(l => ({ ...l, profile: pMap[l.user_id] || null }))

    return res.status(200).json({ totalUsers: profiles.length, agentsActive, logsToday, mrr, planCount, chartData, recentLogs })
  }

  // ─── Agentes: todos os usuários (bypassa RLS) ─────────────────────────────
  if (req.query?.action === 'agents') {
    const { data: agents, error: agErr } = await adminClient
      .from('agents')
      .select('id, name, function, metrics, frequency, rules, scope, is_active, total_executions, last_action, last_action_at, created_at, user_id, campaign_ids')
      .order('total_executions', { ascending: false })
    if (agErr) return res.status(500).json({ error: agErr.message })

    const uids = [...new Set((agents || []).map(a => a.user_id).filter(Boolean))]
    const nameMap  = {}
    const emailMap = {}
    if (uids.length > 0) {
      const { data: pData } = await adminClient.from('profiles').select('id, name').in('id', uids)
      ;(pData || []).forEach(p => { nameMap[p.id] = p.name })
      const { data: authData } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
      ;(authData?.users || []).forEach(u => { if (uids.includes(u.id)) emailMap[u.id] = u.email })
    }

    const since30d = new Date(Date.now() - 30 * 86400000).toISOString()
    const { data: logs30 } = await adminClient.from('agent_logs').select('agent_id').gte('executed_at', since30d)
    const count30d = {}
    ;(logs30 || []).forEach(l => { count30d[l.agent_id] = (count30d[l.agent_id] || 0) + 1 })

    const enriched = (agents || []).map(a => ({
      ...a,
      user_name:      nameMap[a.user_id]  || null,
      user_email:     emailMap[a.user_id] || null,
      executions_30d: count30d[a.id]      || 0,
    }))

    return res.status(200).json({ agents: enriched })
  }

  // ─── Logs de agentes (todos os usuários) ─────────────────────────────────
  if (req.query?.action === 'logs') {
    const PAGE_SIZE  = 50
    const page       = parseInt(req.query?.page  || '0')
    const userId     = req.query?.userId     || ''
    const agentId    = req.query?.agentId    || ''
    const actionType = req.query?.actionType || ''
    const dateFrom   = req.query?.dateFrom   || ''
    const dateTo     = req.query?.dateTo     || ''

    let q = adminClient
      .from('agent_logs')
      .select('id, action, message, executed_at, metric_key, metric_value, agent_id, user_id, campaign_name, campaign_id, agents(name)', { count: 'exact' })
      .order('executed_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (userId)     q = q.eq('user_id', userId)
    if (agentId)    q = q.eq('agent_id', agentId)
    if (actionType) q = q.eq('action', actionType)
    if (dateFrom)   q = q.gte('executed_at', dateFrom)
    if (dateTo)     q = q.lte('executed_at', dateTo + 'T23:59:59')

    const { data: logs, error: logsErr, count } = await q
    if (logsErr) return res.status(500).json({ error: logsErr.message })

    const uids = [...new Set((logs || []).map(r => r.user_id).filter(Boolean))]
    const profileMap = {}
    if (uids.length > 0) {
      const { data: profiles } = await adminClient.from('profiles').select('id, name').in('id', uids)
      ;(profiles || []).forEach(p => { profileMap[p.id] = { name: p.name } })
      const { data: authData } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
      ;(authData?.users || []).forEach(u => {
        if (profileMap[u.id]) profileMap[u.id].email = u.email
        else profileMap[u.id] = { email: u.email }
      })
    }

    const enriched = (logs || []).map(l => ({ ...l, profile: profileMap[l.user_id] || null }))
    return res.status(200).json({ logs: enriched, total: count || 0 })
  }

  // ─── Lista de usuários (default) ─────────────────────────────────────────
  const [profilesRes, authRes] = await Promise.all([
    adminClient.from('profiles').select('*').order('created_at', { ascending: false }),
    adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ])

  const profiles  = profilesRes.data ?? []
  const authUsers = authRes.data?.users ?? []

  const authMap = {}
  for (const u of authUsers) authMap[u.id] = u

  const profileMap = {}
  for (const p of profiles) profileMap[p.id] = p

  const nonAdminAuthUsers = authUsers.filter(u => {
    const p = profileMap[u.id]
    return !p || p.role !== 'admin'
  })

  const stubs = []
  for (const u of nonAdminAuthUsers) {
    if (!profileMap[u.id]) {
      const name = u.user_metadata?.name || u.email?.split('@')[0] || 'Sem nome'
      await adminClient.from('profiles').upsert({
        id:     u.id,
        name,
        role:   'user',
        plan:   'basic',
        status: 'active',
      }).then(() => {})

      stubs.push({
        id:     u.id,
        name,
        role:   'user',
        plan:   'basic',
        status: 'active',
        email:  u.email,
        agents_used: 0, accounts_used: 0, rules_used: 0, campaigns_used: 0, insights_used: 0,
        plan_start_at: null, plan_expires_at: null,
      })
    }
  }

  const enriched = await Promise.all(
    profiles
      .filter(p => p.role !== 'admin')
      .map(async (p) => {
        const [ag, ac] = await Promise.all([
          adminClient.from('agents').select('id', { count: 'exact', head: true }).eq('user_id', p.id),
          adminClient.from('meta_connections').select('id', { count: 'exact', head: true }).eq('user_id', p.id),
        ])
        return {
          ...p,
          email:         authMap[p.id]?.email ?? null,
          agents_used:   ag.count  ?? 0,
          accounts_used: ac.count  ?? 0,
          rules_used:    0,
          campaigns_used: 0,
          insights_used: p.insights_used_month ?? 0,
        }
      })
  )

  const all = [...enriched, ...stubs].sort((a, b) => {
    const da = a.created_at ? new Date(a.created_at) : new Date(0)
    const db = b.created_at ? new Date(b.created_at) : new Date(0)
    return db - da
  })

  return res.status(200).json({ users: all })
}
