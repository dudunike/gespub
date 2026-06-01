import { useState, useEffect } from 'react'
import {
  IconBrandFacebook, IconUnlink, IconExternalLink,
  IconCheck, IconAlertCircle, IconLoader2,
} from '@tabler/icons-react'
import Button from '../../components/ui/Button'
import { useMeta } from '../../context/MetaContext'
import { getAdAccounts } from '../../lib/metaApi'
import { formatDateTime } from '../../utils/formatters'

export default function Connections() {
  const {
    isConnected, connection, loadingConnection,
    error, setError, startConnectRedirect, saveConnection, disconnect,
  } = useMeta()

  const [step, setStep]                       = useState('idle')
  const [availableAccounts, setAvailableAccounts] = useState([])
  const [pendingToken, setPendingToken]       = useState(null)
  const [localError, setLocalError]           = useState(null)
  const [saving, setSaving]                   = useState(false)
  const [disconnecting, setDisconnecting]     = useState(false)
  const [processingReturn, setProcessingReturn] = useState(false)

  // Detecta retorno do Facebook OAuth (token está no hash da URL)
  useEffect(() => {
    if (isConnected) return

    const hash = window.location.hash
    if (!hash || !hash.includes('access_token')) return

    const params = new URLSearchParams(hash.slice(1))
    const token  = params.get('access_token')
    const errCode = params.get('error')

    // Limpa o hash da URL (não fica exposto no histórico)
    window.history.replaceState(null, '', window.location.pathname)

    if (errCode) {
      setLocalError('Autorização negada no Facebook. Tente novamente e aceite as permissões.')
      return
    }

    if (!token) return

    setProcessingReturn(true)
    getAdAccounts(token)
      .then((accounts) => {
        if (!accounts.length) {
          setLocalError('Nenhuma conta de anúncios encontrada neste perfil.')
          return
        }
        if (accounts.length === 1) {
          return saveConnection(token, accounts[0])
        }
        setPendingToken(token)
        setAvailableAccounts(accounts)
        setStep('selecting')
      })
      .catch((err) => setLocalError(err.message))
      .finally(() => setProcessingReturn(false))
  }, [isConnected, saveConnection])

  const handleSelectAccount = async (account) => {
    setSaving(true)
    setLocalError(null)
    try {
      await saveConnection(pendingToken, account)
      setStep('idle')
      setAvailableAccounts([])
      setPendingToken(null)
    } catch (err) {
      setLocalError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDisconnect = async () => {
    setDisconnecting(true)
    setLocalError(null)
    if (setError) setError(null)
    await disconnect()
    setDisconnecting(false)
  }

  const displayError = localError || error

  if (loadingConnection || processingReturn) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3">
        <div className="w-6 h-6 border-2 border-border border-t-brand-500 rounded-full animate-spin" />
        {processingReturn && (
          <p className="text-sm text-txt-secondary">Conectando sua conta Meta Ads…</p>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">

      {/* Card Meta Ads */}
      <div className="bg-white border border-border rounded-card p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-[#1877F2]/10 rounded-card flex items-center justify-center shrink-0">
            <IconBrandFacebook size={32} className="text-[#1877F2]" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-txt-primary">Meta Ads</h2>
            <p className="text-sm text-txt-secondary mt-1">
              Conecte seu Gerenciador de Anúncios do Facebook e Instagram para ver
              campanhas, métricas e fazer edições diretamente pela plataforma.
            </p>
          </div>
        </div>

        {/* Erro */}
        {displayError && (
          <div className="mt-4 flex items-start gap-2 px-3 py-2 bg-status-errorBg border border-status-error rounded-input">
            <IconAlertCircle size={16} className="text-status-error shrink-0 mt-0.5" />
            <p className="text-sm text-status-error">{displayError}</p>
          </div>
        )}

        {/* Não conectado — botão principal */}
        {!isConnected && step === 'idle' && (
          <div className="mt-5">
            <Button
              onClick={startConnectRedirect}
              icon={IconBrandFacebook}
            >
              Conectar com Facebook
            </Button>
            <p className="mt-2 text-xs text-txt-secondary">
              Você será redirecionado para o Facebook para autorizar o acesso.
              Permissões: <strong>ads_management</strong> e <strong>pages_read_engagement</strong>.
            </p>
          </div>
        )}

        {/* Seleção de conta */}
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

        {/* Conectado */}
        {isConnected && (
          <div className="mt-5 pt-5 border-t border-border space-y-3">
            <div className="flex items-center gap-2 text-status-success">
              <IconCheck size={16} />
              <span className="text-sm font-medium">Conta conectada</span>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <span className="text-txt-secondary">Conta</span>
              <span className="font-medium text-txt-primary">{connection.account_name}</span>
              <span className="text-txt-secondary">ID da conta</span>
              <span className="font-mono text-xs text-txt-primary">{connection.account_id}</span>
              <span className="text-txt-secondary">Moeda</span>
              <span className="text-txt-primary">{connection.currency}</span>
              <span className="text-txt-secondary">Conectado em</span>
              <span className="text-txt-primary">{formatDateTime(connection.connected_at)}</span>
            </div>
            <div className="pt-2 flex flex-wrap gap-2">
              <Button
                variant="secondary" size="sm" icon={IconUnlink}
                onClick={handleDisconnect} disabled={disconnecting}
              >
                {disconnecting ? 'Desconectando…' : 'Desconectar'}
              </Button>
              <a href="https://business.facebook.com/adsmanager" target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm" icon={IconExternalLink}>
                  Abrir Gerenciador de Anúncios
                </Button>
              </a>
            </div>
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
