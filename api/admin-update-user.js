import { createClient } from '@supabase/supabase-js'

function isSchemaError(msg = '') {
  return msg.toLowerCase().includes('schema cache') || msg.toLowerCase().includes('column')
}

async function safeUpdate(adminClient, userId, data) {
  const { error } = await adminClient.from('profiles').update(data).eq('id', userId)
  if (!error) return null

  if (isSchemaError(error.message)) {
    // Colunas extras ausentes — atualiza só plan e status
    const { error: minErr } = await adminClient.from('profiles').update({
      plan:   data.plan,
      status: data.status,
    }).eq('id', userId)
    return minErr || null
  }

  return error
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Token necessário' })

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey     = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !serviceKey) return res.status(500).json({ error: 'Configuração do servidor incompleta' })

  const anonClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: auth } } })
  const { data: { user }, error: authErr } = await anonClient.auth.getUser(auth.replace('Bearer ', ''))
  if (authErr || !user) return res.status(401).json({ error: 'Não autorizado' })

  const adminClient = createClient(supabaseUrl, serviceKey)
  const { data: callerProfile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
  if (!callerProfile || callerProfile.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' })

  const { userId, form } = req.body
  if (!userId || !form) return res.status(400).json({ error: 'Dados incompletos' })

  const profileError = await safeUpdate(adminClient, userId, {
    plan:            form.plan            || 'basic',
    status:          form.status          || 'active',
    plan_start_at:   form.plan_start_at   || null,
    plan_expires_at: form.plan_expires_at || null,
  })

  if (profileError) return res.status(500).json({ error: profileError.message })

  return res.status(200).json({ ok: true })
}
