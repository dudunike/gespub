// Campanhas — dados reais do Meta Ads com edição direta
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconRefresh, IconPlayerPlay, IconPlayerPause, IconEdit, IconExternalLink, IconAlertCircle, IconPlugConnected } from '@tabler/icons-react'
import Tabs from '../../components/ui/Tabs'
import Button from '../../components/ui/Button'
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
  const { isConnected, accessToken, accountId, accountName, loadingConnection } = useMeta()

  const [campaigns, setCampaigns] = useState([])
  const [insights, setInsights] = useState({})   // campaignId → insight obj
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('all')
  const [datePreset, setDatePreset] = useState('last_30d')
  const [timeRange, setTimeRange]   = useState(null)
  const [editingBudget, setEditingBudget] = useState(null)
  const [toggling, setToggling] = useState({})   // campaignId → bool

  const loadData = useCallback(async () => {
    if (!isConnected || !accessToken || !accountId) return
    setLoading(true)
    setError(null)
    try {
      const [rawCampaigns, rawInsights] = await Promise.all([
        getCampaigns(accountId, accessToken),
        getCampaignInsights(accountId, accessToken, datePreset, timeRange),
      ])
      setCampaigns(rawCampaigns)
      // Indexar insights por campaign_id
      const idx = {}
      rawInsights.forEach((ins) => { idx[ins.campaign_id] = ins })
      setInsights(idx)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [isConnected, accessToken, accountId, datePreset, timeRange])

  useEffect(() => { loadData() }, [loadData])

  // Toggle status campanha
  const handleToggleStatus = async (campaign) => {
    const newStatus = campaign.effective_status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    setToggling((t) => ({ ...t, [campaign.id]: true }))
    try {
      await updateCampaignStatus(campaign.id, accessToken, newStatus)
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
      await updateCampaignBudget(campaignId, accessToken, cents)
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
          {accountName && (
            <span className="text-xs text-txt-secondary bg-surface-bg px-2.5 py-1 rounded-full border border-border">
              {accountName}
            </span>
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
                {['Campanha', 'Objetivo', 'Orçamento/dia', 'Investido', 'Impressões', 'Cliques', 'CTR', 'CPC', 'Conversões', 'ROAS', 'Status', 'Ações'].map((h) => (
                  <th key={h} className="text-left text-xs font-medium text-txt-secondary px-4 py-3 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const ins = insights[c.id] || {}
                const spend = Number(ins.spend || 0)
                const impressions = Number(ins.impressions || 0)
                const clicks = Number(ins.clicks || 0)
                const ctr = Number(ins.ctr || 0)
                const cpc = Number(ins.cpc || 0)

                // Conversões: Purchase + WhatsApp
                const purchases = getActionCount(ins.actions, 'purchase')
                const whatsapp = getActionCount(ins.actions, 'onsite_conversion.messaging_conversation_started_7d')
                const totalConversions = purchases + whatsapp

                // ROAS
                const revenue = getActionValue(ins.action_values, 'purchase')
                const roas = spend > 0 && revenue > 0 ? revenue / spend : 0

                const budget = c.daily_budget
                  ? Number(c.daily_budget) / 100
                  : c.lifetime_budget ? Number(c.lifetime_budget) / 100 : null

                const status = c.effective_status || c.status
                const isActive = status === 'ACTIVE'

                return (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface-bg/50 transition-colors">
                    <td className="px-4 py-3 max-w-[220px]">
                      <p className="text-sm font-medium text-txt-primary truncate">{c.name}</p>
                      <p className="text-xs text-txt-secondary font-mono">{c.id}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-txt-secondary whitespace-nowrap">
                      {META_OBJECTIVE_LABELS[c.objective] || c.objective || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-txt-primary whitespace-nowrap">
                      {budget ? (
                        <button
                          onClick={() => setEditingBudget(c)}
                          className="flex items-center gap-1 hover:text-brand-500 transition-colors group"
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
                      {impressions > 0 ? formatNumber(impressions) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-txt-primary whitespace-nowrap">
                      {clicks > 0 ? formatNumber(clicks) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-txt-primary whitespace-nowrap">
                      {ctr > 0 ? formatPercent(ctr) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-txt-primary whitespace-nowrap">
                      {cpc > 0 ? formatCurrency(cpc) : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {totalConversions > 0 ? (
                        <div className="text-sm">
                          <span className="font-medium text-txt-primary">{formatNumber(totalConversions)}</span>
                          {whatsapp > 0 && (
                            <p className="text-xs text-txt-secondary">
                              {formatNumber(whatsapp)} WhatsApp
                            </p>
                          )}
                        </div>
                      ) : <span className="text-sm text-txt-secondary">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      {roas > 0 ? (
                        <span className={roas >= 3 ? 'text-status-success font-medium' : roas >= 2 ? 'text-txt-primary' : 'text-status-error'}>
                          {formatRoas(roas)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusChip status={status} />
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
                          href={`https://business.facebook.com/adsmanager/manage/campaigns?act=${accountId?.replace('act_', '')}&selected_campaign_ids=${c.id}`}
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
          campaign={editingBudget}
          onSave={handleSaveBudget}
          onClose={() => setEditingBudget(null)}
        />
      )}
    </div>
  )
}
