// Conexões — OAuth Meta Ads com seleção de conta de anúncios
import { useState } from 'react'
import {
  IconBrandFacebook,
  IconUnlink,
  IconExternalLink,
  IconCheck,
  IconAlertCircle,
  IconInfoCircle,
} from '@tabler/icons-react'
import Button from '../../components/ui/Button'
import { useMeta } from '../../context/MetaContext'
import { formatDateTime } from '../../utils/formatters'

const isPopupError = (msg) =>
  msg && (msg.toLowerCase().includes('popup') || msg.toLowerCase().includes('bloqueado') || msg.toLowerCase().includes('não respondeu'))

export default function Connections() {
  const {
    isConnected, connection, loadingConnection,
    connecting, error, startConnect, saveConnection, disconnect,
  } = useMeta()

  const [step, setStep] = useState('idle')
  const [availableAccounts, setAvailableAccounts] = useState([])
  const [pendingToken, setPendingToken] = useState(null)
  const [localError, setLocalError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  const displayError = localError || error

  const handleConnect = async () => {
    setLocalError(null)
    try {
      const { accessToken, accounts } = await startConnect()
      if (accounts.length === 0) {
        setLocalError('Nenhuma conta de anúncios encontrada neste perfil do Facebook.')
        return
      }
      if (accounts.length === 1) {
        setSaving(true)
        await saveConnection(accessToken, accounts[0])
        setSaving(false)
        setStep('idle')
      } else {
        setPendingToken(accessToken)
        setAvailableAccounts(accounts)
        setStep('selecting')
      }
    } catch (err) {
      setLocalError(err.message)
    }
  }

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
    await disconnect()
    setDisconnecting(false)
  }

  if (loadingConnection) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-border border-t-brand-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">

      {/* Aviso: como funciona */}
      {!isConnected && (
        <div className="flex items-start gap-3 p-4 bg-brand-50 border border-brand-100 rounded-card">
          <IconInfoCircle size={18} className="text-brand-500 shrink-0 mt-0.5" />
          <div className="text-xs text-txt-secondary space-y-1">
            <p className="font-medium text-txt-primary text-sm">Como conectar</p>
            <p>1. Clique em <strong>Conectar Meta Ads</strong> — um popup do Facebook vai abrir.</p>
            <p>2. Se o popup <strong>não abrir</strong>, clique no ícone de popup bloqueado na barra de endereço e permita para <strong>gespub.online</strong>.</p>
            <p>3. Autorize as permissões e selecione a conta de anúncios.</p>
          </div>
        </div>
      )}

      {/* Card Meta Ads */}
      <div className="bg-white border border-border rounded-card p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-[#1877F2]/10 rounded-card flex items-center justify-center shrink-0">
            <IconBrandFacebook size={32} className="text-[#1877F2]" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-txt-primary">Meta Ads</h2>
            <p className="text-sm text-txt-secondary mt-1">
              Conecte seu Gerenciador de Anúncios do Facebook/Instagram para ver campanhas reais,
              métricas e fazer edições diretamente pela plataforma.
            </p>
          </div>
        </div>

        {/* Erro */}
        {displayError && (
          <div className="mt-4 space-y-2">
            <div className="flex items-start gap-2 px-3 py-2 bg-status-errorBg border border-status-error rounded-input">
              <IconAlertCircle size={16} className="text-status-error shrink-0 mt-0.5" />
              <p className="text-sm text-status-error">{displayError}</p>
            </div>

            {/* Instrução extra se for erro de popup */}
            {isPopupError(displayError) && (
              <div className="px-3 py-2 bg-status-warningBg border border-status-warning rounded-input text-xs text-txt-secondary">
                <strong className="text-txt-primary">Para permitir popups no Chrome:</strong>{' '}
                clique no ícone <strong>🚫</strong> ou <strong>⊕</strong> na barra de endereço → &quot;Sempre permitir popups de gespub.online&quot; → OK.
                Depois clique em Conectar novamente.
              </div>
            )}
          </div>
        )}

        {/* Estado: não conectado */}
        {!isConnected && step === 'idle' && (
          <div className="mt-5">
            <Button
              onClick={handleConnect}
              disabled={connecting || saving}
              icon={IconBrandFacebook}
            >
              {connecting ? 'Abrindo popup…' : saving ? 'Salvando…' : 'Conectar Meta Ads'}
            </Button>
            <p className="mt-2 text-xs text-txt-secondary">
              Permissões necessárias: <strong>ads_management</strong> e <strong>pages_read_engagement</strong>
            </p>
          </div>
        )}

        {/* Estado: selecionando conta */}
        {step === 'selecting' && (
          <div className="mt-5 space-y-3">
            <p className="text-sm font-medium text-txt-primary">Selecione a conta de anúncios:</p>
            {availableAccounts.map((acc) => (
              <button
                key={acc.id}
                onClick={() => handleSelectAccount(acc)}
                disabled={saving}
                className="w-full flex items-center gap-3 p-3 border border-border rounded-card hover:border-brand-500 hover:bg-brand-50 transition-all text-left"
              >
                <div className="w-8 h-8 bg-[#1877F2]/10 rounded-input flex items-center justify-center shrink-0">
                  <IconBrandFacebook size={18} className="text-[#1877F2]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-txt-primary truncate">{acc.name}</p>
                  <p className="text-xs text-txt-secondary font-mono">{acc.account_id}</p>
                </div>
                <span className="text-xs text-txt-secondary shrink-0">{acc.currency}</span>
              </button>
            ))}
            {saving && (
              <p className="text-xs text-txt-secondary flex items-center gap-1.5">
                <span className="w-3 h-3 border border-brand-500 border-t-transparent rounded-full animate-spin inline-block" />
                Salvando conexão…
              </p>
            )}
          </div>
        )}

        {/* Estado: conectado */}
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
                variant="secondary"
                size="sm"
                icon={IconUnlink}
                onClick={handleDisconnect}
                disabled={disconnecting}
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
