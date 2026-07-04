// ADIM — Configurações: planos, webhook, alertas, IA e sistema
import { useState, useEffect } from 'react'
import {
  IconDeviceFloppy, IconWebhook, IconBell,
  IconAlertCircle, IconCheck, IconEye, IconEyeOff,
  IconPlugConnected, IconLoader2, IconX,
} from '@tabler/icons-react'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Toggle from '../../components/ui/Toggle'
import { supabase } from '../../lib/supabaseClient'
import { PLAN_LIMITS, SYSTEM_CONFIG } from '../../utils/planLimits'

function Section({ title, description, children }) {
  return (
    <div className="bg-white border border-border rounded-card p-6 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-txt-primary">{title}</h2>
        {description && <p className="text-xs text-txt-secondary mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  )
}

const META_TESTS = [
  {
    id: 'ads_read',
    label: 'ads_read',
    description: 'Leitura de contas de anúncios',
    path: '/me/adaccounts',
    params: { fields: 'id,name,account_status', limit: '5' },
  },
  {
    id: 'ads_management',
    label: 'ads_management',
    description: 'Gerenciamento de contas de anúncios',
    path: '/me/adaccounts',
    params: { fields: 'id,name,account_status,currency', limit: '5' },
  },
  {
    id: 'pages_read_engagement',
    label: 'pages_read_engagement',
    description: 'Leitura de engajamento de páginas',
    path: '/me/accounts',
    params: { fields: 'id,name,fan_count', limit: '5' },
  },
  {
    id: 'business_management',
    label: 'business_management',
    description: 'Gerenciamento de contas Business',
    path: '/me/businesses',
    params: { fields: 'id,name', limit: '5' },
  },
]

async function callProxy(path, params, testToken) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Sem sessão ativa')
  const res = await fetch('/api/meta-proxy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ path, params, testToken: testToken || undefined }),
  })
  return res.json()
}

export default function AdminSettings() {
  const [plans, setPlans] = useState([
    { ...PLAN_LIMITS.basic },
    { ...PLAN_LIMITS.pro },
    { ...PLAN_LIMITS.advanced },
  ])
  const [plansSaved, setPlansSaved] = useState(false)

  const [webhook, setWebhook] = useState({ url: '', secret: '', active: false, status: 'not_configured' })
  const [showSecret, setShowSecret] = useState(false)
  const [testingWH, setTestingWH] = useState(false)
  const [webhookSaved, setWebhookSaved] = useState(false)

  const [alerts, setAlerts] = useState({ expiring3days: true, limit90pct: true, alertEmail: '' })
  const [systemConfig, setSystemConfig] = useState(SYSTEM_CONFIG)
  const [aiConfig, setAiConfig] = useState({ geminiApiKey: '', geminiModel: 'gemini-2.0-flash' })
  const [aiSaved, setAiSaved] = useState(false)

  const [testResults, setTestResults] = useState({})
  const [testRunning, setTestRunning] = useState(false)

  const [metaCreds, setMetaCreds] = useState({ appId: '', appSecret: '', permanentToken: '' })
  const [showAppSecret, setShowAppSecret] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const [metaCredsSaved, setMetaCredsSaved] = useState(false)

  const runAllTests = async () => {
    setTestRunning(true)
    setTestResults({})
    for (const test of META_TESTS) {
      setTestResults(prev => ({ ...prev, [test.id]: { status: 'running' } }))
      try {
        const data = await callProxy(test.path, test.params, metaCreds.permanentToken)
        if (data.error) {
          setTestResults(prev => ({ ...prev, [test.id]: { status: 'error', message: data.error } }))
        } else {
          const items = data.data || []
          setTestResults(prev => ({ ...prev, [test.id]: { status: 'ok', count: items.length, sample: items[0]?.name || items[0]?.id || '—' } }))
        }
      } catch (e) {
        setTestResults(prev => ({ ...prev, [test.id]: { status: 'error', message: e.message } }))
      }
    }
    setTestRunning(false)
  }
  
  // Carrega configurações do Supabase
  useEffect(() => {
    async function loadSettings() {
      const { data, error } = await supabase.from('system_settings').select('id, value')
      if (data && !error) {
        const getVal = (id, fallback) => data.find(item => item.id === id)?.value || fallback

        const dbPlans = getVal('plan_limits', null)
        if (dbPlans) {
          setPlans([
            { ...PLAN_LIMITS.basic, ...dbPlans.basic },
            { ...PLAN_LIMITS.pro, ...dbPlans.pro },
            { ...PLAN_LIMITS.advanced, ...dbPlans.advanced },
          ])
        }
        setWebhook(getVal('webhook_config', webhook))
        setAlerts(getVal('alert_config', alerts))
        setSystemConfig(getVal('system_config', SYSTEM_CONFIG))
        setAiConfig(getVal('ai_config', aiConfig))
        setMetaCreds(getVal('meta_credentials', metaCreds))
      }
    }
    loadSettings()
  }, [])

  // Função auxiliar para salvar no Supabase
  const saveSetting = async (id, value) => {
    await supabase.from('system_settings').upsert({ id, value, updated_at: new Date().toISOString() })
  }

  const updatePlan = (id, field, value) =>
    setPlans(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
    
  const savePlans = async () => {
    const plansObj = {
      basic:    plans.find(p => p.id === 'basic'),
      pro:      plans.find(p => p.id === 'pro'),
      advanced: plans.find(p => p.id === 'advanced'),
    }
    await saveSetting('plan_limits', plansObj)
    Object.assign(PLAN_LIMITS.basic, plansObj.basic)
    Object.assign(PLAN_LIMITS.pro, plansObj.pro)
    Object.assign(PLAN_LIMITS.advanced, plansObj.advanced)
    setPlansSaved(true)
    setTimeout(() => setPlansSaved(false), 2500)
  }

  const testWebhook = async () => {
    if (!webhook.url) return
    setTestingWH(true)
    await new Promise(r => setTimeout(r, 1500))
    const updatedWH = { ...webhook, status: 'connected' }
    setWebhook(updatedWH)
    await saveSetting('webhook_config', updatedWH)
    setTestingWH(false)
  }

  const PLAN_FIELDS = [
    { key: 'price',     label: 'Preço (R$/mês)', step: '0.01' },
    { key: 'accounts',  label: 'Máx. contas' },
    { key: 'agents',    label: 'Máx. agentes' },
    { key: 'rules',     label: 'Máx. regras' },
    { key: 'campaigns', label: 'Máx. campanhas' },
    { key: 'insights',  label: 'Insights/mês' },
  ]

  return (
    <div className="space-y-6 max-w-4xl">

      {/* PLANOS */}
      <Section title="Limites por plano" description="Edite os valores de cada plano. Alterações aplicam-se a todos os usuários daquele plano.">
        {plans.map((plan) => (
          <div key={plan.id} className="p-4 bg-surface-bg border border-border rounded-input">
            <div className="flex items-center justify-between mb-3">
              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${
                plan.id === 'basic'    ? 'bg-white text-txt-secondary border-border' :
                plan.id === 'pro'     ? 'bg-brand-50 text-brand-500 border-brand-100' :
                                        'bg-status-successBg text-status-success border-green-200'
              }`}>{plan.name}</span>
              <p className="text-sm font-semibold text-brand-500">R$ {plan.price.toFixed(2).replace('.', ',')}/mês</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {PLAN_FIELDS.map(({ key, label, step }) => (
                <div key={key}>
                  <label className="text-xs text-txt-secondary block mb-1">{label}</label>
                  <input type="number" step={step} value={plan[key]}
                    onChange={(e) => updatePlan(plan.id, key, parseFloat(e.target.value))}
                    className="w-full px-2 py-1.5 text-sm border border-border rounded-input focus:outline-none focus:ring-2 focus:ring-brand-500/30 bg-white" />
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="flex items-center gap-3">
          <Button icon={plansSaved ? IconCheck : IconDeviceFloppy} onClick={savePlans}>
            {plansSaved ? 'Salvo!' : 'Salvar limites'}
          </Button>
          {plansSaved && <p className="text-xs text-status-success">Limites atualizados.</p>}
        </div>
      </Section>

      {/* WEBHOOK */}
      <Section title="Webhook de Pagamento" description="Integre seu processador de pagamentos para ativar planos automaticamente.">
        <div className={`flex items-start gap-3 p-3 rounded-input border ${
          webhook.status === 'connected'     ? 'bg-status-successBg border-status-success' :
          webhook.status === 'error'         ? 'bg-status-errorBg border-status-error' :
                                               'bg-status-warningBg border-status-warning'
        }`}>
          <IconAlertCircle size={16} className={
            webhook.status === 'connected' ? 'text-status-success mt-0.5' :
            webhook.status === 'error'     ? 'text-status-error mt-0.5'   : 'text-status-warning mt-0.5'
          } />
          <div>
            <p className="text-xs font-semibold text-txt-primary">
              {webhook.status === 'connected' ? 'Webhook conectado e ativo' :
               webhook.status === 'error'     ? 'Erro na conexão do webhook' :
                                                'Webhook não configurado — ativação manual ativa'}
            </p>
            {webhook.status === 'not_configured' && (
              <p className="text-xs text-txt-secondary mt-0.5">
                Enquanto o webhook não estiver ativo, a ativação de usuários é feita manualmente pelo ADIM.
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-txt-primary block mb-1.5">URL do Webhook</label>
            <input type="url" value={webhook.url}
              onChange={(e) => setWebhook(p => ({ ...p, url: e.target.value, status: 'not_configured' }))}
              placeholder="https://pagamento.exemplo.com/webhook"
              className="w-full px-3 py-2 text-sm border border-border rounded-input focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
          </div>
          <div>
            <label className="text-sm font-medium text-txt-primary block mb-1.5">Chave secreta</label>
            <div className="relative">
              <input type={showSecret ? 'text' : 'password'} value={webhook.secret}
                onChange={(e) => setWebhook(p => ({ ...p, secret: e.target.value }))}
                placeholder="whsec_••••••••••••••••"
                className="w-full px-3 py-2 pr-10 text-sm border border-border rounded-input focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
              <button type="button" onClick={() => setShowSecret(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-txt-secondary hover:text-txt-primary">
                {showSecret ? <IconEyeOff size={16} /> : <IconEye size={16} />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Toggle checked={webhook.active} onChange={(v) => setWebhook(p => ({ ...p, active: v }))} size="sm" />
          <span className="text-sm text-txt-primary">Ativar webhook</span>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <Button variant="secondary" icon={IconWebhook} onClick={testWebhook} disabled={!webhook.url || testingWH}>
            {testingWH ? 'Testando…' : 'Testar conexão'}
          </Button>
          <Button icon={webhookSaved ? IconCheck : IconDeviceFloppy} onClick={async () => { await saveSetting('webhook_config', webhook); setWebhookSaved(true); setTimeout(() => setWebhookSaved(false), 2500) }} disabled={!webhook.url}>
            {webhookSaved ? 'Salvo!' : 'Salvar webhook'}
          </Button>
        </div>

        <div className="p-3 bg-surface-bg border border-border rounded-input">
          <p className="text-xs font-medium text-txt-secondary mb-2">Payload esperado (POST JSON):</p>
          <pre className="text-xs text-txt-primary overflow-x-auto whitespace-pre-wrap">{`{ "event": "payment.approved", "email": "usuario@email.com", "plan": "pro", "expires_at": "2025-08-31" }`}</pre>
        </div>
      </Section>

      {/* ALERTAS */}
      <Section title="Alertas automáticos" description="Receba notificações por e-mail sobre eventos dos usuários.">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-txt-primary">Alerta de vencimento (3 dias antes)</p>
            <p className="text-xs text-txt-secondary">Aviso quando um plano estiver próximo do vencimento.</p>
          </div>
          <Toggle checked={alerts.expiring3days} onChange={(v) => setAlerts(p => ({ ...p, expiring3days: v }))} size="sm" />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-txt-primary">Alerta de uso ≥ 90% do limite</p>
            <p className="text-xs text-txt-secondary">Aviso quando um usuário atingir 90% de qualquer limite do plano.</p>
          </div>
          <Toggle checked={alerts.limit90pct} onChange={(v) => setAlerts(p => ({ ...p, limit90pct: v }))} size="sm" />
        </div>
        <div>
          <label className="text-sm font-medium text-txt-primary block mb-1.5">E-mail para receber alertas</label>
          <input type="email" value={alerts.alertEmail} onChange={(e) => setAlerts(p => ({ ...p, alertEmail: e.target.value }))}
            placeholder="admin@gespub.ai"
            className="w-full max-w-sm px-3 py-2 text-sm border border-border rounded-input focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
        </div>
        <Button icon={IconBell} onClick={() => saveSetting('alert_config', alerts)}>Salvar alertas</Button>
      </Section>

      {/* IA GLOBAL */}
      <Section title="Inteligência Artificial Global" description="Chaves utilizadas pelos Agentes IA e Insights de todos os usuários.">
        {/* Gemini */}
        <div>
          <p className="text-xs font-semibold text-txt-secondary uppercase tracking-wide mb-3">Google Gemini</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Gemini API Key" name="geminiApiKey" type="password" placeholder="AIza…"
              value={aiConfig.geminiApiKey || ''} onChange={(e) => setAiConfig(p => ({ ...p, geminiApiKey: e.target.value }))} />
            <Input label="Modelo Gemini" name="geminiModel" placeholder="gemini-2.0-flash"
              value={aiConfig.geminiModel || ''} onChange={(e) => setAiConfig(p => ({ ...p, geminiModel: e.target.value }))} />
          </div>
        </div>

        {/* Claude / Anthropic */}
        <div className="border-t border-border pt-4">
          <p className="text-xs font-semibold text-txt-secondary uppercase tracking-wide mb-3">Anthropic Claude</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Claude API Key" name="claudeApiKey" type="password" placeholder="sk-ant-api03-…"
              value={aiConfig.claudeApiKey || ''} onChange={(e) => setAiConfig(p => ({ ...p, claudeApiKey: e.target.value }))} />
            <Input label="Modelo Claude" name="claudeModel" placeholder="claude-sonnet-4-6"
              value={aiConfig.claudeModel || ''} onChange={(e) => setAiConfig(p => ({ ...p, claudeModel: e.target.value }))} />
          </div>
          <p className="mt-2 text-xs text-txt-secondary">
            Modelos disponíveis: <span className="font-mono">claude-opus-4-8</span>, <span className="font-mono">claude-sonnet-4-6</span>, <span className="font-mono">claude-haiku-4-5-20251001</span>
          </p>
        </div>

        <Button icon={aiSaved ? IconCheck : IconDeviceFloppy} onClick={async () => { await saveSetting('ai_config', aiConfig); setAiSaved(true); setTimeout(() => setAiSaved(false), 2500) }}>
          {aiSaved ? 'Salvo!' : 'Salvar IA'}
        </Button>
      </Section>

      {/* SISTEMA */}
      <Section title="Sistema">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-txt-primary">Modo manutenção</p>
            <p className="text-xs text-txt-secondary">Bloqueia o acesso de todos os usuários à plataforma.</p>
          </div>
          <Toggle checked={systemConfig.maintenanceMode} onChange={(v) => setSystemConfig(p => ({ ...p, maintenanceMode: v }))} />
        </div>
        <div>
          <label className="text-sm font-medium text-txt-primary block mb-1.5">Mensagem global do sistema</label>
          <textarea value={systemConfig.globalMessage}
            onChange={(e) => setSystemConfig(p => ({ ...p, globalMessage: e.target.value }))}
            placeholder="Exibida como banner para todos os usuários…" rows={3}
            className="w-full px-3 py-2 text-sm border border-border rounded-input focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-none" />
        </div>
        <Button icon={IconDeviceFloppy} onClick={async () => { await saveSetting('system_config', systemConfig); Object.assign(SYSTEM_CONFIG, systemConfig); }}>Salvar sistema</Button>
      </Section>

      {/* TESTE DE INTEGRAÇÃO META */}
      <Section title="Teste de Integração Meta API" description="Executa as chamadas obrigatórias para verificação do App Review do Facebook.">
        <div className="p-4 bg-surface-bg border border-border rounded-input space-y-3">
          <p className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">Credenciais Meta (para testar sem OAuth)</p>
          <p className="text-xs text-txt-secondary -mt-2">
            Cole aqui um token gerado no <span className="font-medium">Graph API Explorer</span> (developers.facebook.com) para rodar os testes abaixo sem depender de uma conta conectada via login. Isso NÃO substitui as variáveis de ambiente <span className="font-mono">VITE_META_APP_ID</span> / <span className="font-mono">META_APP_SECRET</span> usadas no fluxo real de OAuth — serve apenas para validar as permissões aqui no painel.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="App ID" name="metaAppId" placeholder="2072345476678142"
              value={metaCreds.appId || ''} onChange={(e) => setMetaCreds(p => ({ ...p, appId: e.target.value }))} />
            <div>
              <label className="text-sm font-medium text-txt-primary block mb-1.5">App Secret</label>
              <div className="relative">
                <input type={showAppSecret ? 'text' : 'password'} value={metaCreds.appSecret || ''}
                  onChange={(e) => setMetaCreds(p => ({ ...p, appSecret: e.target.value }))}
                  placeholder="••••••••••••••••"
                  className="w-full px-3 py-2 pr-10 text-sm border border-border rounded-input focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                <button type="button" onClick={() => setShowAppSecret(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-txt-secondary hover:text-txt-primary">
                  {showAppSecret ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                </button>
              </div>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-txt-primary block mb-1.5">Token Permanente (User ou System User Token)</label>
            <div className="relative">
              <input type={showToken ? 'text' : 'password'} value={metaCreds.permanentToken || ''}
                onChange={(e) => setMetaCreds(p => ({ ...p, permanentToken: e.target.value }))}
                placeholder="EAAG..."
                className="w-full px-3 py-2 pr-10 text-sm border border-border rounded-input focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
              <button type="button" onClick={() => setShowToken(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-txt-secondary hover:text-txt-primary">
                {showToken ? <IconEyeOff size={16} /> : <IconEye size={16} />}
              </button>
            </div>
          </div>
          <Button icon={metaCredsSaved ? IconCheck : IconDeviceFloppy} onClick={async () => { await saveSetting('meta_credentials', metaCreds); setMetaCredsSaved(true); setTimeout(() => setMetaCredsSaved(false), 2500) }}>
            {metaCredsSaved ? 'Salvo!' : 'Salvar credenciais'}
          </Button>
        </div>

        <div className="space-y-3">
          {META_TESTS.map((test) => {
            const r = testResults[test.id]
            return (
              <div key={test.id} className={`flex items-start justify-between p-3 rounded-input border gap-3 ${
                r?.status === 'ok'      ? 'bg-status-successBg border-status-success' :
                r?.status === 'error'   ? 'bg-status-errorBg border-status-error' :
                r?.status === 'running' ? 'bg-surface-bg border-border' :
                                          'bg-surface-bg border-border'
              }`}>
                <div className="min-w-0">
                  <p className="text-sm font-mono font-medium text-txt-primary">{test.label}</p>
                  <p className="text-xs text-txt-secondary">{test.description}</p>
                  {r?.status === 'ok' && (
                    <p className="text-xs text-status-success mt-1">
                      {r.count} registro(s) retornado(s) — ex: <span className="font-medium">{r.sample}</span>
                    </p>
                  )}
                  {r?.status === 'error' && (
                    <p className="text-xs text-status-error mt-1">{r.message}</p>
                  )}
                </div>
                <div className="shrink-0 mt-0.5">
                  {r?.status === 'ok'      && <IconCheck size={18} className="text-status-success" />}
                  {r?.status === 'error'   && <IconX size={18} className="text-status-error" />}
                  {r?.status === 'running' && <IconLoader2 size={18} className="text-brand-500 animate-spin" />}
                  {!r && <span className="w-[18px] h-[18px] rounded-full border-2 border-border block" />}
                </div>
              </div>
            )
          })}
        </div>

        <Button
          icon={testRunning ? IconLoader2 : IconPlugConnected}
          onClick={runAllTests}
          disabled={testRunning}
        >
          {testRunning ? 'Testando…' : 'Executar todos os testes'}
        </Button>

        <p className="text-xs text-txt-secondary">
          Cada chamada bem-sucedida verifica as permissões correspondentes no App Review do Facebook.
          Faça o mesmo pelo Graph API Explorer em developers.facebook.com para registrar os testes oficialmente.
        </p>
      </Section>
    </div>
  )
}
