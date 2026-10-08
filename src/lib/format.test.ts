import { describe, expect, it } from 'vitest'
import { formatHour, formatMoney, initials } from './format'

describe('format', () => {
  it('formatea soles', () => {
    expect(formatMoney(50)).toMatch(/^S\/\s?50\.00$/)
  })
  it('formatea horas decimales', () => {
    expect(formatHour(9.5)).toBe('9:30')
    expect(formatHour(14.75)).toBe('14:45')
  })
  it('obtiene iniciales', () => {
    expect(initials('Mateo Huamán')).toBe('MH')
    expect(initials('  ana  ')).toBe('A')
    expect(initials('Corte + barba')).toBe('CB')
  })
})

import { formatPlanPrice } from '@/features/auth/plans'

describe('formatPlanPrice', () => {
  it('muestra los planes en soles', () => {
    expect(formatPlanPrice(4900)).toBe('S/ 49')
    expect(formatPlanPrice(129000)).toBe('S/ 1,290')
  })
})

import { formatCents, parseSoles } from './format'

describe('soles', () => {
  it('convierte entre texto y céntimos', () => {
    expect(parseSoles('50')).toBe(5000)
    expect(parseSoles('S/ 50.5')).toBe(5050)
    expect(parseSoles('49,90')).toBe(4990)
    expect(parseSoles('abc')).toBeNull()
    expect(parseSoles('1.234')).toBeNull()
    expect(formatCents(5050)).toMatch(/^S\/\s?50\.50$/)
  })
})
