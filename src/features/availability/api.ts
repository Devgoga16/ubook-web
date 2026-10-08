import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import type { BookingRules, BranchException, BranchWithHours, DaySchedule, TimeRange } from '@/lib/api/types'
import { branchesQueryKey } from '@/lib/auth/branch-context'

export const rulesKey = ['booking-rules'] as const
const exceptionsKey = (branchId: string) => ['branches', branchId, 'exceptions'] as const

export function useBranchesWithHours() {
  return useQuery({ queryKey: branchesQueryKey, queryFn: () => api<BranchWithHours[]>('/branches') })
}

export function useBookingRules() {
  return useQuery({ queryKey: rulesKey, queryFn: () => api<BookingRules>('/booking-rules') })
}

export function useSaveBookingRules() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<BookingRules>) => api<BookingRules>('/booking-rules', { method: 'PATCH', body }),
    onSuccess: (data) => qc.setQueryData(rulesKey, data),
  })
}

export function useSaveOpeningHours() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ branchId, days }: { branchId: string; days: DaySchedule[] }) =>
      api<BranchWithHours>(`/branches/${branchId}/hours`, { method: 'PUT', body: { days } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: branchesQueryKey }),
  })
}

export function useCopyOpeningHours() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ from, to }: { from: string; to: string }) =>
      api<BranchWithHours>(`/branches/${from}/hours/copy`, { method: 'POST', body: { toBranchId: to } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: branchesQueryKey }),
  })
}

export function useExceptions(branchId: string, from: string) {
  return useQuery({
    queryKey: [...exceptionsKey(branchId), from],
    queryFn: () => api<BranchException[]>(`/branches/${branchId}/exceptions?from=${from}`),
    enabled: !!branchId,
  })
}

export interface ExceptionInput {
  date: string
  name: string
  type: 'closed' | 'custom_hours'
  intervals?: TimeRange[]
}

export function useExceptionActions(branchId: string) {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: exceptionsKey(branchId) })
  return {
    create: useMutation({
      mutationFn: (body: ExceptionInput) =>
        api<BranchException>(`/branches/${branchId}/exceptions`, { method: 'POST', body }),
      onSuccess: invalidate,
    }),
    bulk: useMutation({
      mutationFn: (items: ExceptionInput[]) =>
        api<{ created: number; skipped: number }>(`/branches/${branchId}/exceptions/bulk`, { method: 'POST', body: { items } }),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api<void>(`/branch-exceptions/${id}`, { method: 'DELETE' }),
      onSuccess: invalidate,
    }),
  }
}
