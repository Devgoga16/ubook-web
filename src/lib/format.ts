/** Formatos para Perú (es-PE, soles, America/Lima). */
export const LOCALE = 'es-PE'
export const CURRENCY = 'PEN'
export const TIMEZONE = 'America/Lima'

const money = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY })

/** 50 → "S/ 50.00" */
export function formatMoney(amount: number): string {
  return money.format(amount)
}

/** Céntimos → "S/ 50.00". */
export function formatCents(cents: number): string {
  return money.format(cents / 100)
}

/** "50", "50.5", "S/ 50,00" → 5050 céntimos. `null` si no es un monto válido. */
export function parseSoles(input: string): number | null {
  const clean = input.replace(/S\/|\s/g, '').replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null
  return Math.round(Number(clean) * 100)
}

/** 9.5 → "9:30" (horas decimales, útil para la agenda). */
export function formatHour(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${h}:${String(m).padStart(2, '0')}`
}

/** "Mateo Huamán" → "MH" */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((w) => /^\p{L}/u.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
}

export const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
export const WEEKDAYS_SHORT = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']
