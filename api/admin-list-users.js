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

  // Busca todos os profiles e todos os usuários do auth em paralelo
  const [profilesRes, authRes] = await Promise.all([
    adminClient.from('profiles').select('*').order('created_at', { ascending: false }),
    adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ])

  const profiles  = profilesRes.data ?? []
  const authUsers = authRes.data?.users ?? []

  // Mapa rápido de id → auth user (para email)
  const authMap = {}
  for (const u of authUsers) authMap[u.id] = u

  // Mapa de id → profile existente
  const profileMap = {}
  for (const p of profiles) profileMap[p.id] = p

  // Une: auth users que não são admin e que têm ou não profile
  const nonAdminAuthUsers = authUsers.filter(u => {
    const p = profileMap[u.id]
    return !p || p.role !== 'admin'
  })

  // Cria profiles stub para usuários do auth sem profile (não bloqueia a exibição)
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

  // Enriquece profiles existentes com email e contagens de uso
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

  // Junta profiles enriquecidos + stubs, mais recentes primeiro
  const all = [...enriched, ...stubs].sort((a, b) => {
    const da = a.created_at ? new Date(a.created_at) : new Date(0)
    const db = b.created_at ? new Date(b.created_at) : new Date(0)
    return db - da
  })

  return res.status(200).json({ users: all })
}
