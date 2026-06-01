import { useState, useEffect, useRef, useCallback } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
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
  IconLogout,
  IconCamera,
  IconChevronUp,
  IconLoader2,
} from '@tabler/icons-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import Avatar from '../ui/Avatar'

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

const navItems = [
  { label: 'Dashboard',   path: '/dashboard', icon: 'IconLayoutDashboard' },
  { label: 'Campanhas',   path: '/campanhas',  icon: 'IconSpeakerphone' },
  { label: 'Conjuntos',   path: '/conjuntos',  icon: 'IconStack2' },
  { label: 'Anúncios',    path: '/anuncios',   icon: 'IconPhoto' },
  { label: 'Agentes IA',  path: '/agentes',    icon: 'IconRobot', showBadge: true },
  { label: 'Regras',      path: '/regras',     icon: 'IconAdjustments' },
  { label: 'Insights',    path: '/insights',   icon: 'IconSparkles' },
  { label: 'Conexões',    path: '/conexoes',   icon: 'IconPlugConnected' },
]

const planLabels = { starter: 'Starter', pro: 'Pro', enterprise: 'Enterprise' }

export default function Sidebar() {
  const { user, logout, updateAvatar } = useAuth()
  const { isSidebarOpen, closeSidebar } = useApp()
  const location = useLocation()
  const navigate = useNavigate()

  const [activeAgentsCount, setActiveAgentsCount] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const menuRef = useRef(null)
  const fileRef = useRef(null)

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

  // Fecha menu ao clicar fora
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const handleLogout = useCallback(async () => {
    setMenuOpen(false)
    closeSidebar()
    await logout()
    navigate('/')
  }, [logout, navigate, closeSidebar])

  const handlePhotoChange = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Foto deve ter no máximo 2 MB.')
      return
    }

    setUploading(true)
    setUploadError('')
    const result = await updateAvatar(file)
    setUploading(false)

    if (!result.success) setUploadError(result.error)
    else setMenuOpen(false)

    // Limpa input para permitir re-upload do mesmo arquivo
    e.target.value = ''
  }, [updateAvatar])

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

      {/* Rodapé — perfil com dropdown */}
      <div className="px-3 py-3 border-t border-border relative" ref={menuRef}>

        {/* Dropdown — abre para cima */}
        {menuOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-2 bg-white border border-border rounded-card shadow-lg overflow-hidden">

            {/* Info do usuário */}
            <div className="px-4 py-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar
                    src={user?.avatar_url}
                    name={user?.name || 'Usuário'}
                    size="md"
                  />
                  {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-full">
                      <IconLoader2 size={16} className="animate-spin text-brand-500" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-txt-primary truncate">
                    {user?.name || 'Usuário'}
                  </p>
                  <p className="text-xs text-txt-secondary truncate">{user?.email}</p>
                </div>
              </div>
              {uploadError && (
                <p className="mt-2 text-xs text-status-error">{uploadError}</p>
              )}
            </div>

            {/* Alterar foto */}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-txt-secondary hover:bg-surface-bg hover:text-txt-primary transition-colors disabled:opacity-50"
            >
              <IconCamera size={16} stroke={1.5} />
              {uploading ? 'Enviando foto…' : 'Alterar foto de perfil'}
            </button>

            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handlePhotoChange}
            />

            {/* Sair */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-status-error hover:bg-status-errorBg transition-colors"
            >
              <IconLogout size={16} stroke={1.5} />
              Sair da conta
            </button>
          </div>
        )}

        {/* Trigger do menu */}
        <button
          onClick={() => { setMenuOpen((o) => !o); setUploadError('') }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-input hover:bg-surface-bg transition-colors group"
        >
          <Avatar
            src={user?.avatar_url}
            name={user?.name || 'Usuário'}
            size="sm"
          />
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium text-txt-primary truncate">
              {user?.name || 'Usuário'}
            </p>
            <p className="text-xs text-txt-secondary">
              {planLabels[user?.plan] || 'Starter'}
            </p>
          </div>
          <IconChevronUp
            size={16}
            stroke={1.5}
            className={`text-txt-secondary shrink-0 transition-transform duration-150 ${menuOpen ? 'rotate-0' : 'rotate-180'}`}
          />
        </button>
      </div>
    </aside>
  )
}
