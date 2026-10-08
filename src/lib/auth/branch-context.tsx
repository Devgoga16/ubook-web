import { useQuery } from '@tanstack/react-query'
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { api } from '../api/client'
import type { Branch } from '../api/types'
import { useAuth } from './auth-context'

interface BranchContextValue {
  branches: Branch[]
  current: Branch | null
  setCurrent: (id: string) => void
  isLoading: boolean
}

const BranchContext = createContext<BranchContextValue | null>(null)

const storageKey = (orgId: string) => `ubook-branch:${orgId}`

function readStored(orgId: string | undefined): string | null {
  if (!orgId) return null
  try {
    return localStorage.getItem(storageKey(orgId))
  } catch {
    return null
  }
}

export const branchesQueryKey = ['branches'] as const

/** Sucursal activa en la interfaz (filtra agenda, reportes…). Se recuerda por negocio. */
export function BranchProvider({ children }: { children: ReactNode }) {
  const { me } = useAuth()
  const orgId = me?.organization?.id
  const [selected, setSelected] = useState<string | null>(() => readStored(orgId))

  const { data = [], isLoading } = useQuery({
    queryKey: branchesQueryKey,
    queryFn: () => api<Branch[]>('/branches'),
    enabled: me?.context.ctx === 'staff',
  })

  const value = useMemo<BranchContextValue>(() => {
    const allowed = me?.access?.branchIds ?? []
    const branches = data.filter((b) => b.isActive && (allowed.length === 0 || allowed.includes(b.id)))
    const current = branches.find((b) => b.id === selected) ?? branches[0] ?? null
    return {
      branches,
      current,
      isLoading,
      setCurrent: (id) => {
        setSelected(id)
        try {
          if (orgId) localStorage.setItem(storageKey(orgId), id)
        } catch {
          // Sin almacenamiento: la elección dura solo esta sesión.
        }
      },
    }
  }, [data, selected, isLoading, me, orgId])

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>
}

export function useBranch() {
  const ctx = useContext(BranchContext)
  if (!ctx) throw new Error('useBranch fuera de BranchProvider')
  return ctx
}
