// Painel de notificações — dropdown funcional com realtime
import { useEffect, useRef } from 'react'
import {
  IconBellOff, IconCheck, IconCheckbox,
  IconAlertTriangle, IconCircleCheck, IconInfoCircle, IconX,
  IconSpeakerphone,
} from '@tabler/icons-react'
import { formatRelativeTime } from '../../utils/formatters'

const TYPE_CONFIG = {
  success: { icon: IconCircleCheck,  color: 'text-status-success', bg: 'bg-status-successBg' },
  warning: { icon: IconAlertTriangle, color: 'text-status-warning', bg: 'bg-status-warningBg' },
  error:   { icon: IconX,             color: 'text-status-error',   bg: 'bg-status-errorBg'   },
  info:    { icon: IconInfoCircle,    color: 'text-brand-500',      bg: 'bg-brand-50'          },
  admin:   { icon: IconSpeakerphone,  color: 'text-brand-500',      bg: 'bg-brand-50'          },
}

export default function NotificationPanel({ notifications, onMarkRead, onMarkAllRead, onClose }) {
  const panelRef = useRef(null)

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose()
    }
    function handleEsc(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [onClose])

  const unread = notifications.filter((n) => !n.read)

  return (
    <div
      ref={panelRef}
      className="absolute top-full right-0 mt-2 w-[360px] max-w-[calc(100vw-24px)] bg-white border border-border rounded-card shadow-xl z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-txt-primary">Notificações</h3>
          {unread.length > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-brand-500 text-white rounded-full">
              {unread.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unread.length > 0 && (
            <button
              onClick={onMarkAllRead}
              className="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-700 px-2 py-1 rounded-input hover:bg-brand-50 transition-colors"
              title="Marcar todas como lidas"
            >
              <IconCheckbox size={14} />
              Marcar todas
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-input text-txt-secondary hover:text-txt-primary hover:bg-surface-bg transition-colors"
          >
            <IconX size={16} />
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="max-h-[420px] overflow-y-auto divide-y divide-border">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-txt-secondary">
            <IconBellOff size={28} strokeWidth={1.5} />
            <p className="text-sm">Nenhuma notificação</p>
          </div>
        ) : (
          notifications.map((notif) => {
            const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.info
            const Icon = cfg.icon
            return (
              <button
                key={notif.id}
                onClick={() => !notif.read && onMarkRead(notif.id)}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-bg/70 ${
                  notif.read ? 'opacity-60' : ''
                }`}
              >
                {/* Ícone de tipo */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${cfg.bg}`}>
                  <Icon size={16} className={cfg.color} strokeWidth={1.5} />
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium text-txt-primary leading-snug ${!notif.read ? 'font-semibold' : ''}`}>
                      {notif.title}
                    </p>
                    {!notif.read && (
                      <span className="w-2 h-2 bg-brand-500 rounded-full shrink-0 mt-1.5" />
                    )}
                  </div>
                  <p className="text-xs text-txt-secondary mt-0.5 leading-relaxed line-clamp-2">
                    {notif.message}
                  </p>
                  <p className="text-xs text-txt-secondary/70 mt-1">
                    {formatRelativeTime(notif.created_at || notif.createdAt)}
                  </p>
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-4 py-2.5 border-t border-border bg-surface-bg/50 text-center">
          <p className="text-xs text-txt-secondary">
            {unread.length > 0
              ? `${unread.length} não lida${unread.length !== 1 ? 's' : ''}`
              : 'Tudo lido'}
          </p>
        </div>
      )}
    </div>
  )
}
