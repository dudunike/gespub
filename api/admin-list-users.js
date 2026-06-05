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

  // Verifica se o chamador é admin
  const anonClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: auth } } })
  const { data: { user }, error: authErr } = await anonClient.auth.getUser(auth.replace('Bearer ', ''))
  if (authErr || !user) return res.status(401).json({ error: 'Não autorizado' })

  const adminClient = createClient(supabaseUrl, serviceKey)
  const { data: callerProfile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
  if (!callerProfile || callerProfile.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado (requer admin)' })
  }

  // Busca todos os perfis (exceto admins)
  const { data: profiles, error: profilesErr } = await adminClient
    .from('profiles')
    .select('*')
    .neq('role', 'admin')
    .order('created_at', { ascending: false })

  if (profilesErr) return res.status(500).json({ error: profilesErr.message })

  // Busca todos os usuários do auth para cruzar o email
  const { data: authData } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const emailMap = {}
  for (const u of authData?.users ?? []) {
    emailMap[u.id] = u.email
  }

  // Enriquece cada perfil com email e contagens de uso
  const enriched = await Promise.all((profiles ?? []).map(async (p) => {
    const [ag, ac] = await Promise.all([
      adminClient.from('agents').select('id', { count: 'exact', head: true }).eq('user_id', p.id),
      adminClient.from('meta_connections').select('id', { count: 'exact', head: true }).eq('user_id', p.id),
    ])
    return {
      ...p,
      email:          emailMap[p.id] || null,
      agents_used:    ag.count   || 0,
      accounts_used:  ac.count   || 0,
      rules_used:     0,
      campaigns_used: 0,
      insights_used:  p.insights_used_month || 0,
    }
  }))

  return res.status(200).json({ users: enriched })
}
