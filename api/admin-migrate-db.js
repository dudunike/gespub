/**
 * Aplica migrações faltantes na tabela profiles via Supabase Management API.
 * Requer: SUPABASE_ACCESS_TOKEN (token pessoal de https://supabase.com/dashboard/account/tokens)
 */
import { createClient } from '@supabase/supabase-js'

const MIGRATIONS = [
  `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan            text DEFAULT 'basic'`,
  `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_start_at   timestamptz`,
  `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz`,
  `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS insights_used_month int DEFAULT 0`,
  `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS insights_reset_at   timestamptz DEFAULT NOW()`,
  `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url      text`,
  `NOTIFY pgrst, 'reload schema'`,
]

export async function runMigrations() {
  const supabaseUrl  = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
  const accessToken  = process.env.SUPABASE_ACCESS_TOKEN
  const projectRef   = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]

  if (!accessToken || !projectRef) {
    throw Object.assign(new Error('SUPABASE_ACCESS_TOKEN não configurado'), { needsToken: true })
  }

  const errors = []
  for (const query of MIGRATIONS) {
    const r = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ query }),
    })
    if (!r.ok) {
      const body = await r.json().catch(() => ({}))
      errors.push(`${query.slice(0, 60)}… → ${body.message || r.status}`)
    }
  }

  if (errors.length) throw new Error(`Migração parcial:\n${errors.join('\n')}`)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Token necessário' })

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey     = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

  const anonClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: auth } } })
  const { data: { user }, error: authErr } = await anonClient.auth.getUser(auth.replace('Bearer ', ''))
  if (authErr || !user) return res.status(401).json({ error: 'Não autorizado' })

  const adminClient = createClient(supabaseUrl, serviceKey)
  const { data: profile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' })

  try {
    await runMigrations()
    return res.status(200).json({ ok: true, message: 'Migração aplicada com sucesso' })
  } catch (e) {
    if (e.needsToken) {
      return res.status(400).json({
        error: 'SUPABASE_ACCESS_TOKEN não configurado',
        needsToken: true,
        instructions: 'Acesse https://supabase.com/dashboard/account/tokens, gere um token e adicione como SUPABASE_ACCESS_TOKEN nas variáveis de ambiente da Vercel.',
        sql: MIGRATIONS.filter(q => !q.startsWith('NOTIFY')).join(';\n') + ';',
      })
    }
    return res.status(500).json({ error: e.message })
  }
}
