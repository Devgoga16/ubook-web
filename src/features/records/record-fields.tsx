import { Checkbox } from '@/components/ui/controls'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import type { RecordField, RecordValue, RecordValues } from '@/lib/api/types'
import { cn } from '@/lib/cn'
import type { DraftValues } from './record-values'

/** Formulario generado a partir de los campos de la plantilla. */
export function RecordFieldsEditor({
  fields,
  draft,
  errors,
  onChange,
}: {
  fields: RecordField[]
  draft: DraftValues
  errors: Record<string, string>
  onChange: (key: string, value: RecordValue) => void
}) {
  return (
    <div className="grid gap-3.5 sm:grid-cols-2">
      {fields.map((f) => {
        const label = f.required ? `${f.label} *` : f.label
        const wide = f.type === 'textarea' || f.type === 'multiselect'
        const v = draft[f.key]
        if (f.type === 'checkbox') {
          return (
            <label key={f.key} className="flex cursor-pointer items-center gap-2.5 self-end py-2 text-sm">
              <Checkbox checked={v === true} onCheckedChange={(c) => onChange(f.key, c === true)} />
              {f.label}
            </label>
          )
        }
        if (f.type === 'multiselect') {
          const selected = Array.isArray(v) ? v : []
          return (
            <fieldset key={f.key} className="m-0 flex min-w-0 flex-col gap-1.5 border-0 p-0 sm:col-span-2" aria-invalid={!!errors[f.key]}>
              <legend className="mb-1.5 p-0 text-2xs font-semibold text-muted">{label}</legend>
              <div className="flex flex-wrap gap-1.5">
                {f.options.map((o) => {
                  const on = selected.includes(o)
                  return (
                    <button
                      key={o}
                      type="button"
                      aria-pressed={on}
                      onClick={() => onChange(f.key, on ? selected.filter((x) => x !== o) : [...selected, o])}
                      className={cn(
                        'cursor-pointer rounded-full border border-line-strong bg-surface px-3 py-[5px] text-xs font-semibold text-ink-2',
                        on && 'border-teal bg-teal-soft text-teal-ink',
                      )}
                    >
                      {o}
                    </button>
                  )
                })}
              </div>
              {errors[f.key] ? (
                <span className="text-2xs font-semibold text-bad">{errors[f.key]}</span>
              ) : (
                f.helpText && <span className="text-2xs text-muted">{f.helpText}</span>
              )}
            </fieldset>
          )
        }
        return (
          <Field key={f.key} label={label} hint={f.helpText} error={errors[f.key]} className={wide ? 'sm:col-span-2' : undefined}>
            {(p) => {
              const text = typeof v === 'string' ? v : ''
              const set = (value: string) => onChange(f.key, value)
              if (f.type === 'textarea') return <Textarea {...p} rows={3} value={text} onChange={(e) => set(e.target.value)} />
              if (f.type === 'select')
                return (
                  <Select {...p} value={text} onChange={(e) => set(e.target.value)}>
                    <option value="">—</option>
                    {f.options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </Select>
                )
              if (f.type === 'date') return <Input {...p} type="date" value={text} onChange={(e) => set(e.target.value)} />
              if (f.type === 'number') return <Input {...p} inputMode="decimal" value={text} onChange={(e) => set(e.target.value)} />
              return <Input {...p} value={text} onChange={(e) => set(e.target.value)} />
            }}
          </Field>
        )
      })}
    </div>
  )
}

function display(f: RecordField, v: RecordValue | undefined): string | null {
  if (v === null || v === undefined || v === '') return null
  if (f.type === 'checkbox') return v ? 'Sí' : 'No'
  if (Array.isArray(v)) return v.length ? v.join(', ') : null
  if (f.type === 'date' && typeof v === 'string') {
    const [y, m, d] = v.split('-').map(Number) as [number, number, number]
    return new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(y, m - 1, d))
  }
  return String(v)
}

/** Lectura de una ficha: solo los campos con contenido. */
export function RecordValuesView({ fields, values }: { fields: RecordField[]; values: RecordValues }) {
  const filled = fields.map((f) => ({ f, text: display(f, values[f.key]) })).filter((x) => x.text !== null)
  if (filled.length === 0) return <p className="m-0 text-sm text-muted">Sin contenido todavía.</p>
  return (
    <dl className="m-0 grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {filled.map(({ f, text }) => (
        <div key={f.key} className={cn('min-w-0', (f.type === 'textarea' || (text?.length ?? 0) > 60) && 'sm:col-span-2')}>
          <dt className="text-2xs font-semibold text-muted">{f.label}</dt>
          <dd className="m-0 mt-0.5 text-sm break-words whitespace-pre-line">{text}</dd>
        </div>
      ))}
    </dl>
  )
}
