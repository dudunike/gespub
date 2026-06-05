import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Token JWT necessário no header Authorization' })

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey     = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Configuração do servidor incompleta (service_key ausente).' })
  }

  const anonClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: auth } } })
  const { data: { user }, error: authErr } = await anonClient.auth.getUser(auth.replace('Bearer ', ''))
  if (authErr || !user) return res.status(401).json({ error: 'Não autorizado' })

  // Verify if caller is admin
  const adminClient = createClient(supabaseUrl, serviceKey)
  const { data: callerProfile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
  
  if (!callerProfile || callerProfile.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado (requer cargo de admin)' })
  }

  const { form } = req.body
  if (!form || !form.email || !form.password) {
    return res.status(400).json({ error: 'Dados incompletos' })
  }

  // Create user securely via Admin API (does NOT affect the active browser session)
  const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
    email: form.email,
    password: form.password,
    email_confirm: true,
    user_metadata: { name: form.name }
  })

  let targetUserId

  if (createError) {
    const alreadyExists =
      createError.message?.toLowerCase().includes('already registered') ||
      createError.message?.toLowerCase().includes('already been registered') ||
      createError.status === 422

    if (!alreadyExists) return res.status(400).json({ error: createError.message })

    // User exists in auth.users — find them and just upsert the profile
    const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (listError) return res.status(500).json({ error: listError.message })

    const existingUser = usersData?.users?.find(u => u.email === form.email)
    if (!existingUser) return res.status(400).json({ error: createError.message })

    targetUserId = existingUser.id
  } else {
    targetUserId = newUser.user.id
  }

  const { error: profileError } = await adminClient.from('profiles').upsert({
    id:              targetUserId,
    name:            form.name,
    role:            'user',
    plan:            form.plan,
    status:          form.status,
    plan_start_at:   form.plan_start_at   || null,
    plan_expires_at: form.plan_expires_at || null,
  })

  if (profileError) return res.status(500).json({ error: profileError.message })

  return res.status(200).json({ success: true, user: newUser?.user ?? { id: targetUserId, email: form.email } })
}
