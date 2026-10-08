import type { CSSProperties } from 'react'
import { useEffect, useRef } from 'react'
import { APPOINTMENT_STATUS_META } from '@/domain/appointment-status'
import type { Appointment, Professional, TimeRange } from '@/lib/api/types'
import { cn } from '@/lib/cn'
import { formatTime, minutesOfDay, minutesToTime } from '@/lib/time'

const HOUR_PX = 64
const PX = HOUR_PX / 60
const SNAP = 15

const dayHeader = new Intl.DateTimeFormat('es-PE', { weekday: 'short', timeZone: 'UTC' })

/** Distribuye citas que se cruzan en carriles, para que no se tapen. */
function layoutLanes(items: Appointment[]): Map<string, { lane: number; lanes: number }> {
  const sorted = [...items].sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const out = new Map<string, { lane: number; lanes: number }>()
  let cluster: Array<{ id: string; lane: number; end: number }> = []
  let clusterEnd = -1
  const flush = () => {
    const lanes = Math.max(1, ...cluster.map((c) => c.lane + 1))
    for (const c of cluster) out.set(c.id, { lane: c.lane, lanes })
    cluster = []
  }
  for (const a of sorted) {
    const s = minutesOfDay(a.startsAt)
    const e = s + a.durationMinutes
    if (s >= clusterEnd) {
      flush()
      clusterEnd = -1
    }
    const used = new Set(cluster.filter((c) => c.end > s).map((c) => c.lane))
    let lane = 0
    while (used.has(lane)) lane++
    cluster.push({ id: a.id, lane, end: e })
    clusterEnd = Math.max(clusterEnd, e)
  }
  flush()
  return out
}

function gaps(windows: TimeRange[], from: number, to: number): TimeRange[] {
  const sorted = [...windows].sort((a, b) => a.start - b.start)
  const out: TimeRange[] = []
  let cursor = from
  for (const w of sorted) {
    if (w.start > cursor) out.push({ start: cursor, end: Math.min(w.start, to) })
    cursor = Math.max(cursor, w.end)
  }
  if (cursor < to) out.push({ start: cursor, end: to })
  return out
}

export interface WeekDay {
  date: string
  /** Horario en que trabaja al menos uno de los profesionales visibles. */
  windows: TimeRange[]
  appointments: Appointment[]
  closedReason?: string
}

/** Semana de lunes a domingo; las citas llevan el color de su profesional. */
export function WeekView({
  days,
  professionals,
  range,
  today,
  nowMinutes,
  onSelect,
  onOpenDay,
  onEmptySlot,
}: {
  days: WeekDay[]
  professionals: Professional[]
  range: [number, number]
  today: string
  nowMinutes: number
  onSelect: (a: Appointment) => void
  onOpenDay: (date: string) => void
  onEmptySlot?: (date: string, minutes: number) => void
}) {
  const [from, to] = range
  const height = (to - from) * PX
  const top = (m: number) => (m - from) * PX
  const scrollRef = useRef<HTMLDivElement>(null)
  const colorOf = (id: string) => professionals.find((p) => p.id === id)?.color ?? 'var(--brand)'
  const nameOf = (id: string) => professionals.find((p) => p.id === id)?.displayName.split(' ')[0] ?? ''
  const showPro = professionals.length > 1
  const hours: number[] = []
  for (let m = from; m < to; m += 60) hours.push(m)

  const focusTop = Math.max(0, (8 * 60 - from) * PX)
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = focusTop
  }, [focusTop])

  const cols = `56px repeat(7, minmax(120px, 1fr))`
  return (
    <div ref={scrollRef} className="max-h-[calc(100vh-250px)] min-h-[420px] overflow-auto">
      <div style={{ minWidth: 56 + 7 * 120 }}>
        <div className="sticky top-0 z-30 grid border-b border-line bg-surface/95 backdrop-blur" style={{ gridTemplateColumns: cols }}>
          <div />
          {days.map((d) => {
            const isToday = d.date === today
            const count = d.appointments.filter((a) => a.status !== 'cancelled').length
            return (
              <button
                key={d.date}
                type="button"
                onClick={() => onOpenDay(d.date)}
                className="flex cursor-pointer flex-col items-center gap-0.5 border-l border-line px-2 py-2.5 hover:bg-surface-2"
                aria-label={`Ver el día ${d.date}`}
              >
                <span className="text-2xs font-semibold text-muted uppercase">{dayHeader.format(new Date(`${d.date}T12:00:00Z`))}</span>
                <span
                  className={cn(
                    'tabular grid size-8 place-items-center rounded-full text-md font-semibold',
                    isToday && 'bg-grad',
                  )}
                >
                  {Number(d.date.slice(8))}
                </span>
                <span className="text-2xs text-muted">{d.closedReason ?? (count ? `${count} ${count === 1 ? 'cita' : 'citas'}` : '—')}</span>
              </button>
            )
          })}
        </div>

        <div className="grid" style={{ gridTemplateColumns: cols }}>
          <div className="relative" style={{ height }} aria-hidden>
            {hours.map((m) => (
              <span key={m} className="tabular absolute right-2.5 -translate-y-1/2 text-2xs text-muted" style={{ top: top(m) + (m === from ? 8 : 0) }}>
                {minutesToTime(m)}
              </span>
            ))}
          </div>
          {days.map((d) => {
            const lanes = layoutLanes(d.appointments)
            return (
              <div
                key={d.date}
                className={cn('relative border-l border-line', onEmptySlot && 'cursor-pointer')}
                style={{
                  height,
                  backgroundImage: 'linear-gradient(to bottom, var(--line) 1px, transparent 1px)',
                  backgroundSize: `100% ${HOUR_PX}px`,
                }}
                onClick={(e) => {
                  if (!onEmptySlot || e.target !== e.currentTarget) return
                  const y = e.clientY - e.currentTarget.getBoundingClientRect().top
                  const minutes = Math.floor((from + y / PX) / SNAP) * SNAP
                  if (d.windows.some((w) => minutes >= w.start && minutes < w.end)) onEmptySlot(d.date, minutes)
                }}
              >
                {gaps(d.windows, from, to).map((g) => (
                  <div key={g.start} aria-hidden className="pointer-events-none absolute inset-x-0 bg-surface-2/80" style={{ top: top(g.start), height: (g.end - g.start) * PX }} />
                ))}
                {d.appointments.map((a) => {
                  const { lane, lanes: n } = lanes.get(a.id) ?? { lane: 0, lanes: 1 }
                  const color = colorOf(a.professionalId)
                  const name = a.client ? a.client.firstName : 'Cliente'
                  const h = Math.max(a.durationMinutes * PX - 2, 20)
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => onSelect(a)}
                      title={`${formatTime(a.startsAt)} · ${a.client ? `${a.client.firstName} ${a.client.lastName}` : ''} · ${a.serviceName} · ${nameOf(a.professionalId)} · ${APPOINTMENT_STATUS_META[a.status].label}`}
                      className={cn(
                        'absolute z-10 cursor-pointer overflow-hidden rounded-[8px] px-1.5 py-0.5 text-left text-2xs leading-tight hover:z-20 hover:shadow-card',
                        a.status === 'cancelled' && 'opacity-45 line-through',
                        a.status === 'no_show' && 'opacity-55',
                        a.status === 'pending' && 'outline-1 outline-dashed outline-warn/60',
                        a.status === 'completed' && 'opacity-70',
                      )}
                      style={
                        {
                          top: top(minutesOfDay(a.startsAt)) + 1,
                          height: h,
                          left: `calc(${(lane / n) * 100}% + 3px)`,
                          width: `calc(${100 / n}% - 6px)`,
                          background: `color-mix(in srgb, ${color} 14%, var(--surface))`,
                          borderLeft: `3px solid ${color}`,
                        } as CSSProperties
                      }
                    >
                      <span className="tabular block text-muted">{formatTime(a.startsAt)}</span>
                      <b className="block truncate font-semibold text-ink">{name}</b>
                      {showPro && h > 44 && <span className="block truncate text-muted">{nameOf(a.professionalId)}</span>}
                    </button>
                  )
                })}
                {d.date === today && nowMinutes >= from && nowMinutes <= to && (
                  <div aria-hidden className="pointer-events-none absolute inset-x-0 z-[15] h-[1.5px] bg-bad/80" style={{ top: top(nowMinutes) }} />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** "2026-10-12" → lunes de esa semana. */
export function startOfWeek(date: string): string {
  const d = new Date(`${date}T12:00:00Z`)
  const iso = d.getUTCDay() === 0 ? 7 : d.getUTCDay()
  d.setUTCDate(d.getUTCDate() - (iso - 1))
  return d.toISOString().slice(0, 10)
}

