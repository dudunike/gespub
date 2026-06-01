// Componente Drawer — gaveta lateral
import { useEffect } from 'react'
import { IconX } from '@tabler/icons-react'

export default function Drawer({
  isOpen,
  onClose,
  title,
  children,
  width = 'max-w-lg',
}) {
  // Prevenir scroll do body quando aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  return (
    <>
      {/* Overlay escuro */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Painel */}
      <div
        className={`
          fixed top-0 right-0 h-full bg-white z-50
          w-full sm:${width}
          border-l border-border
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          flex flex-col shadow-xl
        `}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-base font-semibold text-txt-primary">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-input text-txt-secondary hover:text-txt-primary hover:bg-surface-bg transition-all duration-150"
          >
            <IconX size={20} stroke={1.5} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          {children}
        </div>
      </div>
    </>
  )
}
