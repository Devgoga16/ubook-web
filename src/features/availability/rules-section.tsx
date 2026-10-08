import {
  CalendarRange,
  Clock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/controls'
import { Skeleton } from '@/components/ui/display'
import { errorMessage } from '@/lib/api/client'
import type { BookingRules } from '@/lib/api/types'
import { cn } from '@/lib/cn'
import { useBookingRules, useSaveBookingRules } from './api'

type NumericRule = Exclude<keyof BookingRules, 'allowOverbooking' | 'manualApproval'>

interface NumericRuleDef {
  key: NumericRule
  icon: LucideIcon
  title: string
  description: string
  options: Array<[value: number, label: string]>
  fallback: number
}

const NUMERIC_RULES: NumericRuleDef[] = [
  {
    key: 'minNoticeMinutes',
    icon: Clock,
    title: 'Anticipación mínima',
    description: 'No se puede reservar con menos de este tiempo.',
    options: [[15, '15 minutos'], [30, '30 minutos'], [60, '1 hora'], [120, '2 horas'], [240, '4 horas'], [720, '12 horas'], [1440, '24 horas'], [2880, '48 horas']],
    fallback: 120,
  },
  {
    key: 'maxAdvanceDays',
    icon: CalendarRange,
    title: 'Ventana de reserva',
    description: 'Hasta cuántos días adelante se puede reservar.',
    options: [[7, '7 días'], [14, '14 días'], [30, '30 días'], [60, '60 días'], [90, '90 días'], [180, '6 meses'], [365, '1 año']],
    fallback: 60,
  },
  {
    key: 'freeCancellationHours',
    icon: X,
    title: 'Cancelación gratuita',
    description: 'Después de este límite se retiene el depósito.',
    options: [[1, '1 hora antes'], [2, '2 horas antes'], [6, '6 horas antes'], [12, '12 horas antes'], [24, '24 horas antes'], [48, '48 horas antes']],
    fallback: 12,
  },
  {
    key: 'maxReschedules',
    icon: RefreshCw,
    title: 'Reprogramación',
    description: 'Cuántas veces el cliente puede mover su cita.',
    options: [[1, 'Hasta 1 vez'], [2, 'Hasta 2 veces'], [3, 'Hasta 3 veces'], [5, 'Hasta 5 veces']],
    fallback: 2,
  },
  {
    key: 'defaultBufferMinutes',
    icon: Sparkles,
    title: 'Tiempo entre citas',
    description: 'Limpieza sugerida al crear un servicio nuevo.',
    options: [[5, '5 minutos'], [10, '10 minutos'], [15, '15 minutos'], [20, '20 minutos'], [30, '30 minutos']],
    fallback: 10,
  },
  {
    key: 'maxActiveBookingsPerClient',
    icon: User,
    title: 'Límite por cliente',
    description: 'Citas activas al mismo tiempo por cliente.',
    options: [[1, '1 cita'], [2, '2 citas'], [3, '3 citas'], [5, '5 citas'], [10, '10 citas']],
    fallback: 3,
  },
]

function withOption(options: NumericRuleDef['options'], value: number | null) {
  return value === null || options.some(([v]) => v === value) ? options : [...options, [value, String(value)] as [number, string]]
}

function RuleCard({
  icon: Icon,
  title,
  description,
  enabled,
  onToggle,
  disabled,
  children,
}: {
  icon: LucideIcon
  title: string
  description: string
  enabled: boolean
  onToggle: (on: boolean) => void
  disabled: boolean
  children?: ReactNode
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-2.5 rounded-card bg-surface px-5 py-[18px] shadow-card', !enabled && 'opacity-80')}>
      <div className="flex items-start gap-3">
        <span className="grid size-[34px] flex-none place-items-center rounded-[9px] bg-brand-soft text-brand">
          <Icon size={16} strokeWidth={1.7} aria-hidden />
        </span>
        <div className="flex-1">
          <div className="font-semibold">{title}</div>
          <p className="mt-0.5 mb-0 text-xs text-muted">{description}</p>
        </div>
        <Switch checked={enabled} onCheckedChange={onToggle} disabled={disabled} aria-label={`Activar ${title.toLowerCase()}`} />
      </div>
      {children}
    </div>
  )
}

const selectClass =
  'w-full cursor-pointer rounded-[9px] border border-transparent bg-surface-2 px-2.5 py-2 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:text-muted'

/** Reglas que deciden qué horarios se ofrecen al cliente. */
export function RulesSection({ canEdit }: { canEdit: boolean }) {
  const { data, isLoading } = useBookingRules()
  const save = useSaveBookingRules()
  const [draft, setDraft] = useState<BookingRules | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-[118px] rounded-card" />
        ))}
      </div>
    )
  }

  const rules = draft ?? data
  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(data)
  const set = (patch: Partial<BookingRules>) => setDraft({ ...rules, ...patch })

  const submit = async () => {
    if (!draft) return
    setError(null)
    const changed = Object.fromEntries(
      Object.entries(draft).filter(([k, v]) => v !== data[k as keyof BookingRules]),
    ) as Partial<BookingRules>
    try {
      await save.mutateAsync(changed)
      setDraft(null)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
        {NUMERIC_RULES.map((r) => {
          const value = rules[r.key]
          return (
            <RuleCard
              key={r.key}
              icon={r.icon}
              title={r.title}
              description={r.description}
              enabled={value !== null}
              disabled={!canEdit}
              onToggle={(on) => set({ [r.key]: on ? (data[r.key] ?? r.fallback) : null })}
            >
              <select
                aria-label={r.title}
                className={selectClass}
                disabled={!canEdit || value === null}
                value={value ?? ''}
                onChange={(e) => set({ [r.key]: Number(e.target.value) })}
              >
                {value === null && <option value="">Desactivado</option>}
                {withOption(r.options, value).map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </select>
            </RuleCard>
          )
        })}
        <RuleCard
          icon={Users}
          title="Sobreventa"
          description="Permitir 2 citas en el mismo horario si hay un recurso libre."
          enabled={rules.allowOverbooking}
          disabled={!canEdit}
          onToggle={(on) => set({ allowOverbooking: on })}
        >
          <div className="rounded-[9px] bg-surface-2 px-2.5 py-2 text-sm font-semibold text-muted">
            {rules.allowOverbooking ? 'Activada' : 'Desactivada'}
          </div>
        </RuleCard>
        <RuleCard
          icon={ShieldCheck}
          title="Aprobación manual"
          description="Las reservas web quedan Pendientes hasta aprobarlas."
          enabled={rules.manualApproval !== 'off'}
          disabled={!canEdit}
          onToggle={(on) => set({ manualApproval: on ? 'new_clients' : 'off' })}
        >
          <select
            aria-label="Aprobación manual"
            className={selectClass}
            disabled={!canEdit || rules.manualApproval === 'off'}
            value={rules.manualApproval}
            onChange={(e) => set({ manualApproval: e.target.value as BookingRules['manualApproval'] })}
          >
            {rules.manualApproval === 'off' && <option value="off">Desactivada</option>}
            <option value="new_clients">Solo clientes nuevos</option>
            <option value="all">Todas las reservas</option>
          </select>
        </RuleCard>
      </div>

      {canEdit && (dirty || error) && (
        <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface/95 px-5 py-3 shadow-pop backdrop-blur">
          <span className={cn('text-sm', error ? 'font-semibold text-bad' : 'text-muted')}>
            {error ?? 'Tienes cambios sin guardar en las reglas'}
          </span>
          <div className="ml-auto flex gap-2.5">
            <Button onClick={() => setDraft(null)} disabled={save.isPending}>
              Descartar
            </Button>
            <Button variant="primary" onClick={() => void submit()} disabled={save.isPending || !dirty}>
              {save.isPending ? 'Guardando…' : 'Guardar reglas'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
