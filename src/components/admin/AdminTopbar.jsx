import { useLocation } from 'react-router-dom'
import { IconMenu2 } from '@tabler/icons-react'
import { PAGE_TITLES, PAGE_ACTIONS } from '../../utils/constants'
import { useApp } from '../../context/AppContext'
import Button from '../ui/Button'

export default function AdminTopbar({ onAction }) {
  const location = useLocation()
  const { toggleSidebar } = useApp()
  const pageTitle = PAGE_TITLES[location.pathname] || 'ADIM'
  const actionLabel = PAGE_ACTIONS[location.pathname]

  return (
    <header className="fixed top-0 left-0 lg:left-sidebar right-0 h-topbar bg-white border-b border-border flex items-center justify-between px-4 lg:px-6 gap-3 z-20">
      
      {/* Menu Hamburger (Mobile) */}
      <button 
        onClick={toggleSidebar}
        className="lg:hidden p-2 -ml-2 rounded-input text-txt-secondary hover:text-txt-primary hover:bg-surface-bg"
      >
        <IconMenu2 size={24} stroke={1.5} />
      </button>

      <h1 className="text-base font-semibold text-txt-primary">
        {pageTitle}
      </h1>
      {actionLabel && (
        <Button onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </header>
  )
}
