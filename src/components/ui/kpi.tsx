import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

interface KpiProps {
  icon: LucideIcon
  label: string
  value: string
  detail?: string
  /** Destacada: fondo degradado. */
  featured?: boolean
  onClick?: () => void
}

/** Tarjeta KPI alta (Dashboard, Pagos, Reportes). */
export function Kpi({ icon: Icon, label, value, detail, featured, onClick }: KpiProps) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'flex min-h-[132px] flex-col gap-[3px] rounded-card border-[1.5px] p-4 text-left',
        onClick && 'cursor-pointer',
        featured ? 'bg-grad border-transparent' : 'border-teal-line bg-surface text-brand',
      )}
    >
      <span className="mb-auto pb-3.5">
        <Icon size={26} strokeWidth={1.7} aria-hidden />
      </span>
      <b className="text-base font-semibold">{label}</b>
      <span className={cn('tabular text-[21px] font-semibold', !featured && 'text-ink')}>{value}</span>
      {detail && <span className={cn('text-2xs', featured ? 'opacity-90' : 'text-muted')}>{detail}</span>}
    </Tag>
  )
}

/** KPI plana en una fila (Clientes, Ficha). */
export function KpiFlat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3.5 rounded-card bg-surface px-4 py-3.5 shadow-card">
      <Icon size={26} strokeWidth={1.7} className="flex-none text-ink-2" aria-hidden />
      <div>
        <b className="text-sm font-semibold text-muted">{label}</b>
        <div className="tabular text-[15px] font-semibold">{value}</div>
      </div>
    </div>
  )
}
