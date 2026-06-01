// Componente Toggle — switch liga/desliga

export default function Toggle({
  checked = false,
  onChange,
  label,
  disabled = false,
  size = 'md',
  className = '',
}) {
  const sizes = {
    sm: { track: 'w-8 h-4', thumb: 'w-3 h-3', translate: 'translate-x-4' },
    md: { track: 'w-10 h-5', thumb: 'w-4 h-4', translate: 'translate-x-5' },
  }

  const s = sizes[size]

  return (
    <label className={`inline-flex items-center gap-2 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange?.(!checked)}
        className={`
          relative inline-flex items-center shrink-0
          ${s.track} rounded-full
          transition-all duration-150
          focus:outline-none focus:ring-2 focus:ring-brand-500/30
          ${checked ? 'bg-brand-500' : 'bg-border'}
        `}
      >
        <span
          className={`
            inline-block ${s.thumb} rounded-full bg-white
            transition-all duration-150
            ${checked ? s.translate : 'translate-x-0.5'}
          `}
        />
      </button>
      {label && (
        <span className="text-sm text-txt-primary">{label}</span>
      )}
    </label>
  )
}
