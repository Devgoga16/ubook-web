import { describe, expect, it } from 'vitest'
import { formatRange, isoToZoned, minutesToTime, timeToMinutes, zonedToIso } from './time'

describe('time', () => {
  it('convierte minutos y horas', () => {
    expect(minutesToTime(570)).toBe('09:30')
    expect(timeToMinutes('09:30')).toBe(570)
    expect(timeToMinutes('24:00')).toBe(1440)
    expect(timeToMinutes('25:00')).toBeNull()
  })

  it('usa la hora de Lima (UTC-5)', () => {
    expect(zonedToIso('2026-10-19')).toBe('2026-10-19T05:00:00.000Z')
    expect(zonedToIso('2026-11-04', '09:00')).toBe('2026-11-04T14:00:00.000Z')
    expect(isoToZoned('2026-11-04T14:00:00.000Z')).toEqual({ date: '2026-11-04', time: '09:00' })
  })

  it('formatea rangos de ausencia', () => {
    expect(formatRange('2026-10-19T05:00:00.000Z', '2026-10-27T05:00:00.000Z')).toMatch(/^19 oct\.? – 26 oct\.?$/)
    expect(formatRange('2026-11-04T14:00:00.000Z', '2026-11-04T18:00:00.000Z')).toMatch(/^4 nov\.? · 09:00 – 13:00$/)
  })
})
