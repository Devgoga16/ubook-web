import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'

export type FlowKey = 'reminder' | 'confirmation' | 'review' | 'reactivation' | 'birthday' | 'noShow'
export type Channel = 'email' | 'whatsapp'

export interface FlowSettings {
  enabled: boolean
  channels: Channel[]
  offset: number | null
  message: string
  promoCode: string | null
  link: string | null
}

export interface AutomationsOverview {
  flows: Record<FlowKey, FlowSettings>
  defaults: Record<FlowKey, string>
  variables: string[]
  stats: Array<{ flow: string; status: 'sent' | 'failed'; count: number }>
  channels: { email: boolean; whatsapp: boolean; whatsappStatus: { connected: boolean; phoneNumber: string | null; status: string } }
}

export interface LogEntry {
  id: string
  flow: string
  channel: Channel
  to: string
  status: 'sent' | 'failed'
  error: string | null
  test: boolean
  clientName: string | null
  createdAt: string
}

export const FLOW_META: Record<FlowKey, { label: string; trigger: (offset: number | null) => string; offset?: { label: string; unit: string; min: number; max: number }; marketing?: boolean }> = {
  reminder: { label: 'Recordatorio', trigger: (o) => `${o ?? 24} horas antes de la cita`, offset: { label: 'Horas antes', unit: 'h', min: 1, max: 72 } },
  confirmation: { label: 'Confirmación al reservar', trigger: () => 'Al agendar o aprobar una cita' },
  review: { label: 'Pedir reseña', trigger: (o) => `${o ?? 2} horas después de completar la cita`, offset: { label: 'Horas después', unit: 'h', min: 1, max: 48 } },
  reactivation: { label: 'Reactivar clientes', trigger: (o) => `${o ?? 45} días sin venir y sin cita agendada`, offset: { label: 'Días sin visita', unit: 'días', min: 14, max: 365 }, marketing: true },
  birthday: { label: 'Feliz cumpleaños', trigger: () => 'El día de su cumpleaños, a las 10 a. m.', marketing: true },
  noShow: { label: 'Aviso de falta', trigger: () => 'Al marcar una cita como "No asistió"' },
}

export const FLOW_ORDER: FlowKey[] = ['reminder', 'confirmation', 'review', 'reactivation', 'birthday', 'noShow']

const key = ['automations'] as const

export function useAutomations() {
  return useQuery({ queryKey: key, queryFn: () => api<AutomationsOverview>('/automations') })
}

export function useAutomationLog() {
  return useQuery({ queryKey: [...key, 'log'], queryFn: () => api<LogEntry[]>('/automations/log?limit=50'), refetchInterval: 60_000 })
}

export function useAutomationActions() {
  const qc = useQueryClient()
  return {
    update: useMutation({
      mutationFn: ({ flow, ...body }: Partial<FlowSettings> & { flow: FlowKey }) => api<AutomationsOverview>(`/automations/${flow}`, { method: 'PATCH', body }),
      onSuccess: (data) => qc.setQueryData(key, data),
    }),
    test: useMutation({
      mutationFn: (flow: FlowKey) => api<{ email: boolean; whatsapp: boolean; text: string }>(`/automations/${flow}/test`, { method: 'POST' }),
      onSuccess: () => qc.invalidateQueries({ queryKey: [...key, 'log'] }),
    }),
  }
}

const SAMPLE: Record<string, string> = {
  'cliente.nombre': 'Mateo',
  negocio: 'tu negocio',
  servicio: 'Corte clásico',
  profesional: 'Luis',
  'cita.fecha': 'martes 13 de octubre',
  'cita.hora': '15:00',
  sucursal: 'Sede principal',
  'sucursal.direccion': 'Av. Larco 812',
  'link.gestionar': 'ubook.pe/reserva/…',
  'link.reservar': 'ubook.pe/reservar/…',
}

/** Igual que en la API: el texto con datos de ejemplo para la vista previa. */
export function preview(flow: FlowKey, s: FlowSettings, defaults: Record<FlowKey, string>, businessName: string): string {
  const base = s.message.trim() || defaults[flow]
  const text = s.promoCode && !base.includes('{{cupon}}') ? `${base} Usa el cupón {{cupon}} en tu próxima reserva: {{link.reservar}}` : base
  const vars: Record<string, string> = { ...SAMPLE, negocio: businessName, cupon: s.promoCode ?? '', 'link.resena': s.link ?? '' }
  return text
    .replace(/\{\{\s*([a-z.]+)\s*\}\}/gi, (_, name: string) => vars[name] ?? '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([.,!?])/g, '$1')
    .trim()
}
