/**
 * Gerencia cron jobs no cron-job.org por agente
 * Chamado pelo frontend quando agente é criado, atualizado, pausado ou deletado
 *
 * Env vars necessárias:
 *   CRONJOB_API_KEY  — API key do cron-job.org
 *   CRONJOB_BASE_URL — URL base da sua app (https://gespub.online)
 *   CRON_SECRET      — segredo para autenticar chamadas
 *   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'

const CRONJOB_API = 'https://api.cron-job.org'

// Mapa de frequência → schedule do cron-job.org
function freqToSchedule(frequency) {
  const base = {
    timezone: 'America/Sao_Paulo',
    expiresAt: 0,
    months: [-1],
    wdays: [-1],
    mdays: [-1],
  }

  switch (frequency) {
    case 'realtime': // a cada 15 minutos
      return { ...base, hours: [-1], minutes: [0, 15, 30, 45] }
    case '6h':
      return { ...base, hours: [0, 6, 12, 18], minutes: [0] }
    case '12h':
      return { ...base, hours: [0, 12], minutes: [0] }
    case 'daily':
    default:
      return { ...base, hours: [9], minutes: [0] } // 9h da manhã BRT
  }
}

async function cronRequest(method, path, body = null) {
  const apiKey = process.env.CRONJOB_API_KEY
  if (!apiKey) throw new Error('CRONJOB_API_KEY não configurada')

  const res = await fetch(`${CRONJOB_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`cron-job.org API: ${JSON.stringify(data)}`)
  return data
}

// Cria um cron job para o agente
async function createCronJob(agentId, agentName, frequency) {
  const baseUrl  = process.env.CRONJOB_BASE_URL || 'https://gespub.online'
  const secret   = process.env.CRON_SECRET || 'gespub-cron-2026'
  const url      = `${baseUrl}/api/run-agents?agentId=${agentId}&secret=${secret}`

  const data = await cronRequest('PUT', '/cronjobs', {
    job: {
      url,
      enabled:       true,
      saveResponses: false,
      title:         `GesPub — ${agentName}`,
      schedule:      freqToSchedule(frequency),
    },
  })
  return data.jobId
}

// Atualiza schedule de um cron job existente
async function updateCronJob(cronJobId, agentName, frequency) {
  await cronRequest('PATCH', `/cronjobs/${cronJobId}`, {
    job: {
      title:    `GesPub — ${agentName}`,
      enabled:  true,
      schedule: freqToSchedule(frequency),
    },
  })
}

// Pausa ou reativa
async function setCronJobEnabled(cronJobId, enabled) {
  await cronRequest('PATCH', `/cronjobs/${cronJobId}`, {
    job: { enabled },
  })
}

// Deleta
async function deleteCronJob(cronJobId) {
  await cronRequest('DELETE', `/cronjobs/${cronJobId}`)
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Auth: token Supabase do usuário logado
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Verifica o usuário pelo JWT
  const { data: { user }, error: authErr } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  )
  if (authErr || !user) {
    return res.status(401).json({ error: 'Token inválido' })
  }

  const { action, agentId, agentName, frequency, enabled } = req.body
  if (!action || !agentId) {
    return res.status(400).json({ error: 'action e agentId são obrigatórios' })
  }

  // Verifica que o agente pertence ao usuário autenticado
  const { data: agent, error: agentErr } = await supabase
    .from('agents')
    .select('id, name, frequency, cronjob_id, user_id')
    .eq('id', agentId)
    .eq('user_id', user.id)
    .single()

  if (agentErr || !agent) {
    return res.status(404).json({ error: 'Agente não encontrado' })
  }

  try {
    switch (action) {
      // Criar cron job para o agente
      case 'create': {
        if (agent.cronjob_id) {
          // Já existe — atualiza
          await updateCronJob(agent.cronjob_id, agentName || agent.name, frequency || agent.frequency)
          return res.json({ ok: true, cronjob_id: agent.cronjob_id, updated: true })
        }
        const jobId = await createCronJob(agentId, agentName || agent.name, frequency || agent.frequency)
        await supabase.from('agents').update({ cronjob_id: String(jobId) }).eq('id', agentId)
        return res.json({ ok: true, cronjob_id: jobId, created: true })
      }

      // Atualizar frequência
      case 'update': {
        if (agent.cronjob_id) {
          await updateCronJob(agent.cronjob_id, agentName || agent.name, frequency || agent.frequency)
        } else {
          const jobId = await createCronJob(agentId, agentName || agent.name, frequency || agent.frequency)
          await supabase.from('agents').update({ cronjob_id: String(jobId) }).eq('id', agentId)
        }
        return res.json({ ok: true })
      }

      // Pausar ou reativar
      case 'toggle': {
        if (agent.cronjob_id) {
          await setCronJobEnabled(agent.cronjob_id, enabled !== false)
        } else if (enabled !== false) {
          const jobId = await createCronJob(agentId, agent.name, agent.frequency)
          await supabase.from('agents').update({ cronjob_id: String(jobId) }).eq('id', agentId)
        }
        return res.json({ ok: true })
      }

      // Deletar cron job ao deletar agente
      case 'delete': {
        if (agent.cronjob_id) {
          await deleteCronJob(agent.cronjob_id).catch(() => {}) // ignora se já não existe
          await supabase.from('agents').update({ cronjob_id: null }).eq('id', agentId)
        }
        return res.json({ ok: true, deleted: true })
      }

      default:
        return res.status(400).json({ error: `Ação desconhecida: ${action}` })
    }
  } catch (err) {
    console.error('[manage-agent-cron] Erro:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
