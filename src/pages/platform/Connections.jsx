import { useState } from 'react'
import {
  IconBrandFacebook, IconUnlink, IconExternalLink,
  IconCheck, IconAlertCircle, IconKey, IconChevronDown,
} from '@tabler/icons-react'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { useMeta } from '../../context/MetaContext'
import { getAdAccounts } from '../../lib/metaApi'
import { formatDateTime } from '../../utils/formatters'

export default function Connections() {
  const {
    isConnected, connection, loadingConnection,
    connecting, error, startConnect, saveConnection, disconnect,
  } = useMeta()

  const [step, setStep]                     = useState('idle')
  const [availableAccounts, setAvailableAccounts] = useState([])
  const [pendingToken, setPendingToken]     = useState(null)
  const [localError, setLocalError]         = useState(null)
  const [saving, setSaving]                 = useState(false)
  const [disconnecting, setDisconnecting]   = useState(false)

  // Conexão manual via token
  const [showManual, setShowManual]         = useState(false)
  const [manualToken, setManualToken]       = useState('')
  const [manualLoading, setManualLoading]   = useState(false)

  const displayError = localError || error
  const isPopupErr   = displayError && (
    displayError.toLowerCase().includes('popup') ||
    displayError.toLowerCase().includes('bloqueado') ||
    displayError.toLowerCase().includes('respondeu')
  )

  /* ── Conexão via popup OAuth ── */
  const handleConnect = async () => {
    setLocalError(null)
    try {
      const { accessToken, accounts } = await startConnect()
      if (!accounts.length) {
        setLocalError('Nenhuma conta de anúncios encontrada neste perfil do Facebook.')
        return
      }
      if (accounts.length === 1) {
        setSaving(true)
        await saveConnection(accessToken, accounts[0])
        setSaving(false)
      } else {
        setPendingToken(accessToken)
        setAvailableAccounts(accounts)
        setStep('selecting')
      }
    } catch (err) {
      setLocalError(err.message)
    }
  }

  /* ── Conexão manual via token colado ── */
  const handleManualConnect = async () => {
    if (!manualToken.trim()) return
    setLocalError(null)
    setManualLoading(true)
    try {
      const accounts = await getAdAccounts(manualToken.trim())
      if (!accounts.length) {
        setLocalError('Nenhuma conta de anúncios encontrada com este token.')
        return
      }
      if (accounts.length === 1) {
        setSaving(true)
        await saveConnection(manualToken.trim(), accounts[0])
        setSaving(false)
        setManualToken('')
        setShowManual(false)
      } else {
        setPendingToken(manualToken.trim())
        setAvailableAccounts(accounts)
        setStep('selecting')
        setShowManual(false)
      }
    } catch (err) {
      setLocalError(err.message)
    } finally {
      setManualLoading(false)
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

      {/* Card Meta Ads */}
      <div className="bg-white border border-border rounded-card p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-[#1877F2]/10 rounded-card flex items-center justify-center shrink-0">
            <IconBrandFacebook size={32} className="text-[#1877F2]" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-txt-primary">Meta Ads</h2>
            <p className="text-sm text-txt-secondary mt-1">
              Conecte seu Gerenciador de Anúncios do Facebook/Instagram para ver
              campanhas reais, métricas e fazer edições diretamente pela plataforma.
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
            {isPopupErr && (
              <p className="text-xs text-txt-secondary px-1">
                Use a opção <strong>"Conectar com token"</strong> abaixo para conectar sem popup.
              </p>
            )}
          </div>
        )}

        {/* Não conectado */}
        {!isConnected && step === 'idle' && (
          <div className="mt-5 space-y-4">

            {/* Botão popup */}
            <div>
              <Button
                onClick={handleConnect}
                disabled={connecting || saving}
                icon={IconBrandFacebook}
              >
                {connecting ? 'Abrindo popup…' : saving ? 'Salvando…' : 'Conectar com Facebook'}
              </Button>
              <p className="mt-1.5 text-xs text-txt-secondary">
                Abre um popup do Facebook para autorizar o acesso.
              </p>
            </div>

            {/* Divisor */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-txt-secondary">ou</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Conexão via token */}
            <div className="border border-border rounded-card overflow-hidden">
              <button
                onClick={() => setShowManual((s) => !s)}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-txt-secondary hover:bg-surface-bg transition-colors"
              >
                <IconKey size={16} stroke={1.5} className="text-txt-secondary shrink-0" />
                <span className="flex-1 text-left font-medium text-txt-primary">
                  Conectar com token de acesso
                </span>
                <IconChevronDown
                  size={16}
                  className={`transition-transform shrink-0 ${showManual ? 'rotate-180' : ''}`}
                />
              </button>

              {showManual && (
                <div className="px-4 pb-4 space-y-3 border-t border-border">
                  <p className="text-xs text-txt-secondary mt-3">
                    Acesse{' '}
                    <a
                      href="https://developers.facebook.com/tools/explorer/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-500 hover:underline"
                    >
                      Graph API Explorer
                    </a>
                    , selecione seu app <strong>GesPub</strong>, clique em{' '}
                    <strong>Generate Access Token</strong> e cole abaixo.
                  </p>
                  <Input
                    label="Token de acesso do usuário"
                    placeholder="EAAi6fOws97EB..."
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                  />
                  <Button
                    onClick={handleManualConnect}
                    disabled={!manualToken.trim() || manualLoading || saving}
                    icon={IconKey}
                    fullWidth
                  >
                    {manualLoading ? 'Validando token…' : saving ? 'Salvando…' : 'Conectar com este token'}
                  </Button>
                </div>
              )}
            </div>

          </div>
        )}

        {/* Selecionando conta */}
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
              <Button variant="secondary" size="sm" icon={IconUnlink} onClick={handleDisconnect} disabled={disconnecting}>
                {disconnecting ? 'Desconectando…' : 'Desconectar'}
              </Button>
              <a href="https://business.facebook.com/adsmanager" target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm" icon={IconExternalLink}>Abrir Gerenciador</Button>
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
