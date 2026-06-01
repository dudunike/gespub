// ADIM — Visão Geral com KPIs, gráfico, atividade e envio de notificações
import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import {
  IconSpeakerphone, IconX, IconCheck, IconAlertCircle,
} from '@tabler/icons-react'
import KpiCard from '../../components/ui/KpiCard'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { adminKpis, adminUserGrowth, adminActivityFeed } from '../../mock/adminData'
import { supabase } from '../../lib/supabaseClient'
import { formatCurrency, formatDateTime } from '../../utils/formatters'

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-border rounded-input px-3 py-2 text-xs">
        <p className="font-medium text-txt-primary">{label}</p>
        <p className="text-brand-500">{payload[0].value} usuários</p>
      </div>
    )
  }
  return null
}

const actionTypeBadge = {
  rule_execution:  { label: 'Regra',    variant: 'brand'   },
  sync:            { label: 'Sinc.',    variant: 'success' },
  login:           { label: 'Login',    variant: 'default' },
  login_blocked:   { label: 'Bloqueado',variant: 'error'   },
  campaign_action: { label: 'Campanha', variant: 'warning' },
}

const NOTIF_TYPES = [
  { id: 'info',    label: 'Informação' },
  { id: 'success', label: 'Sucesso'    },
  { id: 'warning', label: 'Aviso'      },
  { id: 'error',   label: 'Urgente'    },
]

const TYPE_STYLE = {
  info:    'border-brand-500  bg-brand-50',
  success: 'border-status-success bg-status-successBg',
  warning: 'border-status-warning bg-status-warningBg',
  error:   'border-status-error   bg-status-errorBg',
}

export default function AdminOverview() {
  const [showNotifModal, setShowNotifModal] = useState(false)
  const [notifForm, setNotifForm] = useState({
    title:   '',
    message: '',
    type:    'info',
    target:  'all', // 'all' | 'plan:basic' | 'plan:pro' | 'plan:advanced'
  })
  const [sending,  setSending]  = useState(false)
  const [sent,     setSent]     = useState(false)
  const [sendError, setSendError] = useState('')

  const field = (f) => (e) => setNotifForm(p => ({ ...p, [f]: e.target.value }))

  const handleSend = async (e) => {
    e.preventDefault()
    if (!notifForm.title) { setSendError('Informe o título da notificação.'); return }
    setSending(true); setSendError('')

    try {
      if (notifForm.target === 'all') {
        // Broadcast — user_id = null: todos veem
        const { error } = await supabase.from('notifications').insert([{
          user_id:  null,
          title:    notifForm.title,
          message:  notifForm.message,
          type:     notifForm.type,
          source:   'admin',
          read:     false,
        }])
        if (error) throw new Error(error.message)
      } else {
        // Enviar para usuários de um plano específico
        const plan = notifForm.target.replace('plan:', '')
        const { data: users, error: usersErr } = await supabase
          .from('profiles')
          .select('id')
          .eq('plan', plan)
          .eq('status', 'active')
        if (usersErr) throw new Error(usersErr.message)

        const rows = (users || []).map((u) => ({
          user_id:  u.id,
          title:    notifForm.title,
          message:  notifForm.message,
          type:     notifForm.type,
          source:   'admin',
          read:     false,
        }))
        if (rows.length > 0) {
          const { error } = await supabase.from('notifications').insert(rows)
          if (error) throw new Error(error.message)
        }
      }

      setSent(true)
      setTimeout(() => {
        setSent(false)
        setShowNotifModal(false)
        setNotifForm({ title: '', message: '', type: 'info', target: 'all' })
      }, 1500)
    } catch (err) {
      setSendError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* KPIs globais */}
      <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-5 gap-4">
        <KpiCard label="Total de usuários"       value={adminKpis.totalUsers} />
        <KpiCard label="Ativos hoje"             value={adminKpis.activeUsersToday} delta="+2 vs ontem" deltaType="up" />
        <KpiCard label="Agentes rodando"         value={adminKpis.totalAgentsRunning} />
        <KpiCard label="Regras executadas (24h)" value={adminKpis.totalRulesExecuted24h} delta="+35% vs ontem" deltaType="up" />
        <KpiCard label="MRR"                     value={formatCurrency(adminKpis.mrr)} delta="+8.3% vs mês anterior" deltaType="up" />
      </div>

      {/* Botão enviar notificação */}
      <div className="flex justify-end">
        <Button icon={IconSpeakerphone} onClick={() => setShowNotifModal(true)}>
          Enviar notificação
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gráfico crescimento */}
        <div className="bg-white border border-border rounded-card p-5">
          <h2 className="text-sm font-semibold text-txt-primary mb-4">Crescimento de usuários</h2>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={adminUserGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#71717A', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717A', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="users" stroke="#7C3AED" strokeWidth={2}
                  dot={{ fill: '#7C3AED', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Feed de atividade */}
        <div className="bg-white border border-border rounded-card p-5">
          <h2 className="text-sm font-semibold text-txt-primary mb-4">Atividade recente</h2>
          <div className="space-y-3 max-h-72 overflow-y-auto">
            {adminActivityFeed.slice(0, 8).map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                <div className="shrink-0 mt-0.5">
                  <Badge variant={actionTypeBadge[activity.type]?.variant}>
                    {actionTypeBadge[activity.type]?.label}
                  </Badge>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-txt-primary">
                    <span className="font-medium">{activity.userName}</span>
                    {activity.agentName && <span className="text-brand-500"> → {activity.agentName}</span>}
                    {' — '}{activity.action}
                  </p>
                  <p className="text-xs text-txt-secondary mt-0.5">{activity.result}</p>
                </div>
                <p className="text-xs text-txt-secondary shrink-0">{formatDateTime(activity.timestamp)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal envio de notificação */}
      {showNotifModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-card border border-border w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <IconSpeakerphone size={18} className="text-brand-500" />
                <h2 className="text-sm font-semibold text-txt-primary">Enviar notificação</h2>
              </div>
              <button onClick={() => setShowNotifModal(false)} className="p-1.5 rounded-input text-txt-secondary hover:bg-surface-bg">
                <IconX size={18} />
              </button>
            </div>

            <form onSubmit={handleSend} className="p-5 space-y-4">
              {sendError && (
                <div className="flex items-start gap-2 px-3 py-2 bg-status-errorBg border border-status-error rounded-input">
                  <IconAlertCircle size={16} className="text-status-error shrink-0 mt-0.5" />
                  <p className="text-sm text-status-error">{sendError}</p>
                </div>
              )}

              {/* Tipo */}
              <div>
                <label className="text-sm font-medium text-txt-primary block mb-2">Tipo</label>
                <div className="grid grid-cols-4 gap-2">
                  {NOTIF_TYPES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setNotifForm(p => ({ ...p, type: t.id }))}
                      className={`px-2 py-2 text-xs font-medium rounded-input border-2 transition-all ${
                        notifForm.type === t.id
                          ? TYPE_STYLE[t.id]
                          : 'border-border text-txt-secondary hover:border-border/70 bg-white'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Destinatário */}
              <div>
                <label className="text-sm font-medium text-txt-primary block mb-1.5">Enviar para</label>
                <select
                  value={notifForm.target}
                  onChange={field('target')}
                  className="w-full px-3 py-2 text-sm border border-border rounded-input focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                >
                  <option value="all">Todos os usuários</option>
                  <option value="plan:basic">Plano Básico</option>
                  <option value="plan:pro">Plano Pro</option>
                  <option value="plan:advanced">Plano Avançado</option>
                </select>
              </div>

              {/* Título */}
              <div>
                <label className="text-sm font-medium text-txt-primary block mb-1.5">Título *</label>
                <input
                  type="text"
                  value={notifForm.title}
                  onChange={field('title')}
                  placeholder="Ex: Atualização importante"
                  maxLength={80}
                  required
                  className="w-full px-3 py-2 text-sm border border-border rounded-input focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
              </div>

              {/* Mensagem */}
              <div>
                <label className="text-sm font-medium text-txt-primary block mb-1.5">Mensagem</label>
                <textarea
                  value={notifForm.message}
                  onChange={field('message')}
                  placeholder="Texto da notificação que o usuário verá..."
                  rows={3}
                  maxLength={300}
                  className="w-full px-3 py-2 text-sm border border-border rounded-input focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-none"
                />
                <p className="text-xs text-txt-secondary text-right mt-0.5">{notifForm.message.length}/300</p>
              </div>

              {/* Preview */}
              <div className={`p-3 rounded-input border-l-4 ${
                notifForm.type === 'success' ? 'border-status-success bg-status-successBg' :
                notifForm.type === 'warning' ? 'border-status-warning bg-status-warningBg' :
                notifForm.type === 'error'   ? 'border-status-error bg-status-errorBg'     :
                                               'border-brand-500 bg-brand-50'
              }`}>
                <p className="text-xs font-semibold text-txt-primary">{notifForm.title || 'Prévia do título'}</p>
                {notifForm.message && <p className="text-xs text-txt-secondary mt-0.5">{notifForm.message}</p>}
              </div>

              <div className="pt-2 flex gap-3">
                <Button type="submit" fullWidth disabled={sending || sent} icon={sent ? IconCheck : IconSpeakerphone}>
                  {sent ? 'Enviada!' : sending ? 'Enviando…' : 'Enviar notificação'}
                </Button>
                <Button variant="secondary" fullWidth type="button" onClick={() => setShowNotifModal(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
