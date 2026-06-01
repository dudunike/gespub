// Insights IA — análise algorítmica real baseada na conta Meta Ads do usuário
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconSparkles, IconCheck, IconX, IconRefresh,
  IconPlugConnected, IconAlertCircle, IconTrendingUp,
  IconAlertTriangle, IconExternalLink,
} from '@tabler/icons-react'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'
import { useMeta } from '../../context/MetaContext'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import {
  getCampaignInsights,
  getAdSetInsights,
  updateCampaignStatus,
  updateCampaignBudget,
  getActionCount,
  getActionValue,
  DATE_PRESETS,
} from '../../lib/metaApi'
import { getPlan, checkLimit } from '../../utils/planLimits'
import { formatCurrency, formatRoas, formatPercent, formatNumber } from '../../utils/formatters'

function generateInsights(campInsights) {
  const list = []
  campInsights.forEach((c) => {
    const spend  = Number(c.spend || 0)
    if (spend < 1) return
    const impressions = Number(c.impressions || 0)
    const clicks      = Number(c.clicks || 0)
    const ctr         = Number(c.ctr || 0)
    const cpc         = Number(c.cpc || 0)
    const cpm         = Number(c.cpm || 0)
    const frequency   = Number(c.frequency || 0)
    const reach       = Number(c.reach || 0)
    const purchases   = getActionCount(c.actions, 'purchase')
    const whatsapp    = getActionCount(c.actions, 'onsite_conversion.messaging_conversation_started_7d')
    const leads       = getActionCount(c.actions, 'lead')
    const revenue     = getActionValue(c.action_values, 'purchase')
    const conversions = purchases + whatsapp + leads
    const roas        = spend > 0 && revenue > 0 ? revenue / spend : 0
    const cpa         = spend > 0 && conversions > 0 ? spend / conversions : 0
    const name        = c.campaign_name

    if (roas >= 4) {
      list.push({ id:`roas_high_${c.campaign_id}`, type:'opportunity',
        title:`ROAS de ${formatRoas(roas)} — escale o investimento`, campaignName:name, campaignId:c.campaign_id,
        analysis:`"${name}" tem ROAS de ${formatRoas(roas)} ${cpa>0?`com CPA de ${formatCurrency(cpa)}`:''}. Aumentar o orçamento em 20-30% pode ampliar os resultados sem comprometer a eficiência.`,
        metrics:[{label:'ROAS',value:formatRoas(roas)},{label:'Investido',value:formatCurrency(spend)},{label:'Receita',value:revenue>0?formatCurrency(revenue):'—'},{label:'Conversões',value:formatNumber(conversions)}],
        action:'increase_budget', actionValue:Math.round(spend*1.25*100), priority:1 })
    }
    if (roas > 0 && roas < 2 && spend > 100) {
      list.push({ id:`roas_low_${c.campaign_id}`, type:'warning',
        title:`ROAS abaixo de 2× — revise a campanha`, campaignName:name, campaignId:c.campaign_id,
        analysis:`"${name}" está com ROAS de ${formatRoas(roas)}. Revise públicos-alvo, criativos e oferta. Pause os conjuntos de menor desempenho.`,
        metrics:[{label:'ROAS',value:formatRoas(roas)},{label:'Investido',value:formatCurrency(spend)},{label:'CPC',value:formatCurrency(cpc)}],
        action:'open_manager', priority:2 })
    }
    if (ctr > 0 && ctr < 1 && impressions > 5000) {
      list.push({ id:`ctr_low_${c.campaign_id}`, type:'warning',
        title:`CTR de ${formatPercent(ctr)} — criativo pouco engajante`, campaignName:name, campaignId:c.campaign_id,
        analysis:`"${name}" tem CTR de ${formatPercent(ctr)} com ${formatNumber(impressions)} impressões. Um CTR abaixo de 1% indica que o criativo não está chamando atenção. Teste novos formatos, headlines ou ofertas.`,
        metrics:[{label:'CTR',value:formatPercent(ctr)},{label:'Impressões',value:formatNumber(impressions)},{label:'CPM',value:formatCurrency(cpm)}],
        action:'open_manager', priority:3 })
    }
    if (frequency > 3.5 && impressions > 1000) {
      list.push({ id:`freq_${c.campaign_id}`, type:'warning',
        title:`Frequência ${frequency.toFixed(1)}× — possível fadiga criativa`, campaignName:name, campaignId:c.campaign_id,
        analysis:`A frequência de "${name}" está em ${frequency.toFixed(1)}×. As mesmas pessoas estão vendo o mesmo anúncio repetidamente. Atualize os criativos ou amplie o público.`,
        metrics:[{label:'Frequência',value:`${frequency.toFixed(1)}×`},{label:'Alcance',value:formatNumber(reach)},{label:'CTR',value:ctr>0?formatPercent(ctr):'—'}],
        action:'open_manager', priority:2 })
    }
    if (whatsapp > 0) {
      list.push({ id:`wa_${c.campaign_id}`, type:'opportunity',
        title:`${formatNumber(whatsapp)} conversas WhatsApp geradas`, campaignName:name, campaignId:c.campaign_id,
        analysis:`"${name}" está gerando ${formatNumber(whatsapp)} conversas no WhatsApp. ${cpc > 3 ? `Com CPC de ${formatCurrency(cpc)}, teste públicos Lookalike de quem já iniciou conversa para reduzir o custo.` : 'Escale o investimento nesta campanha para multiplicar os resultados.'}`,
        metrics:[{label:'Conversas WhatsApp',value:formatNumber(whatsapp)},{label:'CPC',value:formatCurrency(cpc)},{label:'Investido',value:formatCurrency(spend)}],
        action:'increase_budget', actionValue:Math.round(spend*1.20*100), priority:1 })
    }
    if (cpa > 50 && spend > 200) {
      list.push({ id:`cpa_${c.campaign_id}`, type:'critical',
        title:`CPA de ${formatCurrency(cpa)} — acima do ideal`, campaignName:name, campaignId:c.campaign_id,
        analysis:`O custo por resultado de "${name}" está em ${formatCurrency(cpa)} consumindo ${formatCurrency(spend)} para apenas ${formatNumber(conversions)} conversões. Pause os conjuntos de pior desempenho e realoque o orçamento.`,
        metrics:[{label:'CPA',value:formatCurrency(cpa)},{label:'Investido',value:formatCurrency(spend)},{label:'Resultados',value:formatNumber(conversions)}],
        action:'pause_campaign', priority:1 })
    }
    if (ctr > 3 && clicks > 500 && (purchases + leads) < clicks * 0.01) {
      list.push({ id:`ctr_noconv_${c.campaign_id}`, type:'warning',
        title:`Alto CTR (${formatPercent(ctr)}) mas poucas conversões`, campaignName:name, campaignId:c.campaign_id,
        analysis:`"${name}" tem ótimo CTR de ${formatPercent(ctr)} mas a taxa pós-clique está baixa. O problema provavelmente é na página de destino: velocidade, oferta ou call-to-action.`,
        metrics:[{label:'CTR',value:formatPercent(ctr)},{label:'Cliques',value:formatNumber(clicks)},{label:'Conversões',value:formatNumber(purchases+leads)},{label:'CPC',value:formatCurrency(cpc)}],
        action:'open_manager', priority:2 })
    }
  })
  return list.sort((a,b)=>{
    const o={critical:0,warning:1,opportunity:2}
    return o[a.type]!==o[b.type] ? o[a.type]-o[b.type] : a.priority-b.priority
  }).slice(0,20)
}

const TYPE_CFG = {
  opportunity:{ label:'Oportunidade', border:'border-l-brand-500',       icon:IconTrendingUp,   iconColor:'text-brand-500',       iconBg:'bg-brand-50',         badge:'brand'   },
  warning:    { label:'Atenção',       border:'border-l-status-warning',  icon:IconAlertTriangle,iconColor:'text-status-warning',   iconBg:'bg-status-warningBg', badge:'warning' },
  critical:   { label:'Crítico',       border:'border-l-status-error',    icon:IconAlertCircle,  iconColor:'text-status-error',     iconBg:'bg-status-errorBg',   badge:'error'   },
}

export default function Insights() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isConnected, accessToken, accountId, accountName, loadingConnection } = useMeta()

  const [insights,       setInsights]       = useState([])
  const [dismissed,      setDismissed]      = useState(new Set())
  const [applied,        setApplied]        = useState(new Set())
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState(null)
  const [typeFilter,     setTypeFilter]     = useState('')
  const [campaignFilter, setCampaignFilter] = useState('')
  const [datePreset,     setDatePreset]     = useState('last_30d')
  const [insightsUsed,   setInsightsUsed]   = useState(0)
  const [applying,       setApplying]       = useState(null)

  const plan     = user?.plan || 'basic'
  const planInfo = getPlan(plan)
  const { allowed: canGenerate } = checkLimit(plan, 'insights', insightsUsed)

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('insights_used_month').eq('id', user.id).single()
      .then(({ data }) => { if (data) setInsightsUsed(data.insights_used_month || 0) })
      .catch(() => {})
  }, [user])

  const loadInsights = useCallback(async () => {
    if (!isConnected || !accessToken || !accountId || !canGenerate) return
    setLoading(true); setError(null)
    try {
      const data = await getCampaignInsights(accountId, accessToken, datePreset)
      if (!data.length) { setInsights([]); return }

      // Tenta Gemini primeiro; fallback para algoritmo local
      let generated = []
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const resp = await fetch('/api/insights-ai', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            campaigns: data,
            dateLabel: DATE_PRESETS.find(p => p.id === datePreset)?.label || datePreset,
            currency: 'BRL',
          }),
        })
        if (resp.ok) {
          const ai = await resp.json()
          // Converte resposta Gemini para formato interno
          generated = (ai.insights || []).map((ins, i) => ({
            id: `ai_${i}_${Date.now()}`,
            type:        ins.tipo === 'oportunidade' ? 'opportunity' : ins.tipo === 'alerta' ? 'warning' : 'info',
            title:       ins.titulo,
            campaignName: ins.campanha || null,
            campaignId:  data.find(c => c.campaign_name === ins.campanha)?.campaign_id || null,
            analysis:    ins.analise,
            action:      'open_manager',
            priority:    ins.prioridade || 3,
            aiGenerated: true,
          }))
          if (ai.resumo) generated.unshift({
            id: 'ai_summary',
            type: 'info',
            title: 'Resumo do período',
            analysis: ai.resumo,
            campaignName: null,
            campaignId: null,
            priority: 0,
            aiGenerated: true,
          })
        } else {
          throw new Error('Gemini indisponível')
        }
      } catch {
        // Fallback: algoritmo local
        generated = generateInsights(data)
      }

      setInsights(generated)
      if (generated.length > 0 && user) {
        const n = insightsUsed + 1
        setInsightsUsed(n)
        await supabase.from('profiles').update({ insights_used_month: n }).eq('id', user.id)
      }
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [isConnected, accessToken, accountId, datePreset, canGenerate, insightsUsed, user])

  useEffect(() => { loadInsights() }, [isConnected, accountId, datePreset])

  const handleApply = async (insight) => {
    setApplying(insight.id)
    try {
      if (insight.action === 'increase_budget' && insight.actionValue) {
        await updateCampaignBudget(insight.campaignId, accessToken, insight.actionValue)
        setApplied(p => new Set([...p, insight.id]))
      } else if (insight.action === 'pause_campaign') {
        await updateCampaignStatus(insight.campaignId, accessToken, 'PAUSED')
        setApplied(p => new Set([...p, insight.id]))
      } else {
        window.open(`https://business.facebook.com/adsmanager/manage/campaigns?act=${accountId?.replace('act_','')}&selected_campaign_ids=${insight.campaignId}`,'_blank')
      }
    } catch (err) { setError(err.message) }
    finally { setApplying(null) }
  }

  const campaigns = [...new Set(insights.map(i => i.campaignId))]
    .map(id => ({ id, label: insights.find(i => i.campaignId === id)?.campaignName || id }))

  const visible = insights.filter(i => {
    if (dismissed.has(i.id)) return false
    if (typeFilter && i.type !== typeFilter) return false
    if (campaignFilter && i.campaignId !== campaignFilter) return false
    return true
  })

  if (!loadingConnection && !isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div className="w-16 h-16 bg-surface-bg rounded-full flex items-center justify-center">
          <IconPlugConnected size={32} className="text-txt-secondary" />
        </div>
        <p className="text-base font-semibold text-txt-primary">Conecte sua conta Meta Ads</p>
        <p className="text-sm text-txt-secondary max-w-sm">Os Insights analisam os dados reais das suas campanhas e geram recomendações automáticas.</p>
        <Button onClick={() => navigate('/conexoes')} icon={IconPlugConnected}>Conectar Meta Ads</Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {accountName && <span className="text-xs bg-surface-bg border border-border px-2.5 py-1 rounded-full text-txt-secondary">{accountName}</span>}
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
            !canGenerate ? 'bg-status-errorBg text-status-error border-status-error' :
            insightsUsed/planInfo.insights > 0.7 ? 'bg-status-warningBg text-status-warning border-status-warning' :
            'bg-surface-bg border-border text-txt-secondary'
          }`}>
            {insightsUsed} / {planInfo.insights >= 9999 ? '∞' : planInfo.insights} insights — {planInfo.name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Select name="datePreset" value={datePreset} onChange={e => setDatePreset(e.target.value)} options={DATE_PRESETS} />
          <Button variant="ghost" size="sm" icon={IconRefresh} onClick={loadInsights} disabled={loading || !canGenerate}>
            {loading ? 'Analisando…' : 'Atualizar'}
          </Button>
        </div>
      </div>

      {!canGenerate && (
        <div className="flex items-start gap-3 p-4 bg-status-errorBg border border-status-error rounded-card">
          <IconAlertCircle size={18} className="text-status-error shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-txt-primary">Limite de insights atingido este mês</p>
            <p className="text-xs text-txt-secondary mt-0.5">Você usou {insightsUsed} de {planInfo.insights} insights do plano {planInfo.name}. Entre em contato para fazer upgrade.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 px-3 py-2 bg-status-errorBg border border-status-error rounded-input">
          <IconAlertCircle size={16} className="text-status-error shrink-0 mt-0.5" />
          <p className="text-sm text-status-error">{error}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {['','opportunity','warning','critical'].map(t => {
          const labels = {'':`Todos (${visible.length})`, opportunity:'Oportunidades', warning:'Atenção', critical:'Críticos'}
          const count  = t ? visible.filter(i => i.type === t).length : visible.length
          return (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                typeFilter === t ? 'bg-brand-500 border-brand-500 text-white' : 'bg-white border-border text-txt-secondary hover:border-brand-300'
              }`}>
              {labels[t]}{t ? ` (${count})` : ''}
            </button>
          )
        })}
        {campaigns.length > 1 && (
          <select value={campaignFilter} onChange={e => setCampaignFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-border rounded-full focus:outline-none bg-white text-txt-secondary">
            <option value="">Todas as campanhas</option>
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        )}
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-txt-secondary">
          <div className="w-8 h-8 rounded-full animate-spin" style={{border:'3px solid #E4E4E7', borderTopColor:'#7C3AED'}} />
          <p className="text-sm">Analisando campanhas da sua conta…</p>
        </div>
      )}

      {!loading && visible.length === 0 && canGenerate && !error && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="w-14 h-14 bg-brand-50 rounded-full flex items-center justify-center">
            <IconSparkles size={26} className="text-brand-500" strokeWidth={1.5} />
          </div>
          <p className="text-base font-semibold text-txt-primary">Nenhum insight detectado</p>
          <p className="text-sm text-txt-secondary max-w-sm">Suas campanhas estão saudáveis ou não há dados suficientes. Tente um período maior.</p>
        </div>
      )}

      <div className="space-y-4">
        {visible.map((insight) => {
          const cfg = TYPE_CFG[insight.type]
          const Icon = cfg.icon
          const isApplied  = applied.has(insight.id)
          const isApplying = applying === insight.id
          return (
            <div key={insight.id} className={`bg-white border border-border border-l-4 ${cfg.border} rounded-card p-5 ${isApplied ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 ${cfg.iconBg} rounded-input flex items-center justify-center shrink-0`}>
                  <Icon size={18} stroke={1.5} className={cfg.iconColor} />
                </div>
                <div className="flex-1">
                  <div className="flex items-start gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-txt-primary flex-1">{insight.title}</h3>
                    <Badge variant={cfg.badge}>{cfg.label}</Badge>
                    {isApplied && <Badge variant="success">✓ Aplicado</Badge>}
                  </div>
                  <p className="text-xs text-txt-secondary mt-0.5">{insight.campaignName}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-txt-primary leading-relaxed">{insight.analysis}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {insight.metrics.map((m, i) => (
                  <div key={i} className="bg-surface-bg rounded-input px-3 py-2">
                    <p className="text-xs text-txt-secondary">{m.label}</p>
                    <p className="text-sm font-bold text-txt-primary">{m.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {!isApplied && (
                  <Button size="sm" icon={isApplying ? undefined : IconCheck} onClick={() => handleApply(insight)} disabled={isApplying}>
                    {isApplying ? 'Aplicando…' :
                     insight.action === 'increase_budget' ? 'Aumentar orçamento' :
                     insight.action === 'pause_campaign'  ? 'Pausar campanha'    : 'Abrir no Gerenciador'}
                  </Button>
                )}
                <a href={`https://business.facebook.com/adsmanager/manage/campaigns?act=${accountId?.replace('act_','')}&selected_campaign_ids=${insight.campaignId}`} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="secondary" icon={IconExternalLink}>Ver no Gerenciador</Button>
                </a>
                {!isApplied && (
                  <button onClick={() => setDismissed(p => new Set([...p, insight.id]))}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-txt-secondary hover:text-status-error transition-colors rounded-input hover:bg-status-errorBg">
                    <IconX size={14} /> Ignorar
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
