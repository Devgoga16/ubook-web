import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'

export interface Resource {
  id: string
  branchId: string
  name: string
  kind: string
  capacity: number
  serviceIds: string[]
  isActive: boolean
  /** Bloques ocupados hoy, en minutos locales. */
  today: Array<{ startMinute: number; endMinute: number }>
}

export type ResourceInput = Pick<Resource, 'branchId' | 'name' | 'kind' | 'capacity' | 'serviceIds' | 'isActive'>

const key = (branchId?: string) => ['resources', branchId] as const

export function useResources(branchId: string | undefined, enabled = true) {
  return useQuery({ queryKey: key(branchId), queryFn: () => api<Resource[]>(`/resources?branchId=${branchId}`), enabled: !!branchId && enabled })
}

export function useSaveResource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<ResourceInput> & { id?: string }) =>
      api<Resource>(id ? `/resources/${id}` : '/resources', { method: id ? 'PATCH' : 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resources'] }),
  })
}
