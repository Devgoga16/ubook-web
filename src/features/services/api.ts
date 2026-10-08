import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import type { Service, ServiceCategory, ServiceInput } from '@/lib/api/types'

export const servicesKey = ['services'] as const
export const categoriesKey = ['service-categories'] as const

export function useServices() {
  return useQuery({ queryKey: servicesKey, queryFn: () => api<Service[]>('/services') })
}

export function useCategories() {
  return useQuery({ queryKey: categoriesKey, queryFn: () => api<ServiceCategory[]>('/service-categories') })
}

export function useSaveService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<ServiceInput> & { id?: string; isArchived?: boolean }) =>
      id
        ? api<Service>(`/services/${id}`, { method: 'PATCH', body: input })
        : api<Service>('/services', { method: 'POST', body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: servicesKey }),
  })
}

export function useSaveCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id?: string; name: string }) =>
      id
        ? api<ServiceCategory>(`/service-categories/${id}`, { method: 'PATCH', body: { name } })
        : api<ServiceCategory>('/service-categories', { method: 'POST', body: { name } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: categoriesKey }),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api<void>(`/service-categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: categoriesKey })
      void qc.invalidateQueries({ queryKey: servicesKey })
    },
  })
}
