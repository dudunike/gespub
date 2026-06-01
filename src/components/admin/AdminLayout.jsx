// Layout do painel ADIM — sidebar escura + topbar + conteúdo
import { Outlet } from 'react-router-dom'
import AdminSidebar from './AdminSidebar'
import AdminTopbar from './AdminTopbar'
import { useApp } from '../../context/AppContext'

export default function AdminLayout() {
  const { isSidebarOpen, closeSidebar } = useApp()

  return (
    <div className="min-h-screen bg-surface-bg flex flex-col relative">
      <AdminSidebar />
      
      {/* Overlay mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-20 lg:hidden backdrop-blur-sm"
          onClick={closeSidebar}
        />
      )}

      <AdminTopbar />

      {/* Área de conteúdo */}
      <main className="flex-1 lg:ml-sidebar mt-topbar p-4 lg:p-6 w-full lg:w-auto overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  )
}
