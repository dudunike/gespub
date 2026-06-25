import { useState } from 'react'
import { IconCalendar, IconRefresh } from '@tabler/icons-react'

const PRESETS = [
  { id: 'today',      label: 'Hoje' },
  { id: 'yesterday',  label: 'Ontem' },
  { id: 'last_7d',    label: 'Últimos 7 dias' },
  { id: 'last_14d',   label: 'Últimos 14 dias' },
  { id: 'last_30d',   label: 'Últimos 30 dias' },
  { id: 'this_month', label: 'Este mês' },
  { id: 'last_month', label: 'Mês passado' },
  { id: 'custom',     label: 'Personalizado' },
]

function todayBRT() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
}
function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d)
}

export default function DateFilter({ preset = 'last_30d', since, until, onChange, onRefresh, loading }) {
  const isCustom = preset === 'custom'

  // Estado local para as datas — evita dependência do round-trip pelo pai
  const [customSince, setCustomSince] = useState(() => since || daysAgo(30))
  const [customUntil, setCustomUntil] = useState(() => until || todayBRT())

  const handlePreset = (e) => {
    const val = e.target.value
    if (val === 'custom') {
      onChange({ preset: 'custom', since: customSince, until: customUntil })
    } else {
      onChange({ preset: val, since: null, until: null })
    }
  }

  const handleSinceChange = (e) => {
    const s = e.target.value
    setCustomSince(s)
    if (s && customUntil) {
      onChange({ preset: 'custom', since: s, until: customUntil })
    }
  }

  const handleUntilChange = (e) => {
    const u = e.target.value
    setCustomUntil(u)
    if (customSince && u) {
      onChange({ preset: 'custom', since: customSince, until: u })
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Select de período */}
      <div className="relative">
        <select
          value={preset}
          onChange={handlePreset}
          className="pl-8 pr-3 py-1.5 text-sm border border-border rounded-input bg-white text-txt-primary appearance-none focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
        >
          {PRESETS.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
        <IconCalendar size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-txt-secondary pointer-events-none" />
      </div>

      {/* Inputs de data personalizada */}
      {isCustom && (
        <>
          <input
            type="date"
            value={customSince}
            max={customUntil || todayBRT()}
            onChange={handleSinceChange}
            className="px-2 py-1.5 text-sm border border-border rounded-input bg-white text-txt-primary focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
          />
          <span className="text-xs text-txt-secondary">até</span>
          <input
            type="date"
            value={customUntil}
            min={customSince || undefined}
            max={todayBRT()}
            onChange={handleUntilChange}
            className="px-2 py-1.5 text-sm border border-border rounded-input bg-white text-txt-primary focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
          />
        </>
      )}

      {/* Botão atualizar */}
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={loading || (isCustom && (!customSince || !customUntil))}
          className="flex items-center gap-1.5 text-xs text-txt-secondary hover:text-brand-500 transition-colors disabled:opacity-40 px-2 py-1.5 rounded-input hover:bg-surface-bg"
        >
          <IconRefresh size={14} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Atualizando…' : 'Atualizar'}
        </button>
      )}
    </div>
  )
}
