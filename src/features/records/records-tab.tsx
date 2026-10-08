import { FilePlus2, FileText, Lock, PenLine, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Tag } from '@/components/ui/badges'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState, Skeleton } from '@/components/ui/display'
import { Field, Select, Textarea } from '@/components/ui/field'
import { formatDate } from '@/features/clients/api'
import { useProfessionals } from '@/features/professionals/api'
import { ApiError, errorMessage } from '@/lib/api/client'
import type { Appointment, ClientRecord, RecordTemplate } from '@/lib/api/types'
import { useAccess } from '@/lib/auth/access'
import { useAuth } from '@/lib/auth/auth-context'
import { formatTime } from '@/lib/time'
import { useClientRecords, useRecordActions, useRecordTemplates } from './api'
import { RecordFieldsEditor, RecordValuesView } from './record-fields'
import { fromDraft, toDraft, type DraftValues } from './record-values'

function apiFieldErrors(e: unknown): Record<string, string> {
  return e instanceof ApiError ? ((e.details?.fields as Record<string, string> | undefined) ?? {}) : {}
}

const appointmentLabel = (a: Appointment) => `${formatDate(a.startsAt)} ${formatTime(a.startsAt)} · ${a.serviceName}`

/** Formulario de ficha: crear una nueva o seguir un borrador. */
function RecordEditor({
  clientId,
  templates,
  appointments,
  record,
  onDone,
}: {
  clientId: string
  templates: RecordTemplate[]
  appointments: Appointment[]
  record?: ClientRecord
  onDone: () => void
}) {
  const actions = useRecordActions(clientId)
  const [templateId, setTemplateId] = useState(record?.templateId ?? templates[0]?.id ?? '')
  const inProgress = appointments.find((a) => a.status === 'in_progress' || a.status === 'checked_in')
  const [appointmentId, setAppointmentId] = useState(record ? (record.appointmentId ?? '') : (inProgress?.id ?? ''))
  const fields = record?.fields ?? templates.find((t) => t.id === templateId)?.fields ?? []
  const [draft, setDraft] = useState<DraftValues>(() => toDraft(fields, record?.values))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const busy = actions.create.isPending || actions.update.isPending || actions.sign.isPending

  const pickTemplate = (id: string) => {
    setTemplateId(id)
    setDraft(toDraft(templates.find((t) => t.id === id)?.fields ?? []))
    setErrors({})
  }

  const save = async (sign: boolean) => {
    setError(null)
    const { values, errors: local } = fromDraft(fields, draft, sign)
    setErrors(local)
    if (Object.keys(local).length) return
    if (sign && !window.confirm('Una ficha firmada ya no se puede editar; solo se le pueden agregar notas de corrección. ¿Firmar?')) return
    try {
      if (record) {
        await actions.update.mutateAsync({ id: record.id, values })
        if (sign) await actions.sign.mutateAsync(record.id)
      } else {
        await actions.create.mutateAsync({ templateId, values, appointmentId: appointmentId || undefined, sign })
      }
      onDone()
    } catch (e) {
      setErrors(apiFieldErrors(e))
      setError(errorMessage(e))
    }
  }

  return (
    <Card className="flex flex-col gap-4 shadow-[0_0_0_1.5px_var(--teal-line),var(--shadow)]">
      <div className="flex flex-wrap items-center gap-2">
        <PenLine size={16} aria-hidden className="text-brand" />
        <h3 className="m-0 text-md font-bold">{record ? `Borrador · ${record.templateName}` : 'Nueva ficha'}</h3>
      </div>

      {!record && (
        <div className="grid gap-3 sm:grid-cols-2">
          {templates.length > 1 && (
            <Field label="Plantilla">
              {(p) => (
                <Select {...p} value={templateId} onChange={(e) => pickTemplate(e.target.value)}>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}
          <Field label="Cita relacionada" hint="Opcional. Así queda en el historial de esa atención.">
            {(p) => (
              <Select {...p} value={appointmentId} onChange={(e) => setAppointmentId(e.target.value)}>
                <option value="">Sin cita</option>
                {appointments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {appointmentLabel(a)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-control bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">
          {error}
        </div>
      )}

      <fieldset disabled={busy} className="m-0 min-w-0 border-0 p-0">
        <RecordFieldsEditor
          fields={fields}
          draft={draft}
          errors={errors}
          onChange={(key, value) => {
            setDraft((d) => ({ ...d, [key]: value }))
            setErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => k !== key)))
          }}
        />
      </fieldset>

      <div className="flex flex-wrap items-center gap-2.5 border-t border-line pt-3.5">
        <span className="flex items-center gap-1.5 text-2xs text-muted">
          <Lock size={12} aria-hidden /> Se guarda cifrada
        </span>
        <div className="ml-auto flex flex-wrap gap-2.5">
          <Button onClick={onDone} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={() => save(false)} disabled={busy}>
            Guardar borrador
          </Button>
          <Button variant="primary" onClick={() => save(true)} disabled={busy}>
            <ShieldCheck size={14} aria-hidden /> Firmar
          </Button>
        </div>
      </div>
    </Card>
  )
}

function AddendumForm({ clientId, recordId }: { clientId: string; recordId: string }) {
  const { addendum } = useRecordActions(clientId)
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!open) {
    return (
      <Button size="sm" variant="ghost" className="self-start" onClick={() => setOpen(true)}>
        <FilePlus2 size={13} aria-hidden /> Agregar nota de corrección
      </Button>
    )
  }
  const submit = async () => {
    setError(null)
    if (text.trim().length < 2) return setError('Escribe la nota')
    try {
      await addendum.mutateAsync({ id: recordId, text })
      setText('')
      setOpen(false)
    } catch (e) {
      setError(errorMessage(e))
    }
  }
  return (
    <div className="flex flex-col gap-2">
      <Field label="Nota de corrección" error={error ?? undefined} hint="Queda con fecha y autor; la ficha original no cambia.">
        {(p) => <Textarea {...p} rows={2} value={text} onChange={(e) => setText(e.target.value)} autoFocus />}
      </Field>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => setOpen(false)} disabled={addendum.isPending}>
          Cancelar
        </Button>
        <Button size="sm" variant="primary" onClick={submit} disabled={addendum.isPending}>
          Agregar nota
        </Button>
      </div>
    </div>
  )
}

/** Pestaña "Fichas clínicas" del perfil del cliente. */
export function RecordsTab({ clientId, appointments }: { clientId: string; appointments: Appointment[] }) {
  const { me } = useAuth()
  const { can, readOnly } = useAccess()
  const canWrite = can('client_record.write') && !readOnly
  const records = useClientRecords(clientId)
  const templates = useRecordTemplates()
  const professionals = useProfessionals(can('professional.read'))
  const [editing, setEditing] = useState<'new' | string | null>(null)

  const active = templates.data ?? []
  const byId = new Map(appointments.map((a) => [a.id, a]))
  const authorName = (r: ClientRecord) =>
    r.authorUserId === me?.user.id
      ? 'Tú'
      : ((r.professionalId && professionals.data?.find((p) => p.id === r.professionalId)?.displayName) ?? 'Equipo')

  if (records.isLoading || templates.isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-16 rounded-card" />
        <Skeleton className="h-40 rounded-card" />
      </div>
    )
  }
  if (records.isError) {
    return (
      <Card>
        <p className="m-0 text-sm text-bad">{errorMessage(records.error)}</p>
      </Card>
    )
  }

  const list = records.data ?? []
  const noTemplates = active.length === 0

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="m-0 flex flex-1 items-center gap-1.5 text-xs text-muted">
          <ShieldCheck size={14} aria-hidden className="flex-none text-teal-ink" />
          Información sensible: se guarda cifrada y cada consulta queda registrada.
        </p>
        {canWrite && !noTemplates && list.length > 0 && editing !== 'new' && (
          <Button variant="primary" onClick={() => setEditing('new')}>
            <FilePlus2 size={14} aria-hidden /> Nueva ficha
          </Button>
        )}
      </div>

      {editing === 'new' && (
        <RecordEditor clientId={clientId} templates={active} appointments={appointments} onDone={() => setEditing(null)} />
      )}

      {list.length === 0 && editing !== 'new' && (
        <Card>
          <EmptyState
            icon={FileText}
            title="Sin fichas todavía"
            description={
              noTemplates
                ? 'Primero elige qué datos registrar: crea una plantilla de ficha (general, belleza, psicología, dental o la tuya).'
                : 'Registra lo que pasó en cada atención: motivo, observaciones, fórmulas, recomendaciones.'
            }
            action={
              noTemplates ? (
                can('organization.manage') ? (
                  <Link to="/configuracion?tab=fichas" className="text-sm font-semibold text-brand hover:underline">
                    Crear plantilla de ficha
                  </Link>
                ) : (
                  <span className="text-xs text-muted">Pídele al administrador que cree una plantilla.</span>
                )
              ) : (
                canWrite && (
                  <Button variant="primary" size="sm" onClick={() => setEditing('new')}>
                    <FilePlus2 size={13} aria-hidden /> Nueva ficha
                  </Button>
                )
              )
            }
          />
        </Card>
      )}

      <ol className="m-0 flex list-none flex-col gap-4 p-0">
        {list.map((r) =>
          editing === r.id ? (
            <li key={r.id}>
              <RecordEditor clientId={clientId} templates={active} appointments={appointments} record={r} onDone={() => setEditing(null)} />
            </li>
          ) : (
            <li key={r.id}>
              <Card className="flex flex-col gap-4">
                <div className="flex flex-wrap items-start gap-3">
                  <span className="grid size-9 flex-none place-items-center rounded-[10px] bg-brand-soft text-brand">
                    <FileText size={17} strokeWidth={1.7} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="m-0 text-md font-bold">{r.templateName}</h3>
                      {r.status === 'signed' ? <Tag tone="ok">Firmada</Tag> : <Tag tone="warn">Borrador</Tag>}
                    </div>
                    <div className="mt-0.5 text-xs text-muted">
                      {formatDate(r.createdAt)} · {authorName(r)}
                      {r.appointmentId && byId.get(r.appointmentId) && (
                        <>
                          {' · '}
                          <Link to={`/agenda/citas/${r.appointmentId}`} className="hover:underline">
                            {byId.get(r.appointmentId)!.serviceName}
                          </Link>
                        </>
                      )}
                      {r.signedAt && ` · Firmada el ${formatDate(r.signedAt)}`}
                    </div>
                  </div>
                  {r.canEdit && canWrite && (
                    <Button size="sm" onClick={() => setEditing(r.id)}>
                      <PenLine size={13} aria-hidden /> Continuar
                    </Button>
                  )}
                </div>

                <RecordValuesView fields={r.fields} values={r.values} />

                {r.addenda.length > 0 && (
                  <div className="flex flex-col gap-2 border-t border-line pt-3">
                    {r.addenda.map((a, i) => (
                      <div key={i} className="rounded-[10px] bg-surface-2 px-3.5 py-2.5">
                        <div className="text-2xs font-semibold text-muted">
                          Nota de corrección · {formatDate(a.at)}
                          {a.byUserId === me?.user.id && ' · Tú'}
                        </div>
                        <p className="m-0 mt-0.5 text-sm whitespace-pre-line">{a.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                {r.status === 'signed' && canWrite && <AddendumForm clientId={clientId} recordId={r.id} />}
              </Card>
            </li>
          ),
        )}
      </ol>
    </div>
  )
}
