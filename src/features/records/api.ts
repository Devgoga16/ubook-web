import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import type { ClientRecord, RecordField, RecordPreset, RecordTemplate, RecordValues } from '@/lib/api/types'

const templatesKey = ['record-templates'] as const
const recordsKey = (clientId: string) => ['client-records', clientId] as const

export function useRecordTemplates(includeInactive = false, enabled = true) {
  return useQuery({
    queryKey: [...templatesKey, includeInactive],
    queryFn: () => api<RecordTemplate[]>(`/record-templates${includeInactive ? '?includeInactive=true' : ''}`),
    enabled,
  })
}

export function useRecordPresets(enabled = true) {
  return useQuery({
    queryKey: [...templatesKey, 'presets'],
    queryFn: () => api<RecordPreset[]>('/record-templates/presets'),
    staleTime: Infinity,
    enabled,
  })
}

export interface TemplateInput {
  preset?: string
  name?: string
  description?: string
  fields?: RecordField[]
  isActive?: boolean
}

export function useSaveTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: TemplateInput & { id?: string }) =>
      api<RecordTemplate>(id ? `/record-templates/${id}` : '/record-templates', { method: id ? 'PATCH' : 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: templatesKey }),
  })
}

export function useClientRecords(clientId: string, enabled = true) {
  return useQuery({
    queryKey: recordsKey(clientId),
    queryFn: () => api<ClientRecord[]>(`/clients/${clientId}/records`),
    enabled,
  })
}

/** Crear, editar, firmar y agregar notas: todo refresca la lista del cliente. */
export function useRecordActions(clientId: string) {
  const qc = useQueryClient()
  const refresh = () => qc.invalidateQueries({ queryKey: recordsKey(clientId) })
  return {
    create: useMutation({
      mutationFn: (body: { templateId: string; values: RecordValues; appointmentId?: string; sign?: boolean }) =>
        api<ClientRecord>(`/clients/${clientId}/records`, { method: 'POST', body }),
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: ({ id, values }: { id: string; values: RecordValues }) =>
        api<ClientRecord>(`/records/${id}`, { method: 'PATCH', body: { values } }),
      onSuccess: refresh,
    }),
    sign: useMutation({
      mutationFn: (id: string) => api<ClientRecord>(`/records/${id}/sign`, { method: 'POST' }),
      onSuccess: refresh,
    }),
    addendum: useMutation({
      mutationFn: ({ id, text }: { id: string; text: string }) =>
        api<ClientRecord>(`/records/${id}/addenda`, { method: 'POST', body: { text } }),
      onSuccess: refresh,
    }),
  }
}
