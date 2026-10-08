/**
 * Estados de una cita. Flujo normal:
 * pending → confirmed → checked_in → in_progress → completed
 * Salidas: cancelled, no_show.
 */
export const APPOINTMENT_STATUSES = [
  'pending',
  'confirmed',
  'checked_in',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
] as const

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number]

export type StatusTone = 'ok' | 'warn' | 'info' | 'done' | 'bad' | 'off'

export const APPOINTMENT_STATUS_META: Record<AppointmentStatus, { label: string; tone: StatusTone }> = {
  pending: { label: 'Pendiente', tone: 'warn' },
  confirmed: { label: 'Confirmada', tone: 'ok' },
  checked_in: { label: 'Llegó', tone: 'ok' },
  in_progress: { label: 'En curso', tone: 'info' },
  completed: { label: 'Completada', tone: 'done' },
  cancelled: { label: 'Cancelada', tone: 'bad' },
  no_show: { label: 'No asistió', tone: 'off' },
}
