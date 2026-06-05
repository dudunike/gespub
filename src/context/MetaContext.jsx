// Contexto de conexão Meta Ads — suporte a múltiplas contas por plano
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { fbLogin, fbLogout, META_APP_ID } from '../lib/metaSDK'
import { getAdAccounts, checkTokenValid } from '../lib/metaApi'
import { useAuth } from './AuthContext'
import { getPlan } from '../utils/planLimits'

const MetaContext = createContext(null)

export function MetaProvider({ children }) {
  const { user } = useAuth()
  const [connections, setConnections] = useState([])
  const [loadingConnection, setLoadingConnection] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState(null)

  // Carrega todas as conexões do usuário
  useEffect(() => {
    if (!user) {
      setConnections([])
      setLoadingConnection(false)
      return
    }

    let active = true

    async function loadConnections() {
      const { data } = await supabase
        .from('meta_connections')
        .select('*')
        .eq('user_id', user.id)
        .order('connected_at', { ascending: false })

      if (!active) return

      if (!data || data.length === 0) {
        setConnections([])
        setLoadingConnection(false)
        return
      }

      // Garante que exatamente uma conexão está ativa
      const activeConn = data.find(c => c.is_active) || data[0]

      // Valida token da conexão ativa
      const isValid = await checkTokenValid(activeConn.access_token)
      if (!active) return

      if (!isValid) {
        await supabase.from('meta_connections').delete().eq('id', activeConn.id)
        const remaining = data.filter(c => c.id !== activeConn.id)
        if (remaining.length > 0) {
          await supabase.from('meta_connections')
            .update({ is_active: true })
            .eq('id', remaining[0].id)
          remaining[0] = { ...remaining[0], is_active: true }
          setConnections(remaining)
        } else {
          setConnections([])
          setError('Sua conexão com a Meta expirou. Reconecte sua conta.')
        }
      } else {
        if (!data.some(c => c.is_active)) {
          await supabase.from('meta_connections')
            .update({ is_active: true })
            .eq('id', data[0].id)
          data[0] = { ...data[0], is_active: true }
        }
        setConnections(data)
      }
      setLoadingConnection(false)
    }

    loadConnections().catch(() => {
      if (active) setLoadingConnection(false)
    })

    return () => { active = false }
  }, [user])

  // Conexão ativa (usada pelo dashboard, campanhas, anúncios, etc.)
  const activeConnection = connections.find(c => c.is_active) || connections[0] || null

  // Limites do plano — admin sempre tem máximo
  const planLimits = getPlan(user?.plan || 'basic')
  const accountsLimit = user?.role === 'admin' ? 999 : (planLimits.accounts || 1)
  const canAddAccount = connections.length < accountsLimit

  // Fluxo redirect OAuth
  const startConnectRedirect = useCallback(() => {
    const params = new URLSearchParams({
      client_id:     META_APP_ID,
      redirect_uri:  'https://gespub.online/conexoes',
      scope:         'ads_management,pages_show_list,pages_read_engagement',
      response_type: 'token',
    })
    window.location.href = `https://www.facebook.com/dialog/oauth?${params}`
  }, [])

  // Fluxo popup (legado)
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

  // Salva nova conexão (com verificação de limite do plano)
  const saveConnection = useCallback(async (accessToken, account) => {
    if (!user) throw new Error('Usuário não autenticado')
    setError(null)

    // Conta já conectada — apenas ativa
    const alreadyConnected = connections.find(c => c.account_id === account.id)
    if (alreadyConnected) {
      await supabase.from('meta_connections').update({ is_active: false }).eq('user_id', user.id)
      await supabase.from('meta_connections').update({ is_active: true }).eq('id', alreadyConnected.id)
      setConnections(prev => prev.map(c => ({ ...c, is_active: c.id === alreadyConnected.id })))
      return alreadyConnected
    }

    // Verifica limite do plano
    if (connections.length >= accountsLimit) {
      const lim = accountsLimit
      throw new Error(
        `Limite do plano ${planLimits.name}: máximo de ${lim} conta${lim > 1 ? 's' : ''} conectada${lim > 1 ? 's' : ''}. ` +
        `Faça upgrade para adicionar mais.`
      )
    }

    // Desativa todas antes de salvar a nova como ativa
    if (connections.length > 0) {
      await supabase.from('meta_connections').update({ is_active: false }).eq('user_id', user.id)
    }

    const payload = {
      user_id:      user.id,
      access_token: accessToken,
      account_id:   account.id,
      account_name: account.name,
      currency:     account.currency || 'BRL',
      connected_at: new Date().toISOString(),
      is_active:    true,
    }

    const { data, error: dbErr } = await supabase
      .from('meta_connections')
      .upsert(payload, { onConflict: 'user_id,account_id' })
      .select()
      .single()

    if (dbErr) throw new Error(dbErr.message)

    setConnections(prev => {
      const others = prev.map(c => ({ ...c, is_active: false })).filter(c => c.account_id !== account.id)
      return [data, ...others]
    })
    return data
  }, [user, connections, accountsLimit, planLimits])

  // Troca a conexão ativa
  const switchConnection = useCallback(async (connectionId) => {
    if (!user) return
    setError(null)
    await supabase.from('meta_connections').update({ is_active: false }).eq('user_id', user.id)
    await supabase.from('meta_connections').update({ is_active: true }).eq('id', connectionId).eq('user_id', user.id)
    setConnections(prev => prev.map(c => ({ ...c, is_active: c.id === connectionId })))
  }, [user])

  // Remove uma conexão específica
  const removeConnection = useCallback(async (connectionId) => {
    if (!user) return
    const target = connections.find(c => c.id === connectionId)
    await supabase.from('meta_connections').delete().eq('id', connectionId).eq('user_id', user.id)

    const remaining = connections.filter(c => c.id !== connectionId)

    if (target?.is_active && remaining.length > 0) {
      await supabase.from('meta_connections').update({ is_active: true }).eq('id', remaining[0].id)
      remaining[0] = { ...remaining[0], is_active: true }
    }
    if (target?.is_active && remaining.length === 0) {
      await fbLogout().catch(() => {})
    }
    setConnections(remaining)
  }, [user, connections])

  // Remove a conta ativa e redireciona para OAuth (troca em plano básico)
  const replaceActive = useCallback(async () => {
    if (!user || !activeConnection) return startConnectRedirect()
    await supabase.from('meta_connections').delete().eq('id', activeConnection.id).eq('user_id', user.id)
    setConnections(prev => prev.filter(c => c.id !== activeConnection.id))
    startConnectRedirect()
  }, [user, activeConnection, startConnectRedirect])

  // Desconectar tudo
  const disconnect = useCallback(async () => {
    if (!user) return
    try {
      await supabase.from('meta_connections').delete().eq('user_id', user.id)
      await fbLogout()
    } catch (e) {
      console.warn('Erro ao desconectar Meta:', e)
    } finally {
      setConnections([])
    }
  }, [user])

  const value = {
    // Conexão ativa (backward-compat com dashboard, campanhas, anúncios)
    isConnected:  !!activeConnection,
    connection:   activeConnection,
    accessToken:  activeConnection?.access_token  || null,
    accountId:    activeConnection?.account_id    || null,
    accountName:  activeConnection?.account_name  || null,
    currency:     activeConnection?.currency      || 'BRL',
    // Múltiplas contas
    connections,
    accountsLimit,
    accountsUsed: connections.length,
    canAddAccount,
    // Estados
    loadingConnection,
    connecting,
    error,
    setError,
    // Ações
    startConnect,
    startConnectRedirect,
    saveConnection,
    switchConnection,
    removeConnection,
    replaceActive,
    disconnect,
  }

  return <MetaContext.Provider value={value}>{children}</MetaContext.Provider>
}

export function useMeta() {
  const ctx = useContext(MetaContext)
  if (!ctx) throw new Error('useMeta deve ser usado dentro de MetaProvider')
  return ctx
}
