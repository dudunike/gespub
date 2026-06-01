import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import {
  IconLayoutDashboard,
  IconSpeakerphone,
  IconStack2,
  IconPhoto,
  IconRobot,
  IconAdjustments,
  IconSparkles,
  IconPlugConnected,
  IconSettings,
} from '@tabler/icons-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import Avatar from '../ui/Avatar'

// Mapa de ícones para referência dinâmica
const iconMap = {
  IconLayoutDashboard,
  IconSpeakerphone,
  IconStack2,
  IconPhoto,
  IconRobot,
  IconAdjustments,
  IconSparkles,
  IconPlugConnected,
}

// Itens de navegação
const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: 'IconLayoutDashboard' },
  { label: 'Campanhas', path: '/campanhas', icon: 'IconSpeakerphone' },
  { label: 'Conjuntos', path: '/conjuntos', icon: 'IconStack2' },
  { label: 'Anúncios', path: '/anuncios', icon: 'IconPhoto' },
  { label: 'Agentes IA', path: '/agentes', icon: 'IconRobot', showBadge: true },
  { label: 'Regras', path: '/regras', icon: 'IconAdjustments' },
  { label: 'Insights', path: '/insights', icon: 'IconSparkles' },
  { label: 'Conexões', path: '/conexoes', icon: 'IconPlugConnected' },
]

export default function Sidebar() {
  const { user } = useAuth()
  const { isSidebarOpen, closeSidebar } = useApp()
  const location = useLocation()
  
  const [activeAgentsCount, setActiveAgentsCount] = useState(0)

  useEffect(() => {
    if (!user) return
    supabase
      .from('agents')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true)
      .then(({ count }) => setActiveAgentsCount(count || 0))
      .catch(() => {})
  }, [user])

  // Mapa de planos para exibição
  const planLabels = {
    starter: 'Starter',
    pro: 'Pro',
    enterprise: 'Enterprise',
  }

  return (
    <aside className={`
      fixed left-0 top-0 h-full w-sidebar bg-white border-r border-border flex flex-col z-30
      transition-transform duration-300 ease-in-out
      ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      lg:translate-x-0
    `}>
      {/* Logo */}
      <div className="px-5 py-4 flex items-center gap-2.5">
        <img src="/favicon.svg" alt="GesPub.ai" className="w-8 h-8 rounded-input" />
        <span className="text-base font-semibold text-txt-primary">
          GesPub<span className="text-brand-500">.ai</span>
        </span>
      </div>

      {/* Navegação */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = iconMap[item.icon]
          const isActive = location.pathname === item.path

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => closeSidebar()}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-input text-sm
                transition-all duration-150
                ${isActive
                  ? 'bg-brand-50 text-brand-500 font-medium'
                  : 'text-txt-secondary hover:bg-surface-bg hover:text-txt-primary'
                }
              `}
            >
              <Icon size={20} stroke={1.5} />
              <span className="flex-1">{item.label}</span>
              {item.showBadge && (
                <span className="px-1.5 py-0.5 text-xs font-medium bg-brand-500 text-white rounded-md">
                  {activeAgentsCount}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Rodapé — perfil do usuário */}
      <div className="px-3 py-3 border-t border-border">
        <div className="flex items-center gap-3 px-3 py-2">
          <Avatar name={user?.name || 'Usuário'} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-txt-primary truncate">
              {user?.name || 'Usuário'}
            </p>
            <p className="text-xs text-txt-secondary">
              {planLabels[user?.plan] || 'Starter'}
            </p>
          </div>
          <NavLink
            to="/configuracoes"
            className="p-1 rounded-input text-txt-secondary hover:text-txt-primary hover:bg-surface-bg transition-all duration-150"
          >
            <IconSettings size={18} stroke={1.5} />
          </NavLink>
        </div>
      </div>
    </aside>
  )
}
