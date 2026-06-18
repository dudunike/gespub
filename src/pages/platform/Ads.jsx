// Anúncios — criativos reais do Meta Ads com preview, filtros e métricas completas
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconList, IconLayoutGrid, IconPlayerPlay,
  IconPlugConnected, IconAlertCircle,
  IconExternalLink, IconPlayerPause, IconPhoto,
  IconChevronDown, IconSearch, IconHeart, IconUserPlus,
  IconChevronUp
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
  getActionValue,
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

// Extrai a melhor URL de imagem disponível a partir do criativo Meta.
// A Meta retorna vários campos com resoluções diferentes:
//   - thumbnail_url: sempre baixa resolução (~64-128px) — NÃO usar como primária
//   - image_url: resolução média (~720px)
//   - object_story_spec.link_data.image_url / .picture: resolução boa
//   - object_story_spec.link_data.child_attachments[].image_url: carrossel alta res
//   - object_story_spec.video_data.image_url: thumbnail do vídeo em boa res
//   - asset_feed_spec.images[].url/hash: imagens do catálogo
// Limpa modificadores de resolução das URLs do Facebook CDN para obter a imagem original em alta qualidade
// Ex: remove /p100x100/, /s130x130/, /p480x480/ etc.
function cleanFbUrl(url) {
  if (!url) return null
  return url.replace(/\/[ps]\d+x\d+\//g, '/')
}

function getBestImageUrl(creative, type) {
  if (!creative) return null

  const story = creative.object_story_spec || {}
  const linkData = story.link_data || {}
  const videoData = story.video_data || {}
  const photoData = story.photo_data || {}
  const feedSpec = creative.asset_feed_spec || {}

  const anyFeedImage = feedSpec.images?.[0]?.url || feedSpec.images?.[0]?.image_url
  const anyFeedVideo = feedSpec.videos?.[0]?.thumbnail_url
  const anyChildImage = linkData.child_attachments?.[0]?.image_url || linkData.child_attachments?.[0]?.picture

  let url = null

  // Para vídeos: priorizar capa do vídeo em alta res
  if (type === 'video') {
    url = videoData.image_url ||
          anyFeedVideo ||
          creative.image_url ||
          linkData.picture ||
          anyFeedImage ||
          creative.thumbnail_url
  }
  // Para carrossel: usar primeira imagem do child_attachments
  else if (type === 'carousel') {
    url = anyChildImage ||
          creative.image_url ||
          linkData.image_url ||
          creative.thumbnail_url
  }
  // Para imagem: priorizar fontes de alta resolução
  else {
    url = linkData.image_url ||
          photoData.url ||
          anyFeedImage ||
          linkData.picture ||
          anyChildImage ||
          creative.image_url ||
          creative.thumbnail_url
  }

  return cleanFbUrl(url)
}

// Preview visual do criativo com qualidade máxima
function AdPreview({ url, type, name, size = 'full' }) {
  const [err, setErr] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const isSmall = size === 'sm'

  const cls = isSmall
    ? 'w-14 h-14 rounded-lg shrink-0 overflow-hidden bg-gray-100'
    : 'w-full aspect-video overflow-hidden bg-gray-950'

  const gradients = {
    image:    'from-violet-500 to-purple-700',
    video:    'from-purple-700 to-violet-900',
    carousel: 'from-violet-400 to-purple-500',
  }
  const grad = gradients[type] || gradients.image

  if (url && !err) {
    // Para imagens: object-contain preserva proporção sem cortar/borrar
    // Para vídeos e thumbs pequenos: object-cover para preencher o espaço
    const imgCls = isSmall
      ? 'w-full h-full object-cover'
      : type === 'video'
        ? 'w-full h-full object-cover'
        : 'w-full h-full object-contain'

    return (
      <div className={`relative ${cls}`}>
        {/* Skeleton enquanto carrega */}
        {!loaded && !isSmall && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse" />
        )}
        <img
          src={url}
          alt={name}
          className={`${imgCls} transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          loading="lazy"
          decoding="async"
          // Dicas para o navegador carregar em melhor qualidade
          sizes={isSmall ? '56px' : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw'}
          onLoad={() => setLoaded(true)}
          onError={() => setErr(true)}
        />
        {type === 'video' && !isSmall && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-xl">
              <IconPlayerPlay size={20} className="text-brand-500 ml-1" fill="currentColor" />
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
  const { isConnected, loadingConnection, connections, activeAccounts, selectedAccountId, setSelectedAccountId, currency } = useMeta()

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
  const [sortField, setSortField] = useState('spend')
  const [sortDirection, setSortDirection] = useState('desc')

  const loadData = useCallback(async () => {
    if (!isConnected || !activeAccounts || activeAccounts.length === 0) return
    setLoading(true); setError(null)
    try {
      const allAdsRaw = await Promise.all(activeAccounts.map(acc => getAdsWithCreatives(acc.account_id)))
      const allInsightsRaw = await Promise.all(activeAccounts.map(acc => getAdInsights(acc.account_id, datePreset, timeRange)))
      const allCampaignsRaw = await Promise.all(activeAccounts.map(acc => getCampaigns(acc.account_id)))
      const allAdSetsRaw = await Promise.all(activeAccounts.map(acc => getAdSets(acc.account_id)))

      const mergedAds = []
      allAdsRaw.forEach((arr, i) => {
        arr.forEach(a => mergedAds.push({ ...a, __account_name: activeAccounts[i].account_name, __account_id: activeAccounts[i].account_id }))
      })
      setAds(mergedAds)
      setCampaigns(allCampaignsRaw.flat())
      setAdSets(allAdSetsRaw.flat())

      const idx = {}
      allInsightsRaw.flat().forEach((i) => { idx[i.ad_id] = i })
      setInsights(idx)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [isConnected, activeAccounts, datePreset, timeRange])

  useEffect(() => { loadData() }, [loadData])

  const handleToggle = async (ad) => {
    const newStatus = (ad.effective_status || ad.status) === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    setToggling((t) => ({ ...t, [ad.id]: true }))
    try {
      await updateAdStatus(ad.id, newStatus)
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

    // Extrai a melhor URL de imagem disponível (prioriza alta resolução)
    const thumbnailUrl = getBestImageUrl(creative, type)

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
    const cpa          = conversions > 0 ? spend / conversions : 0
    const revenue      = getActionValue(ins.action_values, 'purchase')
    const conversionValue = Array.isArray(ins.action_values)
      ? ins.action_values.reduce((s, av) => s + Number(av.value || 0), 0)
      : 0
    const reactions    = getActionCount(ins.actions, 'post_reaction')
    const pageLikes    = getActionCount(ins.actions, 'like')
    const comments     = getActionCount(ins.actions, 'comment')

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
      spend, impressions, clicks, ctr, cpc, frequency, reach, conversions, cpa, revenue, conversionValue,
      reactions, pageLikes, comments,
      __account_name: ad.__account_name,
      __account_id: ad.__account_id
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

  filtered.sort((a, b) => {
    let valA = a[sortField] ?? 0
    let valB = b[sortField] ?? 0
    if (typeof valA === 'string') valA = valA.toLowerCase()
    if (typeof valB === 'string') valB = valB.toLowerCase()
    if (valA < valB) return sortDirection === 'asc' ? -1 : 1
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  const tSpend = filtered.reduce((s, c) => s + c.spend, 0)
  const tImp = filtered.reduce((s, c) => s + c.impressions, 0)
  const tConv = filtered.reduce((s, c) => s + c.conversions, 0)
  const tReach = filtered.reduce((s, c) => s + c.reach, 0)
  const tConvValue = filtered.reduce((s, c) => s + c.conversionValue, 0)

  const handleSort = (field) => {
    if (sortField === field) setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDirection('desc') }
  }

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? <IconChevronUp size={14} className="ml-1 inline" /> : <IconChevronDown size={14} className="ml-1 inline" />
  }

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
          {connections.length > 1 ? (
            <Select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-48 !py-1.5 hidden sm:block"
              options={[
                { id: 'active', label: 'Conta Ativa' },
                { id: 'all', label: `Todas as contas (${connections.length})` },
                ...connections.map(c => ({ id: c.account_id, label: c.account_name }))
              ]}
            />
          ) : connections.length === 1 ? (
            <span className="text-xs text-txt-secondary bg-surface-bg px-2.5 py-1 rounded-full border border-border hidden sm:block">
              {connections[0].account_name}
            </span>
          ) : null}
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
                    href={`https://business.facebook.com/adsmanager/manage/ads?act=${(ad.__account_id || selectedAccountId)?.replace('act_', '')}&selected_ad_ids=${ad.id}`}
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
                      <p className="font-semibold text-txt-primary">{ad.spend > 0 ? formatCurrency(ad.spend, currency) : '—'}</p>
                    </div>
                    <div>
                      <p className="text-txt-secondary">Impressões</p>
                      <p className="font-semibold text-txt-primary">{ad.impressions > 0 ? formatNumber(ad.impressions) : '—'}</p>
                    </div>
                    <div>
                      <p className="text-txt-secondary">CTR / CPC</p>
                      <p className="font-semibold text-txt-primary">
                        <span className={ad.ctr > 3 ? 'text-status-success' : ''}>{ad.ctr > 0 ? formatPercent(ad.ctr) : '—'}</span>
                        <span className="text-txt-secondary font-normal mx-1">•</span>
                        <span>{ad.cpc > 0 ? formatCurrency(ad.cpc, currency) : '—'}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-txt-secondary">Frequência</p>
                      <p className={`font-semibold ${ad.frequency > 3 ? 'text-status-warning' : 'text-txt-primary'}`}>
                        {ad.frequency > 0 ? `${ad.frequency.toFixed(1)}×` : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-txt-secondary">Conversões</p>
                      <p className="font-semibold text-txt-primary">{ad.conversions > 0 ? formatNumber(ad.conversions) : '—'}</p>
                    </div>
                    <div>
                      <p className="text-txt-secondary">Valor Conv.</p>
                      <p className={`font-semibold ${ad.conversionValue > 0 ? 'text-status-success' : 'text-txt-primary'}`}>
                        {ad.conversionValue > 0 ? formatCurrency(ad.conversionValue, currency) : '—'}
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
                {[
                  { k: 'name', l: 'Anúncio' }, { k: 'campaignName', l: 'Campanha / Conjunto' }, { k: 'type', l: 'Tipo' },
                  { k: 'spend', l: 'Investido' }, { k: 'impressions', l: 'Impressões' }, { k: 'ctr', l: 'CTR' },
                  { k: 'cpc', l: 'CPC' }, { k: 'frequency', l: 'Frequência' }, { k: 'reactions', l: 'Curtidas' },
                  { k: 'pageLikes', l: 'Seguidores' }, { k: 'conversions', l: 'Conversões' },
                  { k: 'conversionValue', l: 'Valor Conv.' }, { k: 'cpa', l: 'CPA' }, { k: 'status', l: 'Status' }
                ].map((col) => (
                  <th key={col.k} onClick={() => handleSort(col.k)} className="text-left text-xs font-medium text-txt-secondary px-3 py-3 uppercase tracking-wide whitespace-nowrap cursor-pointer select-none hover:text-txt-primary">
                    {col.l} <SortIcon field={col.k} />
                  </th>
                ))}
                <th className="text-left text-xs font-medium text-txt-secondary px-3 py-3 uppercase tracking-wide whitespace-nowrap">Ações</th>
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
                          {selectedAccountId === 'all' && (
                            <p className="text-[10px] text-brand-500 font-medium truncate mt-0">{ad.__account_name}</p>
                          )}
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
                      {ad.spend > 0 ? formatCurrency(ad.spend, currency) : '—'}
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
                      {ad.cpc > 0 ? formatCurrency(ad.cpc, currency) : '—'}
                    </td>
                    <td className="px-3 py-3 text-sm whitespace-nowrap">
                      <span className={ad.frequency > 3 ? 'text-status-warning font-medium' : 'text-txt-primary'}>
                        {ad.frequency > 0 ? `${ad.frequency.toFixed(1)}×` : '—'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        {ad.reactions > 0 && <IconHeart size={12} className="text-rose-400" />}
                        <span className="text-txt-primary">{ad.reactions > 0 ? formatNumber(ad.reactions) : '—'}</span>
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        {ad.pageLikes > 0 && <IconUserPlus size={12} className="text-emerald-500" />}
                        <span className="text-txt-primary">{ad.pageLikes > 0 ? formatNumber(ad.pageLikes) : '—'}</span>
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-txt-primary whitespace-nowrap">
                      {ad.conversions > 0 ? formatNumber(ad.conversions) : '—'}
                    </td>
                    <td className="px-3 py-3 text-sm whitespace-nowrap">
                      {ad.conversionValue > 0 ? (
                        <span className="font-semibold text-status-success">
                          {formatCurrency(ad.conversionValue, currency)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-3 text-sm font-medium text-txt-primary whitespace-nowrap">
                      {ad.cpa > 0 ? formatCurrency(ad.cpa, currency) : '—'}
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
                          href={`https://business.facebook.com/adsmanager/manage/ads?act=${(ad.__account_id || selectedAccountId)?.replace('act_', '')}&selected_ad_ids=${ad.id}`}
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
            <tfoot className="bg-surface-bg border-t border-border">
              <tr>
                <td className="px-3 py-3 text-sm font-bold text-txt-primary">Totais ({filtered.length})</td>
                <td className="px-3 py-3"></td>
                <td className="px-3 py-3"></td>
                <td className="px-3 py-3 text-sm font-bold text-txt-primary">{formatCurrency(tSpend, currency)}</td>
                <td className="px-3 py-3 text-sm font-bold text-txt-primary">{formatNumber(tImp)}</td>
                <td className="px-3 py-3"></td>
                <td className="px-3 py-3"></td>
                <td className="px-3 py-3"></td>
                <td className="px-3 py-3"></td>
                <td className="px-3 py-3"></td>
                <td className="px-3 py-3 text-sm font-bold text-txt-primary">{formatNumber(tConv)}</td>
                <td className="px-3 py-3 text-sm font-bold text-status-success">{tConvValue > 0 ? formatCurrency(tConvValue, currency) : '—'}</td>
                <td className="px-3 py-3 text-sm font-bold text-txt-primary">{tConv > 0 ? formatCurrency(tSpend / tConv, currency) : '—'}</td>
                <td className="px-3 py-3"></td>
                <td className="px-3 py-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
