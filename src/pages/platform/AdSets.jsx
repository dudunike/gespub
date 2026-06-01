// Conjuntos de Anúncios — dados reais do Meta Ads API
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconRefresh, IconPlayerPlay, IconPlayerPause,
  IconEdit, IconExternalLink, IconAlertCircle,
  IconPlugConnected,
} from '@tabler/icons-react'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'
import { useMeta } from '../../context/MetaContext'
import {
  getCampaigns,
  getAdSets,
  getAdSetInsights,
  updateAdSetStatus,
  updateAdSetBudget,
  META_STATUS_LABELS,
  DATE_PRESETS,
} from '../../lib/metaApi'
import { formatCurrency, formatNumber, formatPercent } from '../../utils/formatters'

const STATUS_STYLE = {
  ACTIVE:   'bg-status-successBg text-status-success',
  PAUSED:   'bg-status-warningBg text-status-warning',
  ARCHIVED: 'bg-surface-bg text-txt-secondary',
  DELETED:  'bg-surface-bg text-txt-secondary',
}

function StatusChip({ status }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[status] || STATUS_STYLE.PAUSED}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {META_STATUS_LABELS[status] || status}
    </span>
  )
}

// Modal inline de edição de orçamento
function BudgetModal({ adSet, onSave, onClose }) {
  const current = adSet.daily_budget ? Number(adSet.daily_budget) / 100 : 0
  const [value, setValue] = useState(current > 0 ? current.toFixed(2) : '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await onSave(adSet.id, Math.round(Number(value) * 100))
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-card border border-border p-6 w-full max-w-sm shadow-xl">
        <h3 className="text-sm font-semibold text-txt-primary mb-1">Editar orçamento diário</h3>
        <p className="text-xs text-txt-secondary mb-4 truncate">{adSet.name}</p>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-txt-secondary">R$</span>
          <input
            type="number" min="1" step="0.01" value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-input focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          />
        </div>
        <div className="mt-4 flex gap-2">
          <Button fullWidth onClick={handleSave} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
          <Button variant="secondary" fullWidth onClick={onClose}>Cancelar</Button>
        </div>
      </div>
    </div>
  )
}

export default function AdSets() {
  const navigate = useNavigate()
  const { isConnected, accessToken, accountId, accountName, loadingConnection } = useMeta()

  const [adSets,     setAdSets]     = useState([])
  const [insights,   setInsights]   = useState({})   // adset_id → insight
  const [campaigns,  setCampaigns]  = useState([])   // para filtro
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)
  const [campaignFilter, setCampaignFilter] = useState('')
  const [datePreset,     setDatePreset]     = useState('last_30d')
  const [editingBudget,  setEditingBudget]  = useState(null)
  const [toggling,       setToggling]       = useState({})

  const loadData = useCallback(async () => {
    if (!isConnected || !accessToken || !accountId) return
    setLoading(true); setError(null)
    try {
      const [rawAdSets, rawInsights, rawCampaigns] = await Promise.all([
        getAdSets(accountId, accessToken),
        getAdSetInsights(accountId, accessToken, datePreset),
        getCampaigns(accountId, accessToken),
      ])
      setAdSets(rawAdSets)
      setCampaigns(rawCampaigns)
      const idx = {}
      rawInsights.forEach(i => { idx[i.adset_id] = i })
      setInsights(idx)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [isConnected, accessToken, accountId, datePreset])

  useEffect(() => { loadData() }, [loadData])

  const handleToggle = async (adSet) => {
    const newStatus = (adSet.effective_status || adSet.status) === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    setToggling(t => ({ ...t, [adSet.id]: true }))
    try {
      await updateAdSetStatus(adSet.id, accessToken, newStatus)
      setAdSets(prev => prev.map(a => a.id === adSet.id
        ? { ...a, status: newStatus, effective_status: newStatus } : a))
    } catch (err) { setError(err.message) }
    finally { setToggling(t => ({ ...t, [adSet.id]: false })) }
  }

  const handleSaveBudget = async (adSetId, cents) => {
    try {
      await updateAdSetBudget(adSetId, accessToken, cents)
      setAdSets(prev => prev.map(a => a.id === adSetId
        ? { ...a, daily_budget: String(cents) } : a))
    } catch (err) { setError(err.message) }
  }

  // Filtra por campanha
  const filtered = campaignFilter
    ? adSets.filter(a => a.campaign_id === campaignFilter)
    : adSets

  const campaignOptions = campaigns.map(c => ({ id: c.id, label: c.name }))

  // Sem conexão
  if (!loadingConnection && !isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div className="w-16 h-16 bg-surface-bg rounded-full flex items-center justify-center">
          <IconPlugConnected size={32} className="text-txt-secondary" />
        </div>
        <div>
          <p className="text-base font-semibold text-txt-primary">Conta Meta Ads não conectada</p>
          <p className="text-sm text-txt-secondary mt-1">Conecte seu Gerenciador de Anúncios para ver seus conjuntos reais.</p>
        </div>
        <Button onClick={() => navigate('/conexoes')} icon={IconPlugConnected}>Conectar Meta Ads</Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {accountName && (
            <span className="text-xs text-txt-secondary bg-surface-bg px-2.5 py-1 rounded-full border border-border">
              {accountName}
            </span>
          )}
          {/* Filtro por campanha */}
          {campaigns.length > 0 && (
            <Select
              name="campaignFilter"
              value={campaignFilter}
              onChange={(e) => setCampaignFilter(e.target.value)}
              options={campaignOptions}
              placeholder="Todas as campanhas"
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select
            name="datePreset"
            value={datePreset}
            onChange={(e) => setDatePreset(e.target.value)}
            options={DATE_PRESETS}
          />
          <Button variant="ghost" size="sm" onClick={loadData} disabled={loading} icon={IconRefresh}>
            {loading ? 'Atualizando…' : 'Atualizar'}
          </Button>
        </div>
      </div>

      {/* Erro */}
      {error && (
        <div className="flex items-start gap-2 px-3 py-2 bg-status-errorBg border border-status-error rounded-input">
          <IconAlertCircle size={16} className="text-status-error shrink-0 mt-0.5" />
          <p className="text-sm text-status-error">{error}</p>
        </div>
      )}

      {/* Tabela */}
      <div className="bg-white border border-border rounded-card overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40 gap-2 text-txt-secondary">
            <div className="w-5 h-5 border-2 border-border border-t-brand-500 rounded-full animate-spin" />
            <span className="text-sm">Carregando conjuntos…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-txt-secondary">
            <p className="text-sm">Nenhum conjunto encontrado.</p>
          </div>
        ) : (
          <table className="w-full min-w-[960px]">
            <thead>
              <tr className="border-b border-border bg-surface-bg">
                {['Nome', 'Campanha', 'Orç. diário', 'Investido', 'Alcance', 'Impressões', 'CTR', 'CPC', 'Frequência', 'CPM', 'Status', 'Ações'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-txt-secondary px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((adSet) => {
                const ins    = insights[adSet.id] || {}
                const status = adSet.effective_status || adSet.status
                const isActive = status === 'ACTIVE'
                const budget = adSet.daily_budget ? Number(adSet.daily_budget) / 100 : null
                const spend      = Number(ins.spend       || 0)
                const reach      = Number(ins.reach       || 0)
                const impressions= Number(ins.impressions || 0)
                const ctr        = Number(ins.ctr         || 0)
                const cpc        = Number(ins.cpc         || 0)
                const frequency  = Number(ins.frequency   || 0)
                const cpm        = Number(ins.cpm         || 0)

                return (
                  <tr key={adSet.id} className="border-b border-border last:border-0 hover:bg-surface-bg/50 transition-colors">
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="text-sm font-medium text-txt-primary truncate">{adSet.name}</p>
                      <p className="text-xs text-txt-secondary font-mono">{adSet.id}</p>
                    </td>
                    <td className="px-4 py-3 max-w-[180px]">
                      <p className="text-sm text-txt-secondary truncate">
                        {campaigns.find(c => c.id === adSet.campaign_id)?.name || adSet.campaign_id || '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {budget ? (
                        <button
                          onClick={() => setEditingBudget(adSet)}
                          className="flex items-center gap-1 text-sm font-medium text-txt-primary hover:text-brand-500 transition-colors group"
                          title="Clique para editar"
                        >
                          {formatCurrency(budget)}
                          <IconEdit size={12} className="opacity-0 group-hover:opacity-100" />
                        </button>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-txt-primary whitespace-nowrap">
                      {spend > 0 ? formatCurrency(spend) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-txt-primary whitespace-nowrap">
                      {reach > 0 ? formatNumber(reach) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-txt-primary whitespace-nowrap">
                      {impressions > 0 ? formatNumber(impressions) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      {ctr > 0 ? (
                        <span className={ctr > 3 ? 'text-status-success font-medium' : 'text-txt-primary'}>
                          {formatPercent(ctr)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-txt-primary whitespace-nowrap">
                      {cpc > 0 ? formatCurrency(cpc) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      {frequency > 0 ? (
                        <span className={frequency > 3 ? 'text-status-warning font-medium' : 'text-txt-primary'}>
                          {frequency.toFixed(1)}×
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-txt-primary whitespace-nowrap">
                      {cpm > 0 ? formatCurrency(cpm) : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusChip status={status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        {/* Toggle ativo/pausado */}
                        <button
                          onClick={() => handleToggle(adSet)}
                          disabled={toggling[adSet.id] || status === 'DELETED' || status === 'ARCHIVED'}
                          title={isActive ? 'Pausar conjunto' : 'Ativar conjunto'}
                          className={`p-1.5 rounded-input transition-all disabled:opacity-40 ${
                            isActive
                              ? 'text-status-warning hover:bg-status-warningBg'
                              : 'text-status-success hover:bg-status-successBg'
                          }`}
                        >
                          {toggling[adSet.id]
                            ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            : isActive
                            ? <IconPlayerPause size={16} stroke={1.5} />
                            : <IconPlayerPlay  size={16} stroke={1.5} />
                          }
                        </button>
                        {/* Editar orçamento */}
                        <button
                          onClick={() => setEditingBudget(adSet)}
                          title="Editar orçamento"
                          className="p-1.5 rounded-input text-txt-secondary hover:text-brand-500 hover:bg-brand-50 transition-all"
                        >
                          <IconEdit size={16} stroke={1.5} />
                        </button>
                        {/* Abrir no Gerenciador */}
                        <a
                          href={`https://business.facebook.com/adsmanager/manage/adsets?act=${accountId?.replace('act_', '')}&selected_adset_ids=${adSet.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Abrir no Gerenciador de Anúncios"
                          className="p-1.5 rounded-input text-txt-secondary hover:text-brand-500 hover:bg-brand-50 transition-all inline-flex"
                        >
                          <IconExternalLink size={16} stroke={1.5} />
                        </a>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal edição de orçamento */}
      {editingBudget && (
        <BudgetModal
          adSet={editingBudget}
          onSave={handleSaveBudget}
          onClose={() => setEditingBudget(null)}
        />
      )}
    </div>
  )
}
