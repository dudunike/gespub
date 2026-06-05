// Conjuntos de Anúncios — dados reais do Meta Ads API
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconRefresh, IconPlayerPlay, IconPlayerPause,
  IconEdit, IconExternalLink, IconAlertCircle,
  IconPlugConnected, IconChevronUp, IconChevronDown
} from '@tabler/icons-react'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'
import DateFilter from '../../components/ui/DateFilter'
import { useMeta } from '../../context/MetaContext'
import {
  getCampaigns,
  getAdSets,
  getAdSetInsights,
  updateAdSetStatus,
  updateAdSetBudget,
  getActionCount,
  META_STATUS_LABELS,
} from '../../lib/metaApi'
import { formatCurrency, formatNumber, formatPercent, formatRoas } from '../../utils/formatters'

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
  const { isConnected, accessToken, loadingConnection, connections, activeAccounts, selectedAccountId, setSelectedAccountId } = useMeta()

  const [adSets,     setAdSets]     = useState([])
  const [insights,   setInsights]   = useState({})   // adset_id → insight
  const [campaigns,  setCampaigns]  = useState([])   // para filtro
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)
  const [campaignFilter, setCampaignFilter] = useState('')
  const [datePreset,     setDatePreset]     = useState('last_30d')
  const [timeRange,      setTimeRange]      = useState(null)
  const [editingBudget,  setEditingBudget]  = useState(null)
  const [toggling,       setToggling]       = useState({})
  const [sortField, setSortField] = useState('spend')
  const [sortDirection, setSortDirection] = useState('desc')

  const loadData = useCallback(async () => {
    if (!isConnected || !accessToken || !activeAccounts || activeAccounts.length === 0) return
    setLoading(true); setError(null)
    try {
      const allAdSetsRaw = await Promise.all(activeAccounts.map(acc => getAdSets(acc.account_id)))
      const allInsightsRaw = await Promise.all(activeAccounts.map(acc => getAdSetInsights(acc.account_id, datePreset, timeRange)))
      const allCampaignsRaw = await Promise.all(activeAccounts.map(acc => getCampaigns(acc.account_id)))

      const mergedAdSets = []
      allAdSetsRaw.forEach((arr, i) => {
        arr.forEach(a => mergedAdSets.push({ ...a, __account_name: activeAccounts[i].account_name, __account_id: activeAccounts[i].account_id }))
      })
      
      setAdSets(mergedAdSets)
      setCampaigns(allCampaignsRaw.flat())
      
      const idx = {}
      allInsightsRaw.flat().forEach(i => { idx[i.adset_id] = i })
      setInsights(idx)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [isConnected, accessToken, activeAccounts, datePreset, timeRange])

  useEffect(() => { loadData() }, [loadData])

  const handleToggle = async (adSet) => {
    const newStatus = (adSet.effective_status || adSet.status) === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    setToggling(t => ({ ...t, [adSet.id]: true }))
    try {
      await updateAdSetStatus(adSet.id, newStatus)
      setAdSets(prev => prev.map(a => a.id === adSet.id
        ? { ...a, status: newStatus, effective_status: newStatus } : a))
    } catch (err) { setError(err.message) }
    finally { setToggling(t => ({ ...t, [adSet.id]: false })) }
  }

  const handleSaveBudget = async (adSetId, cents) => {
    try {
      await updateAdSetBudget(adSetId, cents)
      setAdSets(prev => prev.map(a => a.id === adSetId
        ? { ...a, daily_budget: String(cents) } : a))
    } catch (err) { setError(err.message) }
  }

  const filtered = campaignFilter
    ? adSets.filter(a => a.campaign_id === campaignFilter)
    : adSets

  const prepared = filtered.map(adSet => {
    const ins    = insights[adSet.id] || {}
    const status = adSet.effective_status || adSet.status
    const budget = adSet.daily_budget ? Number(adSet.daily_budget) / 100 : 0
    const spend      = Number(ins.spend       || 0)
    const reach      = Number(ins.reach       || 0)
    const impressions= Number(ins.impressions || 0)
    const ctr        = Number(ins.ctr         || 0)
    const cpc        = Number(ins.cpc         || 0)
    const frequency  = Number(ins.frequency   || 0)
    const cpm        = Number(ins.cpm         || 0)
    const purchases  = getActionCount(ins.actions, 'purchase')
    const whatsapp   = getActionCount(ins.actions, 'onsite_conversion.messaging_conversation_started_7d')
    const leads      = getActionCount(ins.actions, 'lead') + getActionCount(ins.actions, 'offsite_conversion.fb_pixel_lead')
    const totalConvs = purchases + whatsapp + leads
    const cpa        = spend > 0 && totalConvs > 0 ? spend / totalConvs : 0

    return { ...adSet, status, budget, spend, reach, impressions, ctr, cpc, frequency, cpm, purchases, whatsapp, leads, totalConvs, cpa }
  })

  prepared.sort((a, b) => {
    let valA = a[sortField] ?? 0
    let valB = b[sortField] ?? 0
    if (typeof valA === 'string') valA = valA.toLowerCase()
    if (typeof valB === 'string') valB = valB.toLowerCase()
    if (valA < valB) return sortDirection === 'asc' ? -1 : 1
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  const tSpend = prepared.reduce((s, c) => s + c.spend, 0)
  const tImp = prepared.reduce((s, c) => s + c.impressions, 0)
  const tReach = prepared.reduce((s, c) => s + c.reach, 0)
  const tConv = prepared.reduce((s, c) => s + c.totalConvs, 0)
  const tCpa = tConv > 0 ? tSpend / tConv : 0

  const handleSort = (field) => {
    if (sortField === field) setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDirection('desc') }
  }

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? <IconChevronUp size={14} className="ml-1 inline" /> : <IconChevronDown size={14} className="ml-1 inline" />
  }

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
          {connections.length > 1 ? (
            <Select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-48 !py-1.5"
              options={[
                { id: 'active', label: 'Conta Ativa' },
                { id: 'all', label: `Todas as contas (${connections.length})` },
                ...connections.map(c => ({ id: c.account_id, label: c.account_name }))
              ]}
            />
          ) : connections.length === 1 ? (
            <span className="text-xs text-txt-secondary bg-surface-bg px-2.5 py-1 rounded-full border border-border">
              {connections[0].account_name}
            </span>
          ) : null}
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
        <DateFilter
          preset={datePreset}
          since={timeRange?.since}
          until={timeRange?.until}
          onChange={({ preset, since, until }) => {
            setDatePreset(preset)
            setTimeRange(since && until ? { since, until } : null)
          }}
          onRefresh={loadData}
          loading={loading}
        />
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
                {[
                  { k: 'name', l: 'Nome' }, { k: 'campaign_id', l: 'Campanha' }, { k: 'budget', l: 'Orç. diário' },
                  { k: 'spend', l: 'Investido' }, { k: 'reach', l: 'Alcance' }, { k: 'impressions', l: 'Impressões' },
                  { k: 'ctr', l: 'CTR' }, { k: 'cpc', l: 'CPC' }, { k: 'totalConvs', l: 'Conversões' },
                  { k: 'cpa', l: 'CPA' }, { k: 'frequency', l: 'Frequência' }, { k: 'cpm', l: 'CPM' }, { k: 'status', l: 'Status' }
                ].map((col) => (
                  <th key={col.k} onClick={() => handleSort(col.k)} className="text-left text-xs font-medium text-txt-secondary px-4 py-3 uppercase tracking-wide whitespace-nowrap cursor-pointer select-none hover:text-txt-primary">
                    {col.l} <SortIcon field={col.k} />
                  </th>
                ))}
                <th className="text-left text-xs font-medium text-txt-secondary px-4 py-3 uppercase tracking-wide whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody>
              {prepared.map((adSet) => {
                const isActive = adSet.status === 'ACTIVE'

                return (
                  <tr key={adSet.id} className="border-b border-border last:border-0 hover:bg-surface-bg/50 transition-colors">
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="text-sm font-medium text-txt-primary truncate">{adSet.name}</p>
                      {selectedAccountId === 'all' && (
                        <p className="text-[10px] text-brand-500 font-medium truncate mt-0.5">{adSet.__account_name}</p>
                      )}
                      <p className="text-xs text-txt-secondary font-mono">{adSet.id}</p>
                    </td>
                    <td className="px-4 py-3 max-w-[180px]">
                      <p className="text-sm text-txt-secondary truncate">
                        {campaigns.find(c => c.id === adSet.campaign_id)?.name || adSet.campaign_id || '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {adSet.budget ? (
                        <button
                          onClick={() => setEditingBudget(adSet)}
                          className="flex items-center gap-1 text-sm font-medium text-txt-primary hover:text-brand-500 transition-colors group"
                          title="Clique para editar"
                        >
                          {formatCurrency(adSet.budget)}
                          <IconEdit size={12} className="opacity-0 group-hover:opacity-100" />
                        </button>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-txt-primary whitespace-nowrap">
                      {adSet.spend > 0 ? formatCurrency(adSet.spend) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-txt-primary whitespace-nowrap">
                      {adSet.reach > 0 ? formatNumber(adSet.reach) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-txt-primary whitespace-nowrap">
                      {adSet.impressions > 0 ? formatNumber(adSet.impressions) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      {adSet.ctr > 0 ? (
                        <span className={adSet.ctr > 3 ? 'text-status-success font-medium' : 'text-txt-primary'}>
                          {formatPercent(adSet.ctr)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-txt-primary whitespace-nowrap">
                      {adSet.cpc > 0 ? formatCurrency(adSet.cpc) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-txt-primary whitespace-nowrap">
                      {adSet.totalConvs > 0 ? (
                        <div>
                          <span className="font-medium">{formatNumber(adSet.totalConvs)}</span>
                          <p className="text-[10px] text-txt-secondary leading-tight">
                            {[adSet.purchases > 0 && `${adSet.purchases} compra${adSet.purchases !== 1 ? 's' : ''}`,
                              adSet.whatsapp  > 0 && `${adSet.whatsapp} WhatsApp`,
                              adSet.leads     > 0 && `${adSet.leads} lead${adSet.leads !== 1 ? 's' : ''}`
                            ].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      {adSet.cpa > 0 ? (
                        <span className={`font-semibold ${adSet.cpa > 50 ? 'text-status-error' : adSet.cpa > 20 ? 'text-status-warning' : 'text-status-success'}`}>
                          {formatCurrency(adSet.cpa)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      {adSet.frequency > 0 ? (
                        <span className={adSet.frequency > 3 ? 'text-status-warning font-medium' : 'text-txt-primary'}>
                          {adSet.frequency.toFixed(1)}×
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-txt-primary whitespace-nowrap">
                      {adSet.cpm > 0 ? formatCurrency(adSet.cpm) : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusChip status={adSet.status} />
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
                          href={`https://business.facebook.com/adsmanager/manage/adsets?act=${(adSet.__account_id || selectedAccountId)?.replace('act_', '')}&selected_adset_ids=${adSet.id}`}
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
            <tfoot className="bg-surface-bg border-t border-border">
              <tr>
                <td className="px-4 py-3 text-sm font-bold text-txt-primary">Totais ({prepared.length})</td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3 text-sm font-bold text-txt-primary">{formatCurrency(tSpend)}</td>
                <td className="px-4 py-3 text-sm font-bold text-txt-primary">{formatNumber(tReach)}</td>
                <td className="px-4 py-3 text-sm font-bold text-txt-primary">{formatNumber(tImp)}</td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3 text-sm font-bold text-txt-primary">{formatNumber(tConv)}</td>
                <td className="px-4 py-3 text-sm font-bold text-txt-primary">{formatCurrency(tCpa)}</td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3"></td>
              </tr>
            </tfoot>
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
