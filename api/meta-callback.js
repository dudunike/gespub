/**
 * Meta OAuth Callback — Troca authorization code por access_token (server-side)
 * 
 * O token NUNCA aparece na URL do navegador.
 * O App Secret fica apenas no servidor.
 *
 * Fluxo:
 *   1. Frontend redireciona para Facebook com response_type=code
 *   2. Facebook redireciona para /api/meta-callback?code=XXX&state=YYY
 *   3. Esta rota troca o code por access_token (usando App Secret)
 *   4. Salva a conexão no Supabase
 *   5. Redireciona o usuário de volta para /conexoes?connected=1
 *
 * Env vars: META_APP_SECRET, VITE_META_APP_ID, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
 */

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  const { code, state, error: fbError, error_description } = req.query

  // Dados padrão de retorno
  let returnBase = 'https://www.gespub.online'

  // Decodifica o state (contém JWT do usuário e origin)
  let stateData = {}
  if (state) {
    try {
      // Decodifica base64 → JSON
      const decoded = Buffer.from(state, 'base64').toString('utf-8')
      stateData = JSON.parse(decoded)
      
      if (stateData.o) {
        // Validação contra Open Redirect
        const allowedOrigins = ['https://gespub.online', 'https://www.gespub.online', 'http://localhost:3000', 'http://localhost:5173']
        if (allowedOrigins.includes(stateData.o)) {
          returnBase = stateData.o
        } else {
          console.warn('[meta-callback] Origin não permitida ignorada:', stateData.o)
        }
      }
    } catch {
      // State inválido — continua com defaults
    }
  }

  const redirectTo = (path) => res.redirect(302, `${returnBase}${path}`)

  // Facebook retornou erro (usuário negou permissões)
  if (fbError) {
    console.warn('[meta-callback] Facebook error:', fbError, error_description)
    return redirectTo(`/conexoes?error=${encodeURIComponent(error_description || 'Permissão negada no Facebook')}`)
  }

  if (!code) {
    return redirectTo('/conexoes?error=Código de autorização não recebido')
  }

  const jwt = stateData.t
  if (!jwt) {
    return redirectTo('/conexoes?error=Sessão expirada. Faça login novamente.')
  }

  // Supabase client autenticado como o usuário
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('[meta-callback] Supabase env vars missing')
    return redirectTo('/conexoes?error=Erro de configuração do servidor')
  }

  // Supabase client com o JWT do usuário no cabeçalho para passar nas regras RLS
  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } }
  })

  // Verifica o usuário pelo JWT
  const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt)
  if (authErr || !user) {
    console.error('[meta-callback] Auth error:', authErr?.message)
    return redirectTo('/conexoes?error=Sessão expirada. Faça login novamente.')
  }

  // Credenciais Meta
  const appId = process.env.VITE_META_APP_ID

  if (!appId) {
    console.error('[meta-callback] VITE_META_APP_ID not set')
    return redirectTo('/conexoes?error=App ID não configurado no servidor')
  }

  const appSecret = process.env.META_APP_SECRET

  if (!appSecret) {
    console.error('[meta-callback] META_APP_SECRET not set')
    return redirectTo('/conexoes?error=App Secret não configurado no servidor')
  }

  // redirect_uri deve ser EXATAMENTE igual ao registrado no app Meta
  const rawOrigin = stateData.o || `https://${req.headers.host}`
  const normalizedOrigin = rawOrigin.replace('https://www.', 'https://')
  const redirectUri = normalizedOrigin.startsWith('http://localhost')
    ? `${normalizedOrigin}/conexoes`
    : 'https://gespub.online/conexoes'

  try {
    // ── Troca o code por access_token ──────────────────────────────────────
    const tokenUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token')
    tokenUrl.searchParams.set('client_id', appId)
    tokenUrl.searchParams.set('redirect_uri', redirectUri)
    tokenUrl.searchParams.set('client_secret', appSecret)
    tokenUrl.searchParams.set('code', code)

    const tokenRes = await fetch(tokenUrl.toString())
    const tokenData = await tokenRes.json()

    if (tokenData.error) {
      console.error('[meta-callback] Token exchange error:', tokenData.error)
      return redirectTo(`/conexoes?error=${encodeURIComponent(tokenData.error.message || 'Erro ao trocar código')}`)
    }

    const accessToken = tokenData.access_token
    if (!accessToken) {
      return redirectTo('/conexoes?error=Token não recebido do Facebook')
    }

    // Desativa outras conexões para garantir que a nova PENDING seja a ativa
    await supabase.from('meta_connections').update({ is_active: false }).eq('user_id', user.id)

    // ── Salva o token temporariamente como PENDING ───────────────────────
    const { error: dbErr } = await supabase.from('meta_connections').upsert({
      user_id: user.id,
      access_token: accessToken,
      account_id: 'PENDING',
      account_name: 'Selecionando Conta...',
      currency: 'BRL',
      connected_at: new Date().toISOString(),
      is_active: true,
    }, { onConflict: 'user_id,account_id' })

    if (dbErr) {
      console.error('[meta-callback] DB save error:', dbErr.message)
      return redirectTo(`/conexoes?error=${encodeURIComponent('Erro ao salvar token: ' + dbErr.message)}`)
    }

    console.log(`[meta-callback] ✅ Token recebido para: ${user.email}. Redirecionando para seleção.`)
    return redirectTo('/conexoes?selecting=1')

  } catch (err) {
    console.error('[meta-callback] Unexpected error:', err)
    return redirectTo('/conexoes?error=Erro interno do servidor')
  }
}
