import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('min-w-0 rounded-card bg-surface px-5 py-[18px] shadow-card', className)} {...props} />
}

export function CardHeader({
  title,
  actions,
  className,
}: {
  title: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-3.5 flex flex-wrap items-center justify-between gap-3', className)}>
      <h3 className="m-0 text-md font-bold">{title}</h3>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  )
}

/** Tarjeta punteada de "Agregar…" (servicio, profesional, sucursal…). */
export function AddCard({
  label,
  onClick,
  className,
}: {
  label: string
  onClick?: () => void
  className?: string
}) {
  return (
    <div className={cn('flex min-h-[180px] rounded-panel border-[1.5px] border-dashed border-line-strong p-2.5', className)}>
      <button
        type="button"
        onClick={onClick}
        className="bg-grad flex flex-1 cursor-pointer flex-col items-center justify-center gap-3.5 rounded-[12px] p-[18px] text-center text-[15px] font-semibold"
      >
        {label}
        <span className="grid size-[26px] place-items-center rounded-full bg-white text-[#243352]">+</span>
      </button>
    </div>
  )
}
