import type { Me } from '../api/types'

/** Pantalla de inicio según el tipo de sesión. */
export function homeFor(me: Me): string {
  // Soporte entra directo a su bandeja de tickets.
  if (me.context.ctx === 'platform') return me.user.platformRole === 'support' ? '/superadmin/soporte' : '/superadmin'
  if (me.context.ctx === 'account') return '/negocios'
  return '/'
}
