// Componente SearchInput — campo de busca com ícone
import { IconSearch } from '@tabler/icons-react'

export default function SearchInput({
  value,
  onChange,
  placeholder = 'Buscar...',
  className = '',
}) {
  return (
    <div className={`relative ${className}`}>
      <IconSearch
        size={16}
        stroke={1.5}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-secondary"
      />
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="
          w-full pl-9 pr-3 py-2 text-sm text-txt-primary
          bg-surface-bg border border-transparent rounded-input
          placeholder:text-txt-secondary/50
          transition-all duration-150
          focus:outline-none focus:bg-white focus:border-border focus:ring-2 focus:ring-brand-500/30
        "
      />
    </div>
  )
}
