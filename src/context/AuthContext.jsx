// Contexto de autenticação — Supabase
import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

// Monta perfil básico a partir do usuário do Supabase Auth quando profiles falha
function buildProfileFromSession(authUser) {
  return {
    id: authUser.id,
    email: authUser.email,
    name: authUser.user_metadata?.name || authUser.user_metadata?.full_name || authUser.email,
    role: authUser.user_metadata?.role || 'user',
    plan: authUser.user_metadata?.plan || 'pro',
    status: 'active',
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId, email) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.warn('Perfil não encontrado na tabela profiles:', error.message)
        return null
      }
      return { ...data, email }
    } catch (e) {
      console.warn('Erro ao buscar perfil:', e)
      return null
    }
  }

  useEffect(() => {
    let isMounted = true

    // Garante que loading seja removido mesmo se Supabase não responder
    const fallbackTimer = setTimeout(() => {
      if (isMounted) setLoading(false)
    }, 5000)

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user && isMounted) {
          // Tenta perfil na tabela profiles; cai para dados do auth se não existir
          const profile =
            (await fetchProfile(session.user.id, session.user.email)) ||
            buildProfileFromSession(session.user)

          if (isMounted) {
            if (profile.status === 'blocked') {
              await supabase.auth.signOut()
              setUser(null)
              setIsAuthenticated(false)
            } else {
              setUser(profile)
              setIsAuthenticated(true)
            }
          }
        }
      } catch (err) {
        console.error('Erro na inicialização da auth:', err)
      } finally {
        clearTimeout(fallbackTimer)
        if (isMounted) setLoading(false)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile =
          (await fetchProfile(session.user.id, session.user.email)) ||
          buildProfileFromSession(session.user)

        if (isMounted) {
          if (profile.status === 'blocked') {
            await supabase.auth.signOut()
            setUser(null)
            setIsAuthenticated(false)
          } else {
            setUser(profile)
            setIsAuthenticated(true)
          }
        }
      } else if (isMounted) {
        setUser(null)
        setIsAuthenticated(false)
      }
      clearTimeout(fallbackTimer)
      if (isMounted) setLoading(false)
    })

    return () => {
      isMounted = false
      clearTimeout(fallbackTimer)
      subscription.unsubscribe()
    }
  }, [])

  // Login com Supabase Auth
  const login = useCallback(async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        // Traduz os códigos de erro mais comuns do Supabase
        if (error.code === 'invalid_credentials' || error.status === 400) {
          return { success: false, error: 'E-mail ou senha incorretos.' }
        }
        if (error.code === 'email_not_confirmed') {
          return { success: false, error: 'Confirme seu e-mail antes de entrar.' }
        }
        return { success: false, error: error.message }
      }

      // Tenta perfil na tabela profiles; cai para dados do auth se não existir
      const profile =
        (await fetchProfile(data.user.id, data.user.email)) ||
        buildProfileFromSession(data.user)

      if (profile.status === 'blocked') {
        await supabase.auth.signOut()
        return { success: false, error: 'Conta bloqueada. Entre em contato com o suporte.' }
      }

      setUser(profile)
      setIsAuthenticated(true)
      return { success: true, user: profile }
    } catch (err) {
      return { success: false, error: err.message || 'Erro ao conectar com o servidor.' }
    }
  }, [])

  // Enviar e-mail de redefinição de senha
  const resetPassword = useCallback(async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`,
      })
      if (error) return { success: false, error: error.message }
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }, [])

  // Cadastro de novo usuário
  const signup = useCallback(async (name, email, password) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      })
      if (error) {
        if (error.code === 'user_already_exists') return { success: false, error: 'E-mail já cadastrado.' }
        return { success: false, error: error.message }
      }
      // Cria perfil básico
      if (data.user) {
        await supabase.from('profiles').upsert({
          id:   data.user.id,
          name,
          role: 'user',
          plan: 'starter',
          status: 'active',
        })
      }
      return { success: true, needsConfirmation: !data.session }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setIsAuthenticated(false)
  }, [])

  // Faz upload da foto e atualiza perfil
  const updateAvatar = useCallback(async (file) => {
    if (!user) return { success: false, error: 'Não autenticado' }

    const ext = file.name.split('.').pop()
    const path = `${user.id}.${ext}`

    const { error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (uploadErr) return { success: false, error: uploadErr.message }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id)

    if (updateErr) return { success: false, error: updateErr.message }

    setUser((prev) => ({ ...prev, avatar_url: publicUrl }))
    return { success: true, url: publicUrl }
  }, [user])

  const isAdmin = user?.role === 'admin'

  const value = { user, isAuthenticated, isAdmin, login, signup, logout, loading, resetPassword, updateAvatar }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#F4F4F6',
        flexDirection: 'column',
        gap: '12px',
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          border: '3px solid #E4E4E7',
          borderTopColor: '#7C3AED',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: '#71717A', fontSize: '14px', fontFamily: 'Inter, system-ui, sans-serif' }}>
          Carregando...
        </p>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}
