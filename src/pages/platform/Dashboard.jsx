// Dashboard — métricas reais do Gerenciador de Anúncios Meta Ads
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { IconPlugConnected, IconRefresh, IconRobot, IconAlertCircle, IconTrendingUp } from '@tabler/icons-react'
import Button from '../../components/ui/Button'
import DateFilter from '../../components/ui/DateFilter'
import { useMeta } from '../../context/MetaContext'
import {
  getCampaignInsights,
  getActionCount,
  getActionValue,
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

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-border rounded-input px-3 py-2 text-xs shadow-sm">
        <p className="font-medium text-txt-primary mb-1">{label}</p>
        {payload.map((e, i) => (
          <p key={i} style={{ color: e.color }}>{e.name}: {formatCurrency(e.value)}</p>
        ))}
      </div>
    )
  }
  return null
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isConnected, accessToken, accountId, accountName, loadingConnection } = useMeta()

  const [insights, setInsights] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [datePreset, setDatePreset] = useState('today')
  const [timeRange, setTimeRange]   = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [agentsCount, setAgentsCount] = useState(0)

  // Busca insights reais do Meta Ads
  const loadInsights = async () => {
    if (!isConnected || !accessToken || !accountId) return
    setLoading(true)
    setError(null)
    try {
      const data = await getCampaignInsights(accountId, accessToken, datePreset, timeRange)
      setInsights(data)
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
  }, [isConnected, accessToken, accountId, datePreset, timeRange])

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
          {accountName && (
            <span className="text-xs font-medium bg-surface-bg border border-border px-3 py-1 rounded-full text-txt-secondary">
              {accountName}
            </span>
          )}
          {lastUpdated && (
            <span className="text-xs text-txt-secondary">
              Atualizado às {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
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
          onRefresh={loadInsights}
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

      {/* ── KPIs principais (linha 1) ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          label="Valor investido"
          value={formatCurrency(totalSpend)}
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
          sub={`CPM ${avgCpm > 0 ? formatCurrency(avgCpm) : '—'}`}
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
          value={avgCpc > 0 ? formatCurrency(avgCpc) : '—'}
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
          sub={totalRevenue > 0 ? `Receita ${formatCurrency(totalRevenue)}` : 'Sem valor de compra rastreado'}
          highlight={roas >= 3}
          loading={loading}
        />
        <MetricCard
          label="CPA (custo/resultado)"
          value={cpa > 0 ? formatCurrency(cpa) : '—'}
          sub={totalConversions > 0 ? `${formatNumber(totalConversions)} resultados` : undefined}
          loading={loading}
        />
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
                      <p className="text-sm font-semibold text-txt-primary">{formatCurrency(spend)}</p>
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
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717A', fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
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
