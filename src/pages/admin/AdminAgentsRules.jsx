// Admin — Agentes & Regras: todos os usuários via API com service role
import { useState, useEffect, useCallback } from 'react'
import {
  IconRobot, IconRefresh, IconAlertCircle, IconChevronDown, IconChevronUp,
  IconSearch, IconSparkles, IconUser, IconClock, IconBolt,
} from '@tabler/icons-react'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { supabase } from '../../lib/supabaseClient'
import { formatRelativeTime, formatDateTime } from '../../utils/formatters'

const FREQ_LABELS   = { '1h': '1h', '6h': '6h', '12h': '12h', daily: '24h', realtime: 'Real' }
const METRIC_LABELS = { roas: 'ROAS', cpa: 'CPA', ctr: 'CTR', cpc: 'CPC', cpm: 'CPM', frequency: 'Frequência', conversions: 'Conversões', impressions: 'Impressões' }
const ACTION_CFG    = {
  increase_budget:   { label: 'Orçamento ↑',   variant: 'success', dot: 'bg-status-success'  },
  decrease_budget:   { label: 'Orçamento ↓',   variant: 'warning', dot: 'bg-status-warning'  },
  pause_campaign:    { label: 'Pausou camp.',   variant: 'error',   dot: 'bg-status-error'    },
  pause_ad:          { label: 'Pausou anúncio', variant: 'error',   dot: 'bg-status-error'    },
  send_notification: { label: 'Notificação',    variant: 'brand',   dot: 'bg-brand-500'       },
  send_email:        { label: 'E-mail',         variant: 'default', dot: 'bg-border'          },
  ai_analysis:       { label: 'Análise IA',     variant: 'brand',   dot: 'bg-brand-400'       },
}

function initials(name) {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
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

// Mini-log list for expanded agent row
function AgentLogHistory({ agentId, session }) {
  const [logs,    setLogs]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (!agentId || !session) return
    setLoading(true); setError(null)
    const params = new URLSearchParams({ action: 'logs', agentId, page: '0' })
    fetch(`/api/admin-list-users?${params.toString()}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(r => r.json())
      .then(d => { setLogs((d.logs || []).slice(0, 10)); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [agentId, session])

  if (loading) return (
    <div className="space-y-1.5 mt-2">
      {[1, 2, 3].map(i => <div key={i} className="h-7 bg-surface-bg rounded animate-pulse" />)}
    </div>
  )
  if (error) return <p className="text-xs text-status-error mt-2">Erro: {error}</p>
  if (!logs || logs.length === 0) return <p className="text-xs text-txt-secondary mt-2 italic">Sem execuções registradas ainda.</p>

  return (
    <div className="mt-2 space-y-0 divide-y divide-border border border-border rounded-input overflow-hidden">
      {logs.map(log => {
        const cfg   = ACTION_CFG[log.action] || { label: log.action || '—', variant: 'default', dot: 'bg-border' }
        const isAI  = log.action === 'ai_analysis'
        return (
          <div key={log.id} className={`flex items-start gap-2.5 px-3 py-2 text-xs ${isAI ? 'bg-brand-50/30' : 'bg-white'}`}>
            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${cfg.dot}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge variant={cfg.variant}>
                  {isAI && <IconSparkles size={9} className="inline mr-0.5" />}
                  {cfg.label}
                </Badge>
                {log.campaign_name && (
                  <span className="text-brand-500 font-medium truncate max-w-[140px]">{log.campaign_name}</span>
                )}
              </div>
              {log.message && (
                <p className="text-txt-secondary truncate mt-0.5" title={log.message}>{log.message}</p>
              )}
            </div>
            <span className="text-txt-secondary whitespace-nowrap shrink-0">
              {log.executed_at ? formatRelativeTime(log.executed_at) : '—'}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function AdminAgentsRules() {
  const [agents,      setAgents]      = useState([])
  const [actionStats, setActionStats] = useState([])
  const [topAgents,   setTopAgents]   = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [expanded,    setExpanded]    = useState(null)
  const [search,      setSearch]      = useState('')
  const [session,     setSession]     = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => setSession(s))
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const { data: { session: s } } = await supabase.auth.getSession()
      setSession(s)
      if (!s) throw new Error('Sessão expirada')

      const [agentsRes, logsRes] = await Promise.all([
        fetch('/api/admin-list-users?action=agents', {
          headers: { Authorization: `Bearer ${s.access_token}` },
        }).then(r => r.json()),
        fetch('/api/admin-list-users?action=logs&page=0', {
          headers: { Authorization: `Bearer ${s.access_token}` },
        }).then(r => r.json()),
      ])

      if (agentsRes.error) throw new Error(agentsRes.error)

      setAgents(agentsRes.agents || [])

      // build action stats and top agents from logs
      const actionCount = {}
      const agentCount  = {}
      ;(logsRes.logs || []).forEach(l => {
        actionCount[l.action]   = (actionCount[l.action]   || 0) + 1
        agentCount[l.agent_id]  = (agentCount[l.agent_id]  || 0) + 1
      })

      setActionStats(
        Object.entries(actionCount)
          .sort((a, b) => b[1] - a[1]).slice(0, 6)
          .map(([action, count]) => ({ action, count, cfg: ACTION_CFG[action] || { label: action, variant: 'default' } }))
      )
      setTopAgents(
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

  const totalActive   = agents.filter(a => a.is_active).length
  const totalExecs    = agents.reduce((s, a) => s + (a.total_executions || 0), 0)
  const totalActions  = actionStats.reduce((s, a) => s + a.count, 0)

  const filtered = agents.filter(a => {
    if (!search) return true
    const s = search.toLowerCase()
    return a.name?.toLowerCase().includes(s) ||
           a.user_name?.toLowerCase().includes(s) ||
           a.user_email?.toLowerCase().includes(s)
  })

  const getAgentName = (id) => {
    const a = agents.find(x => x.id === id)
    return a?.name || id?.slice(0, 8) + '…'
  }

  return (
    <div className="space-y-5">

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total de agentes"
          value={agents.length}
          sub={`${totalActive} ativo${totalActive !== 1 ? 's' : ''} · ${agents.length - totalActive} inativo${agents.length - totalActive !== 1 ? 's' : ''}`}
          loading={loading}
        />
        <StatCard
          label="Execuções acumuladas"
          value={totalExecs.toLocaleString('pt-BR')}
          sub="Soma de todos os agentes"
          loading={loading}
        />
        <StatCard
          label="Ações (página atual)"
          value={totalActions.toLocaleString('pt-BR')}
          sub="Últimas 50 entradas de log"
          loading={loading}
        />
      </div>

      {/* Busca + refresh */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <IconSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-txt-secondary pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar agente ou usuário…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-sm border border-border rounded-input focus:outline-none focus:ring-2 focus:ring-brand-500/30 w-64"
          />
        </div>
        <Button variant="ghost" size="sm" icon={IconRefresh} onClick={loadData} disabled={loading}>
          {loading ? 'Carregando…' : 'Atualizar'}
        </Button>
        <p className="text-xs text-txt-secondary ml-auto">
          {filtered.length} agente{filtered.length !== 1 ? 's' : ''}
          {filtered.length !== agents.length && ` (de ${agents.length})`}
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 px-3 py-2 bg-status-errorBg border border-status-error rounded-input">
          <IconAlertCircle size={16} className="text-status-error shrink-0 mt-0.5" />
          <p className="text-sm text-status-error">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Lista principal de agentes */}
        <div className="lg:col-span-2 bg-white border border-border rounded-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-txt-primary">Todos os agentes</h2>
              <p className="text-xs text-txt-secondary mt-0.5">Clique para expandir regras e histórico de execuções</p>
            </div>
          </div>

          {loading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-14 bg-surface-bg rounded animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-txt-secondary gap-3">
              <IconRobot size={40} strokeWidth={1.2} className="text-border" />
              <div className="text-center">
                <p className="text-sm font-medium text-txt-primary">Nenhum agente encontrado</p>
                <p className="text-xs mt-1">Os agentes dos usuários aparecerão aqui conforme forem criados.</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(agent => {
                const isExp  = expanded === agent.id
                const rules  = (agent.rules  || []).filter(r => r.metric)
                const metrics = agent.metrics || []

                return (
                  <div key={agent.id}>
                    {/* Row header */}
                    <button
                      className="w-full px-5 py-3.5 flex items-center gap-3 hover:bg-surface-bg/50 transition-colors text-left group"
                      onClick={() => setExpanded(isExp ? null : agent.id)}
                    >
                      {/* Status dot */}
                      <div className={`w-2 h-2 rounded-full shrink-0 ${agent.is_active ? 'bg-status-success' : 'bg-border'}`} />

                      {/* User avatar */}
                      <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-brand-600">{initials(agent.user_name)}</span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-txt-primary truncate">{agent.name}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${agent.is_active ? 'bg-status-successBg text-status-success' : 'bg-surface-bg text-txt-secondary'}`}>
                            {agent.is_active ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                        <p className="text-xs text-txt-secondary truncate mt-0.5">
                          <IconUser size={11} className="inline mr-1 -mt-0.5" />
                          {agent.user_name || agent.user_email || '—'}
                          {agent.user_email && agent.user_name && (
                            <span className="text-txt-secondary/60 ml-1">· {agent.user_email}</span>
                          )}
                        </p>
                      </div>

                      {/* Right side */}
                      <div className="flex items-center gap-3 shrink-0 text-xs text-txt-secondary">
                        <span className="hidden sm:flex items-center gap-1">
                          <IconClock size={12} />
                          {FREQ_LABELS[agent.frequency] || agent.frequency || '—'}
                        </span>
                        <span className="hidden sm:flex items-center gap-1">
                          <IconBolt size={12} />
                          {(agent.total_executions || 0).toLocaleString()} exec.
                        </span>
                        <span className="font-medium text-brand-500">{agent.executions_30d}×/30d</span>
                        {isExp
                          ? <IconChevronUp  size={14} className="text-txt-secondary" />
                          : <IconChevronDown size={14} className="text-txt-secondary" />
                        }
                      </div>
                    </button>

                    {/* Expanded panel */}
                    {isExp && (
                      <div className="bg-surface-bg/50 border-t border-border px-5 py-4 space-y-4">

                        {/* Meta info grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div className="bg-white border border-border rounded-input p-2.5">
                            <p className="text-txt-secondary mb-1">Frequência</p>
                            <p className="font-semibold text-txt-primary">{FREQ_LABELS[agent.frequency] || agent.frequency || '—'}</p>
                          </div>
                          <div className="bg-white border border-border rounded-input p-2.5">
                            <p className="text-txt-secondary mb-1">Escopo</p>
                            <p className="font-semibold text-txt-primary capitalize">
                              {agent.scope === 'all' ? 'Todas' : agent.scope === 'active_only' ? 'Só ativas' : agent.scope === 'specific' ? 'Específicas' : agent.scope || '—'}
                            </p>
                          </div>
                          <div className="bg-white border border-border rounded-input p-2.5">
                            <p className="text-txt-secondary mb-1">Exec. (30d)</p>
                            <p className="font-semibold text-txt-primary">{agent.executions_30d}</p>
                          </div>
                          <div className="bg-white border border-border rounded-input p-2.5">
                            <p className="text-txt-secondary mb-1">Total acum.</p>
                            <p className="font-semibold text-txt-primary">{(agent.total_executions || 0).toLocaleString()}</p>
                          </div>
                        </div>

                        {/* Metrics */}
                        {metrics.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-txt-secondary mb-1.5">Métricas monitoradas</p>
                            <div className="flex flex-wrap gap-1">
                              {metrics.map(m => (
                                <span key={m} className="px-2 py-0.5 bg-brand-50 text-brand-600 rounded-full text-[10px] font-semibold border border-brand-100">
                                  {METRIC_LABELS[m] || m}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Rules */}
                        {rules.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-txt-secondary mb-1.5">Regras configuradas ({rules.length})</p>
                            <div className="space-y-1">
                              {rules.map((r, i) => (
                                <div key={i} className="bg-white border border-border rounded-input px-3 py-2 text-[11px] text-txt-primary flex items-center gap-1 flex-wrap">
                                  <span className="text-txt-secondary">SE</span>
                                  <span className="font-bold text-brand-500">{(METRIC_LABELS[r.metric] || r.metric).toUpperCase()}</span>
                                  <span className="text-txt-secondary">{r.operator}</span>
                                  <span className="font-bold">{r.value}</span>
                                  <span className="text-txt-secondary">→</span>
                                  <span className="font-bold text-status-success">{r.action?.replace(/_/g, ' ')}</span>
                                  {r.amount && <span className="text-txt-secondary">({r.amount}%)</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Last action */}
                        {agent.last_action && (
                          <div className="text-xs">
                            <p className="text-txt-secondary mb-0.5">Última ação executada</p>
                            <p className="font-medium text-txt-primary">{agent.last_action}</p>
                            {agent.last_action_at && (
                              <p className="text-txt-secondary">{formatRelativeTime(agent.last_action_at)} · {formatDateTime(agent.last_action_at)}</p>
                            )}
                          </div>
                        )}

                        {/* Log history */}
                        <div>
                          <p className="text-xs font-medium text-txt-secondary mb-1">Histórico recente de execuções</p>
                          <AgentLogHistory agentId={agent.id} session={session} />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">

          {/* Top ações */}
          <div className="bg-white border border-border rounded-card p-5">
            <h2 className="text-sm font-semibold text-txt-primary mb-0.5">Ações mais executadas</h2>
            <p className="text-xs text-txt-secondary mb-3">Última página (50 logs)</p>
            {loading
              ? <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-7 bg-surface-bg rounded animate-pulse" />)}</div>
              : actionStats.length === 0
                ? <p className="text-xs text-txt-secondary italic">Sem execuções ainda.</p>
                : (
                  <div className="space-y-2.5">
                    {actionStats.map(a => {
                      const pct = Math.round((a.count / (actionStats[0]?.count || 1)) * 100)
                      return (
                        <div key={a.action}>
                          <div className="flex items-center justify-between mb-1">
                            <Badge variant={a.cfg.variant}>{a.cfg.label}</Badge>
                            <span className="text-xs font-bold text-txt-primary">{a.count.toLocaleString('pt-BR')}</span>
                          </div>
                          <div className="h-1.5 bg-surface-bg rounded-full overflow-hidden">
                            <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
            }
          </div>

          {/* Top agentes */}
          <div className="bg-white border border-border rounded-card p-5">
            <h2 className="text-sm font-semibold text-txt-primary mb-0.5">Top agentes</h2>
            <p className="text-xs text-txt-secondary mb-3">Por execuções (30 dias)</p>
            {loading
              ? <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-8 bg-surface-bg rounded animate-pulse" />)}</div>
              : topAgents.length === 0
                ? <p className="text-xs text-txt-secondary italic">Sem dados ainda.</p>
                : (
                  <div className="space-y-3">
                    {topAgents.map((t, i) => {
                      const ag = agents.find(a => a.id === t.id)
                      return (
                        <div key={t.id}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[10px] font-bold text-brand-400 shrink-0">#{i + 1}</span>
                              <div className="min-w-0">
                                <p className="text-xs text-txt-primary font-medium truncate max-w-[140px]">{getAgentName(t.id)}</p>
                                {ag?.user_name && <p className="text-[10px] text-txt-secondary truncate max-w-[140px]">{ag.user_name}</p>}
                              </div>
                            </div>
                            <span className="text-xs font-bold text-txt-primary shrink-0">{t.count}</span>
                          </div>
                          <div className="h-1.5 bg-surface-bg rounded-full overflow-hidden">
                            <div className="h-full bg-brand-500 rounded-full transition-all"
                              style={{ width: `${Math.round((t.count / (topAgents[0]?.count || 1)) * 100)}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
            }
          </div>

          {/* Summary stats */}
          {!loading && agents.length > 0 && (
            <div className="bg-white border border-border rounded-card p-5">
              <h2 className="text-sm font-semibold text-txt-primary mb-3">Resumo de frequência</h2>
              <div className="space-y-1.5">
                {Object.entries(
                  agents.reduce((acc, a) => {
                    const k = FREQ_LABELS[a.frequency] || a.frequency || 'Outro'
                    acc[k] = (acc[k] || 0) + 1
                    return acc
                  }, {})
                ).map(([freq, cnt]) => (
                  <div key={freq} className="flex items-center justify-between text-xs">
                    <span className="text-txt-secondary">{freq}</span>
                    <span className="font-semibold text-txt-primary">{cnt} agente{cnt !== 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
