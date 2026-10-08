import type { FeatureKey, Me, PermissionKey, Scope } from '../api/types'
import { useAuth } from './auth-context'

/** ¿El plan incluye la funcionalidad? Límite `null` = ilimitado; número > 0 = incluida. */
export function hasFeature(me: Me | null, feature: FeatureKey): boolean {
  const value = me?.subscription?.features[feature]
  return value === true || value === null || (typeof value === 'number' && value > 0)
}

export function permissionScope(me: Me | null, permission: PermissionKey): Scope | undefined {
  return me?.access?.permissions[permission]
}

export interface Requirement {
  permission?: PermissionKey
  feature?: FeatureKey
}

export function meets(me: Me | null, req: Requirement): boolean {
  if (req.permission && !permissionScope(me, req.permission)) return false
  if (req.feature && !hasFeature(me, req.feature)) return false
  return true
}

/** Permisos y plan del usuario en el negocio activo. */
export function useAccess() {
  const { me } = useAuth()
  return {
    can: (permission: PermissionKey) => !!permissionScope(me, permission),
    scope: (permission: PermissionKey) => permissionScope(me, permission),
    hasFeature: (feature: FeatureKey) => hasFeature(me, feature),
    meets: (req: Requirement) => meets(me, req),
    isOwner: me?.access?.isOwner ?? false,
    readOnly: me?.subscription?.readOnly ?? false,
  }
}
