import type { Me } from '../api/types'

/** Pantalla de inicio según el tipo de sesión. */
export function homeFor(me: Me): string {
  if (me.context.ctx === 'platform') return '/superadmin'
  if (me.context.ctx === 'account') return '/negocios'
  return '/'
}
