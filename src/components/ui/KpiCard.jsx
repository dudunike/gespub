// Componente KpiCard — card de métrica para dashboard
import { IconArrowUpRight, IconArrowDownRight } from '@tabler/icons-react'

export default function KpiCard({ label, value, delta, deltaType = 'up' }) {
  const isPositive = deltaType === 'up'

  return (
    <div className="bg-white border border-border rounded-card p-5">
      <p className="text-xs font-medium text-txt-secondary uppercase tracking-wide">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-txt-primary">
        {value}
      </p>
      {delta !== undefined && (
        <div className={`mt-2 inline-flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-status-success' : 'text-status-error'}`}>
          {isPositive ? (
            <IconArrowUpRight size={14} stroke={2} />
          ) : (
            <IconArrowDownRight size={14} stroke={2} />
          )}
          {delta}
        </div>
      )}
    </div>
  )
}
