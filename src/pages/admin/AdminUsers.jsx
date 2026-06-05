// ADIM — Gestão de Usuários com planos, uso e criação manual
import { useState, useEffect, useCallback } from 'react'
import {
  IconEdit, IconLock, IconLockOpen,
  IconPlus, IconAlertTriangle, IconX,
} from '@tabler/icons-react'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import { supabase } from '../../lib/supabaseClient'
import {
  PLAN_OPTIONS, PLAN_LIMITS, PLAN_BADGE_VARIANT,
  getPlan, usageColor, daysUntil,
} from '../../utils/planLimits'
import { formatDate } from '../../utils/formatters'

const STATUS_OPTIONS = [
  { id: 'active',   label: 'Ativo' },
  { id: 'inactive', label: 'Inativo' },
  { id: 'blocked',  label: 'Bloqueado' },
]

const STATUS_STYLE = {
  active:   'bg-status-successBg text-status-success',
  inactive: 'bg-surface-bg text-txt-secondary',
  blocked:  'bg-status-errorBg text-status-error',
}

// Barra de uso com cor por threshold
function UsageBar({ label, used, limit }) {
  if (limit >= 999) {
    return (
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-txt-secondary">{label}</span>
          <span className="font-medium text-status-success">{used} / ∞</span>
        </div>
        <div className="h-1.5 bg-surface-bg rounded-full" />
      </div>
    )
  }
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0
  const { bar, text } = usageColor(pct)
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-txt-secondary">{label}</span>
        <span className={`font-medium ${text}`}>{used} / {limit}</span>
      </div>
      <div className="h-1.5 bg-surface-bg rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${bar} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// Drawer de detalhe/edição
function UserDrawer({ user, onClose, onSave }) {
  const [tab, setTab] = useState('plan')
  const [form, setForm] = useState({
    name:            user?.name            || '',
    plan:            user?.plan            || 'basic',
    status:          user?.status          || 'active',
    plan_start_at:   user?.plan_start_at   ? user.plan_start_at.split('T')[0]   : '',
    plan_expires_at: user?.plan_expires_at ? user.plan_expires_at.split('T')[0] : '',
  })
  const [saving, setSaving] = useState(false)
  const days = daysUntil(user?.plan_expires_at)

  const field = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }))

  const handleSave = async () => {
    setSaving(true)
    await onSave(user.id, form)
    setSaving(false)
    onClose()
  }

  const planInfo = getPlan(form.plan)
  const usageRows = [
    { label: 'Contas Meta Ads',       used: user?.accounts_used || 0, limit: getPlan(form.plan).accounts },
    { label: 'Agentes IA',            used: user?.agents_used   || 0, limit: getPlan(form.plan).agents },
    { label: 'Regras de automação',   used: user?.rules_used    || 0, limit: getPlan(form.plan).rules },
    { label: 'Campanhas gerenciadas', used: user?.campaigns_used|| 0, limit: getPlan(form.plan).campaigns },
    { label: 'Insights este mês',     used: user?.insights_used || 0, limit: getPlan(form.plan).insights },
  ]

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border sticky top-0 bg-white z-10">
          <Avatar name={user?.name || '?'} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-txt-primary truncate">{user?.name || '—'}</p>
            <p className="text-xs text-txt-secondary truncate">{user?.email || '—'}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-input text-txt-secondary hover:bg-surface-bg">
            <IconX size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-5">
          {[{ id: 'plan', label: 'Plano & Acesso' }, { id: 'usage', label: 'Uso atual' }].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`py-3 px-1 mr-5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-brand-500 text-brand-500'
                  : 'border-transparent text-txt-secondary hover:text-txt-primary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 p-5 space-y-4">
          {tab === 'plan' ? (
            <>
              {/* Alertas de vencimento */}
              {days !== null && days < 0 && (
                <div className="flex items-start gap-2 p-3 bg-status-errorBg border border-status-error rounded-input">
                  <IconAlertTriangle size={16} className="text-status-error shrink-0 mt-0.5" />
                  <p className="text-xs font-medium text-txt-primary">Plano vencido há {Math.abs(days)} dia{Math.abs(days) !== 1 ? 's' : ''}.</p>
                </div>
              )}
              {days !== null && days >= 0 && days <= 3 && (
                <div className="flex items-start gap-2 p-3 bg-status-warningBg border border-status-warning rounded-input">
                  <IconAlertTriangle size={16} className="text-status-warning shrink-0 mt-0.5" />
                  <p className="text-xs font-medium text-txt-primary">
                    Plano vence em <strong>{days === 0 ? 'hoje' : `${days} dia${days !== 1 ? 's' : ''}`}</strong>. Renove manualmente ou configure o webhook.
                  </p>
                </div>
              )}

              <Select label="Plano" name="plan" value={form.plan} onChange={field('plan')} options={PLAN_OPTIONS} />

              {/* Preview do plano */}
              <div className="p-3 bg-brand-50 border border-brand-100 rounded-input">
                <p className="text-xs font-bold text-brand-500 mb-2">{planInfo.name} — R$ {planInfo.price > 0 ? planInfo.price.toFixed(2).replace('.', ',') : 'Admin'}/mês</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-txt-secondary">
                  <span>Contas: <b className="text-txt-primary">{planInfo.accounts >= 999 ? '∞' : planInfo.accounts}</b></span>
                  <span>Agentes: <b className="text-txt-primary">{planInfo.agents >= 999 ? '∞' : planInfo.agents}</b></span>
                  <span>Regras: <b className="text-txt-primary">{planInfo.rules >= 999 ? '∞' : planInfo.rules}</b></span>
                  <span>Insights/mês: <b className="text-txt-primary">{planInfo.insights >= 9999 ? '∞' : planInfo.insights}</b></span>
                  <span>Análise: <b className="text-txt-primary">{planInfo.frequency}</b></span>
                  <span>Suporte: <b className="text-txt-primary">{planInfo.support}</b></span>
                </div>
              </div>

              <Select label="Status de acesso" name="status" value={form.status} onChange={field('status')} options={STATUS_OPTIONS} />

              <div className="grid grid-cols-2 gap-3">
                <Input label="Início do plano" name="plan_start_at" type="date" value={form.plan_start_at} onChange={field('plan_start_at')} />
                <Input label="Vencimento" name="plan_expires_at" type="date" value={form.plan_expires_at} onChange={field('plan_expires_at')} />
              </div>

              {form.plan_expires_at && (() => {
                const d = daysUntil(form.plan_expires_at)
                if (d === null) return null
                const color = d < 0 ? 'text-status-error' : d <= 3 ? 'text-status-warning' : 'text-txt-secondary'
                const text  = d < 0 ? `Vencido há ${Math.abs(d)} dia${Math.abs(d) !== 1 ? 's' : ''}` : d === 0 ? 'Vence hoje' : `${d} dia${d !== 1 ? 's' : ''} restante${d !== 1 ? 's' : ''}`
                return <p className={`text-xs ${color}`}>{text}</p>
              })()}
            </>
          ) : (
            <>
              <p className="text-xs text-txt-secondary mb-2">Uso atual vs limite do plano <strong>{planInfo.name}</strong>.</p>
              <div className="space-y-4">
                {usageRows.map((r) => <UsageBar key={r.label} {...r} />)}
              </div>
            </>
          )}
        </div>

        <div className="px-5 pb-5 pt-3 border-t border-border flex gap-2 sticky bottom-0 bg-white">
          <Button fullWidth onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar alterações'}
          </Button>
          <Button variant="secondary" fullWidth onClick={onClose}>Cancelar</Button>
        </div>
      </div>
    </div>
  )
}

// Modal de criação manual de usuário
function CreateUserModal({ onClose, onCreate }) {
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    plan: 'basic', status: 'active',
    plan_start_at:   new Date().toISOString().split('T')[0],
    plan_expires_at: (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split('T')[0] })(),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const field = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }))

  const handleStartChange = (e) => {
    const start = e.target.value
    const exp = new Date(start); exp.setDate(exp.getDate() + 30)
    setForm(p => ({ ...p, plan_start_at: start, plan_expires_at: exp.toISOString().split('T')[0] }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.password) { setError('Preencha todos os campos obrigatórios.'); return }
    setSaving(true); setError('')
    try {
      await onCreate(form)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const planInfo = getPlan(form.plan)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-card border border-border w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-white">
          <h2 className="text-sm font-semibold text-txt-primary">Criar usuário manualmente</h2>
          <button onClick={onClose} className="p-1.5 rounded-input text-txt-secondary hover:bg-surface-bg">
            <IconX size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="px-3 py-2 text-sm text-status-error bg-status-errorBg rounded-input">{error}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Nome completo *" name="name"     value={form.name}     onChange={field('name')}     placeholder="Nome do usuário"    required />
            <Input label="E-mail *"        name="email"    type="email" value={form.email}    onChange={field('email')}    placeholder="email@empresa.com" required />
          </div>
          <Input label="Senha provisória *" name="password" type="password" value={form.password} onChange={field('password')} placeholder="Mínimo 6 caracteres" required />

          <Select label="Plano *" name="plan" value={form.plan} onChange={field('plan')} options={PLAN_OPTIONS} required />

          {/* Preview rápido do plano */}
          <div className="p-3 bg-surface-bg border border-border rounded-input text-xs text-txt-secondary grid grid-cols-3 gap-1">
            <span>Contas: <b className="text-txt-primary">{planInfo.accounts >= 999 ? '∞' : planInfo.accounts}</b></span>
            <span>Agentes: <b className="text-txt-primary">{planInfo.agents >= 999 ? '∞' : planInfo.agents}</b></span>
            <span>Regras: <b className="text-txt-primary">{planInfo.rules >= 999 ? '∞' : planInfo.rules}</b></span>
            <span>Campanhas: <b className="text-txt-primary">{planInfo.campaigns >= 999 ? '∞' : planInfo.campaigns}</b></span>
            <span>Insights: <b className="text-txt-primary">{planInfo.insights >= 9999 ? '∞' : planInfo.insights}/mês</b></span>
            <span>Suporte: <b className="text-txt-primary">{planInfo.support}</b></span>
          </div>

          <Select label="Status inicial" name="status" value={form.status} onChange={field('status')} options={STATUS_OPTIONS} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-txt-primary block mb-1.5">Início do plano *</label>
              <input type="date" value={form.plan_start_at} onChange={handleStartChange}
                className="w-full px-3 py-2 text-sm border border-border rounded-input focus:outline-none focus:ring-2 focus:ring-brand-500/30" required />
            </div>
            <div>
              <label className="text-sm font-medium text-txt-primary block mb-1.5">Vencimento *</label>
              <input type="date" value={form.plan_expires_at} onChange={field('plan_expires_at')}
                className="w-full px-3 py-2 text-sm border border-border rounded-input focus:outline-none focus:ring-2 focus:ring-brand-500/30" required />
            </div>
          </div>

          {form.plan_expires_at && (
            <p className="text-xs text-txt-secondary">
              {(() => {
                const d = daysUntil(form.plan_expires_at)
                if (d === null) return ''
                return d > 0 ? `Plano ativo por ${d} dias` : 'Atenção: data de vencimento no passado'
              })()}
            </p>
          )}

          <div className="pt-2 flex gap-3">
            <Button type="submit" fullWidth disabled={saving}>{saving ? 'Criando…' : 'Criar usuário'}</Button>
            <Button variant="secondary" fullWidth type="button" onClick={onClose}>Cancelar</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminUsers() {
  const [users,        setUsers]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [planFilter,   setPlanFilter]   = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search,       setSearch]       = useState('')
  const [drawerUser,   setDrawerUser]   = useState(null)
  const [showCreate,   setShowCreate]   = useState(false)
  const [expiringCount, setExpiringCount] = useState(0)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .neq('role', 'admin')
        .order('created_at', { ascending: false })

      if (data) {
        // Enriquece cada perfil com contagens de uso
        const enriched = await Promise.all(data.map(async (u) => {
          const [ag, ac] = await Promise.all([
            supabase.from('agents').select('id', { count: 'exact', head: true }).eq('user_id', u.id),
            supabase.from('meta_connections').select('id', { count: 'exact', head: true }).eq('user_id', u.id),
          ])
          return { ...u, agents_used: ag.count || 0, accounts_used: ac.count || 0, rules_used: 0, campaigns_used: 0, insights_used: u.insights_used_month || 0 }
        }))

        setUsers(enriched)
        setExpiringCount(enriched.filter(u => { const d = daysUntil(u.plan_expires_at); return d !== null && d >= 0 && d <= 3 }).length)
      }
    } catch (e) {
      console.warn(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  const handleSaveUser = async (userId, form) => {
    await supabase.from('profiles').update({
      plan:            form.plan,
      status:          form.status,
      plan_start_at:   form.plan_start_at   || null,
      plan_expires_at: form.plan_expires_at || null,
    }).eq('id', userId)
    await loadUsers()
  }

  const handleCreateUser = async (form) => {
    const { data: { session: adminSession } } = await supabase.auth.getSession()
    if (!adminSession?.access_token) throw new Error('Sessão expirada. Faça login novamente.')

    try {
      // Tentativa 1: Via API (Seguro e não afeta a sessão do navegador)
      const res = await fetch('/api/admin-create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminSession.access_token}`
        },
        body: JSON.stringify({ form })
      })

      const result = await res.json()
      
      if (res.ok) {
        await loadUsers()
        return
      }

      // Se falhou por outro motivo que não seja a chave ausente, exibe o erro
      if (!result.error?.includes('service_key ausente') && !result.error?.includes('Configuração do servidor')) {
        throw new Error(result.error)
      }
    } catch (e) {
      if (!e.message.includes('service_key ausente') && !e.message.includes('Configuração do servidor')) {
        throw e
      }
    }

    // FALLBACK: Criação pelo Cliente via RAW FETCH
    // Fazemos um fetch direto para a API do Supabase ignorando o SDK (supabase-js)
    // Isso impede que o SDK detecte a nova sessão e dispare eventos que deslogam o admin.
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL || ''
    const ANON_KEY     = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY || ''
    
    if (!SUPABASE_URL || !ANON_KEY) {
      throw new Error('As chaves do Supabase não estão configuradas no frontend.')
    }

    const signupRes = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
      },
      body: JSON.stringify({
        email: form.email,
        password: form.password,
        data: { name: form.name }
      })
    })

    const signupData = await signupRes.json()

    if (!signupRes.ok) {
      throw new Error(signupData.msg || signupData.message || signupData.error_description || 'Erro desconhecido no cadastro')
    }

    const newUser = signupData.user || signupData
    if (newUser?.id) {
      const { error: profileError } = await supabase.from('profiles').upsert({
        id:              newUser.id,
        name:            form.name,
        role:            'user',
        plan:            form.plan,
        status:          form.status,
        plan_start_at:   form.plan_start_at   || null,
        plan_expires_at: form.plan_expires_at || null,
      })

      if (profileError) throw new Error(profileError.message)
    }

    await loadUsers()
  }

  const toggleBlock = async (user) => {
    const newStatus = user.status === 'blocked' ? 'active' : 'blocked'
    await supabase.from('profiles').update({ status: newStatus }).eq('id', user.id)
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u))
  }

  const filtered = users.filter(u => {
    if (planFilter   && u.plan   !== planFilter)   return false
    if (statusFilter && u.status !== statusFilter)  return false
    if (search) {
      const q = search.toLowerCase()
      if (!u.name?.toLowerCase().includes(q) && !u.email?.toLowerCase().includes(q)) return false
    }
    return true
  })

  return (
    <div className="space-y-4">
      {/* Alerta vencimentos */}
      {expiringCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-status-warningBg border border-status-warning rounded-card">
          <IconAlertTriangle size={18} className="text-status-warning shrink-0" />
          <p className="text-sm text-txt-primary">
            <strong>{expiringCount} usuário{expiringCount !== 1 ? 's' : ''}</strong> com plano vencendo nos próximos 3 dias.
          </p>
        </div>
      )}

      {/* Filtros + busca */}
      <div className="flex flex-wrap items-end gap-3">
        <input type="search" placeholder="Buscar por nome ou e-mail…" value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 text-sm border border-border rounded-input focus:outline-none focus:ring-2 focus:ring-brand-500/30 w-56" />
        <Select name="planFilter" value={planFilter} onChange={(e) => setPlanFilter(e.target.value)}
          options={[{ id: 'basic', label: 'Básico' }, { id: 'pro', label: 'Pro' }, { id: 'advanced', label: 'Avançado' }]}
          placeholder="Todos os planos" />
        <Select name="statusFilter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          options={STATUS_OPTIONS} placeholder="Todos os status" />
        <div className="flex-1" />
        <Button onClick={() => setShowCreate(true)} icon={IconPlus}>Criar usuário</Button>
      </div>

      {/* Resumo de planos + MRR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {['basic', 'pro', 'advanced', 'enterprise'].map(p => {
          const count  = users.filter(u => u.plan === p && u.status === 'active').length
          const info   = getPlan(p)
          const mrr    = count * info.price
          if (count === 0 && p === 'enterprise') return null
          return (
            <div key={p} className="bg-white border border-border rounded-card px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <Badge variant={PLAN_BADGE_VARIANT[p]}>{info.name}</Badge>
                <span className="text-lg font-bold text-txt-primary">{count}</span>
              </div>
              <p className="text-xs text-txt-secondary">usuário{count !== 1 ? 's' : ''} ativos</p>
              {info.price > 0 && <p className="text-xs font-semibold text-status-success mt-0.5">MRR: R$ {mrr.toFixed(2).replace('.', ',')}</p>}
            </div>
          )
        }).filter(Boolean)}
        <div className="bg-brand-50 border border-brand-100 rounded-card px-4 py-3">
          <p className="text-xs font-medium text-brand-500 uppercase tracking-wide mb-1">MRR Total</p>
          <p className="text-xl font-bold text-brand-500">
            R$ {['basic','pro','advanced'].reduce((s, p) => {
              const count = users.filter(u => u.plan === p && u.status === 'active').length
              return s + count * (getPlan(p).price || 0)
            }, 0).toFixed(2).replace('.', ',')}
          </p>
          <p className="text-xs text-brand-500 mt-0.5">{users.filter(u => u.status === 'active').length} ativos</p>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white border border-border rounded-card overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40 gap-2 text-txt-secondary">
            <div className="w-5 h-5 border-2 border-border border-t-brand-500 rounded-full animate-spin" />
            <span className="text-sm">Carregando usuários…</span>
          </div>
        ) : (
          <table className="w-full min-w-[860px]">
            <thead>
              <tr className="border-b border-border bg-surface-bg">
                {['Usuário', 'Plano', 'Vencimento', 'Agentes', 'Contas', 'Status', 'Ações'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-txt-secondary px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-txt-secondary">Nenhum usuário encontrado.</td></tr>
              ) : filtered.map((user) => {
                const days    = daysUntil(user.plan_expires_at)
                const plan    = getPlan(user.plan)
                const agPct   = plan.agents < 999 && plan.agents > 0 ? (user.agents_used / plan.agents) * 100 : 0
                const { text: agColor } = usageColor(agPct)

                return (
                  <tr key={user.id} className="border-b border-border last:border-0 hover:bg-surface-bg/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={user.name || '?'} size="sm" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-txt-primary truncate">{user.name || '—'}</p>
                          <p className="text-xs text-txt-secondary truncate max-w-[160px]">{user.email || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={PLAN_BADGE_VARIANT[user.plan] || 'default'}>{PLAN_LIMITS[user.plan]?.name || user.plan}</Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {user.plan_expires_at ? (
                        <div>
                          <p className="text-sm text-txt-primary">{formatDate(user.plan_expires_at)}</p>
                          {days !== null && (
                            <p className={`text-xs ${days < 0 ? 'text-status-error' : days <= 3 ? 'text-status-warning font-medium' : 'text-txt-secondary'}`}>
                              {days < 0 ? `Vencido (${Math.abs(days)}d)` : days === 0 ? 'Vence hoje' : `${days}d restantes`}
                            </p>
                          )}
                        </div>
                      ) : <span className="text-xs text-txt-secondary">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <p className={`text-sm font-medium ${agColor}`}>
                        {user.agents_used} / {plan.agents >= 999 ? '∞' : plan.agents}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-txt-primary">
                        {user.accounts_used} / {plan.accounts >= 999 ? '∞' : plan.accounts}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[user.status] || STATUS_STYLE.inactive}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                        {STATUS_OPTIONS.find(s => s.id === user.status)?.label || user.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setDrawerUser(user)} className="p-1.5 rounded-input text-txt-secondary hover:text-brand-500 hover:bg-brand-50 transition-all" title="Editar plano / acesso">
                          <IconEdit size={16} stroke={1.5} />
                        </button>
                        <button
                          onClick={() => toggleBlock(user)}
                          className={`p-1.5 rounded-input transition-all ${user.status === 'blocked' ? 'text-status-success hover:bg-status-successBg' : 'text-status-error hover:bg-status-errorBg'}`}
                          title={user.status === 'blocked' ? 'Reativar acesso' : 'Bloquear acesso'}
                        >
                          {user.status === 'blocked' ? <IconLockOpen size={16} stroke={1.5} /> : <IconLock size={16} stroke={1.5} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Drawer edição */}
      {drawerUser && <UserDrawer user={drawerUser} onClose={() => setDrawerUser(null)} onSave={handleSaveUser} />}

      {/* Modal criação */}
      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} onCreate={handleCreateUser} />}
    </div>
  )
}
