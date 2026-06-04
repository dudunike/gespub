// Sistema de planos e limites GESPUB.AI

export const PLAN_LIMITS = {
  basic: {
    id: 'basic',
    name: 'Básico',
    price: 29.90,
    accounts: 1,
    agents: 3,
    rules: 3,
    campaigns: 10,
    insights: 50,
    frequency: 'A cada 24h',
    support: 'E-mail',
    badge: 'default',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 67.90,
    accounts: 3,
    agents: 10,
    rules: 15,
    campaigns: 30,
    insights: 200,
    frequency: 'A cada 6h',
    support: 'Prioritário',
    badge: 'brand',
  },
  advanced: {
    id: 'advanced',
    name: 'Avançado',
    price: 147.00,
    accounts: 5,
    agents: 25,
    rules: 40,
    campaigns: 80,
    insights: 500,
    frequency: 'A cada 1h',
    support: 'VIP WhatsApp',
    badge: 'success',
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 0,
    accounts: 999,
    agents: 999,
    rules: 999,
    campaigns: 999,
    insights: 9999,
    frequency: 'A cada 1h',
    support: 'VIP',
    badge: 'success',
  },
}

export const PLAN_OPTIONS = [
  { id: 'basic',    label: 'Básico — R$ 29,90/mês' },
  { id: 'pro',      label: 'Pro — R$ 67,90/mês' },
  { id: 'advanced', label: 'Avançado — R$ 147,00/mês' },
]

export let SYSTEM_CONFIG = {
  maintenanceMode: false,
  globalMessage: ''
}

// Carrega configurações globais e sobrepõe os limites
export async function loadSystemSettings(supabase) {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('id, value')
      .in('id', ['plan_limits', 'system_config'])

    if (error) {
      console.error('Erro ao carregar configurações do sistema:', error)
      return
    }

    if (data) {
      const planLimitsObj = data.find(item => item.id === 'plan_limits')?.value
      if (planLimitsObj) {
        Object.assign(PLAN_LIMITS.basic, planLimitsObj.basic)
        Object.assign(PLAN_LIMITS.pro, planLimitsObj.pro)
        Object.assign(PLAN_LIMITS.advanced, planLimitsObj.advanced)
      }

      const sysConfigObj = data.find(item => item.id === 'system_config')?.value
      if (sysConfigObj) {
        Object.assign(SYSTEM_CONFIG, sysConfigObj)
      }
    }
  } catch (err) {
    console.error('Erro de conexão ao carregar configurações:', err)
  }
}


export const PLAN_BADGE_VARIANT = {
  basic:      'default',
  pro:        'brand',
  advanced:   'success',
  enterprise: 'success',
}

// Retorna os limites do plano (fallback para basic)
export function getPlan(planId) {
  return PLAN_LIMITS[planId] || PLAN_LIMITS.basic
}

// Verifica se a ação está dentro do limite
export function checkLimit(planId, field, currentUsage) {
  const plan = getPlan(planId)
  const limit = plan[field] ?? 0
  if (limit >= 999) return { allowed: true, limit, used: currentUsage, pct: 0 }
  const allowed = currentUsage < limit
  const pct = limit > 0 ? Math.min(100, (currentUsage / limit) * 100) : 100
  return { allowed, limit, used: currentUsage, remaining: limit - currentUsage, pct }
}

// Cor da barra de uso
export function usageColor(pct) {
  if (pct >= 90) return { bar: 'bg-status-error', text: 'text-status-error' }
  if (pct >= 70) return { bar: 'bg-status-warning', text: 'text-status-warning' }
  return { bar: 'bg-status-success', text: 'text-status-success' }
}

// Calcula dias restantes
export function daysUntil(dateString) {
  if (!dateString) return null
  const diff = new Date(dateString) - new Date()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}
