// Admin — Visão Geral com KPIs reais, gráfico e atividade do Supabase
import { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import {
  IconUsers, IconRobot, IconChartBar, IconCurrencyDollar,
  IconSpeakerphone, IconX, IconCheck, IconAlertCircle,
  IconRefresh, IconTrendingUp, IconTrendingDown,
} from '@tabler/icons-react'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { supabase } from '../../lib/supabaseClient'
import { PLAN_LIMITS } from '../../utils/planLimits'
import { formatCurrency, formatRelativeTime } from '../../utils/formatters'

const PLAN_COLORS = { basic: '#A78BFA', pro: '#7C3AED', advanced: '#5B21B6', enterprise: '#4C1D95' }

const NOTIF_TYPES = [
  { id: 'info',    label: 'Informação' },
  { id: 'success', label: 'Sucesso'    },
  { id: 'warning', label: 'Aviso'      },
  { id: 'error',   label: 'Urgente'    },
]

const ACTION_BADGE = {
  increase_budget:   { label: 'Orçamento ↑', variant: 'success' },
  decrease_budget:   { label: 'Orçamento ↓', variant: 'warning' },
  pause_campaign:    { label: 'Pausou',       variant: 'error'   },
  pause_ad:          { label: 'Pausou ad',    variant: 'error'   },
  send_notification: { label: 'Notificação',  variant: 'brand'   },
  send_email:        { label: 'E-mail',       variant: 'default' },
}

function KpiCard({ label, value, sub, icon: Icon, color = 'text-brand-500', bg = 'bg-brand-50', loading }) {
  return (
    <div className="bg-white border border-border rounded-card p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-txt-secondary uppercase tracking-wide">{label}</p>
          {loading
            ? <div className="mt-2 h-8 w-24 bg-surface-bg rounded animate-pulse" />
            : <p className="mt-1.5 text-2xl font-bold text-txt-primary">{value ?? '—'}</p>}
          {sub && !loading && <p className="mt-1 text-xs text-txt-secondary">{sub}</p>}
        </div>
        <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center shrink-0 ml-3`}>
          <Icon size={20} className={color} strokeWidth={1.5} />
        </div>
      </div>
    </div>
  )
}

export default function AdminOverview() {
  const [loading, setLoading]           = useState(true)
  const [stats,   setStats]             = useState({ totalUsers: 0, agentsActive: 0, logsToday: 0, mrr: 0 })
  const [planBreakdown, setPlanBreakdown] = useState([])
  const [execChart, setExecChart]       = useState([])
  const [recentLogs, setRecentLogs]     = useState([])
  const [showNotif, setShowNotif]       = useState(false)
  const [notifForm, setNotifForm]       = useState({ title: '', message: '', type: 'info', target: 'all' })
  const [sending, setSending]           = useState(false)
  const [sent,    setSent]              = useState(false)
  const [sendErr, setSendErr]           = useState('')

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [
        { count: totalUsers },
        { count: agentsActive },
        { data: plans },
        { data: logs },
        { data: chartLogs },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('agents').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('profiles').select('plan, status'),
        supabase.from('agent_logs')
          .select('id, action, message, executed_at, agent_id, user_id, agents(name), profiles(name, email)')
          .order('executed_at', { ascending: false })
          .limit(15),
        supabase.from('agent_logs')
          .select('executed_at, action')
          .gte('executed_at', new Date(Date.now() - 7 * 86400000).toISOString())
          .order('executed_at', { ascending: true }),
      ])

      // MRR + plan breakdown
      const activePlans = (plans || []).filter(p => p.status === 'active')
      const mrr = activePlans.reduce((s, p) => s + (PLAN_LIMITS[p.plan]?.price || 0), 0)
      const planCount = {}
      ;(plans || []).forEach(p => { planCount[p.plan] = (planCount[p.plan] || 0) + 1 })
      const breakdown = ['basic', 'pro', 'advanced', 'enterprise']
        .filter(k => planCount[k] > 0)
        .map(k => ({ name: PLAN_LIMITS[k]?.name || k, value: planCount[k], color: PLAN_COLORS[k] }))

      // Logs hoje
      const todayStr = new Date().toISOString().slice(0, 10)
      const logsToday = (chartLogs || []).filter(l => l.executed_at?.startsWith(todayStr)).length

      // Chart: execuções por dia (últimos 7 dias)
      const days = {}
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000)
        const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        days[key] = 0
      }
      ;(chartLogs || []).forEach(l => {
        const d = new Date(l.executed_at)
        const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        if (key in days) days[key]++
      })
      const chart = Object.entries(days).map(([dia, total]) => ({ dia, total }))

      setStats({ totalUsers: totalUsers || 0, agentsActive: agentsActive || 0, logsToday, mrr })
      setPlanBreakdown(breakdown)
      setExecChart(chart)
      setRecentLogs(logs || [])
    } catch (e) {
      console.warn('AdminOverview load error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const field = (f) => (e) => setNotifForm(p => ({ ...p, [f]: e.target.value }))

  const handleSend = async (e) => {
    e.preventDefault()
    if (!notifForm.title.trim()) { setSendErr('Informe o título.'); return }
    setSending(true); setSendErr('')
    try {
      if (notifForm.target === 'all') {
        const { error } = await supabase.from('notifications').insert([{
          user_id: null, title: notifForm.title, message: notifForm.message,
          type: notifForm.type, source: 'admin', read: false,
        }])
        if (error) throw new Error(error.message)
      } else {
        const plan = notifForm.target.replace('plan:', '')
        const { data: users, error: ue } = await supabase.from('profiles').select('id').eq('plan', plan).eq('status', 'active')
        if (ue) throw new Error(ue.message)
        if ((users || []).length > 0) {
          const { error } = await supabase.from('notifications').insert(
            users.map(u => ({ user_id: u.id, title: notifForm.title, message: notifForm.message, type: notifForm.type, source: 'admin', read: false }))
          )
          if (error) throw new Error(error.message)
        }
      }
      setSent(true)
      setTimeout(() => { setSent(false); setShowNotif(false); setNotifForm({ title: '', message: '', type: 'info', target: 'all' }) }, 1500)
    } catch (err) { setSendErr(err.message) }
    finally { setSending(false) }
  }

  const typeStyle = {
    info:    'border-brand-500 bg-brand-50',
    success: 'border-status-success bg-status-successBg',
    warning: 'border-status-warning bg-status-warningBg',
    error:   'border-status-error bg-status-errorBg',
  }

  return (
    <div className="space-y-6">

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Total de usuários"      value={stats.totalUsers}            icon={IconUsers}           loading={loading} />
        <KpiCard label="Agentes ativos"         value={stats.agentsActive}           icon={IconRobot}  color="text-brand-500"        bg="bg-brand-50"          loading={loading} />
        <KpiCard label="Execuções hoje"         value={stats.logsToday}             icon={IconChartBar} color="text-status-success"   bg="bg-status-successBg"  loading={loading} />
        <KpiCard label="MRR"                    value={formatCurrency(stats.mrr)}   icon={IconCurrencyDollar} color="text-status-warning" bg="bg-status-warningBg" loading={loading}
          sub={stats.totalUsers > 0 ? `${stats.totalUsers} usuário${stats.totalUsers !== 1 ? 's' : ''} ativos` : undefined} />
      </div>

      {/* Ações */}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" icon={IconRefresh} onClick={loadAll} disabled={loading}>
          {loading ? 'Atualizando…' : 'Atualizar'}
        </Button>
        <Button icon={IconSpeakerphone} onClick={() => setShowNotif(true)}>
          Enviar notificação
        </Button>
      </div>

      {/* Gráfico + Distribuição planos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Execuções por dia */}
        <div className="bg-white border border-border rounded-card p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-txt-primary mb-4">Execuções de agentes — últimos 7 dias</h2>
          {loading
            ? <div className="h-52 bg-surface-bg rounded animate-pulse" />
            : (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={execChart} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" vertical={false} />
                    <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fill: '#71717A', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717A', fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ border: '1px solid #E4E4E7', borderRadius: 8, fontSize: 12 }}
                      formatter={(v) => [`${v} execuções`, '']}
                    />
                    <Bar dataKey="total" fill="#7C3AED" radius={[4, 4, 0, 0]} name="Execuções" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
        </div>

        {/* Distribuição por plano */}
        <div className="bg-white border border-border rounded-card p-5">
          <h2 className="text-sm font-semibold text-txt-primary mb-4">Usuários por plano</h2>
          {loading
            ? <div className="h-52 bg-surface-bg rounded animate-pulse" />
            : planBreakdown.length > 0
              ? (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={planBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                        {planBreakdown.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ fontSize: 12, border: '1px solid #E4E4E7', borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )
              : <p className="text-sm text-txt-secondary text-center py-16">Sem dados de planos ainda.</p>
          }
          {!loading && planBreakdown.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {planBreakdown.map(p => (
                <div key={p.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                    <span className="text-txt-secondary">{p.name}</span>
                  </div>
                  <span className="font-semibold text-txt-primary">{p.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Atividade recente */}
      <div className="bg-white border border-border rounded-card">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-txt-primary">Atividade recente dos agentes</h2>
          <p className="text-xs text-txt-secondary mt-0.5">Últimas execuções em todas as contas</p>
        </div>
        {loading
          ? <div className="p-5 space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-10 bg-surface-bg rounded animate-pulse" />)}</div>
          : recentLogs.length === 0
            ? <p className="text-sm text-txt-secondary text-center py-12">Nenhuma execução registrada ainda.</p>
            : (
              <div className="divide-y divide-border">
                {recentLogs.map(log => {
                  const badge = ACTION_BADGE[log.action] || { label: log.action || '—', variant: 'default' }
                  return (
                    <div key={log.id} className="px-5 py-3 flex items-start gap-3 hover:bg-surface-bg/50 transition-colors">
                      <div className="mt-0.5 shrink-0">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-txt-primary truncate">
                          <span className="font-medium">{log.profiles?.name || log.profiles?.email || 'Usuário'}</span>
                          {log.agents?.name && <span className="text-brand-500"> · {log.agents.name}</span>}
                        </p>
                        <p className="text-xs text-txt-secondary mt-0.5 truncate">{log.message || '—'}</p>
                      </div>
                      <span className="text-xs text-txt-secondary shrink-0 whitespace-nowrap">
                        {formatRelativeTime(log.executed_at)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )
        }
      </div>

      {/* Modal notificação */}
      {showNotif && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-card border border-border w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <IconSpeakerphone size={18} className="text-brand-500" />
                <h2 className="text-sm font-semibold text-txt-primary">Enviar notificação</h2>
              </div>
              <button onClick={() => setShowNotif(false)} className="p-1.5 rounded-input text-txt-secondary hover:bg-surface-bg">
                <IconX size={18} />
              </button>
            </div>
            <form onSubmit={handleSend} className="p-5 space-y-4">
              {sendErr && (
                <div className="flex items-start gap-2 px-3 py-2 bg-status-errorBg border border-status-error rounded-input">
                  <IconAlertCircle size={16} className="text-status-error shrink-0 mt-0.5" />
                  <p className="text-sm text-status-error">{sendErr}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-txt-primary block mb-2">Tipo</label>
                <div className="grid grid-cols-4 gap-2">
                  {NOTIF_TYPES.map(t => (
                    <button key={t.id} type="button" onClick={() => setNotifForm(p => ({ ...p, type: t.id }))}
                      className={`px-2 py-2 text-xs font-medium rounded-input border-2 transition-all ${notifForm.type === t.id ? typeStyle[t.id] : 'border-border text-txt-secondary bg-white'}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-txt-primary block mb-1.5">Enviar para</label>
                <select value={notifForm.target} onChange={field('target')}
                  className="w-full px-3 py-2 text-sm border border-border rounded-input focus:outline-none focus:ring-2 focus:ring-brand-500/30 bg-white">
                  <option value="all">Todos os usuários</option>
                  <option value="plan:basic">Plano Básico</option>
                  <option value="plan:pro">Plano Pro</option>
                  <option value="plan:advanced">Plano Avançado</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-txt-primary block mb-1.5">Título *</label>
                <input type="text" value={notifForm.title} onChange={field('title')} placeholder="Ex: Nova funcionalidade disponível"
                  maxLength={80} required
                  className="w-full px-3 py-2 text-sm border border-border rounded-input focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
              </div>
              <div>
                <label className="text-sm font-medium text-txt-primary block mb-1.5">Mensagem</label>
                <textarea value={notifForm.message} onChange={field('message')} rows={3} maxLength={300}
                  placeholder="Texto da notificação…"
                  className="w-full px-3 py-2 text-sm border border-border rounded-input focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-none" />
                <p className="text-xs text-txt-secondary text-right mt-0.5">{notifForm.message.length}/300</p>
              </div>
              <div className={`p-3 rounded-input border-l-4 ${typeStyle[notifForm.type]}`}>
                <p className="text-xs font-semibold text-txt-primary">{notifForm.title || 'Prévia do título'}</p>
                {notifForm.message && <p className="text-xs text-txt-secondary mt-0.5">{notifForm.message}</p>}
              </div>
              <div className="flex gap-3">
                <Button type="submit" fullWidth disabled={sending || sent} icon={sent ? IconCheck : IconSpeakerphone}>
                  {sent ? 'Enviada!' : sending ? 'Enviando…' : 'Enviar notificação'}
                </Button>
                <Button variant="secondary" fullWidth type="button" onClick={() => setShowNotif(false)}>Cancelar</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
