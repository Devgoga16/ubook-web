import { describe, expect, it } from 'vitest'
import { fromDraft } from './record-values'
import { fieldKey, fromEditable, toEditable, type EditableField } from './templates'

const field = (over: Partial<EditableField>): EditableField => ({
  uid: 'x',
  key: null,
  label: 'Campo',
  type: 'text',
  required: false,
  options: '',
  helpText: '',
  ...over,
})

describe('plantillas de ficha', () => {
  it('genera la clave como la API, sin tildes', () => {
    expect(fieldKey('Alergias o sensibilidades')).toBe('alergias_o_sensibilidades')
    expect(fieldKey('Próximo control')).toBe('proximo_control')
    expect(fieldKey('¿?')).toBe('campo')
  })

  it('conserva la clave de los campos existentes aunque cambie el nombre', () => {
    const [f] = toEditable([{ key: 'alergias', label: 'Alergias', type: 'text', required: true, options: [] }])
    const { fields } = fromEditable([{ ...f!, label: 'Alergias conocidas' }])
    expect(fields[0]).toMatchObject({ key: 'alergias', label: 'Alergias conocidas', required: true })
  })

  it('no repite claves en campos nuevos con el mismo nombre', () => {
    const { fields } = fromEditable([field({ key: 'notas', label: 'Notas' }), field({ label: 'Notas' }), field({ label: 'Notas' })])
    expect(fields.map((f) => f.key)).toEqual(['notas', 'notas_2', 'notas_3'])
  })

  it('las listas necesitan dos opciones y se limpian', () => {
    expect(fromEditable([field({ label: 'Tipo', type: 'select', options: 'Solo una' })]).error).toMatch(/dos opciones/)
    const { fields } = fromEditable([field({ label: 'Tipo', type: 'select', options: ' Liso, Rizado ,Liso,' })])
    expect(fields[0]!.options).toEqual(['Liso', 'Rizado'])
  })

  it('al firmar exige los obligatorios y convierte números', () => {
    const fields = [
      { key: 'motivo', label: 'Motivo', type: 'textarea' as const, required: true, options: [] },
      { key: 'peso', label: 'Peso', type: 'number' as const, required: false, options: [] },
    ]
    expect(fromDraft(fields, { motivo: '  ', peso: '70,5' }, true)).toEqual({
      values: { motivo: null, peso: 70.5 },
      errors: { motivo: 'Obligatorio para firmar' },
    })
    expect(fromDraft(fields, { motivo: '', peso: 'abc' }, false).errors).toEqual({ peso: 'Debe ser un número' })
  })
})
