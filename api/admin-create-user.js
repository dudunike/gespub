import { createClient } from '@supabase/supabase-js'
import { runMigrations } from './admin-migrate-db.js'

const SCHEMA_ERROR = 'schema cache'

async function upsertProfile(adminClient, data, autoMigrated = false) {
  const { error } = await adminClient.from('profiles').upsert(data)
  if (!error) return null

  const isSchemaError = error.message?.toLowerCase().includes(SCHEMA_ERROR)
  if (isSchemaError && !autoMigrated) {
    await runMigrations().catch(() => {})
    return upsertProfile(adminClient, data, true)
  }

  return error
}

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

  const adminClient = createClient(supabaseUrl, serviceKey)
  const { data: callerProfile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
  if (!callerProfile || callerProfile.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado (requer cargo de admin)' })
  }

  const { form } = req.body
  if (!form || !form.email || !form.password) {
    return res.status(400).json({ error: 'Dados incompletos' })
  }

  // Cria o usuário no auth (não afeta a sessão do navegador)
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

    // Usuário já existe no auth — busca pelo email e apenas atualiza o perfil
    const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (listError) return res.status(500).json({ error: listError.message })

    const existingUser = usersData?.users?.find(u => u.email === form.email)
    if (!existingUser) return res.status(400).json({ error: createError.message })

    targetUserId = existingUser.id
  } else {
    targetUserId = newUser.user.id
  }

  // Monta perfil completo — auto-migra se colunas ainda não existirem no banco
  const profileError = await upsertProfile(adminClient, {
    id:              targetUserId,
    name:            form.name,
    role:            'user',
    plan:            form.plan,
    status:          form.status,
    plan_start_at:   form.plan_start_at   || null,
    plan_expires_at: form.plan_expires_at || null,
  })

  if (profileError) {
    return res.status(500).json({ error: profileError.message, needsMigration: profileError.message?.toLowerCase().includes(SCHEMA_ERROR) })
  }

  return res.status(200).json({ success: true, user: newUser?.user ?? { id: targetUserId, email: form.email } })
}
