// Componente Modal — diálogo centralizado
import { IconX } from '@tabler/icons-react'

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-txt-primary/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Conteúdo do modal */}
      <div
        className={`
          relative bg-white border border-border/60
          rounded-xl w-full ${sizes[size]}
          max-h-[85vh] flex flex-col shadow-2xl shadow-brand-500/5
          transition-all duration-300 ease-out animate-in fade-in zoom-in-95
        `}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-txt-primary">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-input text-txt-secondary hover:text-txt-primary hover:bg-surface-bg transition-all duration-150"
          >
            <IconX size={20} stroke={1.5} />
          </button>
        </div>

        {/* Corpo */}
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
