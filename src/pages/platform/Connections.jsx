import { useState, useEffect } from 'react'
import {
  IconBrandFacebook, IconExternalLink,
  IconCheck, IconAlertCircle, IconLoader2, IconRefresh,
  IconStar, IconTrash, IconPlus, IconArrowsExchange,
  IconShieldCheck, IconCrown, IconActivity
} from '@tabler/icons-react'
import Button from '../../components/ui/Button'
import { useMeta } from '../../context/MetaContext'
import { useAuth } from '../../context/AuthContext'
import { getAdAccounts } from '../../lib/metaApi'
import { formatDateTime } from '../../utils/formatters'
import { PLAN_BADGE_VARIANT } from '../../utils/planLimits'

const PLAN_LABELS = { basic: 'Básico', pro: 'Pro', advanced: 'Avançado', enterprise: 'Enterprise', starter: 'Starter' }

function PlanBadge({ plan, used, limit, isAdmin }) {
  const isUnlimited = limit >= 999 || isAdmin
  const variant = PLAN_BADGE_VARIANT[plan] || 'default'
  const colors = {
    default: 'bg-surface-bg text-txt-secondary border-border',
    brand:   'bg-brand-50 text-brand-600 border-brand-200',
    success: 'bg-status-successBg text-status-success border-status-success/30',
  }
  const cls = colors[variant] || colors.default
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cls}`}>
      {isAdmin ? <IconShieldCheck size={12} /> : isUnlimited ? <IconCrown size={12} /> : null}
      {isAdmin
        ? 'Admin — Ilimitado'
        : `${PLAN_LABELS[plan] || plan} • ${used}/${isUnlimited ? '∞' : limit} conta${limit !== 1 ? 's' : ''}`
      }
    </span>
  )
}

function AccountCard({ conn, isActive, onSwitch, onRemove, switching, removing }) {
  const adManagerUrl = `https://business.facebook.com/adsmanager/manage/campaigns?act=${conn.account_id?.replace('act_', '')}`
  return (
    <div className={`rounded-card border p-4 transition-all ${
      isActive
        ? 'bg-white border-brand-300 shadow-sm ring-1 ring-brand-200'
        : 'bg-white border-border hover:border-brand-200'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-card flex items-center justify-center shrink-0 ${
          isActive ? 'bg-[#1877F2]/15' : 'bg-[#1877F2]/10'
        }`}>
          <IconBrandFacebook size={22} className="text-[#1877F2]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-txt-primary truncate">{conn.account_name}</p>
            {isActive && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-status-successBg text-status-success text-xs font-medium rounded-full">
                <IconCheck size={11} />
                Ativa
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-txt-secondary">
            <span className="font-mono">{conn.account_id}</span>
            <span>•</span>
            <span>{conn.currency}</span>
          </div>
          <p className="text-xs text-txt-secondary mt-0.5">
            Conectado em {formatDateTime(conn.connected_at)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
        {!isActive && (
          <Button
            size="sm"
            variant="secondary"
            icon={switching ? IconLoader2 : IconStar}
            onClick={() => onSwitch(conn.id)}
            disabled={switching || removing}
          >
            {switching ? 'Ativando…' : 'Usar esta conta'}
          </Button>
        )}
        <a href={adManagerUrl} target="_blank" rel="noopener noreferrer" className="inline-flex">
          <Button size="sm" variant="ghost" icon={IconExternalLink}>
            Gerenciador
          </Button>
        </a>
        <button
          onClick={() => onRemove(conn.id)}
          disabled={switching || removing}
          className="ml-auto p-1.5 rounded-input text-txt-secondary hover:text-status-error hover:bg-status-errorBg transition-all disabled:opacity-40"
          title="Remover conta"
        >
          {removing
            ? <IconLoader2 size={15} className="animate-spin" />
            : <IconTrash size={15} />
          }
        </button>
      </div>
    </div>
  )
}

export default function Connections() {
  const { user, isAdmin } = useAuth()
  const {
    isConnected, connections, connection, loadingConnection,
    error, setError,
    canAddAccount, accountsLimit, accountsUsed,
    startConnectRedirect, saveConnection, switchConnection,
    removeConnection, replaceActive,
  } = useMeta()

  const [step, setStep]                           = useState('idle')
  const [availableAccounts, setAvailableAccounts] = useState([])
  const [pendingToken, setPendingToken]           = useState(null)
  const [localError, setLocalError]               = useState(null)
  const [saving, setSaving]                       = useState(false)
  const [processingReturn, setProcessingReturn]   = useState(() => {
    const sp = new URLSearchParams(window.location.search)
    return !!(sp.get('code') || sp.get('selecting'))
  })
  const [switchingId, setSwitchingId]             = useState(null)
  const [removingId, setRemovingId]               = useState(null)
  const [testingApi, setTestingApi]               = useState(false)
  const [testResult, setTestResult]               = useState(null)

  const plan       = user?.plan || 'basic'
  const isUnlimited = accountsLimit >= 999 || isAdmin

  // Detecta retorno do Facebook OAuth
  useEffect(() => {
    if (loadingConnection) return
    const searchParams = new URLSearchParams(window.location.search)
    const connected   = searchParams.get('connected')
    const errCode     = searchParams.get('error')
    const code        = searchParams.get('code')
    const state       = searchParams.get('state')
    const selecting   = searchParams.get('selecting')

    // Facebook retornou o code — encaminha para o handler server-side
    if (code && state) {
      setProcessingReturn(true)
      const qs = new URLSearchParams({ code, state }).toString()
      window.location.replace(`/api/meta-callback?${qs}`)
      return
    }

    // Server salvou PENDING e redirecionou aqui — busca contas disponíveis
    // Aguarda user estar disponível antes de limpar a URL e chamar a API
    if (selecting) {
      if (!user) return
      window.history.replaceState(null, '', window.location.pathname)
      setProcessingReturn(true)
      getAdAccounts()
        .then(accs => {
          if (!accs.length) {
            setLocalError('Nenhuma conta de anúncios encontrada no Facebook.')
            return
          }
          setAvailableAccounts(accs)
          setStep('selecting')
        })
        .catch(err => setLocalError(err.message))
        .finally(() => setProcessingReturn(false))
      return
    }

    if (connected || errCode || window.location.hash.includes('access_token')) {
      window.history.replaceState(null, '', window.location.pathname)
    }
    if (errCode) setLocalError(errCode)
  }, [loadingConnection, user])

  const handleAddAccount = async () => {
    if (connections.length === 0) return startConnectRedirect()
    setSaving(true); setLocalError(null)
    try {
      const accounts = await getAdAccounts()
      if (!accounts.length) { setLocalError('Nenhuma conta de anúncios encontrada.'); return }
      setAvailableAccounts(accounts)
      setStep('selecting')
    } catch (err) {
      setLocalError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSelectAccount = async (account) => {
    setSaving(true); setLocalError(null)
    try {
      await saveConnection(account)
      setStep('idle'); setAvailableAccounts([])
    } catch (err) {
      setLocalError(err.message)
    } finally { setSaving(false) }
  }

  const handleSwitch = async (id) => {
    setSwitchingId(id); setLocalError(null)
    try { await switchConnection(id) }
    catch (err) { setLocalError(err.message) }
    finally { setSwitchingId(null) }
  }

  const handleRemove = async (id) => {
    setRemovingId(id); setLocalError(null)
    if (setError) setError(null)
    try { await removeConnection(id) }
    catch (err) { setLocalError(err.message) }
    finally { setRemovingId(null) }
  }

  const handleTestApi = async () => {
    if (!connection?.account_id) return
    setTestingApi(true)
    setTestResult(null)
    try {
      const { getCampaigns, getPageFollowers } = await import('../../lib/metaApi')
      const campaigns = await getCampaigns(connection.account_id)
      const pages = await getPageFollowers()
      setTestResult({
        success: true,
        message: `Teste concluído com sucesso!\n• ads_management: ${campaigns.length} campanhas lidas.\n• pages_read_engagement: Seguidores FB (${pages.fbFollowers}), IG (${pages.igFollowers}).`
      })
    } catch (err) {
      setTestResult({ success: false, message: `Erro no teste da API: ${err.message}` })
    } finally {
      setTestingApi(false)
    }
  }

  const displayError = localError || error

  if (loadingConnection || processingReturn) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3">
        <div className="w-6 h-6 border-2 border-border border-t-brand-500 rounded-full animate-spin" />
        {processingReturn && <p className="text-sm text-txt-secondary">Conectando sua conta Meta Ads…</p>}
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">

      {/* Card Meta Ads */}
      <div className="bg-white border border-border rounded-card p-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-[#1877F2]/10 rounded-card flex items-center justify-center shrink-0">
              <IconBrandFacebook size={32} className="text-[#1877F2]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-txt-primary">Meta Ads</h2>
              <p className="text-sm text-txt-secondary mt-1">
                Conecte seu Gerenciador de Anúncios do Facebook e Instagram para ver
                campanhas, métricas e fazer edições diretamente pela plataforma.
              </p>
            </div>
          </div>
          {/* Badge plano */}
          <div className="shrink-0">
            <PlanBadge plan={plan} used={accountsUsed} limit={accountsLimit} isAdmin={isAdmin} />
          </div>
        </div>

        {/* Erro */}
        {displayError && (
          <div className="mt-4 flex items-start gap-2 px-3 py-2 bg-status-errorBg border border-status-error rounded-input">
            <IconAlertCircle size={16} className="text-status-error shrink-0 mt-0.5" />
            <p className="text-sm text-status-error">{displayError}</p>
          </div>
        )}

        {/* Não conectado */}
        {!isConnected && step === 'idle' && (
          <div className="mt-5">
            <Button onClick={startConnectRedirect} icon={IconBrandFacebook}>
              Conectar com Facebook
            </Button>
            <p className="mt-2 text-xs text-txt-secondary">
              Você será redirecionado para o Facebook para autorizar o acesso.
              Permissões: <strong>ads_management</strong> e <strong>pages_read_engagement</strong>.
            </p>
          </div>
        )}

        {/* Picker de conta pós-OAuth */}
        {step === 'selecting' && (
          <div className="mt-5 space-y-3">
            <p className="text-sm font-medium text-txt-primary">Selecione a conta de anúncios:</p>
            {availableAccounts.map((acc) => (
              <button
                key={acc.id}
                onClick={() => handleSelectAccount(acc)}
                disabled={saving}
                className="w-full flex items-center gap-3 p-3 border border-border rounded-card hover:border-brand-500 hover:bg-brand-50 transition-all text-left disabled:opacity-60"
              >
                <div className="w-8 h-8 bg-[#1877F2]/10 rounded-input flex items-center justify-center shrink-0">
                  <IconBrandFacebook size={18} className="text-[#1877F2]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-txt-primary truncate">{acc.name}</p>
                  <p className="text-xs text-txt-secondary font-mono">{acc.account_id}</p>
                </div>
                <span className="text-xs text-txt-secondary shrink-0">{acc.currency}</span>
                {saving && <IconLoader2 size={16} className="animate-spin text-brand-500 shrink-0" />}
              </button>
            ))}
          </div>
        )}

        {/* Contas conectadas */}
        {connections.length > 0 && step === 'idle' && (
          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-txt-secondary uppercase tracking-wide">
                Contas conectadas
              </p>
              {!isUnlimited && (
                <span className={`text-xs font-medium ${
                  accountsUsed >= accountsLimit ? 'text-status-error' : 'text-txt-secondary'
                }`}>
                  {accountsUsed}/{accountsLimit} do plano
                </span>
              )}
            </div>

            {connections.map((conn) => (
              <AccountCard
                key={conn.id}
                conn={conn}
                isActive={conn.is_active || conn.id === connection?.id}
                onSwitch={handleSwitch}
                onRemove={handleRemove}
                switching={switchingId === conn.id}
                removing={removingId === conn.id}
              />
            ))}

            {/* Ações de conta */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {/* Pode adicionar mais */}
              {canAddAccount && (
                <Button variant="secondary" size="sm" icon={IconPlus} onClick={handleAddAccount}>
                  Adicionar conta Meta
                </Button>
              )}

              {/* Plano básico (1 conta) — trocar */}
              {!canAddAccount && accountsLimit === 1 && (
                <Button variant="secondary" size="sm" icon={IconArrowsExchange} onClick={replaceActive}>
                  Trocar conta
                </Button>
              )}

              {/* Plano multi-conta mas no limite */}
              {!canAddAccount && accountsLimit > 1 && (
                <p className="text-xs text-txt-secondary">
                  Limite de {accountsLimit} contas atingido.{' '}
                  <span className="text-brand-500 font-medium">Faça upgrade para adicionar mais.</span>
                </p>
              )}

              <Button
                variant="ghost"
                size="sm"
                icon={IconRefresh}
                onClick={startConnectRedirect}
                className="ml-auto"
              >
                Reconectar
              </Button>
            </div>

            {/* Bloco de Teste de API (App Review) */}
            {isConnected && connection && (
              <div className="mt-6 p-5 bg-[#F8FAFC] border border-border rounded-card">
                <div className="flex items-center gap-2 mb-2">
                  <IconActivity size={18} className="text-brand-500" />
                  <h3 className="text-sm font-semibold text-txt-primary">Validação da API (App Review)</h3>
                </div>
                <p className="text-xs text-txt-secondary mb-4">
                  Clique no botão abaixo para testar as permissões (ads_management e pages_read_engagement). Ideal para os revisores da Meta confirmarem a execução da API.
                </p>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={handleTestApi} 
                  disabled={testingApi} 
                  icon={testingApi ? IconLoader2 : IconCheck}
                >
                  {testingApi ? 'Executando...' : 'Testar Execução da API Meta'}
                </Button>
                
                {testResult && (
                  <div className={`mt-4 p-3 rounded-input text-xs whitespace-pre-wrap ${testResult.success ? 'bg-status-successBg text-status-success border border-status-success/30' : 'bg-status-errorBg text-status-error border border-status-error'}`}>
                    <div className="flex items-start gap-2">
                      {testResult.success ? <IconCheck size={16} className="shrink-0 mt-0.5" /> : <IconAlertCircle size={16} className="shrink-0 mt-0.5" />}
                      <span className="leading-relaxed">{testResult.message}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Em breve */}
      <div>
        <p className="text-xs font-medium text-txt-secondary uppercase tracking-wide mb-3">Em breve</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {['Google Ads', 'TikTok Ads'].map((name) => (
            <div key={name} className="bg-white border border-border rounded-card p-4 opacity-50">
              <p className="text-sm font-medium text-txt-primary">{name}</p>
              <p className="text-xs text-txt-secondary mt-0.5">Em desenvolvimento</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
