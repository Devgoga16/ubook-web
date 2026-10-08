import type { PermissionKey, Professional } from '@/lib/api/types'
import { useAccess } from '@/lib/auth/access'
import { useAuth } from '@/lib/auth/auth-context'

/** ¿Puede aplicar el permiso sobre este profesional según su alcance (propio, sede, negocio)? */
export function useCanActOn() {
  const { me } = useAuth()
  const { scope } = useAccess()
  return (permission: PermissionKey, p: Professional) => {
    const s = scope(permission)
    const access = me?.access
    if (!s || !access) return false
    if (s === 'organization') return true
    if (s === 'branch') return access.branchIds.length === 0 || p.branchIds.some((b) => access.branchIds.includes(b))
    return p.membershipId === access.membershipId
  }
}
