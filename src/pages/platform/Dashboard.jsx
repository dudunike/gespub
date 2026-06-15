// Dashboard — métricas reais do Gerenciador de Anúncios Meta Ads
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { IconPlugConnected, IconRefresh, IconRobot, IconAlertCircle, IconTrendingUp, IconHeart, IconUserPlus, IconMessageCircle, IconShare2, IconDownload, IconLock, IconX, IconUsers, IconChartBar } from '@tabler/icons-react'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'
import DateFilter from '../../components/ui/DateFilter'
import { useMeta } from '../../context/MetaContext'
import {
  getCampaignInsights,
  getActionCount,
  getActionValue,
  getPageFollowers,
  getInstagramPostStats,
  DATE_PRESETS,
} from '../../lib/metaApi'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { formatCurrency, formatNumber, formatRoas, formatPercent } from '../../utils/formatters'

// KPI Card completo
function MetricCard({ label, value, sub, highlight, loading }) {
  return (
    <div className="bg-white border border-border rounded-card p-5">
      <p className="text-xs font-medium text-txt-secondary uppercase tracking-wide">{label}</p>
      {loading ? (
        <div className="mt-2 h-8 w-24 bg-surface-bg rounded animate-pulse" />
      ) : (
        <p className={`mt-1.5 text-2xl font-bold ${highlight ? 'text-brand-500' : 'text-txt-primary'}`}>
          {value ?? '—'}
        </p>
      )}
      {sub && !loading && (
        <p className="mt-1 text-xs text-txt-secondary">{sub}</p>
      )}
    </div>
  )
}

// ── Helpers de data ──────────────────────────────────────────────────────────
function getActualDateRange(preset, customRange) {
  if (customRange?.since && customRange?.until) return customRange
  const now   = new Date()
  const iso   = (d) => d.toISOString().slice(0, 10)
  const today = iso(now)
  switch (preset) {
    case 'today':     return { since: today, until: today }
    case 'yesterday': { const y = new Date(now); y.setDate(y.getDate() - 1);    return { since: iso(y), until: iso(y) } }
    case 'last_7d':   { const s = new Date(now); s.setDate(s.getDate() - 6);    return { since: iso(s), until: today } }
    case 'last_14d':  { const s = new Date(now); s.setDate(s.getDate() - 13);   return { since: iso(s), until: today } }
    case 'last_30d':  { const s = new Date(now); s.setDate(s.getDate() - 29);   return { since: iso(s), until: today } }
    case 'this_month': {
      return { since: iso(new Date(now.getFullYear(), now.getMonth(), 1)), until: today }
    }
    case 'last_month': {
      const last  = new Date(now.getFullYear(), now.getMonth(), 0)
      const first = new Date(last.getFullYear(), last.getMonth(), 1)
      return { since: iso(first), until: iso(last) }
    }
    default: { const s = new Date(now); s.setDate(s.getDate() - 29); return { since: iso(s), until: today } }
  }
}

const MONTHS_PT = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']

function formatPeriodFull(since, until) {
  const fmt = (str) => { const [y,m,d] = str.split('-'); return `${parseInt(d)} de ${MONTHS_PT[parseInt(m)-1]} de ${y}` }
  return since === until ? fmt(since) : `${fmt(since)} a ${fmt(until)}`
}

function formatPeriodShort(since, until) {
  const fmt = (str) => { const [y,m,d] = str.split('-'); return `${d}/${m}/${y}` }
  return since === until ? fmt(since) : `${fmt(since)} – ${fmt(until)}`
}
// ─────────────────────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label, currency }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-border rounded-input px-3 py-2 text-xs shadow-sm">
        <p className="font-medium text-txt-primary mb-1">{label}</p>
        {payload.map((e, i) => (
          <p key={i} style={{ color: e.color }}>{e.name}: {formatCurrency(e.value, currency)}</p>
        ))}
      </div>
    )
  }
  return null
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isConnected, loadingConnection, connections, activeAccounts, selectedAccountId, setSelectedAccountId, currency } = useMeta()

  const [insights, setInsights] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [datePreset, setDatePreset] = useState('today')
  const [timeRange, setTimeRange]   = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [agentsCount, setAgentsCount] = useState(0)
  const [followers, setFollowers] = useState(null)
  const [followersLoading, setFollowersLoading] = useState(false)
  const [igStats, setIgStats] = useState(null)
  const [showReportChoice, setShowReportChoice] = useState(false)

  // Busca insights reais do Meta Ads
  const loadInsights = async () => {
    if (!isConnected || !activeAccounts || activeAccounts.length === 0) return
    setLoading(true)
    setError(null)
    try {
      const allInsights = await Promise.all(activeAccounts.map(async acc => {
        const data = await getCampaignInsights(acc.account_id, datePreset, timeRange)
        return data.map(i => ({ ...i, _account_id: acc.account_id, _account_name: acc.account_name || acc.account_id }))
      }))
      setInsights(allInsights.flat())
      setLastUpdated(new Date())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (datePreset === 'custom' && (!timeRange?.since || !timeRange?.until)) return
    loadInsights()
  }, [isConnected, activeAccounts, datePreset, timeRange])

  // Busca seguidores reais do Facebook e Instagram
  const loadFollowers = async () => {
    if (!isConnected) return
    setFollowersLoading(true)
    // Resolve o account_id real da conta selecionada
    let accId = null
    if (selectedAccountId !== 'all') {
      if (selectedAccountId !== 'active') {
        accId = selectedAccountId
      } else if (activeAccounts.length > 0) {
        accId = activeAccounts[0].account_id
      }
    }
    try {
      const [followerData, igData] = await Promise.all([
        getPageFollowers(accId),
        getInstagramPostStats(accId),
      ])
      setFollowers(followerData)
      setIgStats(igData)
    } catch {
      // silencia erros de rede — o componente já mostra estado de erro via followers?.loaded
    } finally {
      setFollowersLoading(false)
    }
  }

  useEffect(() => {
    loadFollowers()
  }, [isConnected, selectedAccountId, activeAccounts])

  // Contagem de agentes ativos
  useEffect(() => {
    if (!user) return
    supabase
      .from('agents')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true)
      .then(({ count }) => setAgentsCount(count || 0))
      .catch(() => {})
  }, [user])

  // ── Agrega todas as métricas das campanhas ──
  const totalSpend        = insights.reduce((s, i) => s + Number(i.spend        || 0), 0)
  const totalImpressions  = insights.reduce((s, i) => s + Number(i.impressions  || 0), 0)
  const totalClicks       = insights.reduce((s, i) => s + Number(i.clicks       || 0), 0)
  const totalReach        = insights.reduce((s, i) => s + Number(i.reach        || 0), 0)
  const avgCtr            = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
  const avgCpc            = totalClicks > 0 ? totalSpend / totalClicks : 0
  const avgCpm            = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0
  const avgFrequency      = insights.length > 0
    ? insights.reduce((s, i) => s + Number(i.frequency || 0), 0) / insights.filter(i => Number(i.frequency) > 0).length || 0
    : 0

  // Conversões por tipo
  const totalPurchases    = insights.reduce((s, i) => s + getActionCount(i.actions, 'purchase'), 0)
  const totalWhatsapp     = insights.reduce((s, i) => s + getActionCount(i.actions, 'onsite_conversion.messaging_conversation_started_7d'), 0)
  const totalLeads        = insights.reduce((s, i) => s + getActionCount(i.actions, 'lead') + getActionCount(i.actions, 'offsite_conversion.fb_pixel_lead'), 0)
  const totalConversions  = totalPurchases + totalWhatsapp + totalLeads

  // ROAS e CPA
  const totalRevenue      = insights.reduce((s, i) => s + getActionValue(i.action_values, 'purchase'), 0)
  const roas              = totalSpend > 0 && totalRevenue > 0 ? totalRevenue / totalSpend : 0
  const cpa               = totalSpend > 0 && totalConversions > 0 ? totalSpend / totalConversions : 0

  // Engajamento social (via ações dos anúncios)
  const hasInsights       = insights.length > 0
  const totalReactions    = insights.reduce((s, i) => s + getActionCount(i.actions, 'post_reaction'), 0)
  const totalPageLikes    = insights.reduce((s, i) => s + getActionCount(i.actions, 'like') + getActionCount(i.actions, 'page_like'), 0)
  const totalComments     = insights.reduce((s, i) => s + getActionCount(i.actions, 'comment'), 0)
  const totalShares       = insights.reduce((s, i) => s + getActionCount(i.actions, 'post'), 0)

  // Relatório visual (pro/advanced/enterprise)
  const canDownloadReport = ['pro', 'advanced', 'enterprise'].includes(user?.plan)

  const openClientReport = () => {
    const fC  = (v) => formatCurrency(Number(v || 0), currency)
    const fN  = (v) => Number(v || 0).toLocaleString('pt-BR')

    const { since, until } = getActualDateRange(datePreset, timeRange)
    const periodFull  = formatPeriodFull(since, until)
    const periodShort = formatPeriodShort(since, until)
    const generatedAt = new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

    // Per-account breakdown
    const accountGroups = {}
    insights.forEach(i => {
      const k = i._account_name || 'Conta principal'
      if (!accountGroups[k]) accountGroups[k] = []
      accountGroups[k].push(i)
    })
    const accountNames     = Object.keys(accountGroups)
    const hasMultiAccounts = accountNames.length > 1
    const primaryAccount   = accountNames[0] || connections[0]?.account_name || ''

    const calcTotals = (arr) => {
      const sp  = arr.reduce((s, i) => s + Number(i.spend || 0), 0)
      const re  = arr.reduce((s, i) => s + Number(i.reach || 0), 0)
      const rv  = arr.reduce((s, i) => s + getActionValue(i.action_values, 'purchase'), 0)
      const pu  = arr.reduce((s, i) => s + getActionCount(i.actions, 'purchase'), 0)
      const wa  = arr.reduce((s, i) => s + getActionCount(i.actions, 'onsite_conversion.messaging_conversation_started_7d'), 0)
      const ld  = arr.reduce((s, i) => s + getActionCount(i.actions, 'lead') + getActionCount(i.actions, 'offsite_conversion.fb_pixel_lead'), 0)
      const cv  = pu + wa + ld
      const r   = sp > 0 && rv > 0 ? rv / sp : 0
      const cpa = sp > 0 && cv > 0  ? sp / cv : 0
      const re2 = arr.reduce((s, i) => s + getActionCount(i.actions, 'post_reaction'), 0)
      const cm  = arr.reduce((s, i) => s + getActionCount(i.actions, 'comment'), 0)
      return { sp, re, rv, pu, wa, ld, cv, r, cpa, re2, cm }
    }

    const perfScore = roas >= 4 ? { label: 'Excelente',      color: '#16a34a', bg: '#dcfce7', emoji: '🏆', desc: 'Resultados acima da média' }
      : roas >= 3 ? { label: 'Ótimo',         color: '#16a34a', bg: '#dcfce7', emoji: '🚀', desc: 'Campanha com bom retorno' }
      : roas >= 2 ? { label: 'Bom',           color: '#d97706', bg: '#fef9c3', emoji: '📈', desc: 'Resultados positivos' }
      : roas >= 1 ? { label: 'Moderado',      color: '#d97706', bg: '#fef9c3', emoji: '📊', desc: 'Há espaço para crescimento' }
      : roas > 0  ? { label: 'Atenção',       color: '#dc2626', bg: '#fee2e2', emoji: '⚠️', desc: 'Estratégia precisa de ajustes' }
      : { label: 'Em andamento', color: '#7c3aed', bg: '#f5f3ff', emoji: '📋', desc: 'Acompanhamento em progresso' }

    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)

    const downloadHTML = (html, name) => {
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>Resultados ${periodShort}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,'Segoe UI',system-ui,sans-serif;background:#f5f3ff;-webkit-print-color-adjust:exact;print-color-adjust:exact;color:#18181b}
.wrap{max-width:700px;margin:0 auto;padding:24px 18px}
.no-print{display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap}
.btn-pdf{display:inline-flex;align-items:center;gap:6px;background:#7c3aed;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;-webkit-tap-highlight-color:transparent}
.btn-close{display:inline-flex;align-items:center;gap:6px;background:#fff;color:#52525b;border:1px solid #e4e4e7;padding:10px 18px;border-radius:8px;font-size:13px;cursor:pointer;-webkit-tap-highlight-color:transparent}
.mob-tip{font-size:11px;color:#71717a;margin-top:6px;line-height:1.5;padding:8px 12px;background:#fff;border-radius:8px;border:1px solid #e4e4e7;display:none}

/* ── Header ── */
.header{background:linear-gradient(135deg,#7c3aed 0%,#4c1d95 100%);color:#fff;border-radius:20px;padding:36px 32px 28px;margin-bottom:16px;position:relative;overflow:hidden}
.header::before{content:'';position:absolute;top:-80px;right:-80px;width:260px;height:260px;border-radius:50%;background:rgba(255,255,255,.06)}
.header::after{content:'';position:absolute;bottom:-60px;left:30%;width:200px;height:200px;border-radius:50%;background:rgba(255,255,255,.04)}
.h-logo{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;opacity:.55;margin-bottom:6px}
.h-client{font-size:22px;font-weight:900;letter-spacing:-.02em;margin-bottom:3px}
.h-sub{font-size:13px;opacity:.7;font-weight:500}
.h-period{display:inline-block;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.2);border-radius:24px;padding:6px 16px;font-size:13px;font-weight:700;margin-top:16px;backdrop-filter:blur(4px)}
.h-period small{font-weight:400;opacity:.8;margin-right:6px;font-size:11px}
.h-meta{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
.h-chip{background:rgba(255,255,255,.12);border-radius:20px;padding:3px 10px;font-size:11px;font-weight:500}

/* ── Score ── */
.score{border-radius:14px;padding:20px 24px;margin-bottom:16px;display:flex;align-items:center;gap:16px}
.score-icon{font-size:44px;flex-shrink:0;line-height:1}
.score-body{flex:1}
.score-label{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;opacity:.6;margin-bottom:3px}
.score-title{font-size:28px;font-weight:900;letter-spacing:-.02em;line-height:1}
.score-desc{font-size:12px;opacity:.7;margin-top:4px}

/* ── KPI grid ── */
.kpi-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}
.kpi{background:#fff;border-radius:16px;padding:22px 20px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.06)}
.kpi-icon{font-size:30px;margin-bottom:8px;display:block}
.kpi-val{font-size:28px;font-weight:900;letter-spacing:-.03em;color:#18181b;line-height:1}
.kpi-lbl{font-size:12px;color:#52525b;margin-top:7px;font-weight:600}
.kpi-sub{font-size:11px;color:#a1a1aa;margin-top:3px}

/* ── Cards ── */
.card{background:#fff;border-radius:16px;padding:22px 24px;margin-bottom:14px;box-shadow:0 2px 8px rgba(0,0,0,.05)}
.card-title{font-size:12px;font-weight:800;color:#71717a;text-transform:uppercase;letter-spacing:.07em;margin-bottom:16px}

/* ── ROAS explain ── */
.roas-row{display:flex;align-items:center;gap:16px;background:#f5f3ff;border-radius:12px;padding:18px 20px}
.roas-num{font-size:40px;font-weight:900;color:#7c3aed;letter-spacing:-.04em;flex-shrink:0;line-height:1}
.roas-explain{font-size:13px;color:#52525b;line-height:1.6}
.roas-hl{font-weight:700;color:#7c3aed}

/* ── Conversions ── */
.conv-row{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.conv{border-radius:12px;padding:16px;text-align:center}
.conv-i{font-size:26px;margin-bottom:6px}
.conv-v{font-size:26px;font-weight:900;color:#18181b}
.conv-l{font-size:11px;color:#71717a;margin-top:4px;font-weight:500}
.prg-item{margin-bottom:12px}
.prg-hd{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px}
.prg-name{font-size:12px;color:#52525b;font-weight:500}
.prg-val{font-size:13px;font-weight:800;color:#18181b}
.prg-pct{font-size:10px;color:#a1a1aa;margin-left:3px;font-weight:400}
.prg-bg{height:10px;background:#f4f4f5;border-radius:5px;overflow:hidden}
.prg-fill{height:100%;border-radius:5px}

/* ── Engagement ── */
.eng-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.eng{border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:12px}
.eng-i{font-size:24px;flex-shrink:0}
.eng-v{font-size:20px;font-weight:800;color:#18181b}
.eng-l{font-size:11px;color:#71717a;margin-top:1px}

/* ── Social ── */
.soc-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.soc{border-radius:12px;padding:18px;text-align:center}
.soc-n{font-size:12px;font-weight:700;margin-bottom:6px}
.soc-v{font-size:28px;font-weight:900;color:#18181b}
.soc-s{font-size:10px;color:#a1a1aa;margin-top:3px}
.ig-extra{margin-top:14px;padding-top:12px;border-top:1px solid #f4f4f5}
.ig-row{display:flex;gap:10px}
.ig-box{flex:1;background:#fdf2fb;border-radius:10px;padding:12px;text-align:center}
.ig-v{font-size:20px;font-weight:800;color:#c13584}
.ig-l{font-size:10px;color:#71717a;margin-top:2px}

/* ── Multi-account ── */
.acc-header{display:flex;align-items:center;gap:10px;padding:14px 18px;background:#f5f3ff;border-radius:10px;margin-bottom:10px}
.acc-dot{width:8px;height:8px;background:#7c3aed;border-radius:50%;flex-shrink:0}
.acc-name{font-size:13px;font-weight:700;color:#18181b}
.acc-sub{font-size:11px;color:#71717a;margin-left:auto}
.acc-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px}
.acc-kpi{background:#fafafa;border-radius:8px;padding:10px;text-align:center;border:1px solid #f4f4f5}
.acc-kpi-v{font-size:16px;font-weight:800;color:#18181b}
.acc-kpi-l{font-size:10px;color:#71717a;margin-top:2px}

/* ── Footer ── */
.footer{text-align:center;margin-top:24px;padding:20px 0;border-top:1px solid #e4e4e7}
.footer-by{font-size:12px;color:#71717a;margin-bottom:5px}
.footer-brand{font-size:14px;font-weight:800;color:#7c3aed}
.footer-date{font-size:11px;color:#a1a1aa;margin-top:3px}

/* ── Mobile ── */
@media(max-width:600px){
  .wrap{padding:16px 12px}
  .no-print{flex-direction:column;gap:8px}
  .btn-pdf,.btn-close{width:100%;justify-content:center;padding:13px 16px;font-size:14px;border-radius:10px}
  .mob-tip{display:block}
  .header{padding:24px 20px 20px;border-radius:14px}
  .h-client{font-size:18px}
  .h-sub{font-size:12px}
  .h-period{font-size:12px;padding:5px 12px}
  .score{flex-direction:column;text-align:center;gap:10px;padding:16px}
  .score-icon{font-size:40px}
  .score-title{font-size:24px}
  .roas-row{flex-direction:column;text-align:center;gap:10px;padding:16px}
  .roas-num{font-size:34px}
  .conv-row{grid-template-columns:1fr 1fr}
  .acc-kpis{grid-template-columns:1fr 1fr}
  .kpi{padding:16px 12px}
  .kpi-val{font-size:24px}
  .card{padding:16px}
}
@media(max-width:380px){
  .kpi-grid{grid-template-columns:1fr}
  .conv-row{grid-template-columns:1fr}
  .eng-row{grid-template-columns:1fr}
  .soc-row{grid-template-columns:1fr}
}
@media print{
  body{background:#fff}
  .no-print{display:none!important}
  .wrap{padding:8px;max-width:100%}
  .card,.kpi,.conv,.eng,.soc{break-inside:avoid}
  .header{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}
</style>
</head>
<body>
<div class="wrap">
<div class="no-print">
  <button class="btn-pdf" onclick="window.print()">🖨️ &nbsp;Salvar como PDF / Imprimir</button>
  <button class="btn-close" onclick="
    if(navigator.share){navigator.share({title:'Resultados ${periodShort}',text:'Relatório de resultados dos anúncios'}).catch(()=>{})}
    else{try{navigator.clipboard.writeText(location.href);alert('Link copiado!')}catch(e){window.close()}}
  ">↗ Compartilhar</button>
  <div class="mob-tip">💡 Para salvar como PDF: toque nos 3 pontos do navegador → Imprimir → Salvar como PDF</div>
</div>

<!-- HEADER -->
<div class="header">
  <div class="h-logo">GesPub.ai — Gestor de Anúncios</div>
  <div class="h-client">${primaryAccount || 'Relatório de Resultados'}</div>
  <div class="h-sub">Desempenho dos seus anúncios Meta Ads</div>
  <div class="h-period"><small>Período:</small>${periodFull}</div>
  <div class="h-meta">
    <span class="h-chip">📊 ${insights.length} campanha${insights.length !== 1 ? 's' : ''}</span>
    ${hasMultiAccounts ? `<span class="h-chip">🔗 ${accountNames.length} contas</span>` : ''}
    <span class="h-chip">📆 Gerado em ${generatedAt}</span>
  </div>
</div>

<!-- SCORE -->
<div class="score" style="background:${perfScore.bg}">
  <div class="score-icon">${perfScore.emoji}</div>
  <div class="score-body">
    <div class="score-label" style="color:${perfScore.color}">Avaliação geral do período</div>
    <div class="score-title" style="color:${perfScore.color}">${perfScore.label}</div>
    <div class="score-desc" style="color:${perfScore.color}">${perfScore.desc}</div>
  </div>
  ${roas > 0 ? `<div style="text-align:right;flex-shrink:0"><div style="font-size:10px;font-weight:700;color:${perfScore.color};text-transform:uppercase;letter-spacing:.06em;opacity:.6">ROAS</div><div style="font-size:32px;font-weight:900;color:${perfScore.color};letter-spacing:-.03em">${roas.toFixed(2)}×</div></div>` : ''}
</div>

<!-- MAIN KPIs -->
<div class="kpi-grid">
  <div class="kpi">
    <span class="kpi-icon">👥</span>
    <div class="kpi-val">${fN(totalReach)}</div>
    <div class="kpi-lbl">Pessoas alcançadas</div>
    <div class="kpi-sub">viram seu anúncio</div>
  </div>
  <div class="kpi">
    <span class="kpi-icon">💰</span>
    <div class="kpi-val">${fC(totalSpend)}</div>
    <div class="kpi-lbl">Valor investido</div>
    <div class="kpi-sub">em anúncios no período</div>
  </div>
  ${totalRevenue > 0 ? `
  <div class="kpi">
    <span class="kpi-icon">📈</span>
    <div class="kpi-val" style="color:#16a34a">${fC(totalRevenue)}</div>
    <div class="kpi-lbl">Receita gerada</div>
    <div class="kpi-sub">retorno atribuído</div>
  </div>` : ''}
  ${totalConversions > 0 ? `
  <div class="kpi">
    <span class="kpi-icon">🎯</span>
    <div class="kpi-val" style="color:#7c3aed">${fN(totalConversions)}</div>
    <div class="kpi-lbl">Resultado${totalConversions !== 1 ? 's' : ''} gerado${totalConversions !== 1 ? 's' : ''}</div>
    <div class="kpi-sub">${cpa > 0 ? `custo por resultado: ${fC(cpa)}` : 'conversões no período'}</div>
  </div>` : ''}
</div>

${roas > 0 ? `
<div class="card">
  <div class="roas-row">
    <div class="roas-num">${roas.toFixed(2)}×</div>
    <div class="roas-explain">Para cada <span class="roas-hl">R$ 1,00</span> investido, <span class="roas-hl">R$ ${roas.toFixed(2)}</span> retornou — esse é o seu <span class="roas-hl">ROAS</span> (retorno sobre investimento em anúncios).</div>
  </div>
</div>` : ''}

${totalConversions > 0 ? `
<div class="card">
  <div class="card-title">🎯 Resultados conquistados</div>
  <div class="conv-row">
    ${totalPurchases > 0 ? `<div class="conv" style="background:#f0fdf4"><div class="conv-i">🛒</div><div class="conv-v">${fN(totalPurchases)}</div><div class="conv-l">Compra${totalPurchases !== 1 ? 's' : ''}</div></div>` : ''}
    ${totalWhatsapp  > 0 ? `<div class="conv" style="background:#f0fff4"><div class="conv-i">💬</div><div class="conv-v">${fN(totalWhatsapp)}</div><div class="conv-l">WhatsApp</div></div>` : ''}
    ${totalLeads     > 0 ? `<div class="conv" style="background:#eff6ff"><div class="conv-i">👤</div><div class="conv-v">${fN(totalLeads)}</div><div class="conv-l">Lead${totalLeads !== 1 ? 's' : ''}</div></div>` : ''}
  </div>
  <div style="margin-top:16px">
    ${[{l:'Compras',c:totalPurchases,col:'#22c55e'},{l:'WhatsApp / Mensagens',c:totalWhatsapp,col:'#25D366'},{l:'Leads',c:totalLeads,col:'#7c3aed'}].filter(x=>x.c>0).map(({l,c,col})=>{
      const p = totalConversions > 0 ? Math.round((c/totalConversions)*100) : 0
      return `<div class="prg-item"><div class="prg-hd"><span class="prg-name">${l}</span><span class="prg-val">${fN(c)}<span class="prg-pct">${p}%</span></span></div><div class="prg-bg"><div class="prg-fill" style="width:${p}%;background:${col}"></div></div></div>`
    }).join('')}
  </div>
</div>` : ''}

${(totalReactions + totalComments + totalShares + totalPageLikes) > 0 ? `
<div class="card">
  <div class="card-title">❤️ Engajamento gerado pelos anúncios</div>
  <div class="eng-row">
    ${totalReactions > 0 ? `<div class="eng" style="background:#fff0f0"><div class="eng-i">❤️</div><div><div class="eng-v">${fN(totalReactions)}</div><div class="eng-l">Curtidas e reações</div></div></div>` : ''}
    ${totalComments  > 0 ? `<div class="eng" style="background:#f0f4ff"><div class="eng-i">💬</div><div><div class="eng-v">${fN(totalComments)}</div><div class="eng-l">Comentários</div></div></div>` : ''}
    ${totalShares    > 0 ? `<div class="eng" style="background:#fffbeb"><div class="eng-i">🔁</div><div><div class="eng-v">${fN(totalShares)}</div><div class="eng-l">Compartilhamentos</div></div></div>` : ''}
    ${totalPageLikes > 0 ? `<div class="eng" style="background:#f0fdf4"><div class="eng-i">➕</div><div><div class="eng-v">${fN(totalPageLikes)}</div><div class="eng-l">Novos seguidores</div></div></div>` : ''}
  </div>
</div>` : ''}

${(followers?.igLinked || (followers?.fbFollowers||0) > 0 || igStats?.available) ? `
<div class="card">
  <div class="card-title">📱 Redes sociais</div>
  <div class="soc-row">
    ${followers?.igLinked ? `<div class="soc" style="background:#fdf2fb"><div class="soc-n" style="color:#c13584">Instagram</div><div class="soc-v">${fN(followers.igFollowers)}</div><div class="soc-s">seguidores${followers.igUsername?' · @'+followers.igUsername:''}</div></div>` : ''}
    ${(followers?.fbFollowers||0)>0 ? `<div class="soc" style="background:#eff6ff"><div class="soc-n" style="color:#1877F2">Facebook</div><div class="soc-v">${fN(followers.fbFollowers)}</div><div class="soc-s">curtidas na página</div></div>` : ''}
  </div>
  ${igStats?.available && (igStats.totalLikes > 0 || igStats.totalComments > 0) ? `
    <div class="ig-extra">
      <div style="font-size:11px;font-weight:700;color:#71717a;text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px">Últimas ${igStats.media?.length||0} publicações</div>
      <div class="ig-row">
        <div class="ig-box"><div class="ig-v">${fN(igStats.totalLikes)}</div><div class="ig-l">❤️ Curtidas</div></div>
        <div class="ig-box"><div class="ig-v">${fN(igStats.totalComments)}</div><div class="ig-l">💬 Comentários</div></div>
        ${igStats.igMediaCount>0?`<div class="ig-box"><div class="ig-v">${fN(igStats.igMediaCount)}</div><div class="ig-l">📸 Posts totais</div></div>`:''}
      </div>
    </div>` : ''}
</div>` : ''}

${hasMultiAccounts ? `
<div class="card">
  <div class="card-title">🔗 Detalhamento por conta de anúncios</div>
  ${accountNames.map(name => {
    const t = calcTotals(accountGroups[name])
    return `
      <div class="acc-header">
        <div class="acc-dot"></div>
        <div class="acc-name">${name}</div>
        <div class="acc-sub">${accountGroups[name].length} campanha${accountGroups[name].length !== 1 ? 's' : ''}</div>
      </div>
      <div class="acc-kpis" style="margin-bottom:16px">
        <div class="acc-kpi"><div class="acc-kpi-v">${fC(t.sp)}</div><div class="acc-kpi-l">Investido</div></div>
        <div class="acc-kpi"><div class="acc-kpi-v">${fN(t.re)}</div><div class="acc-kpi-l">Alcance</div></div>
        <div class="acc-kpi"><div class="acc-kpi-v">${t.cv > 0 ? fN(t.cv) : '—'}</div><div class="acc-kpi-l">Conversões</div></div>
        <div class="acc-kpi"><div class="acc-kpi-v" style="color:${t.r>=3?'#16a34a':t.r>0?'#d97706':'#71717a'}">${t.r > 0 ? t.r.toFixed(2) + '×' : '—'}</div><div class="acc-kpi-l">ROAS</div></div>
      </div>
    `
  }).join('')}
</div>` : ''}

<div class="footer">
  <div class="footer-by">Relatório preparado por <strong>${primaryAccount || 'seu gestor de tráfego'}</strong></div>
  <div class="footer-brand">GesPub.ai</div>
  <div class="footer-date">${periodFull} · Gerado em ${generatedAt}</div>
</div>
</div>
</body>
</html>`

    if (isMobile) {
      downloadHTML(html, `resultados-${periodShort.replace(/\//g,'-')}.html`)
      return
    }

    try {
      const win = window.open('', '_blank')
      if (!win) {
        downloadHTML(html, `resultados-${periodShort.replace(/\//g,'-')}.html`)
        return
      }
      win.document.write(html)
      win.document.close()
    } catch (err) {
      console.error('[openClientReport] Erro ao gerar relatório:', err)
      downloadHTML(html, `resultados-${periodShort.replace(/\//g,'-')}.html`)
    }
  }

  const openReport = () => {
    if (!canDownloadReport || insights.length === 0) return

    const fC  = (v) => formatCurrency(Number(v || 0), currency)
    const fN  = (v) => Number(v || 0).toLocaleString('pt-BR')
    const fP  = (v) => `${Number(v || 0).toFixed(2)}%`

    const periodLabel  = DATE_PRESETS.find(d => d.id === datePreset)?.label || datePreset
    const accountName  = connections[0]?.account_name || ''
    const generatedAt  = new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    const sortedC      = [...insights].sort((a, b) => Number(b.spend) - Number(a.spend))
    const maxSpend     = sortedC.length > 0 ? Number(sortedC[0].spend) : 1
    const chartTop     = sortedC.slice(0, 10).map(i => {
      const sp = Number(i.spend || 0)
      const rv = getActionValue(i.action_values, 'purchase')
      const r  = sp > 0 && rv > 0 ? rv / sp : 0
      return { name: i.campaign_name || '—', spend: sp, revenue: rv, roas: r, pct: Math.round((sp / maxSpend) * 100) }
    })
    const scorePill = (r) => r >= 3 ? `<span style="display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;background:#dcfce7;color:#16a34a;">ROAS ${r.toFixed(2)}× ✓</span>`
      : r >= 2 ? `<span style="display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;background:#fef9c3;color:#ca8a04;">ROAS ${r.toFixed(2)}×</span>`
      : r > 0  ? `<span style="display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;background:#fee2e2;color:#dc2626;">ROAS ${r.toFixed(2)}× ↓</span>`
      : `<span style="color:#a1a1aa;">—</span>`

    const purchDeg = totalConversions > 0 ? (totalPurchases / totalConversions) * 360 : 120
    const wappDeg  = totalConversions > 0 ? (totalWhatsapp  / totalConversions) * 360 : 120

    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)

    const downloadHTML = (content, name) => {
      const blob = new Blob([content], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>Relatório GesPub.ai — ${periodLabel}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,'Segoe UI',system-ui,sans-serif;color:#18181b;background:#f4f4f5;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.wrap{max-width:1000px;margin:0 auto;padding:24px}
.no-print{display:flex;gap:10px;margin-bottom:20px;align-items:center;flex-wrap:wrap}
.btn-pdf{display:inline-flex;align-items:center;gap:6px;background:#7c3aed;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;-webkit-tap-highlight-color:transparent}
.btn-close{display:inline-flex;align-items:center;gap:6px;background:#fff;color:#52525b;border:1px solid #e4e4e7;padding:10px 20px;border-radius:8px;font-size:13px;cursor:pointer;-webkit-tap-highlight-color:transparent}
.mob-tip{font-size:11px;color:#71717a;margin-top:6px;width:100%;padding:8px 12px;background:#fff;border-radius:8px;border:1px solid #e4e4e7;display:none;line-height:1.5}
.header{background:linear-gradient(135deg,#7c3aed,#5b21b6);color:#fff;padding:32px 36px;border-radius:14px;margin-bottom:18px;position:relative;overflow:hidden}
.header::after{content:'';position:absolute;top:-60px;right:-60px;width:220px;height:220px;border-radius:50%;background:rgba(255,255,255,.06)}
.header-logo{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;opacity:.65;margin-bottom:5px}
.header-title{font-size:26px;font-weight:800;letter-spacing:-.02em}
.header-sub{font-size:13px;opacity:.7;margin-top:3px}
.chips{display:flex;gap:8px;margin-top:16px;flex-wrap:wrap}
.chip{background:rgba(255,255,255,.15);border-radius:20px;padding:4px 12px;font-size:11px;font-weight:600;border:1px solid rgba(255,255,255,.1)}
.kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:16px}
.kpi{background:#fff;border:1px solid #e4e4e7;border-radius:12px;padding:18px 20px}
.kpi-lbl{font-size:10px;color:#71717a;text-transform:uppercase;letter-spacing:.06em;font-weight:600}
.kpi-val{font-size:24px;font-weight:800;letter-spacing:-.02em;margin-top:6px;color:#18181b}
.kpi-val.g{color:#16a34a}.kpi-val.p{color:#7c3aed}.kpi-val.a{color:#d97706}
.kpi-sub{font-size:11px;color:#71717a;margin-top:4px;line-height:1.4}
.badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700}
.b-g{background:#dcfce7;color:#16a34a}.b-a{background:#fef9c3;color:#ca8a04}.b-r{background:#fee2e2;color:#dc2626}.b-gr{background:#f4f4f5;color:#71717a}
.sec{background:#fff;border:1px solid #e4e4e7;border-radius:12px;padding:20px 22px;margin-bottom:14px}
.sec-hd{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid #f4f4f5;flex-wrap:wrap;gap:4px}
.sec-title{font-size:13px;font-weight:700;color:#18181b}
.sec-sub{font-size:11px;color:#a1a1aa}
.metrics-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.m-item{background:#fafafa;border-radius:8px;padding:13px;border:1px solid #f4f4f5}
.m-lbl{font-size:10px;color:#71717a;text-transform:uppercase;letter-spacing:.04em;font-weight:500}
.m-val{font-size:17px;font-weight:800;color:#18181b;margin-top:4px}
.bar-row{display:flex;align-items:center;gap:12px;margin-bottom:10px}
.bar-name{width:150px;font-size:11px;color:#52525b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex-shrink:0}
.bar-track{flex:1;height:22px;background:#f4f4f5;border-radius:5px;overflow:hidden;position:relative}
.bar-fill{height:100%;border-radius:5px;display:flex;align-items:center;padding-left:8px;min-width:3px}
.bar-lbl{font-size:10px;font-weight:700;color:#fff;white-space:nowrap}
.bar-meta{width:150px;text-align:right;flex-shrink:0}
.bar-spend{font-size:12px;font-weight:700;color:#18181b}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}
.prg-item{margin-bottom:13px}
.prg-row{display:flex;justify-content:space-between;margin-bottom:4px}
.prg-lbl{font-size:12px;color:#52525b;font-weight:500}
.prg-cnt{font-size:13px;font-weight:800;color:#18181b}
.prg-pct{font-size:10px;color:#a1a1aa;margin-left:3px;font-weight:400}
.prg-bg{height:10px;background:#f4f4f5;border-radius:5px;overflow:hidden}
.prg-fill{height:100%;border-radius:5px}
.donut-wrap{display:flex;align-items:center;gap:20px;margin-bottom:16px}
.donut{width:96px;height:96px;border-radius:50%;flex-shrink:0;position:relative}
.donut-hole{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:62px;height:62px;background:#fff;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center}
.donut-num{font-size:15px;font-weight:800;color:#18181b}
.donut-lbl{font-size:8px;color:#71717a;text-transform:uppercase;letter-spacing:.04em;font-weight:500}
.legend{flex:1}
.leg-item{display:flex;align-items:center;gap:8px;margin-bottom:7px}
.leg-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
.leg-name{font-size:12px;color:#52525b}
.leg-val{font-size:12px;font-weight:800;color:#18181b;margin-left:auto}
.eng-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.eng-card{border-radius:8px;padding:14px;text-align:center}
.eng-icon{font-size:20px;margin-bottom:4px}
.eng-cnt{font-size:18px;font-weight:800;color:#18181b}
.eng-lbl{font-size:10px;color:#71717a;margin-top:2px}
.followers-row{display:flex;gap:10px;margin-top:14px;padding-top:12px;border-top:1px solid #f4f4f5}
.fol-card{flex:1;border-radius:8px;padding:12px;text-align:center}
.fol-name{font-size:11px;font-weight:700;margin-bottom:3px}
.fol-cnt{font-size:20px;font-weight:800;color:#18181b}
.fol-sub{font-size:10px;color:#a1a1aa;margin-top:2px}
table{width:100%;border-collapse:collapse;font-size:12px}
thead{background:#fafafa}
th{font-size:10px;color:#71717a;text-transform:uppercase;letter-spacing:.04em;font-weight:600;padding:8px 12px;text-align:left;border-bottom:1px solid #e4e4e7;white-space:nowrap}
th:not(:first-child){text-align:right}
td{padding:10px 12px;border-bottom:1px solid #f4f4f5;vertical-align:middle}
td:not(:first-child){text-align:right}
tr:last-child td{border-bottom:none}
.td-name{font-weight:500;max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.td-sec{color:#71717a}
.total-row td{background:#f5f3ff;font-weight:700}
.footer{text-align:center;margin-top:24px;padding:18px;border-top:1px solid #e4e4e7}
.footer-brand{font-size:14px;font-weight:800;color:#7c3aed}
.footer-text{font-size:11px;color:#a1a1aa;margin-top:3px}
@media print{
  body{background:#fff}
  .no-print{display:none!important}
  .wrap{max-width:100%;padding:10px}
  .header,.sec,.kpi{break-inside:avoid}
}
@media(max-width:700px){
  .wrap{padding:14px 12px}
  .no-print{flex-direction:column;align-items:stretch;gap:8px}
  .btn-pdf,.btn-close{width:100%;justify-content:center;padding:13px 16px;font-size:14px;border-radius:10px}
  .mob-tip{display:block}
  .header{padding:20px;border-radius:10px}
  .header-title{font-size:20px}
  .kpi-row{grid-template-columns:repeat(2,1fr);gap:10px}
  .metrics-grid{grid-template-columns:repeat(2,1fr)}
  .two-col{grid-template-columns:1fr}
  .bar-row{flex-wrap:wrap;gap:6px}
  .bar-name{width:100%;white-space:normal;font-size:12px;font-weight:600;margin-bottom:2px}
  .bar-track{width:100%;height:18px}
  .bar-meta{width:100%;display:flex;align-items:center;justify-content:space-between;text-align:left}
  table,thead,tbody,tr,th,td{display:block}
  thead tr{display:none}
  tbody tr{margin-bottom:12px;background:#fff;border:1px solid #e4e4e7;border-radius:10px;padding:4px 0;overflow:hidden}
  tbody tr.total-row{background:#f5f3ff}
  td{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-bottom:1px solid #f4f4f5;text-align:right}
  td::before{content:attr(data-label);font-size:10px;color:#71717a;font-weight:600;text-transform:uppercase;letter-spacing:.04em;text-align:left;flex-shrink:0;margin-right:8px}
  td.td-name{font-size:13px;font-weight:600;flex-direction:column;align-items:flex-start;gap:2px}
  td.td-name::before{font-size:10px;font-weight:600}
  .total-row td{font-weight:700}
}
@media(max-width:380px){
  .kpi-row{grid-template-columns:1fr}
  .metrics-grid{grid-template-columns:1fr}
  .eng-grid{grid-template-columns:1fr}
}
</style>
</head>
<body>
<div class="wrap">

<div class="no-print">
  <button class="btn-pdf" onclick="window.print()">🖨️ &nbsp;Salvar como PDF / Imprimir</button>
  <button class="btn-close" onclick="
    if(navigator.share){navigator.share({title:'Relatório de Performance — ${periodLabel}',text:'Análise técnica dos anúncios Meta Ads'}).catch(()=>{})}
    else{try{navigator.clipboard.writeText(location.href);alert('Link copiado!')}catch(e){window.close()}}
  ">↗ Compartilhar</button>
  <div class="mob-tip">💡 Para salvar como PDF: toque nos 3 pontos do navegador → Imprimir → Salvar como PDF</div>
</div>

<div class="header">
  <div class="header-logo">GesPub.ai</div>
  <div class="header-title">Relatório de Performance</div>
  <div class="header-sub">Análise completa dos seus anúncios Meta Ads</div>
  <div class="chips">
    <span class="chip">📅 ${periodLabel}</span>
    <span class="chip">📆 ${generatedAt}</span>
    ${accountName ? `<span class="chip">🏢 ${accountName}</span>` : ''}
    <span class="chip">📊 ${sortedC.length} campanha${sortedC.length !== 1 ? 's' : ''}</span>
  </div>
</div>

<div class="kpi-row">
  <div class="kpi">
    <div class="kpi-lbl">💰 Valor Investido</div>
    <div class="kpi-val">${fC(totalSpend)}</div>
    <div class="kpi-sub">${sortedC.length} campanha${sortedC.length !== 1 ? 's' : ''} no período</div>
  </div>
  <div class="kpi">
    <div class="kpi-lbl">📈 Receita Gerada</div>
    <div class="kpi-val ${totalRevenue > 0 ? 'g' : ''}">${totalRevenue > 0 ? fC(totalRevenue) : '—'}</div>
    <div class="kpi-sub">${totalRevenue > 0 ? 'Valor atribuído às compras' : 'Sem rastreamento de compras'}</div>
  </div>
  <div class="kpi">
    <div class="kpi-lbl">⚡ ROAS</div>
    <div class="kpi-val ${roas >= 3 ? 'g' : roas > 0 ? 'p' : ''}">${roas > 0 ? roas.toFixed(2) + '×' : '—'}</div>
    <div class="kpi-sub">${roas >= 4 ? '<span class="badge b-g">Excelente ✓</span>' : roas >= 3 ? '<span class="badge b-g">Bom ✓</span>' : roas >= 2 ? '<span class="badge b-a">Moderado</span>' : roas > 0 ? '<span class="badge b-r">Abaixo do ideal</span>' : 'Sem receita rastreada'}</div>
  </div>
  <div class="kpi">
    <div class="kpi-lbl">🎯 Conversões</div>
    <div class="kpi-val p">${totalConversions > 0 ? fN(totalConversions) : '—'}</div>
    <div class="kpi-sub">${cpa > 0 ? 'CPA: ' + fC(cpa) : 'Nenhuma conversão rastreada'}</div>
  </div>
</div>

<div class="sec">
  <div class="sec-hd"><div class="sec-title">Métricas de Alcance & Eficiência</div></div>
  <div class="metrics-grid">
    <div class="m-item"><div class="m-lbl">Alcance</div><div class="m-val">${fN(totalReach)}</div></div>
    <div class="m-item"><div class="m-lbl">Impressões</div><div class="m-val">${fN(totalImpressions)}</div></div>
    <div class="m-item"><div class="m-lbl">Cliques</div><div class="m-val">${fN(totalClicks)}</div></div>
    <div class="m-item"><div class="m-lbl">CTR</div><div class="m-val">${fP(avgCtr)}</div></div>
    <div class="m-item"><div class="m-lbl">CPC</div><div class="m-val">${avgCpc > 0 ? fC(avgCpc) : '—'}</div></div>
    <div class="m-item"><div class="m-lbl">CPM</div><div class="m-val">${avgCpm > 0 ? fC(avgCpm) : '—'}</div></div>
    <div class="m-item"><div class="m-lbl">Frequência</div><div class="m-val">${avgFrequency > 0 ? avgFrequency.toFixed(1) + '×' : '—'}</div></div>
    <div class="m-item"><div class="m-lbl">CPA</div><div class="m-val">${cpa > 0 ? fC(cpa) : '—'}</div></div>
  </div>
</div>

<div class="sec">
  <div class="sec-hd">
    <div class="sec-title">Performance por Campanha</div>
    <div class="sec-sub">investimento relativo · barras coloridas = nível do ROAS</div>
  </div>
  ${chartTop.map(c => `
    <div class="bar-row">
      <div class="bar-name" title="${c.name}">${c.name}</div>
      <div class="bar-track">
        <div class="bar-fill" style="width:${c.pct}%;background:${c.roas >= 3 ? 'linear-gradient(90deg,#bbf7d0,#16a34a)' : c.roas >= 2 ? 'linear-gradient(90deg,#fef9c3,#d97706)' : c.roas > 0 ? 'linear-gradient(90deg,#fee2e2,#dc2626)' : 'linear-gradient(90deg,#ddd6fe,#7c3aed)'};">
          ${c.pct > 12 ? `<span class="bar-lbl">${fC(c.spend)}</span>` : ''}
        </div>
      </div>
      <div class="bar-meta">
        <div class="bar-spend">${fC(c.spend)}</div>
        ${scorePill(c.roas)}
      </div>
    </div>
  `).join('')}
</div>

<div class="two-col">

  <div class="sec" style="margin-bottom:0">
    <div class="sec-hd"><div class="sec-title">🎯 Conversões por Tipo</div></div>
    ${totalConversions > 0 ? `
      <div class="donut-wrap">
        <div style="position:relative">
          <div class="donut" style="background:conic-gradient(#22c55e 0deg ${purchDeg}deg,#25D366 ${purchDeg}deg ${purchDeg + wappDeg}deg,#7c3aed ${purchDeg + wappDeg}deg 360deg)"></div>
          <div class="donut-hole"><div class="donut-num">${fN(totalConversions)}</div><div class="donut-lbl">total</div></div>
        </div>
        <div class="legend">
          <div class="leg-item"><div class="leg-dot" style="background:#22c55e"></div><span class="leg-name">Compras</span><span class="leg-val">${fN(totalPurchases)}</span></div>
          <div class="leg-item"><div class="leg-dot" style="background:#25D366"></div><span class="leg-name">WhatsApp</span><span class="leg-val">${fN(totalWhatsapp)}</span></div>
          <div class="leg-item"><div class="leg-dot" style="background:#7c3aed"></div><span class="leg-name">Leads</span><span class="leg-val">${fN(totalLeads)}</span></div>
        </div>
      </div>
      ${[{l:'Compras (Purchase)',c:totalPurchases,col:'#22c55e'},{l:'WhatsApp / Mensagem',c:totalWhatsapp,col:'#25D366'},{l:'Leads',c:totalLeads,col:'#7c3aed'}].map(({l,c,col})=>{
        const p = totalConversions > 0 ? Math.round((c/totalConversions)*100) : 0
        return `<div class="prg-item"><div class="prg-row"><span class="prg-lbl">${l}</span><span class="prg-cnt">${fN(c)}<span class="prg-pct">${p}%</span></span></div><div class="prg-bg"><div class="prg-fill" style="width:${p}%;background:${col}"></div></div></div>`
      }).join('')}
    ` : '<p style="font-size:13px;color:#a1a1aa;text-align:center;padding:20px 0">Sem conversões rastreadas no período.</p>'}
  </div>

  <div class="sec" style="margin-bottom:0">
    <div class="sec-hd"><div class="sec-title">❤️ Engajamento Social</div><div class="sec-sub">via anúncios</div></div>
    <div class="eng-grid">
      <div class="eng-card" style="background:#fff0f0"><div class="eng-icon">❤️</div><div class="eng-cnt">${fN(totalReactions)}</div><div class="eng-lbl">Curtidas / Reações</div></div>
      <div class="eng-card" style="background:#f0f4ff"><div class="eng-icon">💬</div><div class="eng-cnt">${fN(totalComments)}</div><div class="eng-lbl">Comentários</div></div>
      <div class="eng-card" style="background:#fffbeb"><div class="eng-icon">🔁</div><div class="eng-cnt">${fN(totalShares)}</div><div class="eng-lbl">Compartilhamentos</div></div>
      <div class="eng-card" style="background:#f0fdf4"><div class="eng-icon">➕</div><div class="eng-cnt">${fN(totalPageLikes)}</div><div class="eng-lbl">Seg. via anúncios</div></div>
    </div>
    ${(followers?.igLinked || (followers?.fbFollowers || 0) > 0) ? `
      <div class="followers-row">
        ${followers?.igLinked ? `<div class="fol-card" style="background:#fdf2fb"><div class="fol-name" style="color:#c13584">Instagram</div><div class="fol-cnt">${fN(followers?.igFollowers||0)}</div>${followers?.igUsername?`<div class="fol-sub">@${followers.igUsername}</div>`:''}</div>` : ''}
        ${(followers?.fbFollowers||0)>0?`<div class="fol-card" style="background:#eff6ff"><div class="fol-name" style="color:#1877F2">Facebook</div><div class="fol-cnt">${fN(followers?.fbFollowers||0)}</div><div class="fol-sub">Curtidas na página</div></div>`:''}
      </div>
    ` : ''}
  </div>
</div>

<div class="sec">
  <div class="sec-hd">
    <div class="sec-title">📋 Detalhamento Completo por Campanha</div>
    <div class="sec-sub">${sortedC.length} campanhas · ordenado por investimento</div>
  </div>
  <table>
    <thead><tr>
      <th style="text-align:left">Campanha</th>
      <th>Investido</th>
      <th>Alcance</th>
      <th>Impressões</th>
      <th>Cliques</th>
      <th>CTR</th>
      <th>CPC</th>
      <th>Conversões</th>
      <th>ROAS</th>
    </tr></thead>
    <tbody>
      ${sortedC.map(i => {
        const sp  = Number(i.spend || 0)
        const im  = Number(i.impressions || 0)
        const cl  = Number(i.clicks || 0)
        const re  = Number(i.reach || 0)
        const ct  = im > 0 ? (cl / im) * 100 : 0
        const cp  = cl > 0 ? sp / cl : 0
        const cv  = getActionCount(i.actions, 'purchase') + getActionCount(i.actions, 'lead') + getActionCount(i.actions, 'onsite_conversion.messaging_conversation_started_7d')
        const rv  = getActionValue(i.action_values, 'purchase')
        const r   = sp > 0 && rv > 0 ? rv / sp : 0
        return `<tr>
          <td class="td-name" data-label="Campanha" title="${i.campaign_name}">${i.campaign_name || '—'}</td>
          <td data-label="Investido"><strong>${fC(sp)}</strong></td>
          <td class="td-sec" data-label="Alcance">${fN(re)}</td>
          <td class="td-sec" data-label="Impressões">${fN(im)}</td>
          <td class="td-sec" data-label="Cliques">${fN(cl)}</td>
          <td class="td-sec" data-label="CTR">${fP(ct)}</td>
          <td class="td-sec" data-label="CPC">${cp > 0 ? fC(cp) : '—'}</td>
          <td data-label="Conversões">${cv > 0 ? fN(cv) : '—'}</td>
          <td data-label="ROAS">${scorePill(r)}</td>
        </tr>`
      }).join('')}
      <tr class="total-row">
        <td data-label="Total">TOTAL GERAL</td>
        <td data-label="Investido">${fC(totalSpend)}</td>
        <td data-label="Alcance">${fN(totalReach)}</td>
        <td data-label="Impressões">${fN(totalImpressions)}</td>
        <td data-label="Cliques">${fN(totalClicks)}</td>
        <td data-label="CTR">${fP(avgCtr)}</td>
        <td data-label="CPC">${avgCpc > 0 ? fC(avgCpc) : '—'}</td>
        <td data-label="Conversões">${totalConversions > 0 ? fN(totalConversions) : '—'}</td>
        <td data-label="ROAS">${scorePill(roas)}</td>
      </tr>
    </tbody>
  </table>
</div>

<div class="footer">
  <div class="footer-brand">GesPub.ai</div>
  <div class="footer-text">Gerado automaticamente em ${generatedAt} · Período: ${periodLabel}</div>
  <div class="footer-text">Dados pela API do Meta Ads · Para salvar como PDF: Ctrl+P → Salvar como PDF</div>
</div>

</div>
</body>
</html>`

    if (isMobile) {
      downloadHTML(html, `relatorio-${periodLabel.replace(/\s/g,'-')}.html`)
      return
    }

    try {
      const win = window.open('', '_blank')
      if (!win) {
        downloadHTML(html, `relatorio-${periodLabel.replace(/\s/g,'-')}.html`)
        return
      }
      win.document.write(html)
      win.document.close()
    } catch (err) {
      console.error('[openReport] Erro ao gerar relatório:', err)
      downloadHTML(html, `relatorio-${periodLabel.replace(/\s/g,'-')}.html`)
    }
  }

  // Top campanhas por investimento
  const topCampaigns = [...insights]
    .sort((a, b) => Number(b.spend) - Number(a.spend))
    .slice(0, 5)

  // Dados do gráfico
  const chartData = insights.slice(0, 8).map((i) => ({
    name: (i.campaign_name || '').split(' ').slice(0, 2).join(' '),
    Investido: Number(i.spend || 0),
    Receita: getActionValue(i.action_values, 'purchase'),
  }))

  // ── Tela "sem conexão" ──
  if (!loadingConnection && !isConnected) {
    return (
      <div className="space-y-6">
        {/* Banner CTA */}
        <div className="flex items-center justify-between gap-4 p-5 bg-brand-50 border border-brand-200 rounded-card">
          <div className="flex items-start gap-3">
            <IconPlugConnected size={22} className="text-brand-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-txt-primary">Conecte sua conta Meta Ads para ver métricas reais</p>
              <p className="text-xs text-txt-secondary mt-0.5">
                Após conectar, o Dashboard mostrará os dados do seu Gerenciador de Anúncios em tempo real: investimento, alcance, impressões, conversões, ROAS e muito mais.
              </p>
            </div>
          </div>
          <Button onClick={() => navigate('/conexoes')} icon={IconPlugConnected} className="shrink-0">
            Conectar agora
          </Button>
        </div>

        {/* Cards vazios com placeholder */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {['Valor investido', 'Impressões', 'Conversões', 'ROAS'].map((label) => (
            <div key={label} className="bg-white border border-border rounded-card p-5">
              <p className="text-xs font-medium text-txt-secondary uppercase tracking-wide">{label}</p>
              <div className="mt-2 h-8 w-20 bg-surface-bg rounded" />
              <p className="mt-1.5 text-xs text-txt-secondary">Aguardando conexão</p>
            </div>
          ))}
        </div>

        <div className="bg-white border border-dashed border-border rounded-card p-10 flex flex-col items-center gap-3 text-center">
          <IconTrendingUp size={36} className="text-txt-secondary" strokeWidth={1.5} />
          <p className="text-sm font-medium text-txt-primary">Suas métricas reais aparecerão aqui</p>
          <p className="text-xs text-txt-secondary max-w-md">
            Investimento, alcance, cliques, CTR, CPC, CPM, frequência, conversões (compras, WhatsApp, leads) e ROAS — tudo sincronizado com o seu Gerenciador de Anúncios.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header com conta + período + atualizar */}
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
            <span className="text-xs font-medium bg-surface-bg border border-border px-3 py-1 rounded-full text-txt-secondary">
              {connections[0].account_name}
            </span>
          ) : null}
          {lastUpdated && (
            <span className="text-xs text-txt-secondary">
              Atualizado às {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <DateFilter
            preset={datePreset}
            since={timeRange?.since}
            until={timeRange?.until}
            onChange={({ preset, since, until }) => {
              setDatePreset(preset)
              setTimeRange(since && until ? { since, until } : null)
            }}
            onRefresh={loadInsights}
            loading={loading}
          />
          {/* Botão de relatório — pro/avançado */}
          {canDownloadReport ? (
            <button
              onClick={() => setShowReportChoice(true)}
              disabled={insights.length === 0 || loading}
              title="Abrir relatório visual com gráficos"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-brand-300 rounded-input bg-brand-50 text-brand-600 hover:bg-brand-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <IconDownload size={14} />
              Ver Relatório
            </button>
          ) : (
            <button
              title="Disponível nos planos Pro e Avançado"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-input bg-white text-txt-secondary/50 cursor-not-allowed"
            >
              <IconLock size={14} />
              Ver Relatório
            </button>
          )}
        </div>
      </div>

      {/* Erro */}
      {error && (
        <div className="flex items-start gap-2 px-3 py-2 bg-status-errorBg border border-status-error rounded-input">
          <IconAlertCircle size={16} className="text-status-error shrink-0 mt-0.5" />
          <p className="text-sm text-status-error">{error}</p>
        </div>
      )}

      {/* ── KPIs principais (linha 1) ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          label="Valor investido"
          value={formatCurrency(totalSpend, currency)}
          sub={`${insights.length} campanha${insights.length !== 1 ? 's' : ''}`}
          loading={loading}
        />
        <MetricCard
          label="Alcance"
          value={formatNumber(totalReach)}
          sub={`Freq. média ${avgFrequency > 0 ? avgFrequency.toFixed(1) + '×' : '—'}`}
          loading={loading}
        />
        <MetricCard
          label="Impressões"
          value={formatNumber(totalImpressions)}
          sub={`CPM ${avgCpm > 0 ? formatCurrency(avgCpm, currency) : '—'}`}
          loading={loading}
        />
        <MetricCard
          label="Cliques no link"
          value={formatNumber(totalClicks)}
          sub={`CTR ${avgCtr > 0 ? formatPercent(avgCtr) : '—'}`}
          loading={loading}
        />
      </div>

      {/* ── KPIs secundários (linha 2) ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          label="CPC (custo/clique)"
          value={avgCpc > 0 ? formatCurrency(avgCpc, currency) : '—'}
          loading={loading}
        />
        <MetricCard
          label="Conversões totais"
          value={totalConversions > 0 ? formatNumber(totalConversions) : '—'}
          sub={
            totalConversions > 0
              ? [
                  totalPurchases > 0 && `${formatNumber(totalPurchases)} compras`,
                  totalWhatsapp  > 0 && `${formatNumber(totalWhatsapp)} WhatsApp`,
                  totalLeads     > 0 && `${formatNumber(totalLeads)} leads`,
                ].filter(Boolean).join(' · ')
              : undefined
          }
          loading={loading}
        />
        <MetricCard
          label="ROAS"
          value={roas > 0 ? formatRoas(roas) : '—'}
          sub={totalRevenue > 0 ? `Receita ${formatCurrency(totalRevenue, currency)}` : 'Sem valor de compra rastreado'}
          highlight={roas >= 3}
          loading={loading}
        />
        <MetricCard
          label="CPA (custo/resultado)"
          value={cpa > 0 ? formatCurrency(cpa, currency) : '—'}
          sub={totalConversions > 0 ? `${formatNumber(totalConversions)} resultados` : undefined}
          loading={loading}
        />
      </div>

      {/* ── Seguidores reais + Engajamento Social ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Seguidores reais das páginas */}
        {selectedAccountId !== 'all' && (followersLoading || followers === null || (followers?.loaded && (followers?.pages?.length > 0 || followers?.loaded === false))) && (
        <div className="bg-white border border-border rounded-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <IconUserPlus size={16} className="text-status-success" strokeWidth={1.5} />
            <h2 className="text-sm font-semibold text-txt-primary">Seguidores</h2>
            <span className="text-xs text-txt-secondary ml-1">da conta selecionada</span>
            <button
              onClick={loadFollowers}
              disabled={followersLoading}
              className="ml-auto p-1 rounded text-txt-secondary hover:text-brand-500 transition-colors disabled:opacity-40"
              title="Atualizar seguidores"
            >
              <IconRefresh size={14} className={followersLoading ? 'animate-spin' : ''} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {/* Instagram */}
            {(followersLoading || followers === null || followers.igLinked) && (
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 border border-border" style={{ background: 'linear-gradient(135deg,#f9ce34,#ee2a7b,#6228d7)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-txt-secondary">Instagram</p>
                  {followersLoading || followers === null ? (
                    <div className="mt-1 h-7 w-16 bg-surface-bg rounded animate-pulse" />
                  ) : (
                    <p className="text-xl font-bold text-txt-primary">
                      {formatNumber(followers.igFollowers)}
                    </p>
                  )}
                  {followers?.igUsername && (
                    <p className="text-[10px] text-txt-secondary mt-0.5">@{followers.igUsername}</p>
                  )}
                </div>
              </div>
            )}
            {/* Facebook */}
            {(followersLoading || followers === null || followers.fbFollowers > 0) && (
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-[#1877F2] rounded-full flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </div>
              <div>
                <p className="text-xs text-txt-secondary">Facebook</p>
                {followersLoading || followers === null ? (
                  <div className="mt-1 h-7 w-16 bg-surface-bg rounded animate-pulse" />
                ) : (
                  <p className="text-xl font-bold text-txt-primary">
                    {formatNumber(followers.fbFollowers)}
                  </p>
                )}
                <p className="text-[10px] text-txt-secondary mt-0.5">Curtidas na página</p>
              </div>
            </div>
            )}
          </div>
          {/* Instagram post stats */}
          {!followersLoading && igStats !== null && (
            <div className="mt-3 pt-3 border-t border-border">
              {igStats.available && (igStats.totalLikes > 0 || igStats.totalComments > 0) ? (
                <div>
                  <p className="text-xs font-medium text-txt-secondary mb-2">
                    Últimas {igStats.media?.length || 0} publicações do Instagram
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-pink-50 rounded-input p-2 text-center">
                      <p className="text-sm font-bold text-pink-600">{formatNumber(igStats.totalLikes)}</p>
                      <p className="text-[10px] text-txt-secondary mt-0.5">❤️ Curtidas</p>
                    </div>
                    <div className="bg-pink-50 rounded-input p-2 text-center">
                      <p className="text-sm font-bold text-pink-600">{formatNumber(igStats.totalComments)}</p>
                      <p className="text-[10px] text-txt-secondary mt-0.5">💬 Comentários</p>
                    </div>
                    {igStats.igMediaCount > 0 && (
                      <div className="bg-pink-50 rounded-input p-2 text-center">
                        <p className="text-sm font-bold text-pink-600">{formatNumber(igStats.igMediaCount)}</p>
                        <p className="text-[10px] text-txt-secondary mt-0.5">📸 Posts</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : igStats.reason === 'no_ig_linked' ? null : igStats.reason === 'no_permission' ? (
                <div className="bg-surface-bg rounded-input p-3">
                  <p className="text-xs font-medium text-txt-primary mb-1">Curtidas do Instagram</p>
                  <p className="text-xs text-txt-secondary leading-relaxed">
                    Para ver curtidas e comentários das publicações, reconecte o Meta Ads aceitando a permissão <strong>instagram_basic</strong> durante o login.
                  </p>
                  <p className="text-[11px] text-brand-500 mt-1.5">Conexões → Reconectar conta Meta</p>
                </div>
              ) : null}
            </div>
          )}

          {followers?.loaded === false && (
            <p className="mt-3 text-xs text-status-error border-t border-border pt-3">
              Erro ao carregar seguidores. Verifique as permissões ou reconecte o Meta Ads.
            </p>
          )}
          {followers?.loaded && !followers?.igLinked && followers?.pages?.length > 0 && (
            <p className="mt-3 text-[11px] text-txt-secondary border-t border-border pt-3">
              Não detectamos conta do Instagram vinculada à página desta conta de anúncios. Vincule no Meta Business.
            </p>
          )}
        </div>
        )}

        {/* Engajamento via anúncios */}
        <div className="bg-white border border-border rounded-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <IconHeart size={16} className="text-status-error" strokeWidth={1.5} />
            <h2 className="text-sm font-semibold text-txt-primary">Engajamento</h2>
            <span className="text-xs text-txt-secondary ml-1">via anúncios</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-status-errorBg rounded-full flex items-center justify-center shrink-0">
                <IconHeart size={16} className="text-status-error" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-xs text-txt-secondary">Curtidas / Reações</p>
                {loading ? <div className="mt-1 h-6 w-12 bg-surface-bg rounded animate-pulse" />
                  : <p className="text-xl font-bold text-txt-primary">{hasInsights ? formatNumber(totalReactions) : '—'}</p>}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-brand-50 rounded-full flex items-center justify-center shrink-0">
                <IconMessageCircle size={16} className="text-brand-500" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-xs text-txt-secondary">Comentários</p>
                {loading ? <div className="mt-1 h-6 w-12 bg-surface-bg rounded animate-pulse" />
                  : <p className="text-xl font-bold text-txt-primary">{hasInsights ? formatNumber(totalComments) : '—'}</p>}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-status-warningBg rounded-full flex items-center justify-center shrink-0">
                <IconShare2 size={16} className="text-status-warning" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-xs text-txt-secondary">Compartilhamentos</p>
                {loading ? <div className="mt-1 h-6 w-12 bg-surface-bg rounded animate-pulse" />
                  : <p className="text-xl font-bold text-txt-primary">{hasInsights ? formatNumber(totalShares) : '—'}</p>}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-status-successBg rounded-full flex items-center justify-center shrink-0">
                <IconUserPlus size={16} className="text-status-success" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-xs text-txt-secondary">Seg. via anúncios</p>
                {loading ? <div className="mt-1 h-6 w-12 bg-surface-bg rounded animate-pulse" />
                  : <p className="text-xl font-bold text-txt-primary">{hasInsights ? formatNumber(totalPageLikes) : '—'}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Grid inferior ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Top campanhas */}
        <div className="bg-white border border-border rounded-card p-5">
          <h2 className="text-sm font-semibold text-txt-primary mb-4">Top campanhas — investimento</h2>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-10 bg-surface-bg rounded animate-pulse" />)}
            </div>
          ) : topCampaigns.length > 0 ? (
            <div className="space-y-0">
              {topCampaigns.map((ins) => {
                const spend   = Number(ins.spend || 0)
                const revenue = getActionValue(ins.action_values, 'purchase')
                const r       = spend > 0 && revenue > 0 ? revenue / spend : 0
                const ctr     = Number(ins.ctr || 0)
                return (
                  <div key={ins.campaign_id} className="flex items-center gap-3 py-3 border-b border-border last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-txt-primary truncate">{ins.campaign_name}</p>
                      <p className="text-xs text-txt-secondary mt-0.5">
                        {formatNumber(Number(ins.impressions || 0))} impressões
                        {ctr > 0 && ` · CTR ${ctr.toFixed(1)}%`}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-txt-primary">{formatCurrency(spend, currency)}</p>
                      {r > 0 && (
                        <p className={`text-xs font-medium ${r >= 3 ? 'text-status-success' : r >= 2 ? 'text-txt-secondary' : 'text-status-error'}`}>
                          ROAS {formatRoas(r)}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-txt-secondary py-6 text-center">
              Nenhum dado no período selecionado.
            </p>
          )}
        </div>

        {/* Conversões + Agentes */}
        <div className="space-y-4">
          {/* Painel de conversões */}
          <div className="bg-white border border-border rounded-card p-5">
            <h2 className="text-sm font-semibold text-txt-primary mb-4">Conversões por tipo</h2>
            {loading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-8 bg-surface-bg rounded animate-pulse" />)}
              </div>
            ) : (
              <div className="space-y-2">
                {[
                  { label: 'Compras (Purchase)',        count: totalPurchases, color: 'bg-status-success' },
                  { label: 'WhatsApp / Mensagens (7d)', count: totalWhatsapp,  color: 'bg-[#25D366]' },
                  { label: 'Leads',                     count: totalLeads,     color: 'bg-brand-500' },
                ].map(({ label, count, color }) => {
                  const pct = totalConversions > 0 ? (count / totalConversions) * 100 : 0
                  return (
                    <div key={label}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-txt-secondary">{label}</span>
                        <span className="font-medium text-txt-primary">{formatNumber(count)}</span>
                      </div>
                      <div className="h-2 bg-surface-bg rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${color} transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
                {totalConversions === 0 && !loading && (
                  <p className="text-xs text-txt-secondary text-center py-2">
                    Nenhuma conversão rastreada no período.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Agentes ativos */}
          <div className="bg-white border border-border rounded-card p-5">
            <h2 className="text-sm font-semibold text-txt-primary mb-3">Agentes IA</h2>
            {agentsCount > 0 ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-50 rounded-full flex items-center justify-center">
                  <IconRobot size={20} className="text-brand-500" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-xl font-bold text-brand-500">{agentsCount}</p>
                  <p className="text-xs text-txt-secondary">agente{agentsCount !== 1 ? 's' : ''} monitorando sua conta</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <IconRobot size={22} className="text-txt-secondary" strokeWidth={1.5} />
                <div>
                  <p className="text-sm text-txt-secondary">Nenhum agente ativo.</p>
                  <button onClick={() => navigate('/agentes')} className="text-xs text-brand-500 hover:text-brand-700 font-medium transition-colors">
                    Criar agente →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: escolha do tipo de relatório */}
      {showReportChoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-card border border-border shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <p className="text-sm font-semibold text-txt-primary">Para quem é este relatório?</p>
                <p className="text-xs text-txt-secondary mt-0.5">Escolha o formato ideal</p>
              </div>
              <button onClick={() => setShowReportChoice(false)} className="p-1.5 rounded-input text-txt-secondary hover:bg-surface-bg transition-colors">
                <IconX size={16} />
              </button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3">
              <button
                onClick={() => { setShowReportChoice(false); openClientReport() }}
                className="group flex flex-col items-center gap-3 p-5 border-2 border-border rounded-card hover:border-brand-400 hover:bg-brand-50/40 transition-all text-center"
              >
                <div className="w-12 h-12 bg-brand-50 rounded-full flex items-center justify-center group-hover:bg-brand-100 transition-colors">
                  <IconUsers size={22} className="text-brand-500" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-txt-primary">Para o cliente</p>
                  <p className="text-xs text-txt-secondary mt-1 leading-relaxed">
                    Simples e visual — foco nos resultados. Sem termos técnicos.
                  </p>
                </div>
              </button>
              <button
                onClick={() => { setShowReportChoice(false); openReport() }}
                className="group flex flex-col items-center gap-3 p-5 border-2 border-border rounded-card hover:border-brand-400 hover:bg-brand-50/40 transition-all text-center"
              >
                <div className="w-12 h-12 bg-surface-bg rounded-full flex items-center justify-center group-hover:bg-brand-100 transition-colors">
                  <IconChartBar size={22} className="text-txt-secondary group-hover:text-brand-500 transition-colors" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-txt-primary">Análise técnica</p>
                  <p className="text-xs text-txt-secondary mt-1 leading-relaxed">
                    Métricas completas: CTR, CPM, CPC, campanhas detalhadas.
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gráfico — Investido vs Receita por campanha */}
      <div className="bg-white border border-border rounded-card p-5">
        <h2 className="text-sm font-semibold text-txt-primary mb-4">
          Investido × Receita por campanha
          <span className="ml-2 text-xs font-normal text-txt-secondary">{DATE_PRESETS.find(d => d.id === datePreset)?.label}</span>
        </h2>
        {loading ? (
          <div className="h-64 bg-surface-bg rounded animate-pulse" />
        ) : chartData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717A', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717A', fontSize: 11 }} tickFormatter={(v) => formatCurrency(v / 1000, currency).replace(/,\d+$/, '') + 'k'} />
                <Tooltip content={<CustomTooltip currency={currency} />} />
                <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: '12px', color: '#71717A' }} />
                <Bar dataKey="Investido" fill="#DDD6FE" radius={[4, 4, 0, 0]} maxBarSize={36} />
                <Bar dataKey="Receita"   fill="#7C3AED" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-txt-secondary">Sem campanhas com dados no período selecionado.</p>
              <button onClick={() => setDatePreset('last_30d')} className="mt-2 text-xs text-brand-500 hover:text-brand-700">
                Ver últimos 30 dias
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
