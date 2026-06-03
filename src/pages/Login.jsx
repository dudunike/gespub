import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

export default function Login() {
  const navigate = useNavigate()
  const { login, resetPassword, isAuthenticated } = useAuth()

  const [showReset, setShowReset] = useState(false)
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [error, setError]         = useState('')
  const [info, setInfo]           = useState('')
  const [loading, setLoading]     = useState(false)

  // Redireciona se já estiver autenticado (ex: voltou para a página de login)
  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true })
  }, [isAuthenticated, navigate])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(''); setInfo('')
    if (!email || !password) { setError('Preencha todos os campos.'); return }
    setLoading(true)
    const timeoutId = setTimeout(() => {
      setLoading(false)
      setError('Tempo limite atingido. Verifique sua conexão e tente novamente.')
    }, 12000)
    try {
      const result = await login(email, password)
      clearTimeout(timeoutId)
      if (result.success) {
        navigate('/dashboard', { replace: true })
      } else {
        setError(result.error || 'Erro ao entrar. Tente novamente.')
      }
    } catch {
      clearTimeout(timeoutId)
      setError('Erro ao conectar com o servidor. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    setError(''); setInfo('')
    if (!email) { setError('Informe seu e-mail.'); return }
    setLoading(true)
    const result = await resetPassword(email)
    setLoading(false)
    if (result.success) {
      setInfo('Link enviado! Verifique sua caixa de entrada.')
      setShowReset(false)
    } else { setError(result.error) }
  }

  return (
    <div className="min-h-screen bg-surface-bg flex flex-col items-center justify-center px-4">
      <div className="flex items-center gap-3 mb-2">
        <img src="/favicon.svg" alt="GesPub.ai" className="w-12 h-12 rounded-xl" />
        <span className="text-2xl font-bold text-txt-primary">
          GesPub<span className="text-brand-500">.ai</span>
        </span>
      </div>
      <p className="text-sm text-txt-secondary mb-8">Gestão inteligente de anúncios</p>

      <div className="w-full max-w-sm bg-white border border-border rounded-card p-8">
        {!showReset ? (
          <>
            <h1 className="text-base font-semibold text-txt-primary mb-5">Entrar na plataforma</h1>
            <form onSubmit={handleLogin} className="space-y-4">
              {error && <p className="px-3 py-2 text-sm text-status-error bg-status-errorBg rounded-input">{error}</p>}
              {info  && <p className="px-3 py-2 text-sm text-status-success bg-status-successBg rounded-input">{info}</p>}
              <Input label="E-mail" type="email" autoComplete="email" placeholder="seu@email.com"
                value={email} onChange={e => setEmail(e.target.value)} required />
              <Input label="Senha" type="password" autoComplete="current-password" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} required />
              <Button type="submit" fullWidth disabled={loading}>
                {loading ? 'Entrando…' : 'Entrar'}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <button onClick={() => { setShowReset(true); setError(''); setInfo('') }}
                className="text-sm text-brand-500 hover:text-brand-700 transition-colors">
                Esqueci minha senha
              </button>
            </div>
            <p className="mt-6 text-center text-xs text-txt-secondary">
              Acesso restrito — disponível mediante assinatura
            </p>
          </>
        ) : (
          <>
            <h1 className="text-base font-semibold text-txt-primary mb-1">Redefinir senha</h1>
            <p className="text-sm text-txt-secondary mb-5">Enviaremos um link de redefinição para seu e-mail.</p>
            <form onSubmit={handleReset} className="space-y-4">
              {error && <p className="px-3 py-2 text-sm text-status-error bg-status-errorBg rounded-input">{error}</p>}
              <Input label="E-mail" type="email" autoComplete="email" placeholder="seu@email.com"
                value={email} onChange={e => setEmail(e.target.value)} required />
              <Button type="submit" fullWidth disabled={loading}>
                {loading ? 'Enviando…' : 'Enviar link'}
              </Button>
              <button type="button" onClick={() => { setShowReset(false); setError('') }}
                className="w-full text-sm text-txt-secondary hover:text-txt-primary transition-colors text-center">
                Voltar ao login
              </button>
            </form>
          </>
        )}
      </div>

      <div className="mt-6 flex items-center gap-4 text-xs text-txt-secondary">
        <Link to="/politica-de-privacidade" className="hover:text-brand-500 transition-colors">Política de Privacidade</Link>
        <span>·</span>
        <Link to="/termos-de-uso" className="hover:text-brand-500 transition-colors">Termos de Uso</Link>
      </div>
      <p className="mt-3 text-xs text-txt-secondary">© {new Date().getFullYear()} GesPub.ai</p>
    </div>
  )
}
