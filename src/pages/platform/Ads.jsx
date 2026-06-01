// Anúncios — criativos reais do Meta Ads (thumbnail, vídeo, carrossel) + métricas
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconList, IconLayoutGrid, IconEye, IconPlayerPlay,
  IconPlugConnected, IconRefresh, IconAlertCircle,
  IconExternalLink, IconPlayerPause, IconPhoto,
} from '@tabler/icons-react'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'
import { useMeta } from '../../context/MetaContext'
import {
  getAdsWithCreatives,
  getAdInsights,
  updateAdStatus,
  getActionCount,
  META_STATUS_LABELS,
  DATE_PRESETS,
} from '../../lib/metaApi'
import { formatPercent, formatCurrency, formatNumber } from '../../utils/formatters'

// Detecta o tipo de anúncio a partir do criativo Meta
function detectAdType(creative) {
  if (!creative) return 'image'
  const t = (creative.object_type || '').toUpperCase()
  if (t === 'VIDEO' || creative.video_id) return 'video'
  if (t === 'CAROUSEL') return 'carousel'
  return 'image'
}

const TYPE_LABELS = { image: 'Imagem', video: 'Vídeo', carousel: 'Carrossel' }
const TYPE_BADGE = { image: 'default', video: 'brand', carousel: 'default' }

// Status chip
const STATUS_STYLE = {
  ACTIVE: 'bg-status-successBg text-status-success',
  PAUSED: 'bg-status-warningBg text-status-warning',
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

// Thumbnail: mostra imagem real ou fallback gradient
function AdThumbnail({ url, type, name, size = 'full' }) {
  const [imgError, setImgError] = useState(false)
  const sizeClass = size === 'sm' ? 'w-12 h-12 rounded-input' : 'w-full aspect-square'

  if (url && !imgError) {
    return (
      <div className={`relative overflow-hidden bg-surface-bg ${sizeClass}`}>
        <img
          src={url}
          alt={name}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setImgError(true)}
        />
        {type === 'video' && size !== 'sm' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
              <IconPlayerPlay size={20} className="text-brand-500 ml-1" fill="currentColor" />
            </div>
          </div>
        )}
      </div>
    )
  }

  // Fallback: gradiente com ícone
  const gradients = {
    image: 'from-brand-500 to-brand-700',
    video: 'from-[#5B21B6] to-brand-500',
    carousel: 'from-brand-100 to-brand-300',
  }
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${gradients[type] || gradients.image} ${sizeClass} flex items-center justify-center`}>
      {type === 'video'
        ? <IconPlayerPlay size={size === 'sm' ? 16 : 28} className="text-white/80" fill="white" />
        : <IconPhoto size={size === 'sm' ? 16 : 28} className="text-white/60" />
      }
    </div>
  )
}

export default function Ads() {
  const navigate = useNavigate()
  const { isConnected, accessToken, accountId, accountName, loadingConnection } = useMeta()

  const [viewMode, setViewMode] = useState('grid')
  const [ads, setAds] = useState([])
  const [insights, setInsights] = useState({})  // adId → insight
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [datePreset, setDatePreset] = useState('last_30d')
  const [toggling, setToggling] = useState({})

  const loadData = useCallback(async () => {
    if (!isConnected || !accessToken || !accountId) return
    setLoading(true)
    setError(null)

    try {
      const [rawAds, rawInsights] = await Promise.all([
        getAdsWithCreatives(accountId, accessToken),
        getAdInsights(accountId, accessToken, datePreset),
      ])

      setAds(rawAds)

      // Indexar insights por ad_id
      const idx = {}
      rawInsights.forEach((ins) => { idx[ins.ad_id] = ins })
      setInsights(idx)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [isConnected, accessToken, accountId, datePreset])

  useEffect(() => { loadData() }, [loadData])

  // Toggle ativo/pausado
  const handleToggle = async (ad) => {
    const newStatus = (ad.effective_status || ad.status) === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    setToggling((t) => ({ ...t, [ad.id]: true }))
    try {
      await updateAdStatus(ad.id, accessToken, newStatus)
      setAds((prev) => prev.map((a) => a.id === ad.id ? { ...a, status: newStatus, effective_status: newStatus } : a))
    } catch (err) {
      setError(err.message)
    } finally {
      setToggling((t) => ({ ...t, [ad.id]: false }))
    }
  }

  // Mapear anúncio da API para interface unificada
  function normalizeAd(ad) {
    const ins = insights[ad.id] || {}
    const status = ad.effective_status || ad.status
    const creative = ad.creative || {}
    const type = detectAdType(creative)
    const thumbnailUrl = creative.thumbnail_url || creative.image_url || null
    const clicks = Number(ins.clicks || 0)
    const impressions = Number(ins.impressions || 0)
    const spend = Number(ins.spend || 0)
    const ctr = Number(ins.ctr || 0)
    const cpc = Number(ins.cpc || 0)
    const frequency = Number(ins.frequency || 0)
    const conversions = getActionCount(ins.actions, 'purchase') +
      getActionCount(ins.actions, 'onsite_conversion.messaging_conversation_started_7d') +
      getActionCount(ins.actions, 'lead')

    return {
      id: ad.id,
      name: ad.name,
      status,
      type,
      thumbnailUrl,
      creative,
      ctr, cpc, impressions, frequency, conversions, spend, clicks,
      campaignName: ad.campaign?.name || '—',
      adSetName: ad.adset?.name || '—',
      body: creative.body || '',
      title: creative.title || '',
    }
  }

  const normalized = ads.map(normalizeAd)

  // Tela: sem conexão
  if (!loadingConnection && !isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div className="w-16 h-16 bg-surface-bg rounded-full flex items-center justify-center">
          <IconPlugConnected size={32} className="text-txt-secondary" />
        </div>
        <div>
          <p className="text-base font-semibold text-txt-primary">Conta Meta Ads não conectada</p>
          <p className="text-sm text-txt-secondary mt-1">
            Conecte seu Gerenciador de Anúncios para ver seus criativos reais com métricas.
          </p>
        </div>
        <Button onClick={() => navigate('/conexoes')} icon={IconPlugConnected}>
          Conectar Meta Ads
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {accountName && (
            <span className="text-xs text-txt-secondary bg-surface-bg px-2.5 py-1 rounded-full border border-border">
              {accountName}
            </span>
          )}
          <span className="text-xs text-txt-secondary">{normalized.length} anúncios</span>
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
          {/* Toggle grid/lista */}
          <div className="flex border border-border rounded-input overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 transition-all ${viewMode === 'grid' ? 'bg-brand-50 text-brand-500' : 'text-txt-secondary hover:bg-surface-bg'}`}
              title="Grade"
            >
              <IconLayoutGrid size={18} stroke={1.5} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 transition-all ${viewMode === 'list' ? 'bg-brand-50 text-brand-500' : 'text-txt-secondary hover:bg-surface-bg'}`}
              title="Lista"
            >
              <IconList size={18} stroke={1.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Erro */}
      {error && (
        <div className="flex items-start gap-2 px-3 py-2 bg-status-errorBg border border-status-error rounded-input">
          <IconAlertCircle size={16} className="text-status-error shrink-0 mt-0.5" />
          <p className="text-sm text-status-error">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-40 gap-2 text-txt-secondary">
          <div className="w-5 h-5 border-2 border-border border-t-brand-500 rounded-full animate-spin" />
          <span className="text-sm">Carregando criativos…</span>
        </div>
      )}

      {/* Sem anúncios */}
      {!loading && normalized.length === 0 && (
        <div className="flex flex-col items-center justify-center h-40 text-txt-secondary">
          <p className="text-sm">Nenhum anúncio encontrado nesta conta.</p>
        </div>
      )}

      {/* Grade de criativos */}
      {!loading && normalized.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {normalized.map((ad) => {
            const isActive = ad.status === 'ACTIVE'
            return (
              <div
                key={ad.id}
                className="bg-white border border-border rounded-card overflow-hidden hover:border-brand-100 hover:shadow-sm transition-all duration-150"
              >
                {/* Thumbnail / criativo */}
                <div className="relative aspect-square bg-surface-bg">
                  <AdThumbnail url={ad.thumbnailUrl} type={ad.type} name={ad.name} />

                  {/* Tipo */}
                  <div className="absolute top-2 right-2">
                    <Badge variant={TYPE_BADGE[ad.type]}>{TYPE_LABELS[ad.type]}</Badge>
                  </div>

                  {/* Badges de performance automáticos */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {ad.ctr > 4 && <Badge variant="brand">Top performer</Badge>}
                    {ad.frequency > 3.5 && <Badge variant="warning">Fadiga detectada</Badge>}
                    {ad.cpc > 5 && <Badge variant="error">CPC alto</Badge>}
                  </div>

                  {/* Preview link (anúncios conectados) */}
                  {isConnected && (
                    <a
                      href={`https://business.facebook.com/adsmanager/manage/ads?act=${accountId?.replace('act_', '')}&selected_ad_ids=${ad.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute bottom-2 right-2 p-1.5 bg-white/90 rounded-input text-txt-secondary hover:text-brand-500 transition-all"
                      title="Abrir no Gerenciador"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <IconExternalLink size={14} stroke={1.5} />
                    </a>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="text-sm font-medium text-txt-primary truncate" title={ad.name}>{ad.name}</p>
                  {ad.body && (
                    <p className="text-xs text-txt-secondary mt-0.5 line-clamp-2">{ad.body}</p>
                  )}

                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-txt-secondary">CTR</p>
                      <p className={`text-sm font-medium ${ad.ctr > 3 ? 'text-status-success' : 'text-txt-primary'}`}>
                        {ad.ctr > 0 ? formatPercent(ad.ctr) : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-txt-secondary">CPC</p>
                      <p className="text-sm font-medium text-txt-primary">
                        {ad.cpc > 0 ? formatCurrency(ad.cpc) : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-txt-secondary">Impressões</p>
                      <p className="text-sm font-medium text-txt-primary">
                        {ad.impressions > 0 ? formatNumber(ad.impressions) : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-txt-secondary">Frequência</p>
                      <p className={`text-sm font-medium ${ad.frequency > 3 ? 'text-status-warning' : 'text-txt-primary'}`}>
                        {ad.frequency > 0 ? `${ad.frequency.toFixed(1)}×` : '—'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <StatusChip status={ad.status} />
                    {isConnected && (
                      <button
                        onClick={() => handleToggle(displayAds.find((a) => a.id === ad.id))}
                        disabled={toggling[ad.id]}
                        className={`p-1.5 rounded-input transition-all disabled:opacity-40 ${
                          isActive
                            ? 'text-status-warning hover:bg-status-warningBg'
                            : 'text-status-success hover:bg-status-successBg'
                        }`}
                        title={isActive ? 'Pausar anúncio' : 'Ativar anúncio'}
                      >
                        {toggling[ad.id]
                          ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          : isActive ? <IconPlayerPause size={15} stroke={1.5} /> : <IconPlayerPlay size={15} stroke={1.5} />
                        }
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Visualização lista */}
      {!loading && normalized.length > 0 && viewMode === 'list' && (
        <div className="bg-white border border-border rounded-card overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-border bg-surface-bg">
                {['Anúncio', 'Tipo', 'CTR', 'CPC', 'Impressões', 'Frequência', 'Conversões', 'Status', 'Ações'].map((h) => (
                  <th key={h} className="text-left text-xs font-medium text-txt-secondary px-4 py-3 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {normalized.map((ad) => {
                const isActive = ad.status === 'ACTIVE'
                return (
                  <tr key={ad.id} className="border-b border-border last:border-0 hover:bg-surface-bg/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <AdThumbnail url={ad.thumbnailUrl} type={ad.type} name={ad.name} size="sm" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-txt-primary truncate max-w-[200px]">{ad.name}</p>
                          {isConnected && <p className="text-xs text-txt-secondary truncate max-w-[200px]">{ad.adSetName}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-txt-secondary whitespace-nowrap">
                      {TYPE_LABELS[ad.type]}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      <span className={ad.ctr > 3 ? 'text-status-success font-medium' : 'text-txt-primary'}>
                        {ad.ctr > 0 ? formatPercent(ad.ctr) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-txt-primary whitespace-nowrap">
                      {ad.cpc > 0 ? formatCurrency(ad.cpc) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-txt-primary whitespace-nowrap">
                      {ad.impressions > 0 ? formatNumber(ad.impressions) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      <span className={ad.frequency > 3 ? 'text-status-warning font-medium' : 'text-txt-primary'}>
                        {ad.frequency > 0 ? `${ad.frequency.toFixed(1)}×` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-txt-primary whitespace-nowrap">
                      {ad.conversions > 0 ? formatNumber(ad.conversions) : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusChip status={ad.status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        {isConnected && (
                          <>
                            <button
                              onClick={() => handleToggle(displayAds.find((a) => a.id === ad.id))}
                              disabled={toggling[ad.id]}
                              className={`p-1.5 rounded-input transition-all disabled:opacity-40 ${
                                isActive ? 'text-status-warning hover:bg-status-warningBg' : 'text-status-success hover:bg-status-successBg'
                              }`}
                              title={isActive ? 'Pausar' : 'Ativar'}
                            >
                              {toggling[ad.id]
                                ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                : isActive ? <IconPlayerPause size={16} stroke={1.5} /> : <IconPlayerPlay size={16} stroke={1.5} />
                              }
                            </button>
                            <a
                              href={`https://business.facebook.com/adsmanager/manage/ads?act=${accountId?.replace('act_', '')}&selected_ad_ids=${ad.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-input text-txt-secondary hover:text-brand-500 hover:bg-brand-50 transition-all inline-flex"
                              title="Ver no Gerenciador"
                            >
                              <IconExternalLink size={16} stroke={1.5} />
                            </a>
                          </>
                        )}
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
