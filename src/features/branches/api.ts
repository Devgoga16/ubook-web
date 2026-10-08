import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import type { Branch } from '@/lib/api/types'
import { branchesQueryKey } from '@/lib/auth/branch-context'

export interface BranchInput {
  name?: string
  address?: string
  reference?: string
  mapsUrl?: string
  phone?: string
  isActive?: boolean
}

export function useSaveBranch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: BranchInput & { id?: string }) =>
      api<Branch>(id ? `/branches/${id}` : '/branches', { method: id ? 'PATCH' : 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: branchesQueryKey }),
  })
}
