import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { appointmentsKey } from '@/features/agenda/api'
import { api } from '@/lib/api/client'
import type { Appointment } from '@/lib/api/types'

export type TimeOfDay = 'any' | 'morning' | 'afternoon' | 'evening'

export const TIME_OF_DAY: Record<TimeOfDay, string> = {
  any: 'Cualquier hora',
  morning: 'Mañana',
  afternoon: 'Tarde',
  evening: 'Noche',
}

export interface WaitlistEntry {
  id: string
  branchId: string
  serviceId: string
  serviceName: string
  professionalId: string | null
  professionalName: string | null
  client: { id: string; name: string; phone: string | null; email: string | null } | null
  dateFrom: string
  dateTo: string
  timeOfDay: TimeOfDay
  notes: string
  status: 'waiting' | 'booked' | 'removed'
  source: 'backoffice' | 'online'
  appointmentId: string | null
  notifiedAt: string | null
  createdAt: string
  options?: Array<{ startsAt: string; professionalId: string; professionalName: string }>
}

// Bajo la clave de citas: al agendar o cancelar, los horarios libres se recalculan.
const waitlistKey = (branchId?: string, status = 'waiting') => [...appointmentsKey, 'waitlist', branchId, status]

export function useWaitlist(branchId: string | undefined, status: 'waiting' | 'booked' | 'removed' = 'waiting') {
  return useQuery({
    queryKey: waitlistKey(branchId, status),
    queryFn: () => api<WaitlistEntry[]>(`/waitlist?branchId=${branchId}&status=${status}`),
    enabled: !!branchId,
    refetchInterval: 60_000,
  })
}

export interface WaitlistInput {
  branchId: string
  serviceId: string
  professionalId?: string
  clientId: string
  dateFrom: string
  dateTo: string
  timeOfDay: TimeOfDay
  notes?: string
}

export function useWaitlistActions() {
  const qc = useQueryClient()
  const refresh = () => qc.invalidateQueries({ queryKey: appointmentsKey })
  return {
    add: useMutation({ mutationFn: (body: WaitlistInput) => api<{ id: string }>('/waitlist', { method: 'POST', body }), onSuccess: refresh }),
    remove: useMutation({ mutationFn: (id: string) => api(`/waitlist/${id}`, { method: 'PATCH', body: { status: 'removed' } }), onSuccess: refresh }),
    restore: useMutation({ mutationFn: (id: string) => api(`/waitlist/${id}`, { method: 'PATCH', body: { status: 'waiting' } }), onSuccess: refresh }),
    book: useMutation({
      mutationFn: ({ id, ...body }: { id: string; professionalId: string; startsAt: string }) =>
        api<Appointment>(`/waitlist/${id}/book`, { method: 'POST', body }),
      onSuccess: refresh,
    }),
    notify: useMutation({
      mutationFn: (id: string) => api<{ emailSent: boolean; phone: string | null; whatsappText: string }>(`/waitlist/${id}/notify`, { method: 'POST' }),
      onSuccess: refresh,
    }),
  }
}
