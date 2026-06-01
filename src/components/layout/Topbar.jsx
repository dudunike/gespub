// Topbar fixa — cabeçalho da plataforma com notificações funcionais
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { IconBell, IconMenu2 } from '@tabler/icons-react'
import { PAGE_TITLES, PAGE_ACTIONS } from '../../utils/constants'
import { useApp } from '../../context/AppContext'
import SearchInput from '../ui/SearchInput'
import Button from '../ui/Button'
import NotificationPanel from '../ui/NotificationPanel'

export default function Topbar({ onAction }) {
  const location = useLocation()
  const { unreadCount, notifications, markAsRead, markAllAsRead, toggleSidebar } = useApp()
  const [searchQuery, setSearchQuery] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)

  const pageTitle  = PAGE_TITLES[location.pathname]  || 'GESPUB.AI'
  const actionLabel = PAGE_ACTIONS[location.pathname]

  return (
    <header className="fixed top-0 left-0 lg:left-sidebar right-0 h-topbar bg-white border-b border-border flex items-center px-4 lg:px-6 gap-3 lg:gap-4 z-20">

      {/* Menu mobile */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden p-2 -ml-2 rounded-input text-txt-secondary hover:text-txt-primary hover:bg-surface-bg"
      >
        <IconMenu2 size={24} stroke={1.5} />
      </button>

      {/* Título da página */}
      <h1 className="text-base font-semibold text-txt-primary shrink-0">{pageTitle}</h1>

      {/* Busca */}
      <div className="hidden lg:block flex-1 max-w-md mx-auto">
        <SearchInput
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar campanhas, agentes, regras..."
        />
      </div>

      {/* Ações à direita */}
      <div className="flex items-center gap-3 shrink-0">

        {/* Sino — abre o painel ao clicar */}
        <div className="relative">
          <button
            onClick={() => setPanelOpen((o) => !o)}
            className={`relative p-2 rounded-input transition-all duration-150 ${
              panelOpen
                ? 'bg-brand-50 text-brand-500'
                : 'text-txt-secondary hover:text-txt-primary hover:bg-surface-bg'
            }`}
            aria-label="Notificações"
          >
            <IconBell size={20} stroke={1.5} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 bg-brand-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Painel dropdown */}
          {panelOpen && (
            <NotificationPanel
              notifications={notifications}
              onMarkRead={markAsRead}
              onMarkAllRead={markAllAsRead}
              onClose={() => setPanelOpen(false)}
            />
          )}
        </div>

        {/* Botão de ação contextual */}
        {actionLabel && (
          <Button onClick={onAction}>{actionLabel}</Button>
        )}
      </div>
    </header>
  )
}
