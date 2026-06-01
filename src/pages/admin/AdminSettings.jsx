// ADIM — Configurações: planos, webhook, alertas, IA e sistema
import { useState } from 'react'
import {
  IconDeviceFloppy, IconWebhook, IconBell,
  IconAlertCircle, IconCheck, IconEye, IconEyeOff,
} from '@tabler/icons-react'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Toggle from '../../components/ui/Toggle'
import { PLAN_LIMITS } from '../../utils/planLimits'
import { adminSystemConfig } from '../../mock/adminData'

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

export default function AdminSettings() {
  const [plans, setPlans] = useState([
    { ...PLAN_LIMITS.basic },
    { ...PLAN_LIMITS.pro },
    { ...PLAN_LIMITS.advanced },
  ])
  const [plansSaved, setPlansSaved] = useState(false)
  const updatePlan = (id, field, value) =>
    setPlans(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
  const savePlans = () => { setPlansSaved(true); setTimeout(() => setPlansSaved(false), 2500) }

  const [webhook, setWebhook] = useState({ url: '', secret: '', active: false, status: 'not_configured' })
  const [showSecret, setShowSecret] = useState(false)
  const [testingWH, setTestingWH] = useState(false)
  const [webhookSaved, setWebhookSaved] = useState(false)
  const testWebhook = async () => {
    if (!webhook.url) return
    setTestingWH(true)
    await new Promise(r => setTimeout(r, 1500))
    setWebhook(p => ({ ...p, status: 'connected' }))
    setTestingWH(false)
  }

  const [alerts, setAlerts] = useState({ expiring3days: true, limit90pct: true, alertEmail: '' })
  const [systemConfig, setSystemConfig] = useState(adminSystemConfig)
  const [aiSaved, setAiSaved] = useState(false)

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
          <Button icon={webhookSaved ? IconCheck : IconDeviceFloppy} onClick={() => { setWebhookSaved(true); setTimeout(() => setWebhookSaved(false), 2500) }} disabled={!webhook.url}>
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
        <Button icon={IconBell}>Salvar alertas</Button>
      </Section>

      {/* IA GLOBAL */}
      <Section title="Inteligência Artificial Global" description="Chave utilizada pelos Agentes IA e Insights de todos os usuários.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Google Gemini API Key" name="geminiApiKey" type="password" placeholder="AIza…"
            value={systemConfig.geminiApiKey || ''} onChange={(e) => setSystemConfig(p => ({ ...p, geminiApiKey: e.target.value }))} />
          <Input label="Modelo padrão" name="geminiModel" placeholder="gemini-2.0-flash"
            value={systemConfig.geminiModel || ''} onChange={(e) => setSystemConfig(p => ({ ...p, geminiModel: e.target.value }))} />
        </div>
        <Button icon={aiSaved ? IconCheck : IconDeviceFloppy} onClick={() => { setAiSaved(true); setTimeout(() => setAiSaved(false), 2500) }}>
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
        <Button icon={IconDeviceFloppy}>Salvar sistema</Button>
      </Section>
    </div>
  )
}
