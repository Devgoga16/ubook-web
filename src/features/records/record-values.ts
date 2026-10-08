import type { RecordField, RecordValue, RecordValues } from '@/lib/api/types'

/** Mientras se edita, los números se guardan como texto. */
export type DraftValues = Record<string, RecordValue>

export function toDraft(fields: RecordField[], values: RecordValues = {}): DraftValues {
  return Object.fromEntries(
    fields.map((f) => {
      const v = values[f.key]
      if (f.type === 'checkbox') return [f.key, v === true]
      if (f.type === 'multiselect') return [f.key, Array.isArray(v) ? v : []]
      if (f.type === 'number') return [f.key, typeof v === 'number' ? String(v) : '']
      return [f.key, typeof v === 'string' ? v : '']
    }),
  )
}

/** Valores listos para la API y errores de validación local. */
export function fromDraft(
  fields: RecordField[],
  draft: DraftValues,
  requireAll: boolean,
): { values: RecordValues; errors: Record<string, string> } {
  const values: RecordValues = {}
  const errors: Record<string, string> = {}
  for (const f of fields) {
    const v = draft[f.key]
    if (f.type === 'number') {
      const text = typeof v === 'string' ? v.trim().replace(',', '.') : ''
      if (text && !Number.isFinite(Number(text))) errors[f.key] = 'Debe ser un número'
      values[f.key] = text ? Number(text) : null
    } else if (typeof v === 'string') {
      values[f.key] = v.trim() || null
    } else {
      values[f.key] = v ?? null
    }
    const empty = values[f.key] === null || (Array.isArray(values[f.key]) && (values[f.key] as string[]).length === 0)
    if (requireAll && f.required && f.type !== 'checkbox' && empty && !errors[f.key]) errors[f.key] = 'Obligatorio para firmar'
  }
  return { values, errors }
}
