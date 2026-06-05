/**
 * Endpoint de uso único para promover um usuário autenticado a admin.
 * Requer ADMIN_SETUP_SECRET configurado nas env vars do Vercel.
 *
 * Uso: POST /api/setup-admin
 * Headers: Authorization: Bearer <jwt>
 * Body: { "secret": "<ADMIN_SETUP_SECRET>" }
 */

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { secret } = req.body || {}
  const setupSecret = process.env.ADMIN_SETUP_SECRET

  if (!setupSecret) {
    return res.status(503).json({ error: 'ADMIN_SETUP_SECRET não configurado no servidor' })
  }
  if (!secret || secret !== setupSecret) {
    return res.status(403).json({ error: 'Segredo inválido' })
  }

  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Token JWT necessário no header Authorization' })

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) return res.status(500).json({ error: 'SUPABASE_URL não configurado' })
  if (!serviceKey)  return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurado no servidor' })

  // Verifica o JWT para obter o usuário
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  const anonClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: auth } }
  })
  const { data: { user }, error: authErr } = await anonClient.auth.getUser(auth.replace('Bearer ', ''))
  if (authErr || !user) return res.status(401).json({ error: 'JWT inválido ou expirado' })

  // Atualiza com service role (ignora RLS)
  const adminClient = createClient(supabaseUrl, serviceKey)

  // Upsert para garantir que o perfil existe
  const { error } = await adminClient
    .from('profiles')
    .upsert({ id: user.id, role: 'admin' }, { onConflict: 'id' })

  if (error) return res.status(500).json({ error: error.message })

  console.log(`[setup-admin] ✅ ${user.email} promovido a admin`)
  return res.status(200).json({ success: true, email: user.email, role: 'admin' })
}
