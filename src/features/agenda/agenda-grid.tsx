import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Avatar } from '@/components/ui/avatar'
import { StatusChip } from '@/components/ui/badges'
import type { Appointment, BranchException, BranchWithHours, Professional, TimeRange } from '@/lib/api/types'
import { cn } from '@/lib/cn'
import { formatTime, minutesOfDay, minutesToTime, weekdayOfYmd } from '@/lib/time'

/** Alto de una hora (px). Más aire que el prototipo para que se lea fácil. */
export const HOUR_PX = 84
const PX = HOUR_PX / 60
const SNAP = 15
/** Bloque "fantasma" al pasar el mouse por un hueco libre. */
const GHOST_MINUTES = 30

function intersect(a: TimeRange[], b: TimeRange[]): TimeRange[] {
  const out: TimeRange[] = []
  for (const x of a) for (const y of b) {
    const start = Math.max(x.start, y.start)
    const end = Math.min(x.end, y.end)
    if (end > start) out.push({ start, end })
  }
  return out.sort((p, q) => p.start - q.start)
}

/** Ventanas de trabajo del profesional ese día (cruzadas con la sede y su excepción). */
export function workingWindows(p: Professional, branch: BranchWithHours, date: string, exception?: BranchException): TimeRange[] {
  const weekday = weekdayOfYmd(date)
  const own = p.schedules.find((s) => s.branchId === branch.id)?.days.find((d) => d.weekday === weekday)?.intervals ?? []
  if (!own.length || exception?.type === 'closed') return []
  const branchDay =
    exception?.type === 'custom_hours'
      ? exception.intervals
      : branch.openingHours.length
        ? (branch.openingHours.find((d) => d.weekday === weekday)?.intervals ?? [])
        : null
  return branchDay ? intersect(own, branchDay) : own
}

/** Rango de horas visible: lo que abarque cualquier horario o cita, mínimo 9–19. */
export function visibleRange(windows: TimeRange[][], appointments: Appointment[]): [number, number] {
  const starts = [...windows.flat().map((w) => w.start), ...appointments.map((a) => minutesOfDay(a.startsAt))]
  const ends = [...windows.flat().map((w) => w.end), ...appointments.map((a) => minutesOfDay(a.endsAt) || 24 * 60)]
  const from = Math.floor(Math.min(9 * 60, ...starts) / 60) * 60
  const to = Math.ceil(Math.max(19 * 60, ...ends) / 60) * 60
  return [from, Math.min(to, 24 * 60)]
}

/** Ausencia recortada al día mostrado (minutos locales). */
export interface DayTimeOff {
  id: string
  title?: string
  start: number
  end: number
}

export interface AgendaColumn {
  professional: Professional
  windows: TimeRange[]
  timeOff: DayTimeOff[]
  appointments: Appointment[]
}

function offHours(windows: TimeRange[], from: number, to: number): Array<TimeRange & { kind: 'before' | 'break' | 'after' }> {
  const out: Array<TimeRange & { kind: 'before' | 'break' | 'after' }> = []
  let cursor = from
  windows.forEach((w, i) => {
    if (w.start > cursor) out.push({ start: cursor, end: Math.min(w.start, to), kind: i === 0 ? 'before' : 'break' })
    cursor = Math.max(cursor, w.end)
  })
  if (cursor < to) out.push({ start: cursor, end: to, kind: 'after' })
  return out
}

const STATUS_STYLE: Record<Appointment['status'], string> = {
  pending: 'outline-1 outline-dashed outline-warn/60',
  confirmed: '',
  checked_in: '',
  in_progress: 'shadow-[0_0_0_1.5px_var(--info)]',
  completed: 'opacity-70',
  cancelled: 'opacity-45 [&_.name]:line-through',
  no_show: 'opacity-55 outline-1 outline-dashed outline-off/60',
}

function AppointmentCard({
  appointment: a,
  color,
  top,
  selected,
  onSelect,
}: {
  appointment: Appointment
  color: string
  top: number
  selected: boolean
  onSelect: () => void
}) {
  const height = Math.max(a.durationMinutes * PX - 3, 26)
  const name = a.client ? `${a.client.firstName} ${a.client.lastName}`.trim() : 'Cliente'
  const roomy = height >= 58
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${name}, ${a.serviceName}, ${formatTime(a.startsAt)}`}
      className={cn(
        'absolute right-1.5 left-1.5 z-10 flex cursor-pointer flex-col overflow-hidden rounded-[10px] px-2.5 py-1.5 text-left transition-[box-shadow,transform] hover:z-20 hover:-translate-y-px hover:shadow-card',
        STATUS_STYLE[a.status],
        selected && 'z-20 shadow-[0_0_0_2px_var(--teal)]',
      )}
      style={
        {
          top,
          height,
          background: `color-mix(in srgb, ${color} 13%, var(--surface))`,
          borderLeft: `3px solid ${color}`,
        } as CSSProperties
      }
    >
      {roomy ? (
        <>
          <span className="flex items-center justify-between gap-2">
            <span className="tabular text-2xs text-muted">
              {formatTime(a.startsAt)} – {formatTime(a.endsAt)}
            </span>
            {a.status !== 'confirmed' && <StatusChip status={a.status} className="px-1.5 py-0" />}
          </span>
          <span className="name truncate text-body font-semibold text-ink">{name}</span>
          <span className="truncate text-2xs text-ink-2">{a.serviceName}</span>
        </>
      ) : (
        <span className="truncate text-xs text-ink-2">
          <b className="name font-semibold text-ink">{name}</b> · {formatTime(a.startsAt)} · {a.serviceName}
        </span>
      )}
    </button>
  )
}

/** Vista de día con una columna por profesional. */
export function AgendaGrid({
  columns,
  range,
  nowMinutes,
  selectedId,
  onSelect,
  onEmptySlot,
}: {
  columns: AgendaColumn[]
  range: [number, number]
  /** Minuto actual si la fecha mostrada es hoy (línea de "ahora"). */
  nowMinutes: number | null
  selectedId: string | null
  onSelect: (appointment: Appointment) => void
  /** Clic en un hueco libre dentro del horario de trabajo. */
  onEmptySlot?: (professional: Professional, minutes: number) => void
}) {
  const [from, to] = range
  const height = (to - from) * PX
  const top = (m: number) => (m - from) * PX
  const scrollRef = useRef<HTMLDivElement>(null)
  const [ghost, setGhost] = useState<{ col: number; minutes: number } | null>(null)

  const hours: number[] = []
  for (let m = from; m < to; m += 60) hours.push(m)

  // Al abrir, muestra la hora actual (o la primera cita) sin tener que bajar.
  const firstAppointment = columns
    .flatMap((c) => c.appointments.map((a) => minutesOfDay(a.startsAt)))
    .sort((x, y) => x - y)[0]
  const focus = nowMinutes ?? firstAppointment ?? from
  const focusTop = Math.max(0, (focus - 60 - from) * PX)
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = focusTop
  }, [focusTop])

  const freeAt = (c: AgendaColumn, minutes: number) =>
    c.windows.some((w) => minutes >= w.start && minutes + SNAP <= w.end) &&
    !c.timeOff.some((t) => minutes < t.end && minutes + SNAP > t.start) &&
    !c.appointments.some((a) => {
      if (a.status === 'cancelled') return false
      const s = minutesOfDay(a.startsAt)
      return minutes < s + a.durationMinutes && minutes + SNAP > s
    })

  const gridCols = `56px repeat(${columns.length}, minmax(200px, 1fr))`

  return (
    <div ref={scrollRef} className="max-h-[calc(100vh-250px)] min-h-[420px] overflow-auto">
      <div style={{ minWidth: 56 + columns.length * 200 }}>
        {/* Encabezado fijo con los profesionales */}
        <div className="sticky top-0 z-30 grid border-b border-line bg-surface/95 backdrop-blur" style={{ gridTemplateColumns: gridCols }}>
          <div className="sticky left-0 bg-surface/95" />
          {columns.map(({ professional: p, windows, appointments }) => {
            const active = appointments.filter((a) => a.status !== 'cancelled')
            const worked = windows.reduce((acc, w) => acc + (w.end - w.start), 0)
            const booked = active.reduce((acc, a) => acc + a.durationMinutes, 0)
            const pct = worked ? Math.min(100, Math.round((booked / worked) * 100)) : 0
            return (
              <div key={p.id} className="flex min-w-0 items-center gap-2.5 border-l border-line px-3 py-3">
                <Avatar name={p.displayName} color={p.color} round />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{p.displayName}</div>
                  <div className="text-2xs text-muted">
                    {windows.length
                      ? `${active.length} ${active.length === 1 ? 'cita' : 'citas'} · ${minutesToTime(windows[0]!.start)}–${minutesToTime(windows[windows.length - 1]!.end)}`
                      : 'No trabaja este día'}
                  </div>
                </div>
                {worked > 0 && (
                  <span className="tabular text-2xs font-semibold text-muted" title="Ocupación del día">
                    {pct}%
                  </span>
                )}
              </div>
            )
          })}
        </div>

        <div className="grid" style={{ gridTemplateColumns: gridCols }}>
          {/* Eje de horas */}
          <div className="sticky left-0 z-20 bg-surface" style={{ height }} aria-hidden>
            {hours
              // La etiqueta de "ahora" reemplaza a la hora cercana para que no se encimen.
              .filter((m) => nowMinutes === null || Math.abs(nowMinutes - m) > 12)
              .map((m) => (
                <span key={m} className="tabular absolute right-2.5 -translate-y-1/2 text-2xs text-muted" style={{ top: top(m) + (m === from ? 8 : 0) }}>
                  {minutesToTime(m)}
                </span>
              ))}
            {nowMinutes !== null && nowMinutes >= from && nowMinutes <= to && (
              <span
                className="tabular absolute right-1 z-10 -translate-y-1/2 rounded-full bg-bad px-1.5 py-px text-2xs font-semibold text-white dark:text-bg"
                style={{ top: top(nowMinutes) }}
              >
                {minutesToTime(nowMinutes)}
              </span>
            )}
          </div>

          {columns.map((c, col) => (
            <div
              key={c.professional.id}
              className={cn('relative border-l border-line', onEmptySlot && 'cursor-pointer')}
              style={{
                height,
                backgroundImage: `linear-gradient(to bottom, var(--line) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--line) 45%, transparent) 1px, transparent 1px)`,
                backgroundSize: `100% ${HOUR_PX}px, 100% ${HOUR_PX / 2}px`,
              }}
              onMouseMove={(e) => {
                if (!onEmptySlot || e.target !== e.currentTarget) return setGhost(null)
                const y = e.clientY - e.currentTarget.getBoundingClientRect().top
                const minutes = Math.floor((from + y / PX) / SNAP) * SNAP
                setGhost(freeAt(c, minutes) ? { col, minutes } : null)
              }}
              onMouseLeave={() => setGhost(null)}
              onClick={(e) => {
                if (!onEmptySlot || e.target !== e.currentTarget) return
                const y = e.clientY - e.currentTarget.getBoundingClientRect().top
                const minutes = Math.floor((from + y / PX) / SNAP) * SNAP
                if (freeAt(c, minutes)) onEmptySlot(c.professional, minutes)
              }}
            >
              {offHours(c.windows, from, to).map((g) => (
                <div
                  key={g.start}
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 flex justify-center bg-surface-2/80 pt-1.5 text-2xs font-medium text-muted"
                  style={{ top: top(g.start), height: (g.end - g.start) * PX }}
                >
                  {c.windows.length === 0 ? (g.start === from ? 'Sin horario este día' : '') : g.kind === 'break' ? 'Pausa' : ''}
                </div>
              ))}
              {c.timeOff.map((t) => {
                const s = Math.max(from, t.start)
                const e = Math.min(to, t.end)
                if (e <= s) return null
                return (
                  <div
                    key={t.id}
                    className="pointer-events-none absolute inset-x-1.5 flex justify-center rounded-[10px] border border-dashed border-line-strong bg-off-bg pt-1.5 text-2xs font-semibold text-off"
                    style={{ top: top(s) + 1, height: (e - s) * PX - 2 }}
                  >
                    Ausente{t.title ? ` · ${t.title}` : ''}
                  </div>
                )
              })}
              {ghost?.col === col && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-1.5 flex items-start rounded-[10px] border border-dashed border-teal bg-teal-soft/60 px-2.5 py-1 text-2xs font-semibold text-teal-ink"
                  style={{ top: top(ghost.minutes) + 1, height: GHOST_MINUTES * PX - 2 }}
                >
                  + Agendar {minutesToTime(ghost.minutes)}
                </div>
              )}
              {c.appointments.map((a) => (
                <AppointmentCard
                  key={a.id}
                  appointment={a}
                  color={c.professional.color}
                  top={top(minutesOfDay(a.startsAt)) + 1.5}
                  selected={selectedId === a.id}
                  onSelect={() => onSelect(a)}
                />
              ))}
              {nowMinutes !== null && nowMinutes >= from && nowMinutes <= to && (
                <div aria-hidden className="pointer-events-none absolute inset-x-0 z-[15] h-[1.5px] bg-bad/80" style={{ top: top(nowMinutes) }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
