// Campanhas — dados reais do Meta Ads com edição direta
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconRefresh, IconPlayerPlay, IconPlayerPause, IconEdit, IconExternalLink, IconAlertCircle, IconPlugConnected, IconChevronUp, IconChevronDown } from '@tabler/icons-react'
import Tabs from '../../components/ui/Tabs'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'
import DateFilter from '../../components/ui/DateFilter'
import { useMeta } from '../../context/MetaContext'
import {
  getCampaigns,
  getCampaignInsights,
  updateCampaignStatus,
  updateCampaignBudget,
  getActionCount,
  getActionValue,
  META_STATUS_LABELS,
  META_OBJECTIVE_LABELS,
} from '../../lib/metaApi'
import { formatCurrency, formatPercent, formatRoas, formatNumber } from '../../utils/formatters'

// Mapa de cores por status Meta
const STATUS_STYLE = {
  ACTIVE: 'bg-status-successBg text-status-success',
  PAUSED: 'bg-status-warningBg text-status-warning',
  DELETED: 'bg-surface-bg text-txt-secondary',
  ARCHIVED: 'bg-surface-bg text-txt-secondary',
  WITH_ISSUES: 'bg-status-errorBg text-status-error',
}

function StatusChip({ status }) {
  const label = META_STATUS_LABELS[status] || status
  const cls = STATUS_STYLE[status] || 'bg-surface-bg text-txt-secondary'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {label}
    </span>
  )
}

// Modal inline de edição de orçamento
function BudgetModal({ campaign, onSave, onClose }) {
  const currentBudget = campaign.daily_budget
    ? Number(campaign.daily_budget) / 100
    : Number(campaign.lifetime_budget) / 100
  const [value, setValue] = useState(currentBudget.toFixed(2))
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await onSave(campaign.id, Math.round(Number(value) * 100))
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-card border border-border p-6 w-full max-w-sm shadow-xl">
        <h3 className="text-sm font-semibold text-txt-primary mb-1">Editar orçamento diário</h3>
        <p className="text-xs text-txt-secondary mb-4 truncate">{campaign.name}</p>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-txt-secondary">R$</span>
          <input
            type="number"
            min="1"
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-input focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          />
        </div>
        <div className="mt-4 flex gap-2">
          <Button fullWidth onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
          <Button variant="secondary" fullWidth onClick={onClose}>Cancelar</Button>
        </div>
      </div>
    </div>
  )
}

export default function Campaigns() {
  const navigate = useNavigate()
  const { isConnected, loadingConnection, connections, activeAccounts, selectedAccountId, setSelectedAccountId, currency } = useMeta()

  const [campaigns, setCampaigns] = useState([])
  const [insights, setInsights] = useState({})   // campaignId → insight obj
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('all')
  const [datePreset, setDatePreset] = useState('last_30d')
  const [timeRange, setTimeRange]   = useState(null)
  const [editingBudget, setEditingBudget] = useState(null)
  const [toggling, setToggling] = useState({})   // campaignId → bool
  const [sortField, setSortField] = useState('spend')
  const [sortDirection, setSortDirection] = useState('desc')

  const loadData = useCallback(async () => {
    if (!isConnected || !activeAccounts || activeAccounts.length === 0) return
    setLoading(true)
    setError(null)
    try {
      const allCampaignsRaw = await Promise.all(activeAccounts.map(acc => getCampaigns(acc.account_id)))
      const allInsightsRaw = await Promise.all(activeAccounts.map(acc => getCampaignInsights(acc.account_id, datePreset, timeRange)))

      const mergedCampaigns = []
      allCampaignsRaw.forEach((campArray, i) => {
        campArray.forEach(c => {
          mergedCampaigns.push({ ...c, __account_name: activeAccounts[i].account_name, __account_id: activeAccounts[i].account_id })
        })
      })
      setCampaigns(mergedCampaigns)

      const idx = {}
      allInsightsRaw.flat().forEach((ins) => { idx[ins.campaign_id] = ins })
      setInsights(idx)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [isConnected, activeAccounts, datePreset, timeRange])

  useEffect(() => { loadData() }, [loadData])

  // Toggle status campanha
  const handleToggleStatus = async (campaign) => {
    const newStatus = campaign.effective_status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    setToggling((t) => ({ ...t, [campaign.id]: true }))
    try {
      await updateCampaignStatus(campaign.id, newStatus)
      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === campaign.id ? { ...c, status: newStatus, effective_status: newStatus } : c
        )
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setToggling((t) => ({ ...t, [campaign.id]: false }))
    }
  }

  // Salvar novo orçamento
  const handleSaveBudget = async (campaignId, cents) => {
    try {
      await updateCampaignBudget(campaignId, cents)
      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === campaignId ? { ...c, daily_budget: String(cents) } : c
        )
      )
    } catch (err) {
      setError(err.message)
    }
  }

  // Filtros por tab
  const filtered = activeTab === 'all'
    ? campaigns
    : campaigns.filter((c) => (c.effective_status || c.status) === activeTab.toUpperCase())

  const tabs = [
    { id: 'all', label: 'Todas', count: campaigns.length },
    { id: 'active', label: 'Ativas', count: campaigns.filter((c) => (c.effective_status || c.status) === 'ACTIVE').length },
    { id: 'paused', label: 'Pausadas', count: campaigns.filter((c) => (c.effective_status || c.status) === 'PAUSED').length },
  ]

  const prepared = filtered.map(c => {
    const ins = insights[c.id] || {}
    const spend = Number(ins.spend || 0)
    const impressions = Number(ins.impressions || 0)
    const clicks = Number(ins.clicks || 0)
    const ctr = Number(ins.ctr || 0)
    const cpc = Number(ins.cpc || 0)

    const purchases = getActionCount(ins.actions, 'purchase')
    const whatsapp  = getActionCount(ins.actions, 'onsite_conversion.messaging_conversation_started_7d')
    const leads     = getActionCount(ins.actions, 'lead') + getActionCount(ins.actions, 'offsite_conversion.fb_pixel_lead')
    const totalConversions = purchases + whatsapp + leads

    const revenue = getActionValue(ins.action_values, 'purchase')
    const roas = spend > 0 && revenue > 0 ? revenue / spend : 0
    const cpa  = spend > 0 && totalConversions > 0 ? spend / totalConversions : 0

    const budget = c.daily_budget ? Number(c.daily_budget) / 100 : c.lifetime_budget ? Number(c.lifetime_budget) / 100 : 0
    const status = c.effective_status || c.status

    return { ...c, spend, impressions, clicks, ctr, cpc, purchases, whatsapp, leads, totalConversions, revenue, roas, cpa, budget, status }
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
  const tClicks = prepared.reduce((s, c) => s + c.clicks, 0)
  const tConv = prepared.reduce((s, c) => s + c.totalConversions, 0)
  const tRev = prepared.reduce((s, c) => s + c.revenue, 0)
  const tCtr = tImp > 0 ? (tClicks / tImp) * 100 : 0
  const tCpc = tClicks > 0 ? tSpend / tClicks : 0
  const tCpa = tConv > 0 ? tSpend / tConv : 0
  const tRoas = tSpend > 0 ? tRev / tSpend : 0

  const handleSort = (field) => {
    if (sortField === field) setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDirection('desc') }
  }

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? <IconChevronUp size={14} className="ml-1 inline" /> : <IconChevronDown size={14} className="ml-1 inline" />
  }

  // Tela: sem conexão Meta
  if (!loadingConnection && !isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div className="w-16 h-16 bg-surface-bg rounded-full flex items-center justify-center">
          <IconPlugConnected size={32} className="text-txt-secondary" />
        </div>
        <div>
          <p className="text-base font-semibold text-txt-primary">Conta Meta Ads não conectada</p>
          <p className="text-sm text-txt-secondary mt-1">Conecte seu Gerenciador de Anúncios para ver suas campanhas reais.</p>
        </div>
        <Button onClick={() => navigate('/conexoes')} icon={IconPlugConnected}>
          Conectar Meta Ads
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho com conta + filtro de data */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
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

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tabela */}
      <div className="bg-white border border-border rounded-card overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40 gap-2 text-txt-secondary">
            <div className="w-5 h-5 border-2 border-border border-t-brand-500 rounded-full animate-spin" />
            <span className="text-sm">Carregando campanhas…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-txt-secondary">
            <p className="text-sm">Nenhuma campanha encontrada.</p>
          </div>
        ) : (
          <table className="w-full min-w-[960px]">
            <thead>
              <tr className="border-b border-border bg-surface-bg">
                {[
                  { k: 'name', l: 'Campanha' }, { k: 'objective', l: 'Objetivo' }, { k: 'budget', l: 'Orçamento/dia' },
                  { k: 'spend', l: 'Investido' }, { k: 'impressions', l: 'Impressões' }, { k: 'clicks', l: 'Cliques' },
                  { k: 'ctr', l: 'CTR' }, { k: 'cpc', l: 'CPC' }, { k: 'totalConversions', l: 'Conversões' },
                  { k: 'cpa', l: 'CPA' }, { k: 'roas', l: 'ROAS' }, { k: 'status', l: 'Status' }
                ].map((col) => (
                  <th key={col.k} onClick={() => handleSort(col.k)} className="text-left text-xs font-medium text-txt-secondary px-4 py-3 uppercase tracking-wide whitespace-nowrap cursor-pointer select-none hover:text-txt-primary">
                    {col.l} <SortIcon field={col.k} />
                  </th>
                ))}
                <th className="text-left text-xs font-medium text-txt-secondary px-4 py-3 uppercase tracking-wide whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody>
              {prepared.map((c) => {
                const isActive = c.status === 'ACTIVE'

                return (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface-bg/50 transition-colors">
                    <td className="px-4 py-3 max-w-[220px]">
                      <p className="text-sm font-medium text-txt-primary truncate">{c.name}</p>
                      {selectedAccountId === 'all' && (
                        <p className="text-[10px] text-brand-500 font-medium truncate mt-0.5">{c.__account_name}</p>
                      )}
                      <p className="text-xs text-txt-secondary font-mono">{c.id}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-txt-secondary whitespace-nowrap">
                      {META_OBJECTIVE_LABELS[c.objective] || c.objective || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-txt-primary whitespace-nowrap">
                      {c.budget ? (
                        <button
                          onClick={() => setEditingBudget(c)}
                          className="flex items-center gap-1 hover:text-brand-500 transition-colors group"
                          title="Clique para editar"
                        >
                          {formatCurrency(c.budget, currency)}
                          <IconEdit size={12} className="opacity-0 group-hover:opacity-100" />
                        </button>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-txt-primary whitespace-nowrap">
                      {c.spend > 0 ? formatCurrency(c.spend, currency) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-txt-primary whitespace-nowrap">
                      {c.impressions > 0 ? formatNumber(c.impressions) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-txt-primary whitespace-nowrap">
                      {c.clicks > 0 ? formatNumber(c.clicks) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-txt-primary whitespace-nowrap">
                      {c.ctr > 0 ? formatPercent(c.ctr) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-txt-primary whitespace-nowrap">
                      {c.cpc > 0 ? formatCurrency(c.cpc, currency) : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {c.totalConversions > 0 ? (
                        <div className="text-sm">
                          <span className="font-medium text-txt-primary">{formatNumber(c.totalConversions)}</span>
                          {c.whatsapp > 0 && (
                            <p className="text-xs text-txt-secondary">
                              {formatNumber(c.whatsapp)} WhatsApp
                            </p>
                          )}
                        </div>
                      ) : <span className="text-sm text-txt-secondary">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      {c.cpa > 0 ? (
                        <span className={`font-semibold ${c.cpa > 50 ? 'text-status-error' : c.cpa > 20 ? 'text-status-warning' : 'text-status-success'}`}>
                          {formatCurrency(c.cpa, currency)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      {c.roas > 0 ? (
                        <span className={c.roas >= 3 ? 'text-status-success font-medium' : c.roas >= 2 ? 'text-txt-primary' : 'text-status-error'}>
                          {formatRoas(c.roas)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusChip status={c.status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        {/* Toggle ativo/pausado */}
                        <button
                          onClick={() => handleToggleStatus(c)}
                          disabled={toggling[c.id] || status === 'DELETED' || status === 'ARCHIVED'}
                          title={isActive ? 'Pausar campanha' : 'Ativar campanha'}
                          className={`p-1.5 rounded-input transition-all duration-150 disabled:opacity-40 ${
                            isActive
                              ? 'text-status-warning hover:bg-status-warningBg'
                              : 'text-status-success hover:bg-status-successBg'
                          }`}
                        >
                          {toggling[c.id]
                            ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            : isActive
                            ? <IconPlayerPause size={16} stroke={1.5} />
                            : <IconPlayerPlay size={16} stroke={1.5} />
                          }
                        </button>
                        {/* Editar orçamento */}
                        <button
                          onClick={() => setEditingBudget(c)}
                          title="Editar orçamento"
                          className="p-1.5 rounded-input text-txt-secondary hover:text-brand-500 hover:bg-brand-50 transition-all"
                        >
                          <IconEdit size={16} stroke={1.5} />
                        </button>
                        {/* Abrir no Gerenciador */}
                        <a
                          href={`https://business.facebook.com/adsmanager/manage/campaigns?act=${(c.__account_id || selectedAccountId)?.replace('act_', '')}&selected_campaign_ids=${c.id}`}
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
                <td className="px-4 py-3 text-sm font-bold text-txt-primary">{formatCurrency(tSpend, currency)}</td>
                <td className="px-4 py-3 text-sm font-bold text-txt-primary">{formatNumber(tImp)}</td>
                <td className="px-4 py-3 text-sm font-bold text-txt-primary">{formatNumber(tClicks)}</td>
                <td className="px-4 py-3 text-sm font-bold text-txt-primary">{formatPercent(tCtr)}</td>
                <td className="px-4 py-3 text-sm font-bold text-txt-primary">{formatCurrency(tCpc, currency)}</td>
                <td className="px-4 py-3 text-sm font-bold text-txt-primary">{formatNumber(tConv)}</td>
                <td className="px-4 py-3 text-sm font-bold text-txt-primary">{formatCurrency(tCpa, currency)}</td>
                <td className="px-4 py-3 text-sm font-bold text-txt-primary">{formatRoas(tRoas)}</td>
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
          campaign={editingBudget}
          onSave={handleSaveBudget}
          onClose={() => setEditingBudget(null)}
        />
      )}
    </div>
  )
}
