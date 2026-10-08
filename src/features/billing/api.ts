import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import type { SubscriptionStatus } from '@/lib/api/types'

export type BillingMethod = 'yape' | 'plin' | 'transfer' | 'deposit' | 'card' | 'other'

export const BILLING_METHODS: Record<BillingMethod, string> = {
  yape: 'Yape',
  plin: 'Plin',
  transfer: 'Transferencia',
  deposit: 'Depósito',
  card: 'Tarjeta',
  other: 'Otro',
}

export interface SubscriptionPayment {
  id: string
  organizationId: string
  planCode: string
  billingCycle: 'monthly' | 'yearly'
  amount: number
  currency: 'PEN' | 'USD'
  method: BillingMethod
  reference: string
  paidOn: string
  note: string
  status: 'pending' | 'approved' | 'rejected'
  rejectReason: string | null
  /** Tiene foto del comprobante. */
  hasProof: boolean
  periodEnd: string | null
  createdAt: string
  organization?: { id: string; name: string; slug: string } | null
}

export interface BillingOverview {
  subscription: { planCode: string; status: SubscriptionStatus; billingCycle: 'monthly' | 'yearly'; trialEndsAt: string | null; currentPeriodEnd: string | null }
  plans: Array<{ code: string; name: string; description: string; price: { monthly: number; yearly: number; currency: string } }>
  payments: SubscriptionPayment[]
  instructions: { yape: string | null; bank: string | null; contact: string | null }
}

export function useBilling(enabled = true) {
  return useQuery({ queryKey: ['billing'], queryFn: () => api<BillingOverview>('/billing'), enabled })
}

export function useReportPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Omit<SubscriptionPayment, 'id' | 'organizationId' | 'status' | 'rejectReason' | 'hasProof' | 'periodEnd' | 'createdAt' | 'organization'> & { proofKey: string }) =>
      api<SubscriptionPayment>('/billing/payments', { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['billing'] }),
  })
}

/** Sube la foto del comprobante; devuelve la clave para registrar el pago. */
export function uploadBillingProof(file: File): Promise<string> {
  const body = new FormData()
  body.append('file', file)
  return api<{ key: string }>('/billing/proof', { method: 'POST', body }).then((r) => r.key)
}

export function usePlatformPayments(status: 'pending' | 'approved' | 'rejected') {
  return useQuery({ queryKey: ['platform', 'billing', status], queryFn: () => api<SubscriptionPayment[]>(`/platform/billing/payments?status=${status}`) })
}

export function usePlatformReview() {
  const qc = useQueryClient()
  const refresh = () => qc.invalidateQueries({ queryKey: ['platform'] })
  return {
    approve: useMutation({ mutationFn: (id: string) => api<SubscriptionPayment>(`/platform/billing/payments/${id}/approve`, { method: 'POST' }), onSuccess: refresh }),
    reject: useMutation({
      mutationFn: ({ id, reason }: { id: string; reason: string }) => api<SubscriptionPayment>(`/platform/billing/payments/${id}/reject`, { method: 'POST', body: { reason } }),
      onSuccess: refresh,
    }),
  }
}

/** Monto en céntimos con su moneda: "S/ 330.00" o "US$ 89.00". */
export const money = (cents: number, currency: string) =>
  `${currency === 'USD' ? 'US$' : 'S/'} ${(cents / 100).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
