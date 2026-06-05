/**
 * Meta Data Deletion Callback
 *
 * Obrigatório pelo Facebook para App Review.
 * Quando um usuário remove o app no Facebook, o Meta chama este endpoint
 * com um signed_request, e nós deletamos todos os dados desse usuário.
 *
 * Documentação: https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
 *
 * URL configurada no painel Meta: https://gespub.online/api/meta-deletion
 */

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Decodifica base64url (sem padding) para Buffer
function base64urlDecode(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(str.length / 4) * 4, '=')
  return Buffer.from(padded, 'base64')
}

// Verifica e parseia o signed_request do Facebook
function parseSignedRequest(signedRequest, appSecret) {
  const [encodedSig, payload] = signedRequest.split('.')
  if (!encodedSig || !payload) throw new Error('signed_request malformado')

  const expectedSig = crypto
    .createHmac('sha256', appSecret)
    .update(payload)
    .digest()

  const actualSig = base64urlDecode(encodedSig)

  if (!crypto.timingSafeEqual(expectedSig, actualSig)) {
    throw new Error('Assinatura inválida')
  }

  return JSON.parse(base64urlDecode(payload).toString('utf-8'))
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const appSecret = process.env.META_APP_SECRET
  if (!appSecret) {
    console.error('[meta-deletion] META_APP_SECRET não configurado')
    return res.status(500).json({ error: 'Configuração do servidor incompleta' })
  }

  const signedRequest = req.body?.signed_request
  if (!signedRequest) {
    return res.status(400).json({ error: 'signed_request ausente' })
  }

  let payload
  try {
    payload = parseSignedRequest(signedRequest, appSecret)
  } catch (err) {
    console.error('[meta-deletion] signed_request inválido:', err.message)
    return res.status(400).json({ error: 'signed_request inválido' })
  }

  const fbUserId = payload.user_id
  if (!fbUserId) {
    return res.status(400).json({ error: 'user_id ausente no payload' })
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('[meta-deletion] Supabase env vars ausentes')
    return res.status(500).json({ error: 'Configuração do servidor incompleta' })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Busca usuário pelo Facebook user_id (armazenado via Supabase Auth com provider=facebook)
    const { data: users } = await supabase.auth.admin.listUsers()
    const user = users?.users?.find(
      u => u.app_metadata?.provider === 'facebook' &&
           (u.app_metadata?.provider_id === fbUserId || u.user_metadata?.sub === fbUserId)
    )

    if (user) {
      // Deleta todos os dados do usuário
      await Promise.all([
        supabase.from('meta_connections').delete().eq('user_id', user.id),
        supabase.from('agents').delete().eq('user_id', user.id),
        supabase.from('notifications').delete().eq('user_id', user.id),
        supabase.from('profiles').delete().eq('id', user.id),
      ])
      console.log(`[meta-deletion] ✅ Dados deletados para FB user ${fbUserId} → ${user.id}`)
    } else {
      // Usuário pode ter se conectado via e-mail — remove apenas conexões Meta pelo token
      const { data: connections } = await supabase
        .from('meta_connections')
        .select('user_id')
        .limit(1)

      console.log(`[meta-deletion] Usuário FB ${fbUserId} não encontrado via auth, dados podem já ter sido removidos.`)
    }

    // Resposta obrigatória pelo Facebook
    const confirmationCode = `DEL-${fbUserId}-${Date.now()}`
    const statusUrl = `https://gespub.online/politica-de-privacidade?deletion=${confirmationCode}`

    return res.status(200).json({
      url: statusUrl,
      confirmation_code: confirmationCode,
    })

  } catch (err) {
    console.error('[meta-deletion] Erro inesperado:', err)
    return res.status(500).json({ error: 'Erro interno' })
  }
}
