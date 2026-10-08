import type { RecordField, RecordFieldType } from '@/lib/api/types'

export const FIELD_TYPE_LABELS: Record<RecordFieldType, string> = {
  text: 'Texto corto',
  textarea: 'Texto largo',
  number: 'Número',
  select: 'Lista (una opción)',
  multiselect: 'Lista (varias opciones)',
  checkbox: 'Sí / No',
  date: 'Fecha',
}

/** Igual que en la API: "Alergias o sensibilidades" → "alergias_o_sensibilidades". */
export function fieldKey(label: string): string {
  return (
    label
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40) || 'campo'
  )
}

/** Campo en edición: las opciones se escriben separadas por coma y la clave se fija al guardar. */
export interface EditableField {
  uid: string
  key: string | null
  label: string
  type: RecordFieldType
  required: boolean
  options: string
  helpText: string
}

let seq = 0
export const newUid = () => `f${++seq}`

export function toEditable(fields: RecordField[]): EditableField[] {
  return fields.map((f) => ({
    uid: newUid(),
    key: f.key,
    label: f.label,
    type: f.type,
    required: f.required,
    options: f.options.join(', '),
    helpText: f.helpText ?? '',
  }))
}

const hasOptions = (t: RecordFieldType) => t === 'select' || t === 'multiselect'

/**
 * Campos para la API. Los existentes conservan su clave (las fichas ya
 * escritas la usan); los nuevos la generan del nombre sin repetir.
 */
export function fromEditable(fields: EditableField[]): { fields: RecordField[]; error: string | null } {
  const used = new Set(fields.map((f) => f.key).filter((k): k is string => !!k))
  const out: RecordField[] = []
  for (const f of fields) {
    const label = f.label.trim()
    if (!label) return { fields: [], error: 'Todos los campos necesitan un nombre' }
    const options = hasOptions(f.type) ? [...new Set(f.options.split(',').map((o) => o.trim()).filter(Boolean))] : []
    if (hasOptions(f.type) && options.length < 2) return { fields: [], error: `"${label}" necesita al menos dos opciones` }
    let key = f.key
    if (!key) {
      const base = fieldKey(label).slice(0, 36)
      key = base
      for (let i = 2; used.has(key); i++) key = `${base}_${i}`
      used.add(key)
    }
    out.push({ key, label, type: f.type, required: f.required, options, ...(f.helpText.trim() && { helpText: f.helpText.trim() }) })
  }
  if (out.length === 0) return { fields: [], error: 'Agrega al menos un campo' }
  return { fields: out, error: null }
}
