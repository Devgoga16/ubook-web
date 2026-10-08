import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import type { DepositMethod, PublicBookingView, PublicBusiness, PublicDays, PublicSlots } from '@/lib/api/types'

/** Llamadas sin sesión: nunca intentan renovar el token. */
const publicApi = <T,>(path: string, init: { method?: string; body?: unknown } = {}) => api<T>(`/public${path}`, { ...init, skipRefresh: true })

export function useBusiness(slug: string) {
  return useQuery({ queryKey: ['public', slug], queryFn: () => publicApi<PublicBusiness>(`/businesses/${slug}`), retry: false, staleTime: 60_000 })
}

export interface SlotsSource {
  key: readonly unknown[]
  days: (from: string, to: string) => Promise<PublicDays>
  slots: (date: string) => Promise<PublicSlots>
}

/** Fuente de horarios para reservar en un negocio. */
export function businessSource(slug: string, p: { branchId: string; serviceId: string; professionalId?: string }): SlotsSource {
  const q = new URLSearchParams({ branchId: p.branchId, serviceId: p.serviceId, ...(p.professionalId && { professionalId: p.professionalId }) })
  return {
    key: ['public', slug, 'slots', p.branchId, p.serviceId, p.professionalId ?? 'any'],
    days: (from, to) => publicApi<PublicDays>(`/businesses/${slug}/days?${q}&from=${from}&to=${to}`),
    slots: (date) => publicApi<PublicSlots>(`/businesses/${slug}/slots?${q}&date=${date}`),
  }
}

/** Fuente de horarios para reprogramar una reserva existente. */
export function bookingSource(token: string): SlotsSource {
  return {
    key: ['public', 'booking', token, 'slots'],
    days: (from, to) => publicApi<PublicDays>(`/bookings/${token}/days?from=${from}&to=${to}`),
    slots: (date) => publicApi<PublicSlots>(`/bookings/${token}/slots?date=${date}`),
  }
}

export interface BookingInput {
  branchId: string
  serviceId: string
  professionalId?: string
  startsAt: string
  client: { firstName: string; lastName: string; phone: string; email?: string }
  notes?: string
  acceptsTerms: boolean
  marketingConsent?: boolean
  promoCode?: string
  deposit?: { proofKey: string; method: DepositMethod; reference?: string }
}

export function useCreateBooking(slug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: BookingInput) => publicApi<{ token: string; booking: PublicBookingView }>(`/businesses/${slug}/bookings`, { method: 'POST', body }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['public', slug, 'slots'] }),
  })
}

/** Sube la foto del comprobante del adelanto; devuelve la clave para la reserva. */
export function uploadDepositProof(slug: string, file: File): Promise<string> {
  const body = new FormData()
  body.append('file', file)
  return publicApi<{ key: string }>(`/businesses/${slug}/uploads`, { method: 'POST', body }).then((r) => r.key)
}

/** Monto del adelanto sobre el precio final (misma regla que el servidor). */
export function depositAmount(rule: { type: 'percent' | 'fixed'; value: number }, price: number): number {
  if (price <= 0) return 0
  return rule.type === 'percent' ? Math.max(1, Math.round((price * rule.value) / 100)) : Math.min(rule.value, price)
}

export const DEPOSIT_METHOD_LABEL: Record<DepositMethod, string> = { yape: 'Yape', plin: 'Plin', transfer: 'Transferencia', other: 'Otro' }

export function useManagedBooking(token: string) {
  return useQuery({ queryKey: ['public', 'booking', token], queryFn: () => publicApi<PublicBookingView>(`/bookings/${token}`), retry: false })
}

export function useManageActions(token: string) {
  const qc = useQueryClient()
  const update = (view: PublicBookingView) => {
    qc.setQueryData(['public', 'booking', token], view)
    void qc.invalidateQueries({ queryKey: ['public', 'booking', token, 'slots'] })
  }
  return {
    cancel: useMutation({
      mutationFn: (reason?: string) => publicApi<PublicBookingView>(`/bookings/${token}/cancel`, { method: 'POST', body: { reason } }),
      onSuccess: update,
    }),
    reschedule: useMutation({
      mutationFn: (startsAt: string) => publicApi<PublicBookingView>(`/bookings/${token}/reschedule`, { method: 'POST', body: { startsAt } }),
      onSuccess: update,
    }),
  }
}

/** "Desde S/ 30.00": el menor precio entre los profesionales que lo hacen. */
export function priceFrom(business: PublicBusiness, serviceId: string, branchId: string): { min: number; varies: boolean } {
  const base = business.services.find((s) => s.id === serviceId)?.price ?? 0
  const prices = business.professionals
    .filter((p) => p.branchIds.includes(branchId))
    .flatMap((p) => p.services.filter((s) => s.serviceId === serviceId).map((s) => s.price ?? base))
  const list = prices.length ? prices : [base]
  return { min: Math.min(...list), varies: new Set(list).size > 1 }
}

/** Enlace "Agregar a Google Calendar". */
export function googleCalendarUrl(b: PublicBookingView): string {
  const fmt = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${b.serviceName} · ${b.organization.name}`,
    dates: `${fmt(b.startsAt)}/${fmt(b.endsAt)}`,
    details: `Con ${b.professional.displayName}. Cita #UB-${b.number}.`,
    location: [b.branch.name, b.branch.address].filter(Boolean).join(', '),
  })
  return `https://calendar.google.com/calendar/render?${params}`
}
