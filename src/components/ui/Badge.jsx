// Componente Badge — etiqueta pequena com variantes

export default function Badge({
  children,
  variant = 'default',
  className = '',
}) {
  const variants = {
    default: 'bg-surface-bg text-txt-secondary',
    brand: 'bg-brand-50 text-brand-500',
    success: 'bg-status-successBg text-status-success',
    warning: 'bg-status-warningBg text-status-warning',
    error: 'bg-status-errorBg text-status-error',
  }

  return (
    <span
      className={`
        inline-flex items-center px-2 py-0.5
        text-xs font-medium rounded-md
        ${variants[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  )
}
