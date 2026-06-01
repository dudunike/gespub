// Contexto global — notificações reais do Supabase com realtime
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './AuthContext'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Carrega notificações do usuário (próprias + broadcast admin)
  const loadNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([])
      return
    }
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .order('created_at', { ascending: false })
        .limit(50)

      if (!error && data) {
        setNotifications(data)
      } else {
        setNotifications([])
      }
    } catch {
      setNotifications([])
    }
  }, [user])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  // Realtime — ouve novas notificações chegando
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev])
        }
      )
      // Notificações broadcast (user_id = null)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: 'user_id=is.null',
        },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  const unreadCount = notifications.filter((n) => !n.read).length

  // Marcar uma notificação como lida
  const markAsRead = useCallback(async (id) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
    if (user) {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id)
    }
  }, [user])

  // Marcar todas como lidas
  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    if (user) {
      const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id)
      if (unreadIds.length > 0) {
        await supabase
          .from('notifications')
          .update({ read: true })
          .in('id', unreadIds)
      }
    }
  }, [user, notifications])

  const openSidebar  = () => setIsSidebarOpen(true)
  const closeSidebar = () => setIsSidebarOpen(false)
  const toggleSidebar = () => setIsSidebarOpen((p) => !p)

  const value = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    isSidebarOpen,
    openSidebar,
    closeSidebar,
    toggleSidebar,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp deve ser usado dentro de AppProvider')
  return context
}
