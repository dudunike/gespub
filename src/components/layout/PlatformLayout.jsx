// Layout base da plataforma — sidebar + topbar + conteúdo
import { Outlet } from 'react-router-dom'
import { useState } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { useApp } from '../../context/AppContext'

export default function PlatformLayout() {
  const { openDrawer, isSidebarOpen, closeSidebar } = useApp()

  // Ação do botão contextual da topbar
  const handleTopbarAction = () => {
    // Cada página lida com sua própria ação via contexto
    openDrawer('default')
  }

  return (
    <div className="min-h-screen bg-surface-bg flex flex-col relative">
      <Sidebar />
      
      {/* Overlay mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-20 lg:hidden backdrop-blur-sm"
          onClick={closeSidebar}
        />
      )}

      <Topbar onAction={handleTopbarAction} />

      {/* Área de conteúdo principal */}
      <main className="flex-1 lg:ml-sidebar mt-topbar p-4 lg:p-6 w-full lg:w-auto overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  )
}
