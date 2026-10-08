import { describe, expect, it } from 'vitest'
import { easterSunday, peruHolidays } from './peru-holidays'

describe('feriados de Perú', () => {
  it('calcula la Semana Santa', () => {
    expect(easterSunday(2026)).toEqual({ month: 4, day: 5 })
    expect(easterSunday(2027)).toEqual({ month: 3, day: 28 })
    const h = peruHolidays(2026)
    expect(h.find((x) => x.name === 'Jueves Santo')?.date).toBe('2026-04-02')
    expect(h.find((x) => x.name === 'Viernes Santo')?.date).toBe('2026-04-03')
  })

  it('incluye los feriados fijos ordenados', () => {
    const h = peruHolidays(2026)
    expect(h).toHaveLength(16)
    expect(h[0]).toEqual({ date: '2026-01-01', name: 'Año Nuevo' })
    expect(h.at(-1)).toEqual({ date: '2026-12-25', name: 'Navidad' })
    expect(h.map((x) => x.date)).toEqual([...h.map((x) => x.date)].sort())
  })
})
