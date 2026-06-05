// Contexto de conexão Meta Ads — suporte a múltiplas contas por plano
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { META_APP_ID } from '../lib/metaSDK'
import { getAdAccounts, checkTokenValid } from '../lib/metaApi'
import { useAuth } from './AuthContext'
import { getPlan } from '../utils/planLimits'

const MetaContext = createContext(null)

export function MetaProvider({ children }) {
  const { user } = useAuth()
  const [connections, setConnections] = useState([])
  const [selectedAccountId, setSelectedAccountId] = useState('active')
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
      // Limpeza de segurança: Se o Meta retornou token no hash (fluxo implícito acidental), limpa imediatamente
      if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        console.warn('Token encontrado e removido da URL por segurança.');
      }

      const { data } = await supabase
        .from('meta_connections')
        .select('*')
        .eq('user_id', user.id)
        .order('connected_at', { ascending: false })

      if (!active) return

      const validData = data.filter(c => c.account_id !== 'PENDING')

      if (validData.length === 0) {
        setConnections([])
        setLoadingConnection(false)
        return
      }

      // Garante que exatamente uma conexão está ativa
      const activeConn = validData.find(c => c.is_active) || validData[0]

      // Valida token da conexão ativa (agora via proxy, sem precisar passar token)
      const isValid = await checkTokenValid()
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
        if (!validData.some(c => c.is_active)) {
          await supabase.from('meta_connections')
            .update({ is_active: true })
            .eq('id', validData[0].id)
          validData[0] = { ...validData[0], is_active: true }
        }
        setConnections(validData)
      }
      setLoadingConnection(false)
    }

    loadConnections().catch(() => {
      if (active) setLoadingConnection(false)
    })

    return () => { active = false }
  }, [user])

  // Conexão ativa (backward-compatível)
  const activeConnection = connections.find(c => c.is_active) || connections[0] || null

  // Múltiplas contas selecionadas
  const activeAccounts = useMemo(() => {
    if (!connections || connections.length === 0) return []
    if (selectedAccountId === 'all') return connections
    if (selectedAccountId === 'active') return [activeConnection].filter(Boolean)
    return connections.filter(c => c.account_id === selectedAccountId)
  }, [selectedAccountId, connections, activeConnection])

  // Limites do plano — admin sempre tem máximo
  const planLimits = getPlan(user?.plan || 'basic')
  const accountsLimit = user?.role === 'admin' ? 999 : (planLimits.accounts || 1)
  const canAddAccount = connections.length < accountsLimit

  // Fluxo redirect OAuth
  const startConnectRedirect = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const stateObj = {
      t: session?.access_token,
      o: window.location.origin
    }
    const stateB64 = btoa(JSON.stringify(stateObj))

    const params = new URLSearchParams({
      client_id:     META_APP_ID,
      redirect_uri:  'https://gespub.online/conexoes',
      scope:         'ads_management,pages_show_list,pages_read_engagement',
      response_type: 'code',
      state:         stateB64
    })
    window.location.href = `https://www.facebook.com/dialog/oauth?${params}`
  }, [])

  // Salva nova conexão usando o proxy
  const saveConnection = useCallback(async (account) => {
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

    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/meta-proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        path: '/add-account',
        body: { id: account.id, name: account.name, currency: account.currency }
      })
    })

    const data = await res.json()
    if (data.error) throw new Error(data.error)

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
      // Não tentamos mais fbLogout, apenas removemos da base
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
    accountId:    activeConnection?.account_id    || null,
    accountName:  activeConnection?.account_name  || null,
    currency:     activeConnection?.currency      || 'BRL',
    selectedAccountId,
    setSelectedAccountId,
    activeAccounts,
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
