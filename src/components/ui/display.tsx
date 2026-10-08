import type { LucideIcon } from 'lucide-react'
import { Check } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Lista de datos "etiqueta → valor" (ficha, detalle de cita). */
export function DefinitionList({
  items,
  className,
}: {
  items: Array<{ icon?: LucideIcon; label: string; value: ReactNode }>
  className?: string
}) {
  return (
    <dl className={cn('grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3.5 gap-y-[9px] text-sm', className)}>
      {items.map(({ icon: Icon, label, value }) => (
        <div key={label} className="contents">
          <dt className="flex items-center gap-2 font-semibold">
            {Icon && <Icon size={15} strokeWidth={1.7} aria-hidden />}
            {label}
          </dt>
          <dd className="m-0 text-muted">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function ProgressBar({ value, label, className }: { value: number; label: string; className?: string }) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-1.5 overflow-hidden rounded-[6px] bg-surface-2 shadow-[inset_0_0_0_1px_var(--line)]', className)}
    >
      <i className="bg-grad block h-full rounded-[6px]" style={{ width: `${pct}%` }} />
    </div>
  )
}

export type TimelineState = 'done' | 'current' | 'pending' | 'bad' | 'off'

/** Línea de tiempo vertical (estado de la cita, historial del cliente). */
export function Timeline({
  items,
}: {
  items: Array<{ title: ReactNode; detail?: ReactNode; extra?: ReactNode; state: TimelineState }>
}) {
  return (
    <ol className="m-0 flex list-none flex-col p-0">
      {items.map((item, i) => {
        const last = i === items.length - 1
        return (
          <li key={i} className="relative grid grid-cols-[20px_minmax(0,1fr)] gap-2.5 pb-3.5">
            {!last && (
              <span
                aria-hidden
                className={cn('absolute top-[18px] bottom-0 left-[9px] w-0.5', item.state === 'done' ? 'bg-teal' : 'bg-line')}
              />
            )}
            <span
              aria-hidden
              className={cn(
                'relative grid size-5 place-items-center rounded-full border-2 border-line-strong bg-surface text-white',
                item.state === 'done' && 'border-teal bg-teal',
                item.state === 'current' && 'border-teal shadow-[0_0_0_4px_var(--teal-soft)]',
                item.state === 'bad' && 'border-bad bg-bad-bg',
                item.state === 'off' && 'border-off bg-off-bg',
              )}
            >
              {item.state === 'done' && <Check size={11} strokeWidth={3} />}
            </span>
            <div>
              <b className={cn('block text-sm', item.state === 'bad' && 'text-bad')}>{item.title}</b>
              {item.detail && <div className="text-xs text-muted">{item.detail}</div>}
              {item.extra && <div className="mt-1 text-xs">{item.extra}</div>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/** Pasos de un asistente (Nueva cita, Onboarding). */
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <>
      {/* Celular: una línea con el paso actual y una barra de avance. */}
      <div className="flex flex-col gap-2 sm:hidden">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="font-semibold text-ink">{steps[current]}</span>
          <span className="text-xs text-muted">
            Paso {Math.min(current + 1, steps.length)} de {steps.length}
          </span>
        </div>
        <div className="flex gap-1" aria-hidden>
          {steps.map((s, i) => (
            <span key={s} className={cn('h-1 flex-1 rounded-full', i <= current ? 'bg-teal' : 'bg-line-strong')} />
          ))}
        </div>
      </div>
      <ol className="m-0 hidden list-none flex-wrap gap-2 p-0 sm:flex" aria-label="Pasos">
      {steps.map((s, i) => {
        const done = i < current
        const active = i === current
        return (
          <li
            key={s}
            aria-current={active ? 'step' : undefined}
            className={cn(
              'flex items-center gap-2 rounded-full bg-surface py-2 pr-3.5 pl-2 text-sm font-semibold text-muted shadow-card',
              done && 'text-ink-2',
              active && 'text-ink shadow-[0_0_0_1.5px_var(--teal)]',
            )}
          >
            <span
              className={cn(
                'grid size-6 place-items-center rounded-full border-[1.5px] border-line-strong text-2xs',
                done && 'border-teal bg-teal text-on-teal',
                active && 'bg-grad border-0',
              )}
            >
              {done ? <Check size={12} strokeWidth={3} aria-label="Completado" /> : i + 1}
            </span>
            {s}
          </li>
        )
      })}
      </ol>
    </>
  )
}

/** Botones de horario para elegir hora. */
export function SlotPicker({
  slots,
  value,
  onChange,
}: {
  slots: Array<{ time: string; disabled?: boolean; popular?: boolean }>
  value?: string
  onChange: (time: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {slots.map((s) => {
        const on = s.time === value
        return (
          <button
            key={s.time}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={s.disabled}
            onClick={() => onChange(s.time)}
            className={cn(
              'tabular relative cursor-pointer rounded-control border px-[13px] py-2 text-sm font-semibold',
              'disabled:cursor-not-allowed disabled:border-dashed disabled:bg-surface-2 disabled:text-muted disabled:line-through',
              on ? 'bg-grad border-transparent' : 'border-line-strong bg-surface text-ink hover:border-teal',
            )}
          >
            {s.time}
            {s.popular && !s.disabled && (
              <span className="absolute -top-2 -right-1.5 rounded-[6px] bg-warn px-[5px] py-px text-[10px] text-white no-underline dark:text-bg">
                Popular
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/** Aviso destacado con degradado (lista de espera, prueba gratis). */
export function Banner({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="bg-grad grid grid-cols-[minmax(0,1fr)] items-center gap-3.5 rounded-card px-[18px] py-4 sm:grid-cols-[44px_minmax(0,1fr)_auto]">
      <span className="hidden size-11 place-items-center rounded-[12px] bg-white/20 sm:grid">
        <Icon size={22} strokeWidth={1.7} aria-hidden />
      </span>
      <div>
        <div className="text-md font-semibold">{title}</div>
        {description && <div className="text-xs opacity-90">{description}</div>}
      </div>
      {action}
    </div>
  )
}

/** Tarjeta de regla configurable (Disponibilidad, Lista de espera). */
export function RuleCard({
  icon: Icon,
  title,
  description,
  control,
  value,
}: {
  icon: LucideIcon
  title: string
  description: string
  control?: ReactNode
  value?: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2.5 rounded-card bg-surface px-5 py-[18px] shadow-card">
      <div className="flex items-start gap-3">
        <span className="grid size-[34px] flex-none place-items-center rounded-[9px] bg-brand-soft text-brand">
          <Icon size={16} strokeWidth={1.7} aria-hidden />
        </span>
        <div className="flex-1">
          <div className="font-semibold">{title}</div>
          <p className="mt-0.5 mb-0 text-xs text-muted">{description}</p>
        </div>
        {control}
      </div>
      {value && (
        <div className="flex items-center gap-2 rounded-[9px] bg-surface-2 px-2.5 py-2 text-sm font-semibold">{value}</div>
      )}
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-[14px] bg-brand-soft text-brand">
        <Icon size={22} strokeWidth={1.7} aria-hidden />
      </span>
      <div className="text-md font-bold">{title}</div>
      {description && <p className="m-0 max-w-[46ch] text-sm text-muted">{description}</p>}
      {action}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cn('block animate-pulse rounded-control bg-surface-2', className)} />
}

/* ---------- Tabla ---------- */

export function Table({ className, ...props }: ComponentProps<'table'>) {
  return (
    <div className="-mx-1.5 overflow-x-auto">
      <table className={cn('w-full border-collapse text-body', className)} {...props} />
    </div>
  )
}

export function Th({ className, ...props }: ComponentProps<'th'>) {
  return (
    <th
      className={cn('px-2.5 py-2 text-left text-2xs font-medium whitespace-nowrap text-muted', className)}
      {...props}
    />
  )
}

export function Td({ className, ...props }: ComponentProps<'td'>) {
  return (
    <td className={cn('tabular border-t border-line p-2.5 whitespace-nowrap', className)} {...props} />
  )
}

export function Tr({ className, selected, ...props }: ComponentProps<'tr'> & { selected?: boolean }) {
  return (
    <tr
      aria-selected={selected}
      className={cn(
        '[&>td]:transition-colors hover:[&>td]:bg-surface-2',
        props.onClick && 'cursor-pointer',
        selected && '[&>td]:bg-surface-2',
        className,
      )}
      {...props}
    />
  )
}
