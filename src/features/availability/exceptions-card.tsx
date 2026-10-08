import { CalendarPlus, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Pill, Tag } from '@/components/ui/badges'
import { Button, IconButton } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { Segmented } from '@/components/ui/controls'
import { Skeleton } from '@/components/ui/display'
import { Field, Input } from '@/components/ui/field'
import { Modal } from '@/components/ui/overlays'
import { errorMessage } from '@/lib/api/client'
import type { BranchException, BranchWithHours } from '@/lib/api/types'
import { isoToZoned, minutesToTime, timeToMinutes } from '@/lib/time'
import { useExceptionActions, useExceptions } from './api'
import { peruHolidays } from './peru-holidays'

const shortDate = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', timeZone: 'UTC' })

/** "8 oct." este año; "8 oct. 2027" en otros años. */
function formatDay(date: string, currentYear: number): string {
  const d = new Date(`${date}T12:00:00Z`)
  const text = shortDate.format(d)
  return d.getUTCFullYear() === currentYear ? text : `${text} ${d.getUTCFullYear()}`
}

function label(e: BranchException): { text: string; tone: 'bad' | 'warn' | 'ok' } {
  if (e.type === 'closed') return { text: 'Cerrado', tone: 'bad' }
  const first = e.intervals[0]!
  const last = e.intervals[e.intervals.length - 1]!
  return { text: `${minutesToTime(first.start)} – ${minutesToTime(last.end)}`, tone: 'warn' }
}

function AddExceptionModal({
  open,
  onOpenChange,
  branch,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  branch: BranchWithHours
}) {
  const { create } = useExceptionActions(branch.id)
  const today = isoToZoned(new Date().toISOString()).date
  const [date, setDate] = useState(today)
  const [name, setName] = useState('')
  const [type, setType] = useState<'closed' | 'custom_hours'>('closed')
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('16:00')
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setError(null)
    if (name.trim().length < 2) return setError('Escribe un nombre, p. ej. "Feriado" o "Inventario"')
    const s = timeToMinutes(start)
    const e = timeToMinutes(end)
    if (type === 'custom_hours' && (s === null || e === null || e <= s)) return setError('Revisa el horario especial')
    try {
      await create.mutateAsync({
        date,
        name: name.trim(),
        type,
        ...(type === 'custom_hours' && { intervals: [{ start: s!, end: e! }] }),
      })
      onOpenChange(false)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={`Nueva excepción · ${branch.name}`}>
      <form
        noValidate
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        {error && (
          <div role="alert" className="rounded-control bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">
            {error}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Fecha">{(p) => <Input {...p} type="date" value={date} onChange={(e) => setDate(e.target.value)} />}</Field>
          <Field label="Motivo">
            {(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej.: Inventario" maxLength={80} />}
          </Field>
        </div>
        <Segmented
          aria-label="Tipo"
          value={type}
          onValueChange={setType}
          options={[
            { value: 'closed', label: 'Cerrado todo el día' },
            { value: 'custom_hours', label: 'Horario especial' },
          ]}
          className="self-start"
        />
        {type === 'custom_hours' && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Abre">{(p) => <Input {...p} type="time" step={300} value={start} onChange={(e) => setStart(e.target.value)} />}</Field>
            <Field label="Cierra">{(p) => <Input {...p} type="time" step={300} value={end} onChange={(e) => setEnd(e.target.value)} />}</Field>
          </div>
        )}
        <div className="flex justify-end gap-2.5 pt-1">
          <Button onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={create.isPending}>
            {create.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/** Feriados y excepciones de la sede, de hoy en adelante. */
export function ExceptionsCard({ branch, canEdit }: { branch: BranchWithHours; canEdit: boolean }) {
  const today = isoToZoned(new Date().toISOString()).date
  const { data, isLoading } = useExceptions(branch.id, today)
  const { bulk, remove } = useExceptionActions(branch.id)
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null)
  const year = Number(today.slice(0, 4))

  const loadHolidays = async () => {
    setMessage(null)
    const items = [...peruHolidays(year), ...peruHolidays(year + 1)]
      .filter((h) => h.date >= today)
      .map((h) => ({ ...h, type: 'closed' as const }))
    try {
      const res = await bulk.mutateAsync(items)
      setMessage({
        tone: 'ok',
        text: res.created
          ? `Se agregaron ${res.created} feriados${res.skipped ? ` (${res.skipped} ya estaban)` : ''}. Revisa si atiendes alguno de ellos.`
          : 'Los feriados ya estaban registrados.',
      })
    } catch (e) {
      setMessage({ tone: 'bad', text: errorMessage(e) })
    }
  }

  return (
    <Card>
      <CardHeader
        title="Feriados y excepciones"
        actions={
          canEdit && (
            <>
              <Button size="sm" onClick={() => void loadHolidays()} disabled={bulk.isPending}>
                <CalendarPlus size={13} aria-hidden /> {bulk.isPending ? 'Cargando…' : 'Feriados de Perú'}
              </Button>
              <Button size="sm" onClick={() => setOpen(true)}>
                <Plus size={13} aria-hidden /> Agregar
              </Button>
            </>
          )
        }
      />
      {message && (
        <p role="status" className={`mt-0 mb-3 text-xs ${message.tone === 'ok' ? 'text-ok' : 'font-semibold text-bad'}`}>
          {message.text}
        </p>
      )}
      {isLoading ? (
        <Skeleton className="h-24" />
      ) : !data?.length ? (
        <p className="m-0 text-sm text-muted">
          Sin feriados ni días especiales próximos. Usa “Feriados de Perú” para cargar los nacionales.
        </p>
      ) : (
        <ul className="m-0 flex max-h-[420px] list-none flex-col overflow-y-auto p-0">
          {data.map((e) => {
            const l = label(e)
            return (
              <li key={e.id} className="flex items-center gap-2.5 border-t border-line py-2.5 first:border-t-0 first:pt-0">
                <Pill className="min-w-[64px] justify-center whitespace-nowrap">{formatDay(e.date, year)}</Pill>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{e.name}</span>
                <Tag tone={l.tone}>{l.text}</Tag>
                {canEdit && (
                  <IconButton aria-label={`Eliminar ${e.name}`} onClick={() => void remove.mutateAsync(e.id)}>
                    <Trash2 size={14} />
                  </IconButton>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {open && <AddExceptionModal open={open} onOpenChange={setOpen} branch={branch} />}
    </Card>
  )
}
