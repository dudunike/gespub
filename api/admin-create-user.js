import { createClient } from '@supabase/supabase-js'

// Colunas que existem no profiles desde a criação original da tabela
const BASE_COLS = ['id', 'name', 'role', 'plan', 'status']

function isSchemaError(msg = '') {
  return msg.toLowerCase().includes('schema cache') || msg.toLowerCase().includes('column')
}

async function safeUpsert(adminClient, data) {
  const { error } = await adminClient.from('profiles').upsert(data)
  if (!error) return null

  if (isSchemaError(error.message)) {
    // Colunas extras não existem ainda — salva só o que o banco tem
    const minimal = Object.fromEntries(Object.entries(data).filter(([k]) => BASE_COLS.includes(k)))
    const { error: minErr } = await adminClient.from('profiles').upsert(minimal)
    return minErr || null
  }

  return error
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Token JWT necessário' })

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey     = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Configuração do servidor incompleta (SUPABASE_SERVICE_ROLE_KEY ausente).' })
  }

  const anonClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: auth } } })
  const { data: { user }, error: authErr } = await anonClient.auth.getUser(auth.replace('Bearer ', ''))
  if (authErr || !user) return res.status(401).json({ error: 'Não autorizado' })

  const adminClient = createClient(supabaseUrl, serviceKey)
  const { data: callerProfile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
  if (!callerProfile || callerProfile.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado (requer admin)' })
  }

  const { form } = req.body
  if (!form?.email || !form?.password) return res.status(400).json({ error: 'Dados incompletos' })

  // Cria no auth (não afeta sessão do admin no browser)
  const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
    email: form.email,
    password: form.password,
    email_confirm: true,
    user_metadata: { name: form.name },
  })

  let targetUserId

  if (createError) {
    const alreadyExists =
      createError.message?.toLowerCase().includes('already registered') ||
      createError.message?.toLowerCase().includes('already been registered') ||
      createError.status === 422

    if (!alreadyExists) return res.status(400).json({ error: createError.message })

    const { data: usersData } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const existing = usersData?.users?.find(u => u.email === form.email)
    if (!existing) return res.status(400).json({ error: createError.message })
    targetUserId = existing.id
  } else {
    targetUserId = newUser.user.id
  }

  const profileError = await safeUpsert(adminClient, {
    id:              targetUserId,
    name:            form.name,
    role:            'user',
    plan:            form.plan   || 'basic',
    status:          form.status || 'active',
    plan_start_at:   form.plan_start_at   || null,
    plan_expires_at: form.plan_expires_at || null,
  })

  if (profileError) return res.status(500).json({ error: profileError.message })

  return res.status(200).json({ success: true, user: newUser?.user ?? { id: targetUserId, email: form.email } })
}
