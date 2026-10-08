import { ArrowDown, ArrowUp, FileQuestion, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Button, IconButton } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox, Switch } from '@/components/ui/controls'
import { EmptyState, Skeleton } from '@/components/ui/display'
import { Field, Input, Select } from '@/components/ui/field'
import { BackLink, FormActions, FormSection } from '@/components/ui/page'
import { errorMessage } from '@/lib/api/client'
import type { RecordFieldType, RecordTemplate } from '@/lib/api/types'
import { usePageMeta } from '@/lib/page-meta'
import { useRecordTemplates, useSaveTemplate } from './api'
import { RecordFieldsEditor } from './record-fields'
import { toDraft } from './record-values'
import { FIELD_TYPE_LABELS, fromEditable, newUid, toEditable, type EditableField } from './templates'

function Editor({ template }: { template: RecordTemplate | null }) {
  const navigate = useNavigate()
  const save = useSaveTemplate()
  const [name, setName] = useState(template?.name ?? '')
  const [description, setDescription] = useState(template?.description ?? '')
  const [isActive, setIsActive] = useState(template?.isActive ?? true)
  const [fields, setFields] = useState<EditableField[]>(() =>
    template
      ? toEditable(template.fields)
      : [{ uid: newUid(), key: null, label: '', type: 'textarea', required: false, options: '', helpText: '' }],
  )
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const patch = (uid: string, change: Partial<EditableField>) => {
    setSaved(false)
    setFields((list) => list.map((f) => (f.uid === uid ? { ...f, ...change } : f)))
  }
  const move = (i: number, dir: -1 | 1) =>
    setFields((list) => {
      const next = [...list]
      ;[next[i], next[i + dir]] = [next[i + dir]!, next[i]!]
      return next
    })

  const submit = async () => {
    setError(null)
    if (name.trim().length < 2) return setError('Ponle un nombre a la plantilla')
    const built = fromEditable(fields)
    if (built.error) return setError(built.error)
    try {
      const result = await save.mutateAsync({
        id: template?.id,
        name: name.trim(),
        description: description.trim(),
        fields: built.fields,
        ...(template && { isActive }),
      })
      if (!template) navigate(`/configuracion/fichas/${result.id}`, { replace: true })
      else {
        setFields(toEditable(result.fields))
        setSaved(true)
      }
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  const preview = fromEditable(fields.filter((f) => f.label.trim()))

  return (
    <Card>
      {error && (
        <div role="alert" className="mb-4 rounded-control bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">
          {error}
        </div>
      )}
      <fieldset disabled={save.isPending} className="m-0 flex min-w-0 flex-col border-0 p-0">
        <FormSection title="Plantilla" description="Así la elige el profesional al escribir una ficha.">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nombre">{(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} autoFocus={!template} />}</Field>
            <Field label="Descripción (opcional)">
              {(p) => <Input {...p} value={description} onChange={(e) => setDescription(e.target.value)} />}
            </Field>
          </div>
          {template && (
            <label className="flex cursor-pointer items-center gap-2.5 text-sm">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              Activa · {isActive ? 'se puede usar en fichas nuevas' : 'no aparece al crear fichas'}
            </label>
          )}
        </FormSection>

        <FormSection title="Campos" description="Lo que se registra en cada atención. Los marcados como obligatorios se exigen al firmar.">
          <ol className="m-0 flex list-none flex-col gap-3 p-0">
            {fields.map((f, i) => (
              <li key={f.uid} className="flex flex-col gap-3 rounded-[12px] border border-line bg-surface-2/50 p-3.5">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
                  <Field label={`Campo ${i + 1}`}>
                    {(p) => <Input {...p} value={f.label} onChange={(e) => patch(f.uid, { label: e.target.value })} placeholder="Ej.: Alergias" />}
                  </Field>
                  <Field label="Tipo">
                    {(p) => (
                      <Select {...p} value={f.type} onChange={(e) => patch(f.uid, { type: e.target.value as RecordFieldType })}>
                        {(Object.keys(FIELD_TYPE_LABELS) as RecordFieldType[]).map((t) => (
                          <option key={t} value={t}>
                            {FIELD_TYPE_LABELS[t]}
                          </option>
                        ))}
                      </Select>
                    )}
                  </Field>
                </div>
                {(f.type === 'select' || f.type === 'multiselect') && (
                  <Field label="Opciones" hint="Separadas por coma.">
                    {(p) => <Input {...p} value={f.options} onChange={(e) => patch(f.uid, { options: e.target.value })} placeholder="Liso, Ondulado, Rizado" />}
                  </Field>
                )}
                <Field label="Ayuda (opcional)">
                  {(p) => <Input {...p} value={f.helpText} onChange={(e) => patch(f.uid, { helpText: e.target.value })} />}
                </Field>
                <div className="flex flex-wrap items-center gap-2">
                  {f.type !== 'checkbox' && (
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <Checkbox checked={f.required} onCheckedChange={(v) => patch(f.uid, { required: v === true })} />
                      Obligatorio
                    </label>
                  )}
                  <div className="ml-auto flex gap-1">
                    <IconButton aria-label="Subir" disabled={i === 0} onClick={() => move(i, -1)}>
                      <ArrowUp size={15} aria-hidden />
                    </IconButton>
                    <IconButton aria-label="Bajar" disabled={i === fields.length - 1} onClick={() => move(i, 1)}>
                      <ArrowDown size={15} aria-hidden />
                    </IconButton>
                    <IconButton
                      aria-label={`Quitar ${f.label || 'campo'}`}
                      disabled={fields.length === 1}
                      onClick={() => setFields((list) => list.filter((x) => x.uid !== f.uid))}
                    >
                      <Trash2 size={15} aria-hidden />
                    </IconButton>
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <Button
            className="self-start"
            onClick={() => setFields((list) => [...list, { uid: newUid(), key: null, label: '', type: 'text', required: false, options: '', helpText: '' }])}
          >
            <Plus size={14} aria-hidden /> Agregar campo
          </Button>
        </FormSection>

        {preview.fields.length > 0 && (
          <FormSection title="Vista previa" description="Así se verá al escribir una ficha.">
            <div className="pointer-events-none rounded-[12px] border border-dashed border-line-strong p-4" aria-hidden>
              <RecordFieldsEditor fields={preview.fields} draft={toDraft(preview.fields)} errors={{}} onChange={() => {}} />
            </div>
          </FormSection>
        )}

        <FormActions hint={saved ? 'Cambios guardados' : undefined}>
          <Button onClick={() => navigate('/configuracion?tab=fichas')}>Volver</Button>
          <Button variant="primary" onClick={submit}>
            {save.isPending ? 'Guardando…' : template ? 'Guardar cambios' : 'Crear plantilla'}
          </Button>
        </FormActions>
      </fieldset>
    </Card>
  )
}

/** Configuración / Fichas clínicas / plantilla: página completa para editar sus campos. */
export function TemplateEditorPage() {
  const { id } = useParams<{ id: string }>()
  const templates = useRecordTemplates(true)
  const isNew = !id || id === 'nueva'
  const template = isNew ? null : (templates.data?.find((t) => t.id === id) ?? null)
  usePageMeta({
    title: isNew ? 'Nueva plantilla' : (template?.name ?? 'Plantilla'),
    crumb: `Ajustes / Configuración / Fichas / ${isNew ? 'Nueva' : (template?.name ?? '')}`,
  })

  return (
    <>
      <BackLink to="/configuracion?tab=fichas" label="Plantillas de ficha" />
      {!isNew && templates.isLoading ? (
        <Skeleton className="h-[400px] rounded-card" />
      ) : !isNew && !template ? (
        <Card>
          <EmptyState
            icon={FileQuestion}
            title="No encontramos esta plantilla"
            action={
              <Link to="/configuracion?tab=fichas" className="text-sm font-semibold text-brand hover:underline">
                Volver a plantillas
              </Link>
            }
          />
        </Card>
      ) : (
        <Editor key={template?.id ?? 'new'} template={template} />
      )}
    </>
  )
}
