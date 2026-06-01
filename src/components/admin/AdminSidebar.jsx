// Sidebar do Admin — fundo escuro para diferenciar da plataforma
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  IconLayoutDashboard,
  IconUsers,
  IconRobot,
  IconFileText,
  IconSettings,
  IconArrowLeft,
  IconLogout,
} from '@tabler/icons-react'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'

const navItems = [
  { label: 'Visão Geral', path: '/admin', icon: IconLayoutDashboard },
  { label: 'Usuários', path: '/admin/usuarios', icon: IconUsers },
  { label: 'Agentes & Regras', path: '/admin/agentes-regras', icon: IconRobot },
  { label: 'Logs', path: '/admin/logs', icon: IconFileText },
  { label: 'Configurações', path: '/admin/configuracoes', icon: IconSettings },
]

export default function AdminSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { isSidebarOpen, closeSidebar } = useApp()

  return (
    <aside className={`
      fixed left-0 top-0 h-full w-sidebar bg-admin-sidebar flex flex-col z-30
      transition-transform duration-300 ease-in-out
      ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      lg:translate-x-0
    `}>
      {/* Logo Admin */}
      <div className="px-5 py-4 flex items-center gap-2.5">
        <div className="w-8 h-8 bg-brand-500 rounded-input flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 6h7v2H6v8h5v2H4V6zm10 0h7v2h-5v3h4v2h-4v3h5v2h-7V6z" fill="white"/>
          </svg>
        </div>
        <div>
          <span className="text-base font-semibold text-white">
            GESPUB<span className="text-brand-500">.AI</span>
          </span>
          <p className="text-[10px] text-brand-100 uppercase tracking-wider">Admin</p>
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon
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
                  ? 'bg-brand-500/20 text-white font-medium'
                  : 'text-brand-100 hover:bg-white/5 hover:text-white'
                }
              `}
            >
              <Icon size={20} stroke={1.5} />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      {/* Rodapé */}
      <div className="px-3 py-3 border-t border-white/10 space-y-1">
        <button
          onClick={() => {
            closeSidebar()
            navigate('/dashboard')
          }}
          className="flex items-center gap-3 px-3 py-2 rounded-input text-sm text-brand-100 hover:bg-white/5 hover:text-white transition-all duration-150 w-full"
        >
          <IconArrowLeft size={20} stroke={1.5} />
          <span>Voltar à Plataforma</span>
        </button>
        <button
          onClick={() => {
            logout()
            navigate('/')
          }}
          className="flex items-center gap-3 px-3 py-2 rounded-input text-sm text-brand-100 hover:bg-white/5 hover:text-white transition-all duration-150 w-full"
        >
          <IconLogout size={20} stroke={1.5} />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  )
}
