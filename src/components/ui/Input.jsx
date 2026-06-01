// Componente Input — campo de entrada reutilizável
import { useState } from 'react'
import { IconEye, IconEyeOff } from '@tabler/icons-react'

export default function Input({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  disabled = false,
  required = false,
  id,
  name,
  className = '',
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword && showPassword ? 'text' : type

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
      <div className="relative">
        <input
          id={id || name}
          name={name}
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className={`
            w-full px-3 py-2 text-sm text-txt-primary
            bg-white border rounded-input
            placeholder:text-txt-secondary/50
            transition-all duration-150
            focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-status-error' : 'border-border'}
            ${isPassword ? 'pr-10' : ''}
          `}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-txt-secondary hover:text-txt-primary transition-all duration-150"
            tabIndex={-1}
          >
            {showPassword ? (
              <IconEyeOff size={18} stroke={1.5} />
            ) : (
              <IconEye size={18} stroke={1.5} />
            )}
          </button>
        )}
      </div>
      {error && (
        <span className="text-xs text-status-error">{error}</span>
      )}
    </div>
  )
}
