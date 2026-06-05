/**
 * Webhook de Pagamento — Provisiona acesso ao GesPub.ai
 *
 * Recebe eventos de plataformas de pagamento (Stripe, Hotmart, Kiwify, etc.)
 * e cria/atualiza automaticamente a conta do usuário.
 *
 * URL do webhook: https://gespub.online/api/webhook-payment
 * Header de autenticação: x-webhook-secret: <WEBHOOK_SECRET>
 *
 * Env vars:
 *   WEBHOOK_SECRET           — segredo compartilhado com a plataforma de pagamento
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'


function parsePlan(rawPlan = '') {
  const lower = rawPlan.toLowerCase()
  if (lower.includes('enterprise'))                                         return 'enterprise'
  if (lower.includes('advanced') || lower.includes('avan'))                 return 'advanced'
  if (lower.includes('pro'))                                                return 'pro'
  if (lower.includes('basic') || lower.includes('basico') || lower.includes('básico')) return 'basic'
  if (lower.includes('starter'))                                            return 'starter'
  return 'basic'
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Autenticação via secret header
  let secret = process.env.WEBHOOK_SECRET
  const { data: whConfig } = await supabase.from('system_settings').select('value').eq('id', 'webhook_config').single()
  if (whConfig?.value?.secret) {
    secret = whConfig.value.secret
  }

  if (!secret) {
    return res.status(503).json({ error: 'Webhook não configurado no painel admin' })
  }

  if (req.headers['x-webhook-secret'] !== secret) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const body = req.body

  // ── Normaliza payload de diferentes plataformas ───────────────────────────

  let email, name, plan, action, expiresAt

  // Stripe
  if (body.type && body.data?.object) {
    const obj = body.data.object
    if (body.type === 'checkout.session.completed' || body.type === 'invoice.paid') {
      email  = obj.customer_email || obj.customer_details?.email
      name   = obj.customer_details?.name || obj.customer_name || email
      plan   = parsePlan(obj.metadata?.plan || obj.lines?.data?.[0]?.description || 'starter')
      action = 'activate'
      expiresAt = addDays(new Date(), 30)
    } else if (body.type === 'customer.subscription.deleted') {
      email  = obj.customer_email
      action = 'deactivate'
    }
  }

  // Hotmart
  else if (body.event && body.data?.buyer) {
    email  = body.data.buyer.email
    name   = body.data.buyer.name
    plan   = parsePlan(body.data.product?.name || body.data.offer?.code || 'starter')
    action = body.event === 'PURCHASE_APPROVED'     ? 'activate'   :
             body.event === 'PURCHASE_CANCELLED'    ? 'deactivate' :
             body.event === 'PURCHASE_REFUNDED'     ? 'deactivate' :
             body.event === 'SUBSCRIPTION_CANCELLATION' ? 'deactivate' : null
    if (action === 'activate') expiresAt = addDays(new Date(), 30)
  }

  // Kiwify
  else if (body.webhook_event_type && body.Customer) {
    email  = body.Customer.email
    name   = body.Customer.full_name
    plan   = parsePlan(body.Product?.product_name || 'starter')
    action = body.webhook_event_type === 'order_approved'   ? 'activate'   :
             body.webhook_event_type === 'order_refunded'   ? 'deactivate' :
             body.webhook_event_type === 'subscription_canceled' ? 'deactivate' : null
    if (action === 'activate') expiresAt = addDays(new Date(), 30)
  }

  // Formato genérico / manual
  else if (body.email) {
    email     = body.email
    name      = body.name || body.email
    plan      = parsePlan(body.plan || 'starter')
    action    = body.action || 'activate'
    expiresAt = body.expires_at || addDays(new Date(), 30)
  }

  if (!email || !action) {
    console.warn('[webhook-payment] Payload não reconhecido:', JSON.stringify(body).slice(0, 200))
    return res.status(200).json({ ok: true, skipped: true, reason: 'Evento não processado' })
  }

  // ── Busca ou cria usuário ──────────────────────────────────────────────────

  if (action === 'activate') {
    // Verifica se usuário já existe
    const { data: { users } } = await supabase.auth.admin.listUsers()
    const existing = users?.find(u => u.email === email)

    let userId

    if (existing) {
      userId = existing.id
    } else {
      // Cria novo usuário — senha temporária (será redefinida via e-mail)
      const tempPassword = Math.random().toString(36).slice(-12) + 'A1!'
      const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { name: name || email },
      })
      if (createErr) {
        console.error('[webhook-payment] Erro ao criar usuário:', createErr.message)
        return res.status(500).json({ error: createErr.message })
      }
      userId = newUser.user.id

      // Envia e-mail de boas-vindas com link de redefinição de senha
      await supabase.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo: 'https://gespub.online/' },
      }).catch(() => {})
    }

    // Cria/atualiza perfil com plano e data de expiração
    const { error: profileErr } = await supabase.from('profiles').upsert({
      id:               userId,
      name:             name || email,
      role:             'user',
      plan:             plan,
      status:           'active',
      plan_start_at:    new Date().toISOString(),
      plan_expires_at:  expiresAt,
      insights_used_month: 0,
    })

    if (profileErr) {
      console.error('[webhook-payment] Erro ao salvar perfil:', profileErr.message)
      return res.status(500).json({ error: profileErr.message })
    }

    console.log(`[webhook-payment] ✅ Acesso ativado: ${email} → plano ${plan}`)
    return res.json({ ok: true, action: 'activated', email, plan, expires: expiresAt })
  }

  if (action === 'deactivate') {
    // Busca e bloqueia o usuário
    const { data: { users } } = await supabase.auth.admin.listUsers()
    const user = users?.find(u => u.email === email)

    if (user) {
      await supabase.from('profiles').update({ status: 'blocked' }).eq('id', user.id)
      await supabase.auth.admin.updateUserById(user.id, { ban_duration: '87600h' }) // 10 anos
    }

    console.log(`[webhook-payment] ⛔ Acesso revogado: ${email}`)
    return res.json({ ok: true, action: 'deactivated', email })
  }

  return res.json({ ok: true, action: 'unknown' })
}
