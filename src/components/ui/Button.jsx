// Componente Button — botão reutilizável com variantes

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  type = 'button',
  onClick,
  className = '',
  icon: Icon,
  ...props
}) {
  // Variantes de estilo
  const variants = {
    primary: 'bg-brand-500 text-white hover:bg-brand-700 focus:ring-brand-500/30',
    secondary: 'bg-white text-txt-primary border border-border hover:bg-surface-bg focus:ring-brand-500/30',
    ghost: 'bg-transparent text-txt-secondary hover:bg-surface-bg hover:text-txt-primary',
    danger: 'bg-status-error text-white hover:bg-red-700 focus:ring-red-500/30',
    facebook: 'bg-facebook text-white hover:bg-blue-700 focus:ring-blue-500/30',
  }

  // Tamanhos
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-sm',
  }

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`
        inline-flex items-center justify-center gap-2
        font-medium rounded-input
        transition-all duration-150
        focus:outline-none focus:ring-2 focus:ring-offset-0
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {Icon && <Icon size={size === 'sm' ? 16 : 18} stroke={1.5} />}
      {children}
    </button>
  )
}
