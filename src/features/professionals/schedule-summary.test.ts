import { describe, expect, it } from 'vitest'
import { summarizeSchedule } from './schedule-summary'

const block = (start: number, end: number) => ({ start: start * 60, end: end * 60 })

describe('summarizeSchedule', () => {
  it('resume días consecutivos y suma horas de todas las sedes', () => {
    const s = summarizeSchedule([
      {
        branchId: 'a',
        days: [1, 2, 3, 4, 5].map((weekday) => ({ weekday, intervals: [block(9, 13), block(14, 19)] })),
      },
      { branchId: 'b', days: [{ weekday: 6, intervals: [block(9, 15)] }] },
    ])
    expect(s).toEqual({ days: 6, hours: 51, label: 'Lun–Sáb' })
  })

  it('lista días sueltos y reconoce la ausencia de horario', () => {
    expect(
      summarizeSchedule([{ branchId: 'a', days: [1, 3, 5].map((weekday) => ({ weekday, intervals: [block(9, 12)] })) }])
        .label,
    ).toBe('Lun, Mié, Vie')
    expect(summarizeSchedule([])).toEqual({ days: 0, hours: 0, label: '' })
  })
})
