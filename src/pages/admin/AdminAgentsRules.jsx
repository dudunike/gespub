// Admin — Agentes & Regras com dados reais do Supabase
import { useState, useEffect, useCallback } from 'react'
import { IconRobot, IconRefresh, IconAlertCircle, IconChevronDown, IconChevronUp } from '@tabler/icons-react'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { supabase } from '../../lib/supabaseClient'
import { formatRelativeTime } from '../../utils/formatters'

const FREQ_LABELS = { '1h': 'A cada 1h', '6h': 'A cada 6h', '12h': 'A cada 12h', daily: 'A cada 24h', realtime: 'Tempo real' }
const METRIC_LABELS = { roas: 'ROAS', cpa: 'CPA', ctr: 'CTR', cpc: 'CPC', cpm: 'CPM', frequency: 'Frequência', conversions: 'Conversões', impressions: 'Impressões' }
const ACTION_CFG = {
  increase_budget:   { label: 'Orçamento ↑',   variant: 'success' },
  decrease_budget:   { label: 'Orçamento ↓',   variant: 'warning' },
  pause_campaign:    { label: 'Pausou camp.',   variant: 'error'   },
  pause_ad:          { label: 'Pausou anúncio', variant: 'error'   },
  send_notification: { label: 'Notificação',    variant: 'brand'   },
  send_email:        { label: 'E-mail',         variant: 'default' },
}

function StatCard({ label, value, sub, loading }) {
  return (
    <div className="bg-white border border-border rounded-card p-5">
      <p className="text-xs font-medium text-txt-secondary uppercase tracking-wide">{label}</p>
      {loading
        ? <div className="mt-2 h-8 w-20 bg-surface-bg rounded animate-pulse" />
        : <p className="mt-1.5 text-2xl font-bold text-txt-primary">{value ?? '—'}</p>}
      {sub && !loading && <p className="mt-1 text-xs text-txt-secondary">{sub}</p>}
    </div>
  )
}

export default function AdminAgentsRules() {
  const [agents,      setAgents]      = useState([])
  const [topLogs,     setTopLogs]     = useState([])
  const [actionStats, setActionStats] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [expanded,    setExpanded]    = useState(null)
  const [search,      setSearch]      = useState('')

  const loadData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [
        { data: agentsData },
        { data: logsData },
      ] = await Promise.all([
        supabase
          .from('agents')
          .select('id, name, function, metrics, frequency, rules, scope, is_active, total_executions, last_action, last_action_at, created_at, user_id, profiles(name, email)')
          .order('total_executions', { ascending: false }),
        supabase
          .from('agent_logs')
          .select('action, agent_id, executed_at')
          .gte('executed_at', new Date(Date.now() - 30 * 86400000).toISOString()),
      ])

      setAgents(agentsData || [])

      // Contagem por ação
      const actionCount = {}
      ;(logsData || []).forEach(l => { actionCount[l.action] = (actionCount[l.action] || 0) + 1 })
      setActionStats(
        Object.entries(actionCount)
          .sort((a, b) => b[1] - a[1]).slice(0, 6)
          .map(([action, count]) => ({ action, count, cfg: ACTION_CFG[action] || { label: action, variant: 'default' } }))
      )

      // Top agentes por execuções
      const agentCount = {}
      ;(logsData || []).forEach(l => { agentCount[l.agent_id] = (agentCount[l.agent_id] || 0) + 1 })
      setTopLogs(
        Object.entries(agentCount)
          .sort((a, b) => b[1] - a[1]).slice(0, 5)
          .map(([id, count]) => ({ id, count }))
      )
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const totalActive = agents.filter(a => a.is_active).length
  const totalExecs  = agents.reduce((s, a) => s + (a.total_executions || 0), 0)
  const totalActions30d = actionStats.reduce((s, a) => s + a.count, 0)

  const filtered = agents.filter(a => {
    if (!search) return true
    const s = search.toLowerCase()
    return a.name?.toLowerCase().includes(s) ||
           a.profiles?.name?.toLowerCase().includes(s) ||
           a.profiles?.email?.toLowerCase().includes(s)
  })

  const getAgentName = (id) => agents.find(a => a.id === id)?.name || id?.slice(0, 8) + '…'

  return (
    <div className="space-y-5">

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total de agentes"  value={agents.length} sub={`${totalActive} ativo${totalActive !== 1 ? 's' : ''} · ${agents.length - totalActive} inativo${agents.length - totalActive !== 1 ? 's' : ''}`} loading={loading} />
        <StatCard label="Execuções totais"  value={totalExecs.toLocaleString('pt-BR')} sub="Soma acumulada de todos os agentes" loading={loading} />
        <StatCard label="Ações (30 dias)"   value={totalActions30d.toLocaleString('pt-BR')} sub="Todas as ações executadas" loading={loading} />
      </div>

      {/* Barra de busca + refresh */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text" placeholder="Buscar agente ou usuário…"
          value={search} onChange={e => setSearch(e.target.value)}
          className="px-3 py-1.5 text-sm border border-border rounded-input focus:outline-none focus:ring-2 focus:ring-brand-500/30 w-56"
        />
        <Button variant="ghost" size="sm" icon={IconRefresh} onClick={loadData} disabled={loading}>
          {loading ? 'Carregando…' : 'Atualizar'}
        </Button>
        <p className="text-xs text-txt-secondary ml-auto">{filtered.length} agente{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      {error && (
        <div className="flex items-start gap-2 px-3 py-2 bg-status-errorBg border border-status-error rounded-input">
          <IconAlertCircle size={16} className="text-status-error shrink-0 mt-0.5" />
          <p className="text-sm text-status-error">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Lista de agentes expandível */}
        <div className="lg:col-span-2 bg-white border border-border rounded-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-txt-primary">Todos os agentes</h2>
            <p className="text-xs text-txt-secondary mt-0.5">Clique para ver regras e detalhes</p>
          </div>

          {loading ? (
            <div className="p-5 space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-12 bg-surface-bg rounded animate-pulse" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-txt-secondary">
              <IconRobot size={36} strokeWidth={1.5} />
              <p className="text-sm mt-2">Nenhum agente encontrado.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(agent => {
                const isExp = expanded === agent.id
                const top30 = topLogs.find(t => t.id === agent.id)
                return (
                  <div key={agent.id}>
                    <button
                      className="w-full px-5 py-3 flex items-center gap-3 hover:bg-surface-bg/40 transition-colors text-left"
                      onClick={() => setExpanded(isExp ? null : agent.id)}
                    >
                      <div className={`w-2 h-2 rounded-full shrink-0 ${agent.is_active ? 'bg-status-success' : 'bg-border'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-txt-primary truncate">{agent.name}</p>
                        <p className="text-xs text-txt-secondary truncate">
                          {agent.profiles?.name || agent.profiles?.email || '—'}
                          {' · '}{FREQ_LABELS[agent.frequency] || agent.frequency || '—'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${agent.is_active ? 'bg-status-successBg text-status-success' : 'bg-surface-bg text-txt-secondary'}`}>
                          {agent.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                        <span className="text-xs text-txt-secondary">{(agent.total_executions || 0).toLocaleString()} exec.</span>
                        {isExp ? <IconChevronUp size={14} className="text-txt-secondary" /> : <IconChevronDown size={14} className="text-txt-secondary" />}
                      </div>
                    </button>

                    {isExp && (
                      <div className="px-5 pb-4 bg-surface-bg/40 border-t border-border">
                        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
                          <div>
                            <p className="text-txt-secondary">Usuário</p>
                            <p className="font-medium text-txt-primary">{agent.profiles?.name || '—'}</p>
                            <p className="text-txt-secondary">{agent.profiles?.email || ''}</p>
                          </div>
                          <div>
                            <p className="text-txt-secondary">Frequência</p>
                            <p className="font-medium text-txt-primary">{FREQ_LABELS[agent.frequency] || agent.frequency || '—'}</p>
                          </div>
                          <div>
                            <p className="text-txt-secondary">Escopo</p>
                            <p className="font-medium text-txt-primary capitalize">{agent.scope === 'all' ? 'Todas as campanhas' : agent.scope === 'active_only' ? 'Só ativas' : agent.scope || '—'}</p>
                          </div>
                          <div>
                            <p className="text-txt-secondary">Execuções (30d)</p>
                            <p className="font-medium text-txt-primary">{top30?.count ?? 0}</p>
                          </div>
                          {(agent.metrics || []).length > 0 && (
                            <div className="col-span-2">
                              <p className="text-txt-secondary mb-1.5">Métricas monitoradas</p>
                              <div className="flex flex-wrap gap-1">
                                {agent.metrics.map(m => (
                                  <span key={m} className="px-2 py-0.5 bg-brand-50 text-brand-500 rounded-full text-[10px] font-medium border border-brand-100">
                                    {METRIC_LABELS[m] || m}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {(agent.rules || []).filter(r => r.metric).length > 0 && (
                            <div className="col-span-2">
                              <p className="text-txt-secondary mb-1.5">Regras configuradas</p>
                              <div className="space-y-1">
                                {agent.rules.filter(r => r.metric).map((r, i) => (
                                  <div key={i} className="bg-white border border-border rounded-input px-3 py-2 text-[11px] text-txt-primary">
                                    <span className="text-txt-secondary">SE </span>
                                    <span className="font-semibold">{(METRIC_LABELS[r.metric] || r.metric).toUpperCase()}</span>
                                    <span className="text-txt-secondary"> {r.operator} </span>
                                    <span className="font-semibold">{r.value}</span>
                                    <span className="text-txt-secondary"> → </span>
                                    <span className="font-semibold text-brand-500">{r.action}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {agent.last_action && (
                            <div className="col-span-2">
                              <p className="text-txt-secondary">Última ação</p>
                              <p className="font-medium text-txt-primary">{agent.last_action}</p>
                              {agent.last_action_at && <p className="text-txt-secondary">{formatRelativeTime(agent.last_action_at)}</p>}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Sidebar: top ações + top agentes */}
        <div className="space-y-4">
          <div className="bg-white border border-border rounded-card p-5">
            <h2 className="text-sm font-semibold text-txt-primary mb-1">Ações mais executadas</h2>
            <p className="text-xs text-txt-secondary mb-3">Últimos 30 dias</p>
            {loading
              ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-7 bg-surface-bg rounded animate-pulse" />)}</div>
              : actionStats.length === 0
                ? <p className="text-xs text-txt-secondary">Sem execuções ainda.</p>
                : (
                  <div className="space-y-2.5">
                    {actionStats.map(a => {
                      const pct = Math.round((a.count / (actionStats[0]?.count || 1)) * 100)
                      return (
                        <div key={a.action}>
                          <div className="flex items-center justify-between mb-0.5">
                            <Badge variant={a.cfg.variant}>{a.cfg.label}</Badge>
                            <span className="text-xs font-semibold text-txt-primary">{a.count.toLocaleString('pt-BR')}</span>
                          </div>
                          <div className="h-1.5 bg-surface-bg rounded-full overflow-hidden">
                            <div className="h-full bg-brand-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
            }
          </div>

          <div className="bg-white border border-border rounded-card p-5">
            <h2 className="text-sm font-semibold text-txt-primary mb-1">Top agentes</h2>
            <p className="text-xs text-txt-secondary mb-3">Mais ativos nos últimos 30 dias</p>
            {loading
              ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-7 bg-surface-bg rounded animate-pulse" />)}</div>
              : topLogs.length === 0
                ? <p className="text-xs text-txt-secondary">Sem dados ainda.</p>
                : (
                  <div className="space-y-3">
                    {topLogs.map((t, i) => (
                      <div key={t.id}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs text-txt-primary font-medium truncate max-w-[160px]">
                            <span className="text-txt-secondary mr-1">#{i + 1}</span>{getAgentName(t.id)}
                          </span>
                          <span className="text-xs font-semibold text-txt-primary shrink-0">{t.count}</span>
                        </div>
                        <div className="h-1.5 bg-surface-bg rounded-full overflow-hidden">
                          <div className="h-full bg-brand-500 rounded-full" style={{ width: `${Math.round((t.count / (topLogs[0]?.count || 1)) * 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )
            }
          </div>
        </div>
      </div>
    </div>
  )
}
