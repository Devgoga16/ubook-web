import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, api } from '@/lib/api/client'
import type { AppointmentStatusValue, DepositStatus, PaymentMethod } from '@/lib/api/types'
import { formatLongDate, formatTime, isoToZoned } from '@/lib/time'

export const RELATIONSHIPS = ['Hijo/a', 'Padre/Madre', 'Pareja', 'Hermano/a', 'Abuelo/a', 'Nieto/a', 'Otro'] as const
export type Relationship = (typeof RELATIONSHIPS)[number]

export interface PortalProfile {
  id: string
  firstName: string
  lastName: string
  email: string
  birthDate: string
  marketingConsent: boolean
  /** Titular de la cuenta (dueño del celular) o persona a su cargo. */
  isHolder: boolean
  guardianId: string | null
  relationship: string
}

export interface PortalAccount {
  phone: string
  features: { guardians: boolean }
  profiles: PortalProfile[]
}

export interface PortalAppointment {
  /** Enlace firmado de la cita: /reserva/:token. */
  token: string
  clientId: string
  number: number
  status: AppointmentStatusValue
  startsAt: string
  endsAt: string
  serviceId: string
  serviceName: string
  price: number
  durationMinutes: number
  professional: { id: string; displayName: string; color: string | null }
  branch: { id: string; name: string; address: string; mapsUrl: string; phone: string }
  deposit: { amount: number; status: DepositStatus; rejectReason: string | null } | null
  upcoming: boolean
}

export interface PortalAppointments {
  upcoming: PortalAppointment[]
  past: PortalAppointment[]
}

export interface PortalPayment {
  id: string
  number: number
  clientId: string
  /** Fecha local "YYYY-MM-DD". */
  date: string
  serviceName: string
  discount: number
  tip: number
  total: number
  methods: Array<{ method: PaymentMethod; amount: number }>
}

export interface DependentInput {
  firstName: string
  lastName: string
  birthDate: string | null
  documentId?: string
  relationship: string
}

export interface ProfileInput {
  clientId: string
  firstName?: string
  lastName?: string
  email?: string | null
  birthDate?: string | null
  marketingConsent?: boolean
  relationship?: string
}

interface StoredSession {
  token: string
  /** Celular en formato +51987654321. */
  phone: string
}

/** La sesión del portal vive en este navegador y vale solo para un negocio. */
const storageKey = (slug: string) => `ubook.portal.${slug}`

export const portalSession = {
  get(slug: string): StoredSession | null {
    try {
      const raw = localStorage.getItem(storageKey(slug))
      const parsed = raw ? (JSON.parse(raw) as Partial<StoredSession>) : null
      return parsed?.token && parsed.phone ? { token: parsed.token, phone: parsed.phone } : null
    } catch {
      return null
    }
  },
  set(slug: string, session: StoredSession) {
    try {
      localStorage.setItem(storageKey(slug), JSON.stringify(session))
    } catch {
      // Navegación privada sin almacenamiento: la sesión dura lo que la pestaña.
    }
  },
  clear(slug: string) {
    try {
      localStorage.removeItem(storageKey(slug))
    } catch {
      // Nada que borrar.
    }
  },
}

const base = (slug: string) => `/public/businesses/${slug}/portal`
export const portalHeaders = (token: string) => ({ 'x-portal-token': token })
const withToken = (token: string) => ({ headers: portalHeaders(token), skipRefresh: true })

export function requestPortalCode(slug: string, phone: string) {
  return api<{ ok: true; expiresInSeconds: number }>(`${base(slug)}/code`, { method: 'POST', body: { phone }, skipRefresh: true })
}

export function openPortalSession(slug: string, phone: string, code: string) {
  return api<PortalAccount & { token: string; expiresAt: string }>(`${base(slug)}/session`, { method: 'POST', body: { phone, code }, skipRefresh: true })
}

export const isSessionExpired = (error: unknown) => error instanceof ApiError && error.status === 401

const keys = {
  me: (slug: string) => ['portal', slug, 'me'] as const,
  appointments: (slug: string) => ['portal', slug, 'appointments'] as const,
  payments: (slug: string) => ['portal', slug, 'payments'] as const,
}

export function usePortalAccount(slug: string, token: string | null) {
  return useQuery({ queryKey: [...keys.me(slug), token], queryFn: () => api<PortalAccount>(`${base(slug)}/me`, withToken(token!)), enabled: !!token, retry: false, staleTime: 30_000 })
}

export function usePortalAppointments(slug: string, token: string | null) {
  return useQuery({
    queryKey: [...keys.appointments(slug), token],
    queryFn: () => api<PortalAppointments>(`${base(slug)}/appointments`, withToken(token!)),
    enabled: !!token,
    retry: false,
  })
}

export function usePortalPayments(slug: string, token: string | null) {
  return useQuery({
    queryKey: [...keys.payments(slug), token],
    queryFn: () => api<{ items: PortalPayment[]; totalThisYear: number }>(`${base(slug)}/payments`, withToken(token!)),
    enabled: !!token,
    retry: false,
  })
}

export function usePortalActions(slug: string, token: string) {
  const qc = useQueryClient()
  const refresh = () => qc.invalidateQueries({ queryKey: ['portal', slug] })
  return {
    updateProfile: useMutation({
      mutationFn: ({ clientId, ...body }: ProfileInput) => api<PortalProfile>(`${base(slug)}/profiles/${clientId}`, { method: 'PATCH', body, ...withToken(token) }),
      onSuccess: refresh,
    }),
    addDependent: useMutation({
      mutationFn: (body: DependentInput) => api<PortalProfile>(`${base(slug)}/dependents`, { method: 'POST', body, ...withToken(token) }),
      onSuccess: refresh,
    }),
    removeDependent: useMutation({
      mutationFn: (clientId: string) => api<{ ok: true }>(`${base(slug)}/dependents/${clientId}`, { method: 'DELETE', ...withToken(token) }),
      onSuccess: refresh,
    }),
  }
}

/* ---------- Texto ---------- */

export const fullName = (p: { firstName: string; lastName: string }) => `${p.firstName} ${p.lastName}`.trim()
export const prettyPhone = (phone: string) => phone.replace(/^\+51/, '').replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')
export const whenText = (iso: string) => `${formatLongDate(isoToZoned(iso).date)}, ${formatTime(iso)}`

/** "8 años" a partir de la fecha de nacimiento. */
export function ageText(birthDate: string): string | null {
  if (!birthDate) return null
  const [y, m, d] = birthDate.split('-').map(Number)
  const now = new Date()
  let years = now.getFullYear() - y!
  if (now.getMonth() + 1 < m! || (now.getMonth() + 1 === m && now.getDate() < d!)) years -= 1
  if (years < 0) return null
  if (years === 0) return 'menos de 1 año'
  return `${years} ${years === 1 ? 'año' : 'años'}`
}

/** "en 3 días", "mañana", "hoy": cuánto falta para una cita. */
export function countdown(iso: string): string {
  const today = isoToZoned(new Date().toISOString()).date
  const day = isoToZoned(iso).date
  const days = Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000)
  if (days <= 0) return 'Hoy'
  if (days === 1) return 'Mañana'
  if (days < 7) return `En ${days} días`
  if (days < 14) return 'La próxima semana'
  return `En ${Math.round(days / 7)} semanas`
}

/** Enlace a la página de reservas con lo que ya se sabe elegido. */
export function bookingUrl(slug: string, p: { forClientId?: string; branchId?: string; serviceId?: string; professionalId?: string } = {}): string {
  const q = new URLSearchParams()
  if (p.forClientId) q.set('para', p.forClientId)
  if (p.branchId) q.set('sede', p.branchId)
  if (p.serviceId) q.set('servicio', p.serviceId)
  if (p.professionalId) q.set('profesional', p.professionalId)
  const query = q.toString()
  return `/reservar/${slug}${query ? `?${query}` : ''}`
}
