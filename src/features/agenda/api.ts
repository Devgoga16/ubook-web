import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import type { Appointment, AppointmentStatusValue, ProfessionalSlots } from '@/lib/api/types'
import { zonedToIso } from '@/lib/time'

export const appointmentsKey = ['appointments'] as const

/** Citas entre dos fechas locales de la sede: [from, to). */
export function useRangeAppointments(branchId: string | undefined, from: string, to: string) {
  return useQuery({
    queryKey: [...appointmentsKey, branchId, from, to],
    queryFn: () =>
      api<Appointment[]>(
        `/appointments?branchId=${branchId}&from=${encodeURIComponent(zonedToIso(from))}&to=${encodeURIComponent(zonedToIso(to))}`,
      ),
    enabled: !!branchId,
    refetchInterval: 60_000,
    placeholderData: (prev) => prev,
  })
}

export function useAppointment(id: string | null | undefined) {
  return useQuery({
    queryKey: [...appointmentsKey, 'one', id],
    queryFn: () => api<Appointment>(`/appointments/${id}`),
    enabled: !!id,
  })
}

export interface ClientHistory {
  stats: { total: number; completed: number; noShows: number; cancelled: number; spent: number; lastVisit: string | null }
  upcoming: Appointment[]
  past: Appointment[]
}

export function useClientHistory(clientId: string | undefined) {
  return useQuery({
    queryKey: [...appointmentsKey, 'client', clientId],
    queryFn: () => api<ClientHistory>(`/clients/${clientId}/appointments`),
    enabled: !!clientId,
  })
}

export interface SlotsParams {
  branchId?: string
  serviceId?: string
  professionalId?: string
  date?: string
  excludeAppointmentId?: string
}

export function useSlots(p: SlotsParams) {
  const qs = new URLSearchParams(Object.entries(p).filter((e): e is [string, string] => !!e[1])).toString()
  return useQuery({
    queryKey: ['availability', qs],
    queryFn: () => api<{ date: string; timezone: string; professionals: ProfessionalSlots[] }>(`/availability?${qs}`),
    enabled: !!(p.branchId && p.serviceId && p.date),
  })
}

export function useAvailabilityDays(p: { branchId?: string; serviceId?: string; professionalId?: string; from: string; to: string }) {
  const qs = new URLSearchParams(Object.entries(p).filter((e): e is [string, string] => !!e[1])).toString()
  return useQuery({
    queryKey: ['availability-days', qs],
    queryFn: () => api<{ days: Array<{ date: string; free: number; total: number }> }>(`/availability/days?${qs}`),
    enabled: !!(p.branchId && p.serviceId),
  })
}

export function useAppointmentActions() {
  const qc = useQueryClient()
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: appointmentsKey })
    void qc.invalidateQueries({ queryKey: ['availability'] })
    void qc.invalidateQueries({ queryKey: ['availability-days'] })
  }
  return {
    create: useMutation({
      mutationFn: (body: { branchId: string; serviceId: string; professionalId: string; clientId: string; startsAt: string; notes?: string }) =>
        api<Appointment>('/appointments', { method: 'POST', body }),
      onSuccess: refresh,
    }),
    changeStatus: useMutation({
      mutationFn: ({ id, status, note, by }: { id: string; status: AppointmentStatusValue; note?: string; by?: 'client' | 'business' }) =>
        api<Appointment>(`/appointments/${id}/status`, { method: 'POST', body: { status, note, by } }),
      onSuccess: refresh,
    }),
    /** Cambiar horario y/o profesional y/o servicio. */
    reschedule: useMutation({
      mutationFn: ({ id, ...body }: { id: string; startsAt: string; professionalId?: string; serviceId?: string }) =>
        api<Appointment>(`/appointments/${id}/reschedule`, { method: 'POST', body }),
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: ({ id, ...body }: { id: string; notes?: string; clientId?: string }) =>
        api<Appointment>(`/appointments/${id}`, { method: 'PATCH', body }),
      onSuccess: refresh,
    }),
  }
}
