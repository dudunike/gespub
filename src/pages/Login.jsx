// Tela de Login — acesso apenas por convite via Admin
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconBrandFacebook } from '@tabler/icons-react'
import { useAuth } from '../context/AuthContext'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

export default function Login() {
  const navigate = useNavigate()
  const { login, resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [showReset, setShowReset] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')

    if (!email || !password) {
      setError('Preencha todos os campos.')
      return
    }

    setLoading(true)
    const result = await login(email, password)
    setLoading(false)

    if (result.success) {
      navigate('/dashboard')
    } else {
      setError(result.error)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')

    if (!email) {
      setError('Informe seu e-mail para redefinir a senha.')
      return
    }

    setLoading(true)
    const result = await resetPassword(email)
    setLoading(false)

    if (result.success) {
      setInfo('E-mail de redefinição enviado. Verifique sua caixa de entrada.')
      setShowReset(false)
    } else {
      setError(result.error)
    }
  }

  const handleFacebookLogin = () => {
    setError('Login com Facebook ainda não configurado. Use e-mail e senha.')
  }

  return (
    <div className="min-h-screen bg-surface-bg flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-2">
        <img src="/favicon.svg" alt="GesPub.ai" className="w-12 h-12 rounded-xl" />
        <span className="text-2xl font-bold text-txt-primary">
          GesPub<span className="text-brand-500">.ai</span>
        </span>
      </div>

      <p className="text-sm text-txt-secondary mb-8">
        Gestão inteligente de anúncios
      </p>

      <div className="w-full max-w-sm bg-white border border-border rounded-card p-8">
        {!showReset ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="px-3 py-2 text-sm text-status-error bg-status-errorBg rounded-input">
                {error}
              </div>
            )}
            {info && (
              <div className="px-3 py-2 text-sm text-status-success bg-status-successBg rounded-input">
                {info}
              </div>
            )}

            <Input
              label="E-mail"
              type="email"
              name="email"
              placeholder="seu@email.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Senha"
              type="password"
              name="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button type="submit" fullWidth disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <p className="text-sm text-txt-secondary">
              Informe seu e-mail e enviaremos um link para redefinir a senha.
            </p>
            {error && (
              <div className="px-3 py-2 text-sm text-status-error bg-status-errorBg rounded-input">
                {error}
              </div>
            )}

            <Input
              label="E-mail"
              type="email"
              name="email"
              placeholder="seu@email.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Button type="submit" fullWidth disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar link de redefinição'}
            </Button>

            <button
              type="button"
              onClick={() => { setShowReset(false); setError('') }}
              className="w-full text-sm text-txt-secondary hover:text-txt-primary transition-all duration-150 text-center"
            >
              Voltar ao login
            </button>
          </form>
        )}

        {!showReset && (
          <>
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-txt-secondary">ou</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <Button
              variant="facebook"
              fullWidth
              onClick={handleFacebookLogin}
              icon={IconBrandFacebook}
            >
              Continuar com Facebook
            </Button>

            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => { setShowReset(true); setError(''); setInfo('') }}
                className="text-sm text-brand-500 hover:text-brand-700 transition-all duration-150"
              >
                Esqueci minha senha
              </button>
            </div>
          </>
        )}
      </div>

      <p className="mt-8 text-xs text-txt-secondary">
        © 2025 GESPUB.AI
      </p>
    </div>
  )
}
