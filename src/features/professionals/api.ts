import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import type { DaySchedule, Member, Professional, ProfessionalService, TimeOff, TimeOffType } from '@/lib/api/types'

export const professionalsKey = ['professionals'] as const
const timeOffKey = (id: string) => ['professionals', id, 'time-off'] as const

export interface ProfessionalInput {
  displayName: string
  title?: string
  color?: string
  email?: string
  phone?: string
  membershipId?: string | null
  branchIds: string[]
  services: Array<Pick<ProfessionalService, 'serviceId' | 'price'>>
  commissionPercent: number | null
  isActive?: boolean
}

export function useProfessionals(enabled = true) {
  return useQuery({ queryKey: professionalsKey, queryFn: () => api<Professional[]>('/professionals'), enabled })
}

export function useMembers(enabled: boolean) {
  return useQuery({ queryKey: ['members'], queryFn: () => api<Member[]>('/members'), enabled })
}

export function useSaveProfessional() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<ProfessionalInput> & { id?: string }) =>
      id
        ? api<Professional>(`/professionals/${id}`, { method: 'PATCH', body: input })
        : api<Professional>('/professionals', { method: 'POST', body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: professionalsKey }),
  })
}

export function useSaveSchedule(professionalId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { branchId: string; days: DaySchedule[] }) =>
      api<Professional>(`/professionals/${professionalId}/schedule`, { method: 'PUT', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: professionalsKey }),
  })
}

export function useTimeOff(professionalId: string, from: string) {
  return useQuery({
    queryKey: [...timeOffKey(professionalId), from],
    queryFn: () => api<TimeOff[]>(`/professionals/${professionalId}/time-off?from=${encodeURIComponent(from)}`),
  })
}

export function useTimeOffActions(professionalId: string) {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: timeOffKey(professionalId) })
  return {
    create: useMutation({
      mutationFn: (body: { type: TimeOffType; title?: string; startsAt: string; endsAt: string; note?: string }) =>
        api<TimeOff>(`/professionals/${professionalId}/time-off`, { method: 'POST', body }),
      onSuccess: invalidate,
    }),
    decide: useMutation({
      mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) =>
        api<TimeOff>(`/time-off/${id}`, { method: 'PATCH', body: { status } }),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api<void>(`/time-off/${id}`, { method: 'DELETE' }),
      onSuccess: invalidate,
    }),
  }
}
