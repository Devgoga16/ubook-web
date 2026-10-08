import { TIMEZONE } from './format'

/** 570 → "09:30" */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** "09:30" → 570. `null` si no es una hora válida. */
export function timeToMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim())
  if (!match) return null
  const h = Number(match[1])
  const m = Number(match[2])
  if (h > 24 || m > 59 || (h === 24 && m > 0)) return null
  return h * 60 + m
}

/** Desfase de la zona horaria en una fecha, p. ej. "-05:00" para Lima. */
function offsetFor(date: Date, timeZone: string): string {
  const name = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
    .formatToParts(date)
    .find((p) => p.type === 'timeZoneName')?.value
  const offset = name?.replace('GMT', '') ?? ''
  return offset === '' ? '+00:00' : offset
}

/** Fecha y hora "de pared" en la zona del negocio → ISO UTC. */
export function zonedToIso(date: string, time = '00:00', timeZone = TIMEZONE): string {
  const guess = new Date(`${date}T${time}:00Z`)
  return new Date(`${date}T${time}:00${offsetFor(guess, timeZone)}`).toISOString()
}

/** ISO UTC → { date: "2026-10-19", time: "09:00" } en la zona del negocio. */
export function isoToZoned(iso: string, timeZone = TIMEZONE): { date: string; time: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  )
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` }
}

const dayMonth = new Intl.DateTimeFormat('es-PE', { timeZone: TIMEZONE, day: 'numeric', month: 'short' })

/**
 * Rango legible: "19 – 26 oct" (días completos) o "4 nov · 09:00 – 13:00".
 * `endsAt` es exclusivo: un día completo termina a las 00:00 del día siguiente.
 */
export function formatRange(startsAt: string, endsAt: string): string {
  const s = isoToZoned(startsAt)
  const e = isoToZoned(endsAt)
  if (s.time === '00:00' && e.time === '00:00') {
    const last = new Date(new Date(endsAt).getTime() - 1)
    const a = dayMonth.format(new Date(startsAt))
    const b = dayMonth.format(last)
    return a === b ? a : `${a} – ${b}`
  }
  if (s.date === e.date) return `${dayMonth.format(new Date(startsAt))} · ${s.time} – ${e.time}`
  return `${dayMonth.format(new Date(startsAt))} ${s.time} – ${dayMonth.format(new Date(endsAt))} ${e.time}`
}

export const WEEKDAYS = [
  { iso: 1, short: 'Lun', long: 'Lunes' },
  { iso: 2, short: 'Mar', long: 'Martes' },
  { iso: 3, short: 'Mié', long: 'Miércoles' },
  { iso: 4, short: 'Jue', long: 'Jueves' },
  { iso: 5, short: 'Vie', long: 'Viernes' },
  { iso: 6, short: 'Sáb', long: 'Sábado' },
  { iso: 7, short: 'Dom', long: 'Domingo' },
]

/** Fecha de hoy en la zona del negocio ("2026-10-06"). */
export function todayLocal(): string {
  return isoToZoned(new Date().toISOString()).date
}

/** Date del calendario (hora local del navegador) → "YYYY-MM-DD". */
export function dateToYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** "YYYY-MM-DD" → Date local del navegador (para el calendario). */
export function ymdToDate(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}

export function addDaysYmd(ymd: string, days: number): string {
  return new Date(Date.parse(`${ymd}T12:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)
}

/** Día ISO (1 = lunes … 7 = domingo) de una fecha "YYYY-MM-DD". */
export function weekdayOfYmd(ymd: string): number {
  const d = new Date(`${ymd}T12:00:00Z`).getUTCDay()
  return d === 0 ? 7 : d
}

/** Minutos desde la medianoche (hora del negocio) de un instante ISO. */
export function minutesOfDay(iso: string): number {
  const { time } = isoToZoned(iso)
  return timeToMinutes(time) ?? 0
}

const longDate = new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })

/** "2026-10-06" → "Martes, 6 de octubre" */
export function formatLongDate(ymd: string): string {
  const text = longDate.format(new Date(`${ymd}T12:00:00Z`))
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** ISO → "09:30" en la hora del negocio. */
export function formatTime(iso: string): string {
  return isoToZoned(iso).time
}
