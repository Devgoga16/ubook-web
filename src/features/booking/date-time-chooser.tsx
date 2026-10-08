import { useQuery } from '@tanstack/react-query'
import { CalendarX, Moon, Sun, Sunrise } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Skeleton } from '@/components/ui/display'
import { cn } from '@/lib/cn'
import { addDaysYmd, formatLongDate, formatTime, todayLocal, weekdayOfYmd } from '@/lib/time'
import type { SlotsSource } from './api'

const WEEKDAY = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTH = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
/** La API permite consultar hasta 42 días a la vez. */
const MAX_DAYS = 42

const PERIODS = [
  { label: 'Mañana', icon: Sunrise, test: (h: number) => h < 12 },
  { label: 'Tarde', icon: Sun, test: (h: number) => h >= 12 && h < 18 },
  { label: 'Noche', icon: Moon, test: (h: number) => h >= 18 },
]

/**
 * Días en una tira horizontal y horarios agrupados por momento del día.
 * Con varios profesionales ("cualquiera"), junta todos los horarios libres.
 */
export function DateTimeChooser({
  source,
  maxAdvanceDays,
  value,
  onChange,
}: {
  source: SlotsSource
  maxAdvanceDays: number | null
  value: string | null
  onChange: (startsAt: string) => void
}) {
  const from = todayLocal()
  const to = addDaysYmd(from, Math.min(maxAdvanceDays ?? MAX_DAYS, MAX_DAYS) - 1)
  const days = useQuery({ queryKey: [...source.key, 'days', from, to], queryFn: () => source.days(from, to) })
  const [date, setDate] = useState<string | null>(null)
  const stripRef = useRef<HTMLDivElement>(null)

  const freeByDate = useMemo(() => new Map((days.data?.days ?? []).map((d) => [d.date, d.free])), [days.data])
  const allDates = useMemo(() => {
    const list: string[] = []
    for (let d = from; d <= to; d = addDaysYmd(d, 1)) list.push(d)
    return list
  }, [from, to])
  const firstFree = allDates.find((d) => (freeByDate.get(d) ?? 0) > 0) ?? null
  const selected = date ?? firstFree

  useEffect(() => {
    if (!selected) return
    stripRef.current?.querySelector<HTMLElement>(`[data-date="${selected}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [selected])

  const slots = useQuery({
    queryKey: [...source.key, 'day', selected],
    queryFn: () => source.slots(selected!),
    enabled: !!selected,
  })
  const times = useMemo(
    () => [...new Set((slots.data?.professionals ?? []).flatMap((p) => p.slots))].sort(),
    [slots.data],
  )

  if (days.isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-[72px]" />
        <Skeleton className="h-28" />
      </div>
    )
  }
  if (!firstFree) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-[14px] bg-surface-2 px-5 py-8 text-center">
        <CalendarX size={24} className="text-muted" aria-hidden />
        <p className="m-0 font-semibold">No hay horarios libres en los próximos días</p>
        <p className="m-0 text-sm text-muted">Prueba con otro profesional o comunícate con el negocio.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div ref={stripRef} role="radiogroup" aria-label="Día" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
        {allDates.map((d) => {
          const free = freeByDate.get(d) ?? 0
          const on = d === selected
          const [, m, day] = d.split('-').map(Number) as [number, number, number]
          return (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`${formatLongDate(d)}${free ? '' : ', sin horarios'}`}
              data-date={d}
              disabled={free === 0}
              onClick={() => setDate(d)}
              className={cn(
                'flex w-[58px] flex-none cursor-pointer flex-col items-center gap-0.5 rounded-[12px] border border-line-strong bg-surface py-2 text-ink',
                'disabled:cursor-not-allowed disabled:border-dashed disabled:opacity-45',
                on ? 'bg-grad border-transparent' : 'hover:border-teal',
              )}
            >
              <span className={cn('text-2xs font-semibold', !on && 'text-muted')}>{d === from ? 'Hoy' : WEEKDAY[weekdayOfYmd(d)]}</span>
              <span className="tabular text-lg leading-tight font-semibold">{day}</span>
              <span className={cn('text-[10px]', !on && 'text-muted')}>{MONTH[m - 1]}</span>
            </button>
          )
        })}
      </div>

      {selected && <p className="m-0 text-sm font-semibold">{formatLongDate(selected)}</p>}

      {slots.isLoading ? (
        <Skeleton className="h-28" />
      ) : times.length === 0 ? (
        <p className="m-0 text-sm text-muted">Ya no quedan horarios este día. Elige otro.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {PERIODS.map(({ label, icon: Icon, test }) => {
            const group = times.filter((t) => test(Number(formatTime(t).slice(0, 2))))
            if (!group.length) return null
            return (
              <div key={label} className="flex flex-col gap-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                  <Icon size={14} aria-hidden /> {label}
                </span>
                <div role="radiogroup" aria-label={`Horarios de la ${label.toLowerCase()}`} className="grid grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-2">
                  {group.map((t) => {
                    const on = t === value
                    return (
                      <button
                        key={t}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => onChange(t)}
                        className={cn(
                          'tabular cursor-pointer rounded-control border px-2 py-2.5 text-sm font-semibold',
                          on ? 'bg-grad border-transparent' : 'border-line-strong bg-surface text-ink hover:border-teal',
                        )}
                      >
                        {formatTime(t)}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
