// Módulo Regras — listagem, builder visual e histórico
import { useState, useEffect, useCallback } from 'react'
import { IconAdjustments, IconPlus, IconChevronDown, IconChevronUp, IconPlugConnected, IconTrash, IconAlertCircle } from '@tabler/icons-react'
import Toggle from '../../components/ui/Toggle'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Select from '../../components/ui/Select'
import Input from '../../components/ui/Input'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { useMeta } from '../../context/MetaContext'
import { METRICS, OPERATORS, RULE_ACTIONS } from '../../utils/constants'
import { formatDateTime } from '../../utils/formatters'
import { getPlan, checkLimit, usageColor } from '../../utils/planLimits'

export default function Rules() {
  const { user } = useAuth()
  const { isConnected, accountName } = useMeta()

  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [expandedRule, setExpandedRule] = useState(null)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  // Formulário de nova regra
  const [formData, setFormData] = useState({
    name: '',
    metric: '',
    operator: '',
    value: '',
    action: '',
    actionValue: '',
  })

  const loadRules = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('rules')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (!error) setRules(data || [])
    } catch (e) {
      console.warn('Erro ao carregar regras:', e)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { loadRules() }, [loadRules])

  // Toggle liga/desliga
  const handleToggle = async (ruleId, newValue) => {
    setRules((prev) => prev.map((r) => (r.id === ruleId ? { ...r, is_active: newValue } : r)))
    await supabase.from('rules').update({ is_active: newValue }).eq('id', ruleId)
  }

  // Expandir/colapsar histórico
  const toggleHistory = (ruleId) => {
    setExpandedRule(expandedRule === ruleId ? null : ruleId)
  }

  // Atualizar formulário
  const handleFormChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }))
  }

  // Submeter — cria nova regra
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name || !formData.metric || !formData.operator || !formData.value || !formData.action) {
      setError('Preencha todos os campos obrigatórios da regra.')
      return
    }

    setSaving(true)
    setError(null)
    const operatorSymbols = { gt: '>', lt: '<', gte: '≥', lte: '≤', eq: '=' }
    const metricLabels = { roas: 'ROAS', cpa: 'CPA', ctr: 'CTR', cpc: 'CPC', frequency: 'Frequência', budget_remaining: 'Orçamento restante', conversions: 'Conversões', impressions: 'Impressões' }
    const actionLabels = { increase_budget: 'Aumentar orçamento', decrease_budget: 'Reduzir orçamento', pause_ad: 'Pausar anúncio', pause_campaign: 'Pausar campanha', send_notification: 'Enviar notificação' }
    
    const metricLabel = METRICS.find(m => m.id === formData.metric)?.label || metricLabels[formData.metric] || formData.metric
    const opLabel = OPERATORS.find(o => o.id === formData.operator)?.label || operatorSymbols[formData.operator] || formData.operator
    const actionLabel = RULE_ACTIONS.find(a => a.id === formData.action)?.label || actionLabels[formData.action] || formData.action
    
    const conditionStr = `SE ${metricLabel} ${opLabel} ${formData.value} → ${actionLabel}${formData.actionValue ? ' em ' + formData.actionValue : ''}`
    
    const payload = {
      user_id: user.id,
      name: formData.name,
      condition: conditionStr,
      metric: formData.metric,
      operator: formData.operator,
      value: formData.value,
      action: formData.action,
      action_value: formData.actionValue,
      is_active: true,
      agent_name: '—', // Poderia vincular a um agente real depois
      total_executions: 0,
      history: []
    }

    try {
      const { data, error: insertError } = await supabase.from('rules').insert([payload]).select().single()
      if (insertError) throw new Error(insertError.message)
      setRules((prev) => [data, ...prev])
      setDrawerOpen(false)
      setFormData({ name: '', metric: '', operator: '', value: '', action: '', actionValue: '' })
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (ruleId) => {
    setDeleting(ruleId)
    await supabase.from('rules').delete().eq('id', ruleId)
    setRules(prev => prev.filter(r => r.id !== ruleId))
    setDeleting(null)
  }

  // Labels para resultado
  const resultLabels = {
    success: { label: 'Executada', variant: 'success' },
    skipped: { label: 'Ignorada', variant: 'default' },
    error: { label: 'Erro', variant: 'error' },
  }

  const plan = user?.plan || 'basic'
  const planInfo = getPlan(plan)
  const { allowed, limit, pct } = checkLimit(plan, 'rules', rules.length)
  const { bar, text } = usageColor(pct)

  return (
    <div className="space-y-6">
      {/* Banner se Meta não conectado */}
      {!isConnected && (
        <div className="flex items-start gap-3 px-4 py-3 bg-status-warningBg border border-status-warning rounded-xl">
          <IconPlugConnected size={18} className="text-status-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-txt-primary">Conecte sua conta Meta Ads</p>
            <p className="text-xs text-txt-secondary mt-0.5">
              As regras precisam de uma conta conectada para acessar os dados e aplicar as otimizações.
            </p>
          </div>
        </div>
      )}

      {/* Header e Estatísticas */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-txt-primary">Regras Globais</h2>
          {isConnected && accountName && (
            <p className="text-xs text-txt-secondary mt-0.5">Conta: <span className="font-medium">{accountName}</span></p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-txt-secondary mb-1">
              <span className={`font-semibold ${text}`}>{rules.length}</span>
              <span> de {limit >= 999 ? '∞' : limit} regras</span>
            </p>
            <div className="w-32 h-1.5 bg-surface-bg rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${bar} transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <p className="text-[10px] text-txt-secondary mt-0.5">Plano {planInfo.name}</p>
          </div>
          {allowed ? (
            <Button onClick={() => setDrawerOpen(true)} icon={IconPlus}>Nova regra</Button>
          ) : (
            <div className="text-right">
              <Button disabled variant="secondary" icon={IconPlus}>Nova regra</Button>
              <p className="text-[10px] text-status-warning mt-1 max-w-[140px]">Limite atingido.</p>
            </div>
          )}
        </div>
      </div>

      {/* Listagem de regras */}
      {loading ? (
        <div className="flex items-center gap-2 justify-center py-12 text-txt-secondary">
          <div className="w-5 h-5 border-2 border-border border-t-brand-500 rounded-full animate-spin" />
          <span className="text-sm">Carregando regras…</span>
        </div>
      ) : rules.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-border rounded-2xl p-12 text-center">
          <IconAdjustments size={40} className="text-txt-secondary mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-base font-semibold text-txt-primary">Nenhuma regra criada</p>
          <p className="text-sm text-txt-secondary mt-1 mb-5 max-w-xs mx-auto">
            Automatize otimizações criando regras condicionais para suas campanhas.
          </p>
          {allowed && <Button onClick={() => setDrawerOpen(true)} icon={IconPlus}>Criar primeira regra</Button>}
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <div key={rule.id} className="bg-white border border-border rounded-card overflow-hidden">
              <div className="flex flex-wrap items-center gap-4 px-5 py-4">
                <div className="w-9 h-9 bg-brand-50 rounded-input flex items-center justify-center shrink-0">
                  <IconAdjustments size={18} stroke={1.5} className="text-brand-500" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-txt-primary">{rule.name}</p>
                  <p className="text-xs text-txt-secondary mt-0.5 font-mono">{rule.condition}</p>
                </div>

                <div className="shrink-0 text-right hidden sm:block">
                  <p className="text-xs text-txt-secondary">Última execução</p>
                  <p className="text-sm text-txt-primary">{rule.last_execution ? formatDateTime(rule.last_execution) : 'Nunca'}</p>
                </div>

                <div className="shrink-0 hidden sm:block">
                  <Badge variant="default">{rule.total_executions || 0} execuções</Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Toggle checked={!!rule.is_active} onChange={(v) => handleToggle(rule.id, v)} size="sm" />
                  
                  <button
                    onClick={() => handleDelete(rule.id)}
                    disabled={deleting === rule.id}
                    className="p-1.5 rounded-input text-txt-secondary hover:text-status-error hover:bg-status-errorBg transition-all"
                  >
                    {deleting === rule.id ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <IconTrash size={16} stroke={1.5} />}
                  </button>

                  <button onClick={() => toggleHistory(rule.id)} className="p-1.5 rounded-input text-txt-secondary hover:text-txt-primary hover:bg-surface-bg transition-all">
                    {expandedRule === rule.id ? <IconChevronUp size={16} stroke={1.5} /> : <IconChevronDown size={16} stroke={1.5} />}
                  </button>
                </div>
              </div>

              {expandedRule === rule.id && (
                <div className="border-t border-border bg-surface-bg px-5 py-3">
                  <p className="text-xs font-medium text-txt-secondary uppercase tracking-wide mb-2">Histórico de execuções</p>
                  <div className="space-y-2">
                    {rule.history && rule.history.length > 0 ? rule.history.map((entry, i) => (
                      <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                        <p className="text-xs text-txt-secondary shrink-0 w-32">{formatDateTime(entry.date)}</p>
                        <p className="text-xs text-txt-secondary shrink-0">{entry.campaign}</p>
                        <div className="flex-1"><p className="text-xs text-txt-primary">{entry.detail}</p></div>
                        <Badge variant={resultLabels[entry.result]?.variant}>{resultLabels[entry.result]?.label}</Badge>
                      </div>
                    )) : (
                      <p className="text-xs text-txt-secondary">Nenhuma execução registrada.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de criação */}
      <Modal isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} title="Nova regra" size="lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-start gap-2 px-3 py-2 bg-status-errorBg border border-status-error rounded-input">
              <IconAlertCircle size={16} className="text-status-error shrink-0 mt-0.5" />
              <p className="text-sm text-status-error">{error}</p>
            </div>
          )}

          <Input label="Nome da regra" name="name" placeholder="Ex: Escalar ROAS alto" value={formData.name} onChange={handleFormChange('name')} required />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-txt-primary">Condição</label>
            <div className="flex flex-wrap items-center gap-2 p-4 bg-surface-bg rounded-input border border-border">
              <span className="text-sm font-medium text-brand-500">SE</span>
              <Select name="metric" value={formData.metric} onChange={handleFormChange('metric')} options={METRICS} placeholder="Métrica" className="flex-1 min-w-[120px]" />
              <Select name="operator" value={formData.operator} onChange={handleFormChange('operator')} options={OPERATORS} placeholder="Op." className="w-20" />
              <Input name="value" value={formData.value} onChange={handleFormChange('value')} placeholder="Valor" className="w-24" />
              <span className="text-sm font-medium text-brand-500">→</span>
              <Select name="action" value={formData.action} onChange={handleFormChange('action')} options={RULE_ACTIONS} placeholder="Ação" className="flex-1 min-w-[150px]" />
              <Input name="actionValue" value={formData.actionValue} onChange={handleFormChange('actionValue')} placeholder="Ex: 20%" className="w-24" />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setDrawerOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Criando…' : 'Criar regra'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
