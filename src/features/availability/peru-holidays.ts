/**
 * Feriados nacionales de Perú (calendario oficial vigente). El gobierno puede
 * declarar feriados o días no laborables adicionales: el negocio debe revisarlos.
 */
const FIXED: Array<[month: number, day: number, name: string]> = [
  [1, 1, 'Año Nuevo'],
  [5, 1, 'Día del Trabajo'],
  [6, 7, 'Batalla de Arica y Día de la Bandera'],
  [6, 29, 'San Pedro y San Pablo'],
  [7, 23, 'Día de la Fuerza Aérea del Perú'],
  [7, 28, 'Fiestas Patrias'],
  [7, 29, 'Fiestas Patrias'],
  [8, 6, 'Batalla de Junín'],
  [8, 30, 'Santa Rosa de Lima'],
  [10, 8, 'Combate de Angamos'],
  [11, 1, 'Día de Todos los Santos'],
  [12, 8, 'Inmaculada Concepción'],
  [12, 9, 'Batalla de Ayacucho'],
  [12, 25, 'Navidad'],
]

/** Domingo de Pascua (algoritmo de Meeus/Jones/Butcher). */
export function easterSunday(year: number): { month: number; day: number } {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return { month, day }
}

const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

export function peruHolidays(year: number): Array<{ date: string; name: string }> {
  const easter = easterSunday(year)
  const base = Date.UTC(year, easter.month - 1, easter.day)
  const shift = (days: number) => new Date(base + days * 86_400_000).toISOString().slice(0, 10)
  return [
    ...FIXED.map(([m, d, name]) => ({ date: iso(year, m, d), name })),
    { date: shift(-3), name: 'Jueves Santo' },
    { date: shift(-2), name: 'Viernes Santo' },
  ].sort((a, b) => a.date.localeCompare(b.date))
}
