import { Banknote, CreditCard, Landmark, Smartphone, Wallet, type LucideIcon } from 'lucide-react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { appointmentsKey } from '@/features/agenda/api'
import { api } from '@/lib/api/client'
import type { AppointmentPayments, CashDay, CommissionRow, PaymentMethod, PaymentTotals, PaymentView } from '@/lib/api/types'

const paymentsKey = ['payments'] as const

export const METHODS: Array<{ value: PaymentMethod; label: string; icon: LucideIcon; reference?: string }> = [
  { value: 'cash', label: 'Efectivo', icon: Banknote },
  { value: 'yape', label: 'Yape', icon: Smartphone, reference: 'N.º de operación' },
  { value: 'plin', label: 'Plin', icon: Smartphone, reference: 'N.º de operación' },
  { value: 'card', label: 'Tarjeta (POS)', icon: CreditCard, reference: 'N.º de voucher' },
  { value: 'transfer', label: 'Transferencia', icon: Landmark, reference: 'N.º de operación' },
  { value: 'other', label: 'Otro', icon: Wallet },
]
export const methodLabel = (m: PaymentMethod) => METHODS.find((x) => x.value === m)?.label ?? m

export function useAppointmentPayments(appointmentId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: [...paymentsKey, 'appointment', appointmentId],
    queryFn: () => api<AppointmentPayments>(`/appointments/${appointmentId}/payments`),
    enabled: !!appointmentId && enabled,
  })
}

export interface PaymentInput {
  methods: Array<{ method: PaymentMethod; amount: number; reference?: string }>
  discount?: number
  tip?: number
  note?: string
  complete?: boolean
}

export function usePaymentActions() {
  const qc = useQueryClient()
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: paymentsKey })
    void qc.invalidateQueries({ queryKey: appointmentsKey })
  }
  return {
    pay: useMutation({
      mutationFn: ({ appointmentId, ...body }: PaymentInput & { appointmentId: string }) =>
        api<AppointmentPayments>(`/appointments/${appointmentId}/payments`, { method: 'POST', body }),
      onSuccess: refresh,
    }),
    void: useMutation({
      mutationFn: ({ id, reason }: { id: string; reason: string }) => api<PaymentView>(`/payments/${id}/void`, { method: 'POST', body: { reason } }),
      onSuccess: refresh,
    }),
  }
}

/** Validar o rechazar el adelanto que subió el cliente. */
export function useDepositActions(appointmentId: string) {
  const qc = useQueryClient()
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: paymentsKey })
    void qc.invalidateQueries({ queryKey: appointmentsKey })
    void qc.invalidateQueries({ queryKey: ['dashboard'] })
  }
  return {
    approve: useMutation({
      mutationFn: () => api(`/appointments/${appointmentId}/deposit/approve`, { method: 'POST' }),
      onSuccess: refresh,
    }),
    reject: useMutation({
      mutationFn: (reason: string) => api(`/appointments/${appointmentId}/deposit/reject`, { method: 'POST', body: { reason } }),
      onSuccess: refresh,
    }),
  }
}

export function usePayments(p: { from: string; to: string; branchId?: string; professionalId?: string }) {
  const q = new URLSearchParams({ from: p.from, to: p.to, ...(p.branchId && { branchId: p.branchId }), ...(p.professionalId && { professionalId: p.professionalId }) })
  return useQuery({
    queryKey: [...paymentsKey, 'list', p],
    queryFn: () => api<{ items: PaymentView[]; totals: PaymentTotals }>(`/payments?${q}`),
    placeholderData: keepPreviousData,
  })
}

export function useCommissions(p: { from: string; to: string; branchId?: string; professionalId?: string }) {
  const q = new URLSearchParams({ from: p.from, to: p.to, ...(p.branchId && { branchId: p.branchId }), ...(p.professionalId && { professionalId: p.professionalId }) })
  return useQuery({
    queryKey: [...paymentsKey, 'commissions', p],
    queryFn: () => api<CommissionRow[]>(`/payments/commissions?${q}`),
    placeholderData: keepPreviousData,
  })
}

export function useCashDay(branchId: string | undefined, date: string, enabled = true) {
  return useQuery({
    queryKey: [...paymentsKey, 'cash', branchId, date],
    queryFn: () => api<CashDay>(`/cash/day?branchId=${branchId}&date=${date}`),
    enabled: !!branchId && enabled,
  })
}

export function useCashActions() {
  const qc = useQueryClient()
  const set = (day: CashDay) => {
    qc.setQueryData([...paymentsKey, 'cash', day.branchId, day.date], day)
    void qc.invalidateQueries({ queryKey: paymentsKey })
  }
  return {
    movement: useMutation({
      mutationFn: (body: { branchId: string; type: 'in' | 'out'; amount: number; concept: string }) => api<CashDay>('/cash/movements', { method: 'POST', body }),
      onSuccess: set,
    }),
    close: useMutation({
      mutationFn: (body: { branchId: string; date: string; openingCash: number; countedCash: number; notes?: string }) =>
        api<CashDay>('/cash/close', { method: 'POST', body }),
      onSuccess: set,
    }),
    reopen: useMutation({
      mutationFn: (body: { branchId: string; date: string }) => api<CashDay>('/cash/reopen', { method: 'POST', body }),
      onSuccess: set,
    }),
  }
}
