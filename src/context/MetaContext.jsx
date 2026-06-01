// Contexto de conexão Meta Ads — gerencia token, conta e estado de conexão
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { fbLogin, fbLogout, META_APP_ID } from '../lib/metaSDK'
import { getAdAccounts, checkTokenValid } from '../lib/metaApi'
import { useAuth } from './AuthContext'

const MetaContext = createContext(null)

export function MetaProvider({ children }) {
  const { user } = useAuth()
  const [connection, setConnection] = useState(null)
  const [loadingConnection, setLoadingConnection] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState(null)

  // Carrega conexão salva no Supabase e valida token
  useEffect(() => {
    if (!user) {
      setConnection(null)
      setLoadingConnection(false)
      return
    }

    let active = true

    async function loadConnection() {
      const { data } = await supabase
        .from('meta_connections')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!active) return

      if (!data) {
        setConnection(null)
        setLoadingConnection(false)
        return
      }

      // Verifica se o token ainda é válido antes de expor
      const isValid = await checkTokenValid(data.access_token)
      if (!active) return

      if (!isValid) {
        // Token expirado — remove do banco e pede reconexão
        await supabase.from('meta_connections').delete().eq('user_id', user.id)
        setConnection(null)
        setError('Sua conexão com a Meta expirou. Reconecte sua conta.')
      } else {
        setConnection(data)
      }
      setLoadingConnection(false)
    }

    loadConnection().catch(() => {
      if (active) setLoadingConnection(false)
    })

    return () => { active = false }
  }, [user])

  // Fluxo redirect OAuth — redireciona para o Facebook e volta com token na URL
  const startConnectRedirect = useCallback(() => {
    const params = new URLSearchParams({
      client_id:    META_APP_ID,
      redirect_uri: `${window.location.origin}/conexoes`,
      scope:        'ads_management,pages_read_engagement',
      response_type: 'token',
    })
    window.location.href = `https://www.facebook.com/dialog/oauth?${params}`
  }, [])

  // Passo 1 (popup, legado): OAuth → retorna token e lista de contas disponíveis
  const startConnect = useCallback(async () => {
    setError(null)
    setConnecting(true)
    try {
      const auth = await fbLogin()
      const accounts = await getAdAccounts(auth.accessToken)
      return { accessToken: auth.accessToken, accounts }
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setConnecting(false)
    }
  }, [])

  // Passo 2: Salva a conta selecionada no Supabase
  const saveConnection = useCallback(async (accessToken, account) => {
    if (!user) throw new Error('Usuário não autenticado')
    setError(null)

    const payload = {
      user_id: user.id,
      access_token: accessToken,
      account_id: account.id,          // ex: "act_123456"
      account_name: account.name,
      currency: account.currency || 'BRL',
      connected_at: new Date().toISOString(),
    }

    const { data, error: dbErr } = await supabase
      .from('meta_connections')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single()

    if (dbErr) throw new Error(dbErr.message)
    setConnection(data)
    return data
  }, [user])

  // Desconectar conta Meta
  const disconnect = useCallback(async () => {
    if (!user) return
    try {
      await supabase.from('meta_connections').delete().eq('user_id', user.id)
      await fbLogout()
    } catch (e) {
      console.warn('Erro ao desconectar Meta:', e)
    } finally {
      setConnection(null)
    }
  }, [user])

  const value = {
    isConnected: !!connection,
    connection,
    accessToken: connection?.access_token || null,
    accountId: connection?.account_id || null,
    accountName: connection?.account_name || null,
    currency: connection?.currency || 'BRL',
    loadingConnection,
    connecting,
    error,
    setError,
    startConnect,
    startConnectRedirect,
    saveConnection,
    disconnect,
  }

  return <MetaContext.Provider value={value}>{children}</MetaContext.Provider>
}

export function useMeta() {
  const ctx = useContext(MetaContext)
  if (!ctx) throw new Error('useMeta deve ser usado dentro de MetaProvider')
  return ctx
}
