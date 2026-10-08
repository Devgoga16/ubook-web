import type { Appointment, BranchException, Professional } from '@/lib/api/types'
import { cn } from '@/lib/cn'
import { WEEKDAYS_SHORT } from '@/lib/format'
import { addDaysYmd, formatTime, isoToZoned } from '@/lib/time'

const MAX_ITEMS = 3

/** Primer lunes de la cuadrícula del mes que contiene `date` (6 semanas). */
export function monthGridStart(date: string): string {
  const first = `${date.slice(0, 7)}-01`
  const d = new Date(`${first}T12:00:00Z`)
  const iso = d.getUTCDay() === 0 ? 7 : d.getUTCDay()
  return addDaysYmd(first, -(iso - 1))
}

/** Mes en cuadrícula: hasta 3 citas por día y "+N más". Clic en el día abre la vista de día. */
export function MonthView({
  date,
  today,
  appointments,
  professionals,
  exceptions,
  onOpenDay,
  onSelect,
}: {
  date: string
  today: string
  appointments: Appointment[]
  professionals: Professional[]
  exceptions: BranchException[]
  onOpenDay: (date: string) => void
  onSelect: (a: Appointment) => void
}) {
  const start = monthGridStart(date)
  const month = date.slice(0, 7)
  const cells = Array.from({ length: 42 }, (_, i) => addDaysYmd(start, i))
  const byDay = new Map<string, Appointment[]>()
  for (const a of appointments) {
    const d = isoToZoned(a.startsAt).date
    byDay.set(d, [...(byDay.get(d) ?? []), a])
  }
  const colorOf = (id: string) => professionals.find((p) => p.id === id)?.color ?? 'var(--brand)'

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[700px] grid-cols-7">
        {WEEKDAYS_SHORT.map((d) => (
          <div key={d} className="border-b border-line px-3 py-2.5 text-2xs font-semibold text-muted uppercase">
            {d}
          </div>
        ))}
        {cells.map((d, i) => {
          const inMonth = d.slice(0, 7) === month
          const list = (byDay.get(d) ?? []).sort((a, b) => a.startsAt.localeCompare(b.startsAt))
          const active = list.filter((a) => a.status !== 'cancelled')
          const exception = exceptions.find((e) => e.date === d)
          const shown = active.slice(0, MAX_ITEMS)
          return (
            <div
              key={d}
              role="button"
              tabIndex={0}
              onClick={() => onOpenDay(d)}
              onKeyDown={(e) => e.key === 'Enter' && onOpenDay(d)}
              aria-label={`${d}, ${active.length} citas`}
              className={cn(
                'flex min-h-[118px] cursor-pointer flex-col gap-1 border-b border-line p-2 text-left transition-colors hover:bg-surface-2/70',
                i % 7 !== 0 && 'border-l',
                !inMonth && 'bg-surface-2/40',
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'tabular grid size-7 place-items-center rounded-full text-sm font-semibold',
                    !inMonth && 'text-muted',
                    d === today && 'bg-grad',
                  )}
                >
                  {Number(d.slice(8))}
                </span>
                {active.length > 0 && <span className="tabular text-2xs font-semibold text-muted">{active.length}</span>}
              </div>
              {exception && (
                <span className="truncate rounded-[6px] bg-warn-bg px-1.5 py-0.5 text-2xs font-semibold text-warn">
                  {exception.type === 'closed' ? 'Cerrado' : 'Horario especial'} · {exception.name}
                </span>
              )}
              {shown.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelect(a)
                  }}
                  className={cn(
                    'flex cursor-pointer items-center gap-1.5 truncate rounded-[6px] px-1.5 py-0.5 text-left text-2xs text-ink-2 hover:bg-surface',
                    a.status === 'no_show' && 'opacity-55',
                  )}
                >
                  <span className="size-1.5 flex-none rounded-full" style={{ background: colorOf(a.professionalId) }} aria-hidden />
                  <span className="tabular text-muted">{formatTime(a.startsAt)}</span>
                  <span className="truncate font-semibold text-ink">{a.client?.firstName ?? 'Cliente'}</span>
                </button>
              ))}
              {active.length > MAX_ITEMS && (
                <span className="px-1.5 text-2xs font-semibold text-brand">+{active.length - MAX_ITEMS} más</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
