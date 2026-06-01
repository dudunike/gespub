// Hook para verificar e aplicar limites do plano do usuário
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { checkLimit, getPlan } from '../utils/planLimits'

export function usePlanLimits() {
  const { user } = useAuth()
  const plan = user?.plan || 'basic'
  const planInfo = getPlan(plan)
  const [usage, setUsage] = useState({ agents: 0, rules: 0, accounts: 0 })

  useEffect(() => {
    if (!user) return
    // Busca uso atual do usuário
    Promise.all([
      supabase.from('agents').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('agents').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_active', true),
      supabase.from('meta_connections').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ]).then(([agentsRes, , accountsRes]) => {
      setUsage({
        agents:   agentsRes.count  || 0,
        accounts: accountsRes.count || 0,
        rules:    0, // TODO: buscar da tabela agents.rules quando existir tabela rules
      })
    }).catch(() => {})
  }, [user])

  // Verifica se pode criar um novo item
  function canCreate(field) {
    const { allowed } = checkLimit(plan, field, usage[field] || 0)
    return allowed
  }

  // Mensagem de limite atingido
  const limitMessage = 'Você atingiu o limite do seu plano. Entre em contato para fazer upgrade.'

  return { plan, planInfo, usage, canCreate, limitMessage, checkLimit: (field, used) => checkLimit(plan, field, used) }
}
