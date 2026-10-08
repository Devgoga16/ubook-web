import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import type { Client, ClientDirectory, ClientInput, ClientSegment, ClientSummary } from '@/lib/api/types'

export const clientsKey = ['clients'] as const

export function useClientSearch(search: string) {
  const term = search.trim()
  return useQuery({
    queryKey: [...clientsKey, 'search', term],
    queryFn: () => api<Client[]>(`/clients?limit=8${term ? `&search=${encodeURIComponent(term)}` : ''}`),
    placeholderData: (prev) => prev,
  })
}

export function useClientDirectory(p: { search: string; segment: ClientSegment; page: number }) {
  const params = new URLSearchParams({ segment: p.segment, page: String(p.page), limit: '20' })
  if (p.search.trim()) params.set('search', p.search.trim())
  return useQuery({
    queryKey: [...clientsKey, 'directory', p.search.trim(), p.segment, p.page],
    queryFn: () => api<ClientDirectory>(`/clients/directory?${params}`),
    placeholderData: keepPreviousData,
  })
}

export function useClientSummary() {
  return useQuery({ queryKey: [...clientsKey, 'summary'], queryFn: () => api<ClientSummary>('/clients/summary') })
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: [...clientsKey, 'one', id],
    queryFn: () => api<Client>(`/clients/${id}`),
    enabled: !!id,
  })
}

export function useCreateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ClientInput) => api<Client>('/clients', { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: clientsKey }),
  })
}

export function useUpdateClient(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ClientInput) => api<Client>(`/clients/${id}`, { method: 'PATCH', body }),
    onSuccess: (saved) => {
      qc.setQueryData([...clientsKey, 'one', id], saved)
      void qc.invalidateQueries({ queryKey: clientsKey })
    },
  })
}

export const CHANNEL_LABELS: Record<NonNullable<Client['preferredChannel']>, string> = {
  whatsapp: 'WhatsApp',
  call: 'Llamada',
  sms: 'SMS',
  email: 'Correo',
}

export const fullName = (c: Pick<Client, 'firstName' | 'lastName'>) => `${c.firstName} ${c.lastName ?? ''}`.trim()

/** "+51987654321" → "987 654 321". */
export function formatPhone(phone?: string): string {
  const d = phone?.replace(/\D/g, '').slice(-9)
  return d && d.length === 9 ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}` : (phone ?? '')
}

/** Fecha corta en Lima: "12 oct 2026". */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Lima' })
    .format(new Date(iso))
    .replace('.', '')
}

/** Edad a partir de "AAAA-MM-DD". */
export function ageFrom(birthDate?: string): number | null {
  if (!birthDate) return null
  const [y, m, d] = birthDate.split('-').map(Number) as [number, number, number]
  const now = new Date()
  let age = now.getFullYear() - y
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age -= 1
  return age >= 0 && age < 130 ? age : null
}
