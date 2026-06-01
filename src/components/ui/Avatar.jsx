import { getInitials } from '../../utils/formatters'

export default function Avatar({ name, src, size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
  }

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`inline-block rounded-full object-cover shrink-0 ${sizes[size]} ${className}`}
      />
    )
  }

  return (
    <div
      className={`
        inline-flex items-center justify-center
        rounded-full bg-brand-50 text-brand-500
        font-medium shrink-0
        ${sizes[size]}
        ${className}
      `}
    >
      {getInitials(name)}
    </div>
  )
}
