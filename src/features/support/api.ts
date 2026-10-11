import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TagTone } from '@/components/ui/badges'
import { api } from '@/lib/api/client'
import type { Paginated, SubscriptionStatus } from '@/lib/api/types'
import { useAuth } from '@/lib/auth/auth-context'
import { LOCALE, TIMEZONE } from '@/lib/format'

export type TicketCategory = 'bug' | 'question' | 'billing' | 'request' | 'other' | 'appointment' | 'payment' | 'service'
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent'
export type TicketStatus = 'open' | 'in_progress' | 'waiting_customer' | 'resolved'
export type PlatformRole = 'super_admin' | 'support'

export const CATEGORIES: Record<TicketCategory, string> = {
  bug: 'Algo no funciona',
  question: 'Tengo una duda',
  billing: 'Pagos y mi plan',
  request: 'Quiero sugerir algo',
  other: 'Otro',
  // Temas de las consultas de clientes finales.
  appointment: 'Sobre una cita',
  payment: 'Pagos y adelantos',
  service: 'Sobre el servicio',
}

/** Lo que un miembro del negocio puede elegir al abrir un ticket con uBook. */
export const STAFF_CATEGORIES: TicketCategory[] = ['bug', 'question', 'billing', 'request', 'other']

export const PRIORITIES: Record<TicketPriority, { label: string; tone: TagTone }> = {
  low: { label: 'Baja', tone: 'off' },
  normal: { label: 'Normal', tone: 'brand' },
  high: { label: 'Alta', tone: 'warn' },
  urgent: { label: 'Urgente', tone: 'bad' },
}

/** Estados como los lee el negocio. */
export const CUSTOMER_STATUS: Record<TicketStatus, { label: string; tone: TagTone }> = {
  open: { label: 'Enviado', tone: 'teal' },
  in_progress: { label: 'En revisión', tone: 'brand' },
  waiting_customer: { label: 'Te respondimos', tone: 'warn' },
  resolved: { label: 'Resuelto', tone: 'ok' },
}

/** Estados como los lee el equipo de soporte. */
export const AGENT_STATUS: Record<TicketStatus, { label: string; tone: TagTone }> = {
  open: { label: 'Por atender', tone: 'warn' },
  in_progress: { label: 'En revisión', tone: 'brand' },
  waiting_customer: { label: 'Esperando al negocio', tone: 'teal' },
  resolved: { label: 'Resuelto', tone: 'ok' },
}

export const ROLE_LABEL: Record<PlatformRole, string> = { super_admin: 'Super admin', support: 'Soporte' }

export interface TicketMessage {
  id: string
  from: 'customer' | 'agent'
  authorName: string
  body: string
  internal: boolean
  /** Enlaces firmados y temporales de las capturas. */
  attachments: string[]
  createdAt: string
}

interface TicketBase {
  id: string
  number: number
  subject: string
  category: TicketCategory
  status: TicketStatus
  createdBy: { userId: string | null; name: string }
  lastMessageAt: string
  lastMessagePreview: string
  lastMessageFrom: 'customer' | 'agent'
  unread: boolean
  resolvedAt: string | null
  createdAt: string
}

/** Ticket visto por el negocio. */
export interface Ticket extends TicketBase {
  /** Nombre de pila de quien atiende. */
  assignedTo: string | null
}
export type TicketDetail = Ticket & { messages: TicketMessage[] }

/** Ticket visto por el equipo de plataforma. */
export interface PlatformTicket extends TicketBase {
  priority: TicketPriority
  /** Lo abrió un cliente final del negocio desde su portal (no su equipo). */
  fromClient: boolean
  organization: { id: string; name: string; slug: string; status: 'active' | 'suspended' } | null
  assignedTo: { userId: string; name: string } | null
}
export interface PlatformTicketDetail extends PlatformTicket {
  context: { path: string; userAgent: string; viewport: string }
  createdBy: { userId: string | null; name: string; email: string | null; phone: string | null }
  subscription: { planCode: string; effectiveStatus: SubscriptionStatus } | null
  messages: TicketMessage[]
}

export interface SupportSummary {
  open: number
  unassigned: number
  mine: number
  waitingCustomer: number
  urgent: number
  unread: number
}

export interface PlatformAgent {
  id: string
  name: string
  platformRole: PlatformRole
}

export interface PlatformTeamMember {
  id: string
  email: string
  firstName: string
  lastName: string
  platformRole: PlatformRole
  isActive: boolean
  /** Aún no creó su contraseña. */
  pending: boolean
  lastLoginAt: string | null
  createdAt: string
}

export interface PlatformInvite {
  inviteUrl: string
  expiresAt: string
  emailSent: boolean
}

export interface MessageInput {
  body: string
  attachments?: string[]
  internal?: boolean
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, { timeZone: TIMEZONE, day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso))
}

/** "hace 5 min", "hace 3 h", o la fecha si pasó más de un día. */
export function timeAgo(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return 'ahora'
  if (minutes < 60) return `hace ${minutes} min`
  if (minutes < 60 * 24) return `hace ${Math.floor(minutes / 60)} h`
  return formatDateTime(iso)
}

const REFRESH_MS = 60_000

/** Última pantalla visitada fuera de Soporte: viaja con el ticket para reproducir el problema. */
let lastPath = ''
export const lastVisited = {
  get: () => lastPath,
  remember: (pathname: string) => {
    if (!pathname.startsWith('/soporte')) lastPath = pathname
  },
}

/* ---------- Negocio ---------- */

export function useTickets() {
  return useQuery({ queryKey: ['support', 'tickets'], queryFn: () => api<{ canSeeAll: boolean; items: Ticket[] }>('/support/tickets') })
}

export function useTicket(id: string) {
  const qc = useQueryClient()
  return useQuery({
    queryKey: ['support', 'ticket', id],
    queryFn: async () => {
      const ticket = await api<TicketDetail>(`/support/tickets/${id}`)
      // Abrirlo lo marca como leído: se actualiza el aviso del menú.
      void qc.invalidateQueries({ queryKey: ['support', 'unread'] })
      return ticket
    },
    refetchInterval: REFRESH_MS,
  })
}

export function useTicketActions() {
  const qc = useQueryClient()
  const refresh = (t: TicketDetail) => {
    qc.setQueryData(['support', 'ticket', t.id], t)
    return qc.invalidateQueries({ queryKey: ['support'] })
  }
  return {
    create: useMutation({
      mutationFn: (body: { subject: string; category: TicketCategory; body: string; attachments: string[]; context: { path: string; userAgent: string; viewport: string } }) =>
        api<TicketDetail>('/support/tickets', { method: 'POST', body }),
      onSuccess: refresh,
    }),
    reply: useMutation({
      mutationFn: ({ id, ...body }: MessageInput & { id: string }) => api<TicketDetail>(`/support/tickets/${id}/messages`, { method: 'POST', body }),
      onSuccess: refresh,
    }),
    resolve: useMutation({ mutationFn: (id: string) => api<TicketDetail>(`/support/tickets/${id}/resolve`, { method: 'POST' }), onSuccess: refresh }),
  }
}

/** Sube una captura; devuelve la clave para adjuntarla al mensaje. */
export function uploadAttachment(file: File, ticketId?: string): Promise<string> {
  const body = new FormData()
  body.append('file', file)
  // El agente sube contra el ticket (la captura se guarda con los archivos de ese negocio).
  const path = ticketId ? `/platform/support/tickets/${ticketId}/attachments` : '/support/attachments'
  return api<{ key: string }>(path, { method: 'POST', body }).then((r) => r.key)
}


/* ---------- Consultas de clientes (las atiende el negocio) ---------- */

export interface Inquiry {
  id: string
  number: number
  subject: string
  category: TicketCategory
  status: TicketStatus
  client: { id: string; name: string; phone: string | null }
  lastMessageAt: string
  lastMessagePreview: string
  lastMessageFrom: 'customer' | 'agent'
  unread: boolean
  resolvedAt: string | null
  createdAt: string
}
export type InquiryDetail = Inquiry & { messages: TicketMessage[] }

/** Estados de una consulta como los lee el equipo del negocio. */
export const INQUIRY_STATUS: Record<TicketStatus, { label: string; tone: TagTone }> = {
  open: { label: 'Por responder', tone: 'warn' },
  in_progress: { label: 'En revisión', tone: 'brand' },
  waiting_customer: { label: 'Respondida', tone: 'teal' },
  resolved: { label: 'Resuelta', tone: 'ok' },
}

export function useInquiries(status: 'active' | 'resolved') {
  return useQuery({ queryKey: ['support', 'inquiries', status], queryFn: () => api<Inquiry[]>(`/support/inquiries?status=${status}`), refetchInterval: REFRESH_MS })
}

export function useInquiry(id: string) {
  const qc = useQueryClient()
  return useQuery({
    queryKey: ['support', 'inquiry', id],
    queryFn: async () => {
      const inquiry = await api<InquiryDetail>(`/support/inquiries/${id}`)
      void qc.invalidateQueries({ queryKey: ['support', 'inquiries-unread'] })
      return inquiry
    },
    refetchInterval: REFRESH_MS,
  })
}

export function useInquiryActions(id: string) {
  const qc = useQueryClient()
  const refresh = (t: InquiryDetail) => {
    qc.setQueryData(['support', 'inquiry', id], t)
    return qc.invalidateQueries({ queryKey: ['support'] })
  }
  return {
    reply: useMutation({ mutationFn: (body: MessageInput) => api<InquiryDetail>(`/support/inquiries/${id}/messages`, { method: 'POST', body }), onSuccess: refresh }),
    setStatus: useMutation({ mutationFn: (status: 'open' | 'resolved') => api<InquiryDetail>(`/support/inquiries/${id}`, { method: 'PATCH', body: { status } }), onSuccess: refresh }),
  }
}

/* ---------- Plataforma ---------- */

export interface PlatformTicketFilters {
  status: TicketStatus | 'active' | 'all'
  assignee: 'all' | 'me' | 'none'
  search: string
  organizationId?: string
  page: number
}

export function usePlatformTickets(f: PlatformTicketFilters) {
  const params = new URLSearchParams({ page: String(f.page), pageSize: '25' })
  if (f.status !== 'all') params.set('status', f.status)
  if (f.assignee !== 'all') params.set('assignee', f.assignee)
  if (f.search) params.set('search', f.search)
  if (f.organizationId) params.set('organizationId', f.organizationId)
  return useQuery({
    queryKey: ['platform', 'support', 'tickets', f],
    queryFn: () => api<Paginated<PlatformTicket>>(`/platform/support/tickets?${params}`),
    placeholderData: keepPreviousData,
    refetchInterval: REFRESH_MS,
  })
}

export function useSupportSummary(enabled = true) {
  return useQuery({ queryKey: ['platform', 'support', 'summary'], queryFn: () => api<SupportSummary>('/platform/support/summary'), enabled, refetchInterval: REFRESH_MS })
}

export function usePlatformTicket(id: string) {
  const qc = useQueryClient()
  return useQuery({
    queryKey: ['platform', 'support', 'ticket', id],
    queryFn: async () => {
      const ticket = await api<PlatformTicketDetail>(`/platform/support/tickets/${id}`)
      void qc.invalidateQueries({ queryKey: ['platform', 'support', 'summary'] })
      return ticket
    },
    refetchInterval: REFRESH_MS,
  })
}

export function usePlatformAgents() {
  return useQuery({ queryKey: ['platform', 'support', 'agents'], queryFn: () => api<PlatformAgent[]>('/platform/support/agents'), staleTime: 5 * 60_000 })
}

export function usePlatformTicketActions(id: string) {
  const qc = useQueryClient()
  const refresh = (t: PlatformTicketDetail) => {
    qc.setQueryData(['platform', 'support', 'ticket', id], t)
    return qc.invalidateQueries({ queryKey: ['platform', 'support'] })
  }
  return {
    reply: useMutation({ mutationFn: (body: MessageInput) => api<PlatformTicketDetail>(`/platform/support/tickets/${id}/messages`, { method: 'POST', body }), onSuccess: refresh }),
    update: useMutation({
      mutationFn: (body: Partial<{ status: TicketStatus; priority: TicketPriority; category: TicketCategory; assignedToUserId: string | null }>) =>
        api<PlatformTicketDetail>(`/platform/support/tickets/${id}`, { method: 'PATCH', body }),
      onSuccess: refresh,
    }),
  }
}

export function usePlatformTeam() {
  return useQuery({ queryKey: ['platform', 'team'], queryFn: () => api<PlatformTeamMember[]>('/platform/team') })
}

export function usePlatformTeamActions() {
  const qc = useQueryClient()
  const refresh = () => qc.invalidateQueries({ queryKey: ['platform'] })
  return {
    invite: useMutation({
      mutationFn: (body: { firstName: string; lastName: string; email: string; role: PlatformRole }) => api<PlatformInvite & { id: string }>('/platform/team', { method: 'POST', body }),
      onSuccess: refresh,
    }),
    resend: useMutation({ mutationFn: (id: string) => api<PlatformInvite>(`/platform/team/${id}/resend`, { method: 'POST' }) }),
    update: useMutation({
      mutationFn: ({ id, ...body }: { id: string; role?: PlatformRole; isActive?: boolean }) => api<PlatformTeamMember>(`/platform/team/${id}`, { method: 'PATCH', body }),
      onSuccess: refresh,
    }),
    remove: useMutation({ mutationFn: (id: string) => api<void>(`/platform/team/${id}`, { method: 'DELETE' }), onSuccess: refresh }),
  }
}

/* ---------- Menú ---------- */

/** Avisos del menú: respuestas sin leer (negocio) o tickets con novedades (plataforma). */
export function useSupportBadges(): Record<string, number | undefined> {
  const { me } = useAuth()
  const ctx = me?.context.ctx
  const isAgentView = !!me?.context.supportView
  const unread = useQuery({
    queryKey: ['support', 'unread'],
    queryFn: () => api<{ unread: number }>('/support/tickets/unread'),
    enabled: ctx === 'staff' && !isAgentView,
    refetchInterval: REFRESH_MS,
  })
  const inquiries = useQuery({
    queryKey: ['support', 'inquiries-unread'],
    queryFn: () => api<{ unread: number }>('/support/inquiries/unread'),
    enabled: ctx === 'staff' && !!me?.access?.permissions['client.read'],
    refetchInterval: REFRESH_MS,
  })
  const summary = useSupportSummary(ctx === 'platform')
  return { '/soporte': unread.data?.unread, '/consultas': inquiries.data?.unread, '/superadmin/soporte': summary.data?.unread }
}
