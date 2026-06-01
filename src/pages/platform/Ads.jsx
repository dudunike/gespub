// Anúncios — criativos reais do Meta Ads com preview, filtros e métricas completas
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconList, IconLayoutGrid, IconPlayerPlay,
  IconPlugConnected, IconRefresh, IconAlertCircle,
  IconExternalLink, IconPlayerPause, IconPhoto,
  IconChevronDown, IconSearch,
} from '@tabler/icons-react'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'
import DateFilter from '../../components/ui/DateFilter'
import { useMeta } from '../../context/MetaContext'
import {
  getAdsWithCreatives,
  getAdInsights,
  getCampaigns,
  getAdSets,
  updateAdStatus,
  getActionCount,
  META_STATUS_LABELS,
} from '../../lib/metaApi'
import { formatPercent, formatCurrency, formatNumber } from '../../utils/formatters'

const TYPE_LABELS = { image: 'Imagem', video: 'Vídeo', carousel: 'Carrossel' }
const TYPE_BADGE  = { image: 'default', video: 'brand', carousel: 'default' }

function detectAdType(creative) {
  if (!creative) return 'image'
  const t = (creative.object_type || '').toUpperCase()
  if (t === 'VIDEO' || creative.video_id) return 'video'
  if (t === 'CAROUSEL') return 'carousel'
  return 'image'
}

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

// Preview visual do criativo com fallback rico
function AdPreview({ url, type, name, size = 'full' }) {
  const [err, setErr] = useState(false)
  const isSmall = size === 'sm'
  const cls = isSmall
    ? 'w-14 h-14 rounded-lg shrink-0 overflow-hidden'
    : 'w-full aspect-[4/3] overflow-hidden bg-surface-bg'

  const gradients = {
    image:    'from-violet-500 to-purple-700',
    video:    'from-purple-700 to-violet-900',
    carousel: 'from-violet-400 to-purple-500',
  }
  const grad = gradients[type] || gradients.image

  if (url && !err) {
    return (
      <div className={`relative ${cls}`}>
        <img
          src={url}
          alt={name}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setErr(true)}
        />
        {type === 'video' && !isSmall && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/25">
            <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center shadow-xl">
              <IconPlayerPlay size={22} className="text-brand-500 ml-1" fill="currentColor" />
            </div>
          </div>
        )}
        {type === 'video' && isSmall && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <IconPlayerPlay size={12} className="text-white" fill="white" />
          </div>
        )}
      </div>
    )
  }

  // Fallback gradient com ícone
  return (
    <div className={`relative bg-gradient-to-br ${grad} ${cls} flex items-center justify-center`}>
      {type === 'video'
        ? <IconPlayerPlay size={isSmall ? 14 : 32} className="text-white/80" fill="white" />
        : <IconPhoto size={isSmall ? 14 : 32} className="text-white/60" />
      }
      {!isSmall && (
        <div className="absolute bottom-0 inset-x-0 bg-black/40 px-3 py-2">
          <p className="text-white text-xs font-medium truncate">{name}</p>
        </div>
      )}
    </div>
  )
}

export default function Ads() {
  const navigate = useNavigate()
  const { isConnected, accessToken, accountId, accountName, loadingConnection } = useMeta()

  const [viewMode, setViewMode]         = useState('grid')
  const [ads, setAds]                   = useState([])
  const [insights, setInsights]         = useState({})
  const [campaigns, setCampaigns]       = useState([])
  const [adSets, setAdSets]             = useState([])
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState(null)
  const [datePreset, setDatePreset]     = useState('last_30d')
  const [timeRange, setTimeRange]       = useState(null)
  const [toggling, setToggling]         = useState({})
  const [filterCampaign, setFilterCampaign] = useState('')
  const [filterAdSet, setFilterAdSet]   = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [search, setSearch]             = useState('')

  const loadData = useCallback(async () => {
    if (!isConnected || !accessToken || !accountId) return
    setLoading(true); setError(null)
    try {
      const [rawAds, rawInsights, rawCampaigns, rawAdSets] = await Promise.all([
        getAdsWithCreatives(accountId, accessToken),
        getAdInsights(accountId, accessToken, datePreset, timeRange),
        getCampaigns(accountId, accessToken),
        getAdSets(accountId, accessToken),
      ])
      setAds(rawAds)
      setCampaigns(rawCampaigns)
      setAdSets(rawAdSets)
      const idx = {}
      rawInsights.forEach((i) => { idx[i.ad_id] = i })
      setInsights(idx)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [isConnected, accessToken, accountId, datePreset, timeRange])

  useEffect(() => { loadData() }, [loadData])

  const handleToggle = async (ad) => {
    const newStatus = (ad.effective_status || ad.status) === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    setToggling((t) => ({ ...t, [ad.id]: true }))
    try {
      await updateAdStatus(ad.id, accessToken, newStatus)
      setAds((prev) => prev.map((a) => a.id === ad.id
        ? { ...a, status: newStatus, effective_status: newStatus } : a))
    } catch (err) { setError(err.message) }
    finally { setToggling((t) => ({ ...t, [ad.id]: false })) }
  }

  // Lookup maps para nomes
  const campaignMap = Object.fromEntries(campaigns.map((c) => [c.id, c.name]))
  const adSetMap    = Object.fromEntries(adSets.map((s) => [s.id, s.name]))

  function normalizeAd(ad) {
    const ins         = insights[ad.id] || {}
    const status      = ad.effective_status || ad.status
    const creative    = ad.creative || {}
    const type        = detectAdType(creative)
    const thumbnailUrl = creative.thumbnail_url || creative.image_url || null
    const spend        = Number(ins.spend        || 0)
    const impressions  = Number(ins.impressions  || 0)
    const clicks       = Number(ins.clicks       || 0)
    const ctr          = Number(ins.ctr          || 0)
    const cpc          = Number(ins.cpc          || 0)
    const frequency    = Number(ins.frequency    || 0)
    const reach        = Number(ins.reach        || 0)
    const conversions  = getActionCount(ins.actions, 'purchase')
                       + getActionCount(ins.actions, 'lead')
                       + getActionCount(ins.actions, 'onsite_conversion.messaging_conversation_started_7d')

    const campaignId = ad.campaign_id || ad.campaign?.id || ''
    const adSetId    = ad.adset_id    || ad.adset?.id    || ''

    return {
      id: ad.id,
      name: ad.name,
      status,
      type,
      thumbnailUrl,
      body:  creative.body  || '',
      title: creative.title || '',
      cta:   creative.call_to_action_type || '',
      campaignId,
      adSetId,
      campaignName: ad.campaign?.name || campaignMap[campaignId] || campaignId || '—',
      adSetName:    ad.adset?.name    || adSetMap[adSetId]       || adSetId    || '—',
      spend, impressions, clicks, ctr, cpc, frequency, reach, conversions,
    }
  }

  const normalized = ads.map(normalizeAd)

  // Filtros encadeados
  const adSetsForCampaign = filterCampaign
    ? adSets.filter((s) => s.campaign_id === filterCampaign)
    : adSets

  const filtered = normalized.filter((ad) => {
    if (filterCampaign && ad.campaignId !== filterCampaign) return false
    if (filterAdSet    && ad.adSetId    !== filterAdSet)    return false
    if (filterStatus   && ad.status     !== filterStatus)   return false
    if (search && !ad.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const campaignOptions = campaigns.map((c) => ({ id: c.id, label: c.name }))
  const adSetOptions    = adSetsForCampaign.map((s) => ({ id: s.id, label: s.name }))
  const statusOptions   = [
    { id: 'ACTIVE', label: 'Ativas' },
    { id: 'PAUSED', label: 'Pausadas' },
  ]

  if (!loadingConnection && !isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div className="w-16 h-16 bg-surface-bg rounded-full flex items-center justify-center">
          <IconPlugConnected size={32} className="text-txt-secondary" />
        </div>
        <div>
          <p className="text-base font-semibold text-txt-primary">Conta Meta Ads não conectada</p>
          <p className="text-sm text-txt-secondary mt-1">Conecte o Gerenciador de Anúncios para ver seus criativos reais.</p>
        </div>
        <Button onClick={() => navigate('/conexoes')} icon={IconPlugConnected}>Conectar Meta Ads</Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* Header — filtros + controles */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Busca por nome */}
        <div className="relative">
          <IconSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-txt-secondary pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar anúncio…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-7 pr-3 py-1.5 text-sm border border-border rounded-input focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 w-44"
          />
        </div>

        <Select
          name="filterCampaign"
          value={filterCampaign}
          onChange={(e) => { setFilterCampaign(e.target.value); setFilterAdSet('') }}
          options={campaignOptions}
          placeholder="Todas as campanhas"
          className="w-52"
        />
        <Select
          name="filterAdSet"
          value={filterAdSet}
          onChange={(e) => setFilterAdSet(e.target.value)}
          options={adSetOptions}
          placeholder="Todos os conjuntos"
          className="w-48"
        />
        <Select
          name="filterStatus"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          options={statusOptions}
          placeholder="Qualquer status"
          className="w-36"
        />

        <div className="ml-auto flex items-center gap-2">
          {accountName && (
            <span className="text-xs text-txt-secondary bg-surface-bg px-2.5 py-1 rounded-full border border-border hidden sm:block">
              {accountName}
            </span>
          )}
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
          {/* Grid / Lista */}
          <div className="flex border border-border rounded-input overflow-hidden">
            <button onClick={() => setViewMode('grid')}
              className={`p-2 transition-all ${viewMode === 'grid' ? 'bg-brand-50 text-brand-500' : 'text-txt-secondary hover:bg-surface-bg'}`}
              title="Grade">
              <IconLayoutGrid size={17} stroke={1.5} />
            </button>
            <button onClick={() => setViewMode('list')}
              className={`p-2 transition-all ${viewMode === 'list' ? 'bg-brand-50 text-brand-500' : 'text-txt-secondary hover:bg-surface-bg'}`}
              title="Lista">
              <IconList size={17} stroke={1.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Contador */}
      <p className="text-xs text-txt-secondary">
        {filtered.length} de {normalized.length} anúncios
      </p>

      {/* Erro */}
      {error && (
        <div className="flex items-start gap-2 px-3 py-2 bg-status-errorBg border border-status-error rounded-input">
          <IconAlertCircle size={16} className="text-status-error shrink-0 mt-0.5" />
          <p className="text-sm text-status-error">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-48 gap-2 text-txt-secondary">
          <div className="w-5 h-5 border-2 border-border border-t-brand-500 rounded-full animate-spin" />
          <span className="text-sm">Carregando anúncios…</span>
        </div>
      )}

      {/* Vazio */}
      {!loading && normalized.length === 0 && (
        <div className="flex flex-col items-center justify-center h-40 text-txt-secondary">
          <p className="text-sm">Nenhum anúncio encontrado nesta conta.</p>
        </div>
      )}
      {!loading && normalized.length > 0 && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center h-28 text-txt-secondary">
          <p className="text-sm">Nenhum anúncio corresponde aos filtros.</p>
          <button onClick={() => { setFilterCampaign(''); setFilterAdSet(''); setFilterStatus(''); setSearch('') }}
            className="mt-2 text-xs text-brand-500 hover:text-brand-700">
            Limpar filtros
          </button>
        </div>
      )}

      {/* ===== GRADE ===== */}
      {!loading && filtered.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((ad) => {
            const isActive = ad.status === 'ACTIVE'
            return (
              <div key={ad.id}
                className="bg-white border border-border rounded-card overflow-hidden hover:border-brand-200 hover:shadow-md transition-all duration-150 flex flex-col">

                {/* Preview do criativo */}
                <div className="relative">
                  <AdPreview url={ad.thumbnailUrl} type={ad.type} name={ad.name} />

                  {/* Badges topo-direita: tipo */}
                  <div className="absolute top-2 right-2">
                    <Badge variant={TYPE_BADGE[ad.type]}>{TYPE_LABELS[ad.type]}</Badge>
                  </div>

                  {/* Badges topo-esquerda: performance */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {ad.ctr > 4          && <Badge variant="brand">Top performer</Badge>}
                    {ad.frequency > 3.5  && <Badge variant="warning">Fadiga</Badge>}
                    {ad.cpc > 5          && <Badge variant="error">CPC alto</Badge>}
                  </div>

                  {/* Link externo */}
                  <a
                    href={`https://business.facebook.com/adsmanager/manage/ads?act=${accountId?.replace('act_', '')}&selected_ad_ids=${ad.id}`}
                    target="_blank" rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="absolute bottom-2 right-2 p-1.5 bg-white/90 rounded-input text-txt-secondary hover:text-brand-500 shadow-sm transition-all"
                    title="Abrir no Gerenciador">
                    <IconExternalLink size={13} stroke={1.5} />
                  </a>
                </div>

                {/* Corpo do card */}
                <div className="p-3 flex flex-col gap-2 flex-1">
                  {/* Nome */}
                  <div>
                    <p className="text-sm font-semibold text-txt-primary leading-snug line-clamp-2" title={ad.name}>
                      {ad.name}
                    </p>
                    {/* Hierarquia Campanha > Conjunto */}
                    <div className="flex items-center gap-1 mt-1 text-xs text-txt-secondary min-w-0">
                      <span className="truncate max-w-[90px]" title={ad.campaignName}>{ad.campaignName}</span>
                      <IconChevronDown size={10} className="shrink-0 -rotate-90 opacity-50" />
                      <span className="truncate max-w-[90px]" title={ad.adSetName}>{ad.adSetName}</span>
                    </div>
                  </div>

                  {/* Texto do anúncio */}
                  {(ad.title || ad.body) && (
                    <div className="bg-surface-bg rounded-input px-2.5 py-2">
                      {ad.title && (
                        <p className="text-xs font-medium text-txt-primary line-clamp-1">{ad.title}</p>
                      )}
                      {ad.body && (
                        <p className="text-xs text-txt-secondary line-clamp-2 mt-0.5">{ad.body}</p>
                      )}
                    </div>
                  )}

                  {/* Métricas */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                    <div>
                      <p className="text-txt-secondary">Investido</p>
                      <p className="font-semibold text-txt-primary">{ad.spend > 0 ? formatCurrency(ad.spend) : '—'}</p>
                    </div>
                    <div>
                      <p className="text-txt-secondary">Impressões</p>
                      <p className="font-semibold text-txt-primary">{ad.impressions > 0 ? formatNumber(ad.impressions) : '—'}</p>
                    </div>
                    <div>
                      <p className="text-txt-secondary">CTR</p>
                      <p className={`font-semibold ${ad.ctr > 3 ? 'text-status-success' : 'text-txt-primary'}`}>
                        {ad.ctr > 0 ? formatPercent(ad.ctr) : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-txt-secondary">CPC</p>
                      <p className="font-semibold text-txt-primary">{ad.cpc > 0 ? formatCurrency(ad.cpc) : '—'}</p>
                    </div>
                    <div>
                      <p className="text-txt-secondary">Alcance</p>
                      <p className="font-semibold text-txt-primary">{ad.reach > 0 ? formatNumber(ad.reach) : '—'}</p>
                    </div>
                    <div>
                      <p className="text-txt-secondary">Frequência</p>
                      <p className={`font-semibold ${ad.frequency > 3 ? 'text-status-warning' : 'text-txt-primary'}`}>
                        {ad.frequency > 0 ? `${ad.frequency.toFixed(1)}×` : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Rodapé: status + ações */}
                  <div className="flex items-center justify-between pt-1 border-t border-border mt-auto">
                    <StatusChip status={ad.status} />
                    <button
                      onClick={() => handleToggle(ad)}
                      disabled={toggling[ad.id] || ad.status === 'DELETED' || ad.status === 'ARCHIVED'}
                      className={`p-1.5 rounded-input transition-all disabled:opacity-40 ${
                        isActive ? 'text-status-warning hover:bg-status-warningBg' : 'text-status-success hover:bg-status-successBg'
                      }`}
                      title={isActive ? 'Pausar' : 'Ativar'}>
                      {toggling[ad.id]
                        ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        : isActive ? <IconPlayerPause size={15} stroke={1.5} /> : <IconPlayerPlay size={15} stroke={1.5} />
                      }
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ===== LISTA ===== */}
      {!loading && filtered.length > 0 && viewMode === 'list' && (
        <div className="bg-white border border-border rounded-card overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr className="border-b border-border bg-surface-bg">
                {['Anúncio', 'Campanha / Conjunto', 'Tipo', 'Investido', 'Impressões', 'CTR', 'CPC', 'Frequência', 'Conversões', 'Status', ''].map((h) => (
                  <th key={h} className="text-left text-xs font-medium text-txt-secondary px-3 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((ad) => {
                const isActive = ad.status === 'ACTIVE'
                return (
                  <tr key={ad.id} className="border-b border-border last:border-0 hover:bg-surface-bg/50 transition-colors">
                    {/* Anúncio */}
                    <td className="px-3 py-3 max-w-[220px]">
                      <div className="flex items-center gap-2.5">
                        <AdPreview url={ad.thumbnailUrl} type={ad.type} name={ad.name} size="sm" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-txt-primary truncate">{ad.name}</p>
                          <p className="text-xs text-txt-secondary font-mono truncate">{ad.id}</p>
                        </div>
                      </div>
                    </td>
                    {/* Campanha / Conjunto */}
                    <td className="px-3 py-3 max-w-[200px]">
                      <p className="text-xs text-txt-primary truncate font-medium">{ad.campaignName}</p>
                      <p className="text-xs text-txt-secondary truncate">{ad.adSetName}</p>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <Badge variant={TYPE_BADGE[ad.type]}>{TYPE_LABELS[ad.type]}</Badge>
                    </td>
                    <td className="px-3 py-3 text-sm font-medium text-txt-primary whitespace-nowrap">
                      {ad.spend > 0 ? formatCurrency(ad.spend) : '—'}
                    </td>
                    <td className="px-3 py-3 text-sm text-txt-primary whitespace-nowrap">
                      {ad.impressions > 0 ? formatNumber(ad.impressions) : '—'}
                    </td>
                    <td className="px-3 py-3 text-sm whitespace-nowrap">
                      <span className={ad.ctr > 3 ? 'text-status-success font-medium' : 'text-txt-primary'}>
                        {ad.ctr > 0 ? formatPercent(ad.ctr) : '—'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-txt-primary whitespace-nowrap">
                      {ad.cpc > 0 ? formatCurrency(ad.cpc) : '—'}
                    </td>
                    <td className="px-3 py-3 text-sm whitespace-nowrap">
                      <span className={ad.frequency > 3 ? 'text-status-warning font-medium' : 'text-txt-primary'}>
                        {ad.frequency > 0 ? `${ad.frequency.toFixed(1)}×` : '—'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-txt-primary whitespace-nowrap">
                      {ad.conversions > 0 ? formatNumber(ad.conversions) : '—'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <StatusChip status={ad.status} />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggle(ad)}
                          disabled={toggling[ad.id] || ad.status === 'DELETED' || ad.status === 'ARCHIVED'}
                          className={`p-1.5 rounded-input transition-all disabled:opacity-40 ${
                            isActive ? 'text-status-warning hover:bg-status-warningBg' : 'text-status-success hover:bg-status-successBg'
                          }`}
                          title={isActive ? 'Pausar' : 'Ativar'}>
                          {toggling[ad.id]
                            ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            : isActive ? <IconPlayerPause size={15} stroke={1.5} /> : <IconPlayerPlay size={15} stroke={1.5} />
                          }
                        </button>
                        <a
                          href={`https://business.facebook.com/adsmanager/manage/ads?act=${accountId?.replace('act_', '')}&selected_ad_ids=${ad.id}`}
                          target="_blank" rel="noopener noreferrer"
                          className="p-1.5 rounded-input text-txt-secondary hover:text-brand-500 hover:bg-brand-50 transition-all inline-flex"
                          title="Ver no Gerenciador">
                          <IconExternalLink size={15} stroke={1.5} />
                        </a>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
