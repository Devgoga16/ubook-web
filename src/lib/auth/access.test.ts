import { describe, expect, it } from 'vitest'
import type { Me } from '../api/types'
import { hasFeature, meets } from './access'

const me = {
  access: { isOwner: false, branchIds: [], permissions: { 'booking.read': 'own' } },
  subscription: { features: { resources: false, max_branches: 3, max_professionals: null, max_bookings_per_month: 0 } },
} as unknown as Me

describe('access', () => {
  it('interpreta flags y límites del plan', () => {
    expect(hasFeature(me, 'resources')).toBe(false)
    expect(hasFeature(me, 'max_branches')).toBe(true)
    expect(hasFeature(me, 'max_professionals')).toBe(true) // null = ilimitado
    expect(hasFeature(me, 'max_bookings_per_month')).toBe(false)
  })

  it('combina permiso y funcionalidad', () => {
    expect(meets(me, { permission: 'booking.read' })).toBe(true)
    expect(meets(me, { permission: 'role.read' })).toBe(false)
    expect(meets(me, { permission: 'booking.read', feature: 'resources' })).toBe(false)
    expect(meets(null, {})).toBe(true)
  })
})
