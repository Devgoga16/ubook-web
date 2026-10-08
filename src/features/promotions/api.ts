import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { formatCents } from '@/lib/format'
import { minutesToTime } from '@/lib/time'

export interface Promotion {
  id: string
  code: string
  description: string
  type: 'percent' | 'amount'
  value: number
  serviceIds: string[]
  validFrom: string | null
  validTo: string | null
  weekdays: number[]
  fromMinute: number | null
  toMinute: number | null
  newClientsOnly: boolean
  oncePerClient: boolean
  maxUses: number | null
  isActive: boolean
  uses: number
  discountGiven: number
}

export type PromotionInput = Omit<Promotion, 'id' | 'uses' | 'discountGiven'>

const key = ['promotions'] as const

export function usePromotions() {
  return useQuery({ queryKey: key, queryFn: () => api<Promotion[]>('/promotions') })
}

export function useSavePromotion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<PromotionInput> & { id?: string }) =>
      api<Promotion>(id ? `/promotions/${id}` : '/promotions', { method: id ? 'PATCH' : 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  })
}

export const promoValue = (p: Pick<Promotion, 'type' | 'value'>) => (p.type === 'percent' ? `${p.value}%` : formatCents(p.value))

const DAY = ['', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom']

/** Resumen de las condiciones: "Lun y mar · 9:00–13:00 · solo clientes nuevos". */
export function promoRules(p: Promotion, serviceName: (id: string) => string | undefined): string {
  const parts: string[] = []
  parts.push(p.serviceIds.length ? p.serviceIds.map(serviceName).filter(Boolean).join(', ') : 'Todos los servicios')
  if (p.weekdays.length) parts.push(`solo ${[...p.weekdays].sort().map((d) => DAY[d]).join(', ')}`)
  if (p.fromMinute != null || p.toMinute != null) parts.push(`${minutesToTime(p.fromMinute ?? 0)}–${minutesToTime(p.toMinute ?? 1440)}`)
  if (p.newClientsOnly) parts.push('primera visita')
  return parts.join(' · ')
}
