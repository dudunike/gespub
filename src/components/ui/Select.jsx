// Componente Select — dropdown reutilizável

export default function Select({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Selecione...',
  error,
  disabled = false,
  required = false,
  id,
  name,
  className = '',
  ...props
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={id || name}
          className="text-sm font-medium text-txt-primary"
        >
          {label}
          {required && <span className="text-status-error ml-0.5">*</span>}
        </label>
      )}
      <select
        id={id || name}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className={`
          w-full px-3 py-2 text-sm text-txt-primary
          bg-white border rounded-input appearance-none
          bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2371717A' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")]
          bg-no-repeat bg-[right_0.75rem_center]
          transition-all duration-150
          focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-status-error' : 'border-border'}
        `}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.id || opt.value} value={opt.id || opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <span className="text-xs text-status-error">{error}</span>
      )}
    </div>
  )
}
