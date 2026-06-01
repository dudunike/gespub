// Componente StatusPill — pílula de status colorida

export default function StatusPill({ status }) {
  const config = {
    active: { label: 'Ativa', bg: 'bg-status-successBg', text: 'text-status-success', dot: 'bg-status-success' },
    paused: { label: 'Pausada', bg: 'bg-status-warningBg', text: 'text-status-warning', dot: 'bg-status-warning' },
    draft: { label: 'Rascunho', bg: 'bg-surface-bg', text: 'text-txt-secondary', dot: 'bg-txt-secondary' },
    blocked: { label: 'Bloqueado', bg: 'bg-status-errorBg', text: 'text-status-error', dot: 'bg-status-error' },
    connected: { label: 'Conectado', bg: 'bg-status-successBg', text: 'text-status-success', dot: 'bg-status-success' },
    disconnected: { label: 'Desconectado', bg: 'bg-status-errorBg', text: 'text-status-error', dot: 'bg-status-error' },
    coming_soon: { label: 'Em breve', bg: 'bg-surface-bg', text: 'text-txt-secondary', dot: 'bg-txt-secondary' },
  }

  const c = config[status] || config.draft

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  )
}
