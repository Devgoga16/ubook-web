import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/cn'
import { MONTHS, WEEKDAYS_SHORT } from '@/lib/format'
import { IconButton } from './button'

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

interface MiniCalendarProps {
  value?: Date
  onChange?: (date: Date) => void
  today?: Date
  /** Días con citas (punto teal). */
  hasEvents?: (date: Date) => boolean
  /** Días sin horarios libres (tachados, no seleccionables). */
  isFull?: (date: Date) => boolean
  size?: 'md' | 'lg'
  /** Se llama al cambiar de mes (para cargar disponibilidad del mes visible). */
  onMonthChange?: (firstDay: Date) => void
  /** Días anteriores a esta fecha no se pueden elegir. */
  minDate?: Date
}

/** Calendario mensual compacto. Semana de lunes a domingo. */
export function MiniCalendar({ value, onChange, today = new Date(), hasEvents, isFull, size = 'md', onMonthChange, minDate }: MiniCalendarProps) {
  const [month, setMonthState] = useState(() => {
    const base = value ?? today
    return new Date(base.getFullYear(), base.getMonth(), 1)
  })
  const setMonth = (next: Date) => {
    setMonthState(next)
    onMonthChange?.(next)
  }
  // Si el valor salta a otro mes (p. ej. con "Hoy"), el calendario lo sigue.
  const [lastValue, setLastValue] = useState(value)
  if (value && value.getTime() !== lastValue?.getTime()) {
    setLastValue(value)
    if (value.getFullYear() !== month.getFullYear() || value.getMonth() !== month.getMonth()) {
      setMonthState(new Date(value.getFullYear(), value.getMonth(), 1))
    }
  }

  const y = month.getFullYear()
  const m = month.getMonth()
  const offset = (new Date(y, m, 1).getDay() + 6) % 7
  const days = new Date(y, m + 1, 0).getDate()
  const cells: Array<{ date: Date; outside: boolean }> = []
  for (let i = offset; i > 0; i--) cells.push({ date: new Date(y, m, 1 - i), outside: true })
  for (let d = 1; d <= days; d++) cells.push({ date: new Date(y, m, d), outside: false })
  while (cells.length % 7) {
    const last = cells[cells.length - 1]!.date
    cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), outside: true })
  }

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between font-semibold">
        <span aria-live="polite">
          {MONTHS[m]} {y}
        </span>
        <span className="flex gap-0.5">
          <IconButton aria-label="Mes anterior" onClick={() => setMonth(new Date(y, m - 1, 1))}>
            <ChevronLeft size={16} />
          </IconButton>
          <IconButton aria-label="Mes siguiente" onClick={() => setMonth(new Date(y, m + 1, 1))}>
            <ChevronRight size={16} />
          </IconButton>
        </span>
      </div>
      <div
        role="grid"
        className={cn('tabular grid grid-cols-7 text-center text-xs', size === 'lg' ? 'gap-1.5 text-base' : 'gap-[3px]')}
      >
        {WEEKDAYS_SHORT.map((d) => (
          <span key={d} role="columnheader" className="pb-1 text-2xs font-semibold text-muted">
            {d}
          </span>
        ))}
        {cells.map(({ date, outside }) => {
          const selected = value && sameDay(date, value)
          const isToday = sameDay(date, today)
          const past = !!minDate && date < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())
          const full = !outside && (past || isFull?.(date))
          const dot = !outside && hasEvents?.(date)
          return (
            <button
              key={date.toISOString()}
              type="button"
              role="gridcell"
              aria-selected={selected || undefined}
              aria-current={isToday ? 'date' : undefined}
              aria-label={`${date.getDate()} de ${MONTHS[date.getMonth()]}${full && !past ? ', sin horarios' : ''}`}
              disabled={outside || full}
              onClick={() => onChange?.(date)}
              className={cn(
                'relative grid aspect-square max-w-full cursor-pointer place-items-center rounded-full font-medium hover:bg-surface-2',
                outside && 'cursor-default text-line-strong hover:bg-transparent',
                full && 'cursor-not-allowed text-muted hover:bg-transparent',
                full && !past && 'line-through',
                isToday && !selected && 'shadow-[inset_0_0_0_1.5px_var(--teal)]',
                selected && 'bg-grad hover:bg-transparent',
              )}
            >
              {date.getDate()}
              {dot && (
                <span
                  aria-hidden
                  className={cn('absolute bottom-[3px] size-1 rounded-full', selected ? 'bg-white' : 'bg-teal')}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
