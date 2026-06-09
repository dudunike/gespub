// Agentes IA — templates + agentes do usuário com modal centralizado
import { useState, useEffect, useCallback } from 'react'
import {
  IconRobot, IconSettings, IconPlus, IconTrash,
  IconLock, IconX, IconCheck, IconAlertCircle,
  IconPlugConnected, IconChevronDown, IconChevronUp,
  IconHistory, IconPlayerPlay, IconSparkles, IconBrandTabler,
} from '@tabler/icons-react'
import Toggle from '../../components/ui/Toggle'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { supabase } from '../../lib/supabaseClient'
import { META_CONVERSIONS } from '../../lib/metaApi'
import { useAuth } from '../../context/AuthContext'
import { useMeta } from '../../context/MetaContext'
import { AGENT_FUNCTIONS, METRICS, OPERATORS, RULE_ACTIONS, ANALYSIS_FREQUENCIES } from '../../utils/constants'
import { formatRelativeTime } from '../../utils/formatters'
import { getPlan, checkLimit, usageColor } from '../../utils/planLimits'

// Templates padrão da plataforma
const DEFAULT_AGENTS = [
  {
    id: 'tpl_roas',
    name: 'Guardião de ROAS',
    description: 'Monitora o ROAS de todas as campanhas e alerta quando cai abaixo do limite configurado.',
    function: 'optimize_roas',
    metrics: ['roas', 'cpa'],
    frequency: '6h',
    primary_conversion: 'purchase',
  },
  {
    id: 'tpl_whatsapp',
    name: 'Conversor WhatsApp',
    description: 'Monitora mensagens iniciadas pelo WhatsApp/Messenger e otimiza campanhas de mensagens diretas (x1).',
    function: 'monitor_ctr',
    metrics: ['ctr', 'cpc'],
    frequency: 'daily',
    primary_conversion: 'onsite_conversion.messaging_conversation_started_7d',
  },
  {
    id: 'tpl_cpa',
    name: 'Sentinela de CPA',
    description: 'Alerta quando o custo por aquisição ultrapassa o limite e sugere pausar anúncios.',
    function: 'control_cpa',
    metrics: ['cpa', 'conversions'],
    frequency: '12h',
    primary_conversion: 'purchase',
  },
  {
    id: 'tpl_escalador',
    name: 'Escalador de Orçamento',
    description: 'Aumenta o orçamento das campanhas vencedoras que possuem ROAS alto e CPA abaixo da meta.',
    function: 'scale_budget',
    metrics: ['roas', 'cpa', 'budget_remaining'],
    frequency: '12h',
    primary_conversion: 'purchase',
  },
  {
    id: 'tpl_fadiga',
    name: 'Limpador de Fadiga',
    description: 'Pausa anúncios que já foram vistos muitas vezes sem gerar conversão, evitando saturação do público.',
    function: 'detect_fatigue',
    metrics: ['frequency', 'ctr', 'cpm', 'conversions'],
    frequency: 'daily',
    primary_conversion: 'link_click',
  },
]

const EMPTY_FORM = {
  name: '',
  goal_description: '',
  ad_account_id: '',
  function: '',
  primary_conversion: '',
  metrics: [],
  rules: [{ metric: '', operator: '', value: '', action: '', actionValue: '' }],
  frequency: 'daily',
  scope: 'all',
  scope_items: [],
}

const FREQ_LABELS = { '1h': 'A cada 1h', '6h': 'A cada 6h', '12h': 'A cada 12h', daily: 'A cada 24h' }
const METRIC_LABELS = { roas: 'ROAS', cpa: 'CPA', ctr: 'CTR', cpc: 'CPC', cpm: 'CPM', frequency: 'Frequência', conversions: 'Conversões', impressions: 'Impressões' }
const SCOPE_LABELS = { all: 'Todas as campanhas', active_only: 'Só campanhas ativas', specific: 'Campanhas específicas' }

const FUNCTION_PRESETS = {
  optimize_roas: {
    primary_conversion: 'purchase',
    metrics: ['roas', 'cpa'],
    goal_description: 'Sua meta principal é maximizar o Retorno sobre o Investimento (ROAS). Monitore as campanhas de vendas e sugira escalar as que têm ROAS alto e pausar as que dão prejuízo.',
  },
  control_cpa: {
    primary_conversion: 'purchase',
    metrics: ['cpa', 'conversions'],
    goal_description: 'Mantenha o custo por aquisição (CPA) abaixo do limite aceitável. Alerte e pause anúncios que estão gastando muito sem gerar conversões.',
  },
  detect_fatigue: {
    primary_conversion: 'link_click',
    metrics: ['frequency', 'ctr', 'cpm', 'conversions'],
    goal_description: 'Identifique anúncios que estão sofrendo de fadiga criativa (alta frequência, CTR caindo e CPM subindo). Recomende a pausa dos criativos saturados.',
  },
  scale_budget: {
    primary_conversion: 'purchase',
    metrics: ['roas', 'cpa', 'budget_remaining'],
    goal_description: 'Identifique campanhas vencedoras (CPA baixo e ROAS alto) que têm orçamento sobrando e recomende o aumento do orçamento diário para escalar os resultados.',
  },
  monitor_ctr: {
    primary_conversion: 'onsite_conversion.messaging_conversation_started_7d',
    metrics: ['ctr', 'cpc'],
    goal_description: 'Monitore o CTR (taxa de cliques) e CPC. Otimize campanhas de mensagens (WhatsApp/Direct) pausando os anúncios que não geram bom engajamento ou cliques baratos.',
  },
}

// ─────────────────────────────────────────────
// Modal centralizado de criação/edição
// ─────────────────────────────────────────────
function AgentModal({ editingAgent, initialForm, onClose, onSave, campaigns }) {
  const { connections } = useMeta()
  const [form, setForm] = useState(initialForm || EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(1) // 1 = info, 2 = regras

  const [localCampaigns, setLocalCampaigns] = useState([])
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)

  useEffect(() => {
    if (!form.ad_account_id) {
      setLocalCampaigns([])
      return
    }
    let active = true
    setLoadingCampaigns(true)
    import('../../lib/metaApi').then(({ getCampaigns }) => {
      getCampaigns(form.ad_account_id)
        .then(data => { if (active) setLocalCampaigns(data) })
        .catch(() => { if (active) setLocalCampaigns([]) })
        .finally(() => { if (active) setLoadingCampaigns(false) })
    })
    return () => { active = false }
  }, [form.ad_account_id])

  const updateAdAccount = (e) => {
    const newId = e.target.value
    if (newId !== form.ad_account_id) {
      setForm(p => ({ ...p, ad_account_id: newId, scope_items: [] }))
    }
  }

  const updateFunction = (e) => {
    const fn = e.target.value
    setForm(p => {
      const preset = FUNCTION_PRESETS[fn]
      if (preset) {
        return { 
          ...p, 
          function: fn, 
          primary_conversion: preset.primary_conversion, 
          metrics: preset.metrics, 
          goal_description: preset.goal_description 
        }
      }
      return { ...p, function: fn }
    })
  }

  const f = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }))

  const toggleMetric = (id) =>
    setForm(p => ({
      ...p,
      metrics: p.metrics.includes(id) ? p.metrics.filter(m => m !== id) : [...p.metrics, id],
    }))

  const updateRule = (i, field, val) =>
    setForm(p => ({ ...p, rules: p.rules.map((r, idx) => idx === i ? { ...r, [field]: val } : r) }))

  const addRule = () =>
    setForm(p => ({ ...p, rules: [...p.rules, { metric: '', operator: '', value: '', action: '', actionValue: '' }] }))

  const removeRule = (i) =>
    setForm(p => ({ ...p, rules: p.rules.filter((_, idx) => idx !== i) }))

  const toggleCampaign = (id) =>
    setForm(p => ({
      ...p,
      scope_items: p.scope_items.includes(id)
        ? p.scope_items.filter(x => x !== id)
        : [...p.scope_items, id],
    }))

  const handleSubmit = async () => {
    if (!form.name.trim())     { setError('Informe o nome do agente.'); return }
    if (!form.ad_account_id)   { setError('Selecione uma conta de anúncio.'); return }
    if (!form.function)        { setError('Selecione a função principal.'); return }
    setSaving(true); setError('')
    try {
      await onSave(form, editingAgent?.id)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const convLabel = META_CONVERSIONS.find(c => c.id === form.primary_conversion)?.label || ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl border border-border w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border shrink-0">
          <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center">
            <IconRobot size={20} className="text-brand-500" strokeWidth={1.5} />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-txt-primary">
              {editingAgent ? `Editar — ${editingAgent.name}` : 'Criar agente IA'}
            </h2>
            <p className="text-xs text-txt-secondary mt-0.5">
              Configure o objetivo, métricas e regras de atuação
            </p>
          </div>
          {/* Steps */}
          <div className="flex items-center gap-1 mr-2">
            {[1, 2].map(s => (
              <button
                key={s}
                onClick={() => setStep(s)}
                className={`w-7 h-7 rounded-full text-xs font-semibold transition-all ${
                  step === s ? 'bg-brand-500 text-white' : 'bg-surface-bg text-txt-secondary hover:bg-brand-50'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-input text-txt-secondary hover:bg-surface-bg">
            <IconX size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="flex items-start gap-2 px-3 py-2 bg-status-errorBg border border-status-error rounded-input">
              <IconAlertCircle size={16} className="text-status-error shrink-0 mt-0.5" />
              <p className="text-sm text-status-error">{error}</p>
            </div>
          )}

          {/* ── PASSO 1: Informações ── */}
          {step === 1 && (
            <>
              {/* Nome */}
              <div>
                <label className="text-sm font-semibold text-txt-primary block mb-1.5">
                  Nome do agente <span className="text-status-error">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={f('name')}
                  placeholder="Ex: Otimizador de WhatsApp x1"
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-input focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                  autoFocus
                />
              </div>

              {/* Conta de Anúncio */}
              <div>
                <label className="text-sm font-semibold text-txt-primary block mb-1.5">
                  Conta de anúncio <span className="text-status-error">*</span>
                </label>
                <select
                  value={form.ad_account_id}
                  onChange={updateAdAccount}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-input focus:outline-none focus:ring-2 focus:ring-brand-500/30 bg-white"
                >
                  <option value="">Selecione uma conta...</option>
                  {connections.map(c => (
                    <option key={c.account_id} value={c.account_id}>
                      {c.account_name} ({c.account_id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Função + Conversão em 2 colunas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-txt-primary block mb-1.5">
                    Função principal <span className="text-status-error">*</span>
                  </label>
                  <select
                    value={form.function}
                    onChange={updateFunction}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-input focus:outline-none focus:ring-2 focus:ring-brand-500/30 bg-white"
                  >
                    <option value="">Selecione…</option>
                    {AGENT_FUNCTIONS.map(fn => <option key={fn.id} value={fn.id}>{fn.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-txt-primary block mb-1.5">
                    Conversão principal
                  </label>
                  <select
                    value={form.primary_conversion}
                    onChange={f('primary_conversion')}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-input focus:outline-none focus:ring-2 focus:ring-brand-500/30 bg-white"
                  >
                    <option value="">Nenhuma</option>
                    {META_CONVERSIONS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Frequência */}
              <div>
                <label className="text-sm font-semibold text-txt-primary block mb-2">
                  Frequência de análise
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {ANALYSIS_FREQUENCIES.map(freq => (
                    <button
                      key={freq.id}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, frequency: freq.id }))}
                      className={`px-2 py-2.5 text-xs font-medium rounded-input border transition-all ${
                        form.frequency === freq.id
                          ? 'bg-brand-50 border-brand-500 text-brand-500'
                          : 'bg-white border-border text-txt-secondary hover:border-brand-300'
                      }`}
                    >
                      {freq.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Escopo */}
              <div>
                <label className="text-sm font-semibold text-txt-primary block mb-2">
                  Escopo de atuação
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'all',         label: 'Todas as campanhas' },
                    { id: 'active_only', label: 'Só campanhas ativas' },
                  ].map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, scope: s.id, scope_items: [] }))}
                      className={`px-3 py-2.5 text-sm rounded-input border transition-all ${
                        form.scope === s.id
                          ? 'bg-brand-50 border-brand-500 text-brand-500 font-medium'
                          : 'bg-white border-border text-txt-secondary hover:border-brand-300'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* Campanhas específicas (individual ou múltiplas) */}
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => setForm(p => ({ ...p, scope: p.scope === 'specific' ? 'all' : 'specific', scope_items: p.scope === 'specific' ? [] : p.scope_items }))}
                    className={`w-full px-3 py-2.5 text-sm rounded-input border transition-all ${
                      form.scope === 'specific'
                        ? 'bg-brand-50 border-brand-500 text-brand-500 font-medium'
                        : 'bg-white border-border text-txt-secondary hover:border-brand-300'
                    }`}
                  >
                    Campanhas específicas (individual ou múltiplas)
                  </button>

                  {form.scope === 'specific' && (
                    <div className="mt-2">
                      {loadingCampaigns ? (
                        <p className="text-xs text-txt-secondary px-3 py-2 border border-border rounded-input bg-surface-bg">
                          Carregando campanhas...
                        </p>
                      ) : localCampaigns.length === 0 ? (
                        <p className="text-xs text-txt-secondary px-3 py-2 border border-border rounded-input bg-surface-bg">
                          Nenhuma campanha encontrada na conta de anúncio selecionada.
                        </p>
                      ) : (
                        <>
                          <div className="mb-1.5 flex items-center justify-between">
                            <p className="text-xs text-txt-secondary">
                              {form.scope_items.length === 0
                                ? 'Selecione uma ou mais campanhas'
                                : `${form.scope_items.length} campanha${form.scope_items.length !== 1 ? 's' : ''} selecionada${form.scope_items.length !== 1 ? 's' : ''}`}
                            </p>
                            {form.scope_items.length > 0 && (
                              <button type="button" onClick={() => setForm(p => ({ ...p, scope_items: [] }))}
                                className="text-xs text-txt-secondary hover:text-status-error transition-colors">
                                Limpar
                              </button>
                            )}
                          </div>
                          <div className="border border-border rounded-input overflow-hidden max-h-48 overflow-y-auto">
                            {localCampaigns.map(c => {
                              const isActive = c.effective_status === 'ACTIVE' || c.status === 'ACTIVE'
                              return (
                                <label key={c.id} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-surface-bg cursor-pointer border-b border-border last:border-0">
                                  <input
                                    type="checkbox"
                                    checked={form.scope_items.includes(c.id)}
                                    onChange={() => toggleCampaign(c.id)}
                                    className="w-4 h-4 rounded border-border text-brand-500 focus:ring-brand-500/30 shrink-0"
                                  />
                                  <span className="flex-1 text-sm text-txt-primary truncate">{c.name}</span>
                                  <span className={`text-[10px] shrink-0 px-1.5 py-0.5 rounded-full font-medium ${
                                    isActive ? 'bg-status-successBg text-status-success' : 'bg-surface-bg text-txt-secondary'
                                  }`}>
                                    {isActive ? 'Ativa' : 'Pausada'}
                                  </span>
                                </label>
                              )
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ── PASSO 2: Métricas + Regras SE → ENTÃO ── */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Instruções IA */}
              <div>
                <p className="text-sm font-semibold text-txt-primary mb-1.5">Instruções para a Inteligência Artificial</p>
                <textarea
                  value={form.goal_description}
                  onChange={f('goal_description')}
                  placeholder="Descreva como a IA deve avaliar as métricas abaixo (ex: foque em manter o CPA abaixo de R$ 20, ou escale campanhas com bom ROAS)."
                  rows={2}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-input focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-none mb-1"
                />
              </div>

              {/* Métricas monitoradas */}
              <div>
                <p className="text-sm font-semibold text-txt-primary mb-2">Métricas monitoradas pela Inteligência Artificial</p>
                <div className="flex items-start gap-2 mb-3 px-3 py-2.5 bg-brand-50 rounded-input border border-brand-100">
                  <IconSparkles size={16} className="text-brand-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-txt-secondary leading-relaxed">
                    <strong className="text-brand-700">Atenção:</strong> As métricas que você selecionar aqui serão ativamente estudadas pela nossa IA para gerar <strong className="text-brand-700">Insights e Sugestões</strong> automáticas para melhorar suas campanhas.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {METRICS.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleMetric(m.id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                        form.metrics.includes(m.id)
                          ? 'bg-brand-500 border-brand-500 text-white shadow-sm'
                          : 'bg-white border-border text-txt-secondary hover:border-brand-300'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-border" />

              <div>
                <p className="text-sm font-semibold text-txt-primary">Regras de atuação</p>
                <p className="text-xs text-txt-secondary mt-0.5">
                  Defina condições e ações automáticas. O agente executará estas regras na frequência configurada.
                </p>
              </div>

              {form.rules.map((rule, i) => (
                <div key={i} className="bg-surface-bg border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-brand-500 uppercase tracking-wide">Regra {i + 1}</span>
                    {form.rules.length > 1 && (
                      <button onClick={() => removeRule(i)} className="text-txt-secondary hover:text-status-error transition-colors">
                        <IconTrash size={15} stroke={1.5} />
                      </button>
                    )}
                  </div>

                  {/* SE */}
                  <div>
                    <p className="text-xs font-medium text-txt-secondary mb-1.5">SE (condição)</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <select value={rule.metric} onChange={e => updateRule(i, 'metric', e.target.value)}
                        className="flex-1 min-w-[120px] px-2.5 py-2 text-sm bg-white border border-border rounded-input focus:outline-none focus:ring-2 focus:ring-brand-500/30">
                        <option value="">Métrica</option>
                        {METRICS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                      </select>
                      <select value={rule.operator} onChange={e => updateRule(i, 'operator', e.target.value)}
                        className="flex-1 min-w-[170px] px-2 py-2 text-sm bg-white border border-border rounded-input focus:outline-none focus:ring-2 focus:ring-brand-500/30">
                        <option value="">Operador</option>
                        {OPERATORS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                      </select>
                      <input type="text" value={rule.value} onChange={e => updateRule(i, 'value', e.target.value)}
                        placeholder="Valor"
                        className="w-24 px-2.5 py-2 text-sm bg-white border border-border rounded-input focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                    </div>
                  </div>

                  {/* ENTÃO */}
                  <div>
                    <p className="text-xs font-medium text-txt-secondary mb-1.5">ENTÃO (ação)</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <select value={rule.action} onChange={e => updateRule(i, 'action', e.target.value)}
                        className="flex-1 min-w-[160px] px-2.5 py-2 text-sm bg-white border border-border rounded-input focus:outline-none focus:ring-2 focus:ring-brand-500/30">
                        <option value="">Ação</option>
                        {RULE_ACTIONS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                      </select>
                      <input type="text" value={rule.actionValue} onChange={e => updateRule(i, 'actionValue', e.target.value)}
                        placeholder="Ex: 20%"
                        className="w-24 px-2.5 py-2 text-sm bg-white border border-border rounded-input focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addRule}
                className="flex items-center gap-2 text-sm font-medium text-brand-500 hover:text-brand-700 transition-colors w-full justify-center py-2.5 border-2 border-dashed border-brand-200 rounded-xl hover:border-brand-400 hover:bg-brand-50"
              >
                <IconPlus size={16} />
                Adicionar regra
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border shrink-0 flex items-center gap-3">
          {step === 1 ? (
            <>
              <Button fullWidth onClick={() => setStep(2)} disabled={!form.name || !form.function}>
                Próximo: Regras →
              </Button>
              <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setStep(1)}>← Voltar</Button>
              <Button fullWidth onClick={handleSubmit} disabled={saving} icon={saving ? undefined : IconCheck}>
                {saving ? 'Salvando…' : editingAgent ? 'Salvar alterações' : 'Criar agente'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Card de agente
// ─────────────────────────────────────────────
function AgentCard({ agent, isUser, isTemplate, onEdit, onToggle, onDelete, onUseTemplate, deleting, campaigns = [] }) {
  return (
    <div className={`rounded-2xl p-5 border transition-all ${
      isTemplate
        ? 'bg-white border-dashed border-border hover:border-brand-200'
        : 'bg-gradient-to-br from-brand-50 to-white border-brand-100 shadow-sm'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isTemplate ? 'bg-surface-bg' : 'bg-white shadow-sm'}`}>
          {isTemplate
            ? <IconLock size={18} stroke={1.5} className="text-txt-secondary" />
            : <IconRobot size={20} stroke={1.5} className="text-brand-500" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-txt-primary truncate">{agent.name}</p>
            {isUser && <Toggle checked={!!agent.is_active} onChange={onToggle} size="sm" />}
            {isTemplate && <span className="text-xs text-txt-secondary shrink-0 bg-surface-bg px-2 py-0.5 rounded-full border border-border">Template</span>}
          </div>
          <p className="text-xs text-txt-secondary mt-1 line-clamp-2 leading-relaxed">
            {agent.goal_description || agent.description}
          </p>
        </div>
      </div>

      {/* Badges */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {(agent.metrics || []).map(m => (
          <Badge key={m} variant="brand">{METRIC_LABELS[m] || m}</Badge>
        ))}
        {agent.primary_conversion && (
          <Badge variant="success">
            {agent.primary_conversion.includes('messaging') ? '💬 WhatsApp' :
             agent.primary_conversion.includes('purchase')  ? '🛒 Compras'  : '🎯 Conversão'}
          </Badge>
        )}
        <Badge variant="default">{FREQ_LABELS[agent.frequency] || agent.frequency}</Badge>
        {isUser && <Badge variant="default">{agent.total_executions || 0} exec.</Badge>}
      </div>

      {/* Escopo de atuação */}
      {isUser && (
        <div className="mt-2">
          {agent.scope === 'specific' && agent.scope_items?.length > 0 ? (
            <div>
              <p className="text-[10px] font-semibold text-txt-secondary uppercase tracking-wide mb-1">
                {agent.scope_items.length === 1 ? 'Campanha individual' : `${agent.scope_items.length} campanhas específicas`}
              </p>
              <div className="flex flex-wrap gap-1">
                {agent.scope_items.slice(0, 3).map(id => {
                  const camp = campaigns.find(c => c.id === id)
                  return (
                    <span key={id} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-brand-50 text-brand-700 border border-brand-100 truncate max-w-[120px]">
                      {camp?.name || id}
                    </span>
                  )
                })}
                {agent.scope_items.length > 3 && (
                  <span className="text-[10px] text-txt-secondary">+{agent.scope_items.length - 3}</span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-[10px] text-txt-secondary">
              {SCOPE_LABELS[agent.scope] || 'Todas as campanhas'}
            </p>
          )}
        </div>
      )}

      {/* Última ação */}
      {isUser && agent.last_action && (
        <p className="mt-3 pt-3 border-t border-brand-100 text-xs text-txt-secondary truncate">
          {agent.last_action}
          {agent.last_action_at && ` · ${formatRelativeTime(agent.last_action_at)}`}
        </p>
      )}

      {/* Ações */}
      <div className="mt-3 flex gap-2">
        {isUser && (
          <>
            <Button variant="secondary" size="sm" onClick={onEdit} icon={IconSettings} className="bg-white flex-1">
              Configurar
            </Button>
            <button
              onClick={onDelete}
              disabled={deleting}
              className="p-2 rounded-input text-txt-secondary hover:text-status-error hover:bg-status-errorBg transition-all disabled:opacity-40"
              title="Excluir agente"
            >
              {deleting
                ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                : <IconTrash size={15} stroke={1.5} />
              }
            </button>
          </>
        )}
        {isTemplate && (
          <Button variant="secondary" size="sm" onClick={onUseTemplate} icon={IconPlus} className="bg-white w-full justify-center">
            Usar template
          </Button>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Página principal
// ─────────────────────────────────────────────
export default function Agents() {
  const { user } = useAuth()
  const { isConnected, accountName, accountId } = useMeta()

  const [userAgents,    setUserAgents]    = useState([])
  const [campaigns,     setCampaigns]     = useState([])
  const [loadingAgents, setLoadingAgents] = useState(false)
  const [modalOpen,     setModalOpen]     = useState(false)
  const [editingAgent,  setEditingAgent]  = useState(null)
  const [initialForm,   setInitialForm]   = useState(null)
  const [deleting,      setDeleting]      = useState(null)
  const [logs,          setLogs]          = useState([])
  const [loadingLogs,   setLoadingLogs]   = useState(false)
  const [logsLoaded,    setLogsLoaded]    = useState(false)

  // Timeout helper para queries Supabase que podem travar
  const withQueryTimeout = (promise, ms = 8000) =>
    Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
    ])

  // Carregar agentes do Supabase
  const loadAgents = useCallback(async () => {
    if (!user) { setLoadingAgents(false); return }
    setLoadingAgents(true)
    try {
      const { data, error } = await withQueryTimeout(
        supabase.from('agents').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      )
      if (!error) setUserAgents(data || [])
    } catch {
      setUserAgents([])
    } finally {
      setLoadingAgents(false)
    }
  }, [user])

  // Carregar logs de execução
  const loadLogs = useCallback(async () => {
    if (!user) { setLoadingLogs(false); return }
    setLoadingLogs(true)
    try {
      const { data } = await withQueryTimeout(
        supabase.from('agent_logs').select('*').eq('user_id', user.id).order('executed_at', { ascending: false }).limit(50)
      )
      setLogs(data || [])
    } catch {
      setLogs([])
    } finally {
      setLoadingLogs(false)
      setLogsLoaded(true)
    }
  }, [user])

  useEffect(() => { loadLogs() }, [loadLogs])

  useEffect(() => { loadAgents() }, [loadAgents])

  // Carregar TODAS as campanhas do Meta para seleção de escopo (ativas e pausadas)
  useEffect(() => {
    if (!isConnected || !accountId) return
    import('../../lib/metaApi').then(({ getCampaigns }) => {
      getCampaigns(accountId)
        .then(data => setCampaigns(data))
        .catch(() => {})
    })
  }, [isConnected, accountId])

  const openCreate = () => {
    setEditingAgent(null)
    setInitialForm(EMPTY_FORM)
    setModalOpen(true)
  }

  const openEdit = (agent) => {
    setEditingAgent(agent)
    setInitialForm({
      name:               agent.name || '',
      goal_description:   agent.goal_description || '',
      ad_account_id:      agent.ad_account_id || '',
      function:           agent.function || '',
      primary_conversion: agent.primary_conversion || '',
      metrics:            agent.metrics || [],
      rules:              agent.rules?.length ? agent.rules : [{ metric: '', operator: '', value: '', action: '', actionValue: '' }],
      frequency:          agent.frequency || 'daily',
      scope:              agent.scope || 'all',
      scope_items:        agent.scope_items || [],
    })
    setModalOpen(true)
  }

  const openFromTemplate = (tpl) => {
    setEditingAgent(null)
    setInitialForm({
      ...EMPTY_FORM,
      name:               tpl.name,
      goal_description:   tpl.description,
      ad_account_id:      '',
      function:           tpl.function,
      metrics:            tpl.metrics,
      frequency:          tpl.frequency,
      primary_conversion: tpl.primary_conversion || '',
    })
    setModalOpen(true)
  }

  // Chama a API de gerenciamento de cron jobs
  const manageCron = async (action, agentId, agentName, frequency, enabled) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return
      await fetch('/api/manage-agent-cron', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action, agentId, agentName, frequency, enabled }),
      })
    } catch {
      // Cron é best-effort — não bloqueia operação principal
    }
  }

  const handleToggle = async (agentId, val) => {
    setUserAgents(prev => prev.map(a => a.id === agentId ? { ...a, is_active: val } : a))
    await supabase.from('agents').update({ is_active: val }).eq('id', agentId)
    const agent = userAgents.find(a => a.id === agentId)
    manageCron('toggle', agentId, agent?.name, agent?.frequency, val)
  }

  const handleSave = async (form, agentId) => {
    const payload = {
      user_id:            user.id,
      name:               form.name,
      goal_description:   form.goal_description,
      ad_account_id:      form.ad_account_id,
      function:           form.function,
      primary_conversion: form.primary_conversion,
      metrics:            form.metrics,
      rules:              form.rules.filter(r => r.metric),
      frequency:          form.frequency,
      scope:              form.scope,
      scope_items:        form.scope_items,
      is_active:          true,
    }

    if (agentId) {
      const { error } = await supabase.from('agents').update(payload).eq('id', agentId)
      if (error) throw new Error(error.message)
      setUserAgents(prev => prev.map(a => a.id === agentId ? { ...a, ...payload } : a))
      manageCron('update', agentId, form.name, form.frequency, true)
    } else {
      const { data, error } = await supabase.from('agents').insert([payload]).select().single()
      if (error) throw new Error(error.message)
      setUserAgents(prev => [data, ...prev])
      manageCron('create', data.id, form.name, form.frequency, true)
    }
  }

  const handleDelete = async (agentId) => {
    setDeleting(agentId)
    const agent = userAgents.find(a => a.id === agentId)
    manageCron('delete', agentId, agent?.name, agent?.frequency, false)
    await supabase.from('agents').delete().eq('id', agentId)
    setUserAgents(prev => prev.filter(a => a.id !== agentId))
    setDeleting(null)
  }

  return (
    <div className="space-y-8">
      {/* Banner se Meta não conectado */}
      {!isConnected && (
        <div className="flex items-start gap-3 px-4 py-3 bg-status-warningBg border border-status-warning rounded-xl">
          <IconPlugConnected size={18} className="text-status-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-txt-primary">Conecte sua conta Meta Ads</p>
            <p className="text-xs text-txt-secondary mt-0.5">
              Acesse <a href="/conexoes" className="text-brand-500 underline font-medium">Conexões</a> para vincular seu Gerenciador de Anúncios e os agentes analisarão dados reais.
            </p>
          </div>
        </div>
      )}

      {/* Meus Agentes */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-txt-primary">Meus Agentes</h2>
            {isConnected && accountName && (
              <p className="text-xs text-txt-secondary mt-0.5">Conta: <span className="font-medium">{accountName}</span></p>
            )}
          </div>
          {/* Uso do plano + botão criar */}
          <div className="flex items-center gap-3">
            {(() => {
              const plan = user?.plan || 'basic'
              const planInfo = getPlan(plan)
              const total = userAgents.length
              const active = userAgents.filter(a => a.is_active).length
              const { allowed, limit, pct } = checkLimit(plan, 'agents', total)
              const { bar, text } = usageColor(pct)
              return (
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-txt-secondary mb-1">
                    <span className={`font-semibold ${text}`}>{total}</span>
                    <span> de {limit >= 999 ? '∞' : limit} agentes</span>
                    <span className="text-txt-secondary/60 ml-1">({active} ativo{active !== 1 ? 's' : ''})</span>
                  </p>
                  <div className="w-32 h-1.5 bg-surface-bg rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${bar} transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <p className="text-[10px] text-txt-secondary mt-0.5">Plano {planInfo.name}</p>
                </div>
              )
            })()}
            {(() => {
              const plan = user?.plan || 'basic'
              const { allowed } = checkLimit(plan, 'agents', userAgents.length)
              return allowed ? (
                <Button onClick={openCreate} icon={IconPlus}>Criar agente</Button>
              ) : (
                <div className="text-right">
                  <Button disabled variant="secondary" icon={IconPlus}>Criar agente</Button>
                  <p className="text-[10px] text-status-warning mt-1 max-w-[140px]">Limite do plano atingido. Entre em contato para upgrade.</p>
                </div>
              )
            })()}
          </div>
        </div>

        {loadingAgents ? (
          <div className="flex items-center gap-2 justify-center py-12 text-txt-secondary">
            <div className="w-5 h-5 border-2 border-border border-t-brand-500 rounded-full animate-spin" />
            <span className="text-sm">Carregando agentes…</span>
          </div>
        ) : userAgents.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-border rounded-2xl p-12 text-center">
            <IconRobot size={40} className="text-txt-secondary mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-base font-semibold text-txt-primary">Nenhum agente criado ainda</p>
            <p className="text-sm text-txt-secondary mt-1 mb-5 max-w-xs mx-auto">
              Crie seu primeiro agente ou use um dos templates abaixo para começar.
            </p>
            <Button onClick={openCreate} icon={IconPlus}>Criar primeiro agente</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {userAgents.map(agent => (
              <AgentCard
                key={agent.id}
                agent={agent}
                isUser
                campaigns={campaigns}
                onEdit={() => openEdit(agent)}
                onToggle={val => handleToggle(agent.id, val)}
                onDelete={() => handleDelete(agent.id)}
                deleting={deleting === agent.id}
              />
            ))}
          </div>
        )}
      </section>

      {/* Histórico de Execuções */}
      {(logsLoaded || loadingLogs) && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <IconHistory size={18} className="text-brand-500" stroke={1.5} />
            <h2 className="text-base font-semibold text-txt-primary">Histórico de Execuções</h2>
            <button onClick={loadLogs} disabled={loadingLogs} className="ml-1 p-1 rounded text-txt-secondary hover:text-brand-500 transition-colors disabled:opacity-40">
              <svg className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
            </button>
            <span className="text-xs text-txt-secondary ml-auto">{loadingLogs ? 'carregando…' : `${logs.length} ações recentes`}</span>
          </div>
          <div className="bg-white border border-border rounded-card overflow-hidden">
            {loadingLogs ? (
              <div className="flex items-center justify-center py-8 gap-2 text-txt-secondary text-sm">
                <div className="w-4 h-4 border-2 border-border border-t-brand-500 rounded-full animate-spin" />
                Carregando histórico…
              </div>
            ) : logs.length === 0 ? (
              <div className="py-10 text-center">
                <IconHistory size={28} className="text-txt-secondary mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-sm text-txt-secondary">Nenhuma execução registrada ainda.</p>
                <p className="text-xs text-txt-secondary mt-1">As ações dos agentes aparecerão aqui com detalhes e horários.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {logs.map(log => {
                  const agentName = userAgents.find(a => a.id === log.agent_id)?.name || 'Agente'
                  const isAI      = log.action === 'ai_analysis'
                  const isPositive = ['increase_budget', 'send_notification'].includes(log.action)
                  const isDanger   = ['pause_campaign', 'pause_ad', 'decrease_budget'].includes(log.action)
                  return (
                    <div key={log.id} className={`px-4 py-3 flex items-start gap-3 ${isAI ? 'bg-brand-50/40' : ''}`}>
                      <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                        isAI       ? 'bg-brand-400' :
                        isDanger   ? 'bg-status-warning' :
                        isPositive ? 'bg-status-success' :
                        'bg-brand-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-1.5">
                          {isAI && <IconSparkles size={13} className="text-brand-500 shrink-0 mt-0.5" />}
                          <p className="text-sm text-txt-primary">{log.message}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          <span className="text-xs text-txt-secondary">{agentName}</span>
                          {log.campaign_name && (
                            <span className="text-xs text-brand-500 font-medium truncate max-w-[160px]">· {log.campaign_name}</span>
                          )}
                          {log.metric_key && log.metric_key !== 'ai' && (
                            <span className="text-xs text-txt-secondary">· {log.metric_key.toUpperCase()}: <span className="font-semibold">{Number(log.metric_value || 0).toFixed(2)}</span></span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-txt-secondary shrink-0 whitespace-nowrap">
                        {formatRelativeTime(log.executed_at)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Templates */}
      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-txt-primary">Templates padrão</h2>
          <p className="text-xs text-txt-secondary mt-0.5">Clique em "Usar template" para criar um agente com base neste modelo.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {DEFAULT_AGENTS.map(tpl => (
            <AgentCard
              key={tpl.id}
              agent={tpl}
              isTemplate
              onUseTemplate={() => openFromTemplate(tpl)}
            />
          ))}
        </div>
      </section>

      {/* Modal */}
      {modalOpen && (
        <AgentModal
          editingAgent={editingAgent}
          initialForm={initialForm}
          onClose={() => { setModalOpen(false); setEditingAgent(null) }}
          onSave={handleSave}
          campaigns={campaigns}
        />
      )}
    </div>
  )
}
