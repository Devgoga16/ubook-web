import type { BranchSchedule } from '@/lib/api/types'
import { WEEKDAYS } from '@/lib/time'

export interface ScheduleSummary {
  /** Días con al menos un bloque, en cualquier sede. */
  days: number
  /** Horas semanales sumando todas las sedes. */
  hours: number
  /** "Lun–Sáb", "Lun, Mié, Vie" o "" si no tiene horario. */
  label: string
}

export function summarizeSchedule(schedules: BranchSchedule[]): ScheduleSummary {
  const working = new Set<number>()
  let minutes = 0
  for (const s of schedules) {
    for (const d of s.days) {
      if (d.intervals.length) working.add(d.weekday)
      minutes += d.intervals.reduce((acc, r) => acc + (r.end - r.start), 0)
    }
  }
  const sorted = [...working].sort((a, b) => a - b)
  const short = (iso: number) => WEEKDAYS[iso - 1]!.short
  const consecutive = sorted.length > 2 && sorted.every((d, i) => i === 0 || d === sorted[i - 1]! + 1)
  const label = consecutive
    ? `${short(sorted[0]!)}–${short(sorted[sorted.length - 1]!)}`
    : sorted.map(short).join(', ')
  return { days: sorted.length, hours: Math.round((minutes / 60) * 10) / 10, label }
}
