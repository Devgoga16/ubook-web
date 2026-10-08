import { Check, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { Tag, type TagTone } from '@/components/ui/badges'
import { Button, IconButton } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { Switch } from '@/components/ui/controls'
import { Skeleton } from '@/components/ui/display'
import { Field, Input, Select } from '@/components/ui/field'
import { Modal } from '@/components/ui/overlays'
import { errorMessage } from '@/lib/api/client'
import type { Professional, TimeOff, TimeOffType } from '@/lib/api/types'
import { formatRange, isoToZoned, zonedToIso } from '@/lib/time'
import { useTimeOff, useTimeOffActions } from './api'

const TYPES: Record<TimeOffType, string> = {
  vacation: 'Vacaciones',
  training: 'Capacitación',
  medical: 'Cita médica',
  personal: 'Personal',
  other: 'Otro',
}

const STATUS: Record<TimeOff['status'], { label: string; tone: TagTone }> = {
  pending: { label: 'Pendiente', tone: 'warn' },
  approved: { label: 'Aprobado', tone: 'ok' },
  rejected: { label: 'Rechazado', tone: 'off' },
}

function nextDay(date: string): string {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

function AddTimeOffModal({
  open,
  onOpenChange,
  professional,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  professional: Professional
}) {
  const { create } = useTimeOffActions(professional.id)
  const today = isoToZoned(new Date().toISOString()).date
  const [type, setType] = useState<TimeOffType>('vacation')
  const [title, setTitle] = useState('')
  const [allDay, setAllDay] = useState(true)
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('13:00')
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setError(null)
    // Día completo: hasta las 00:00 del día siguiente (fin exclusivo).
    const startsAt = allDay ? zonedToIso(from) : zonedToIso(from, startTime)
    const endsAt = allDay ? zonedToIso(nextDay(to)) : zonedToIso(from, endTime)
    if (endsAt <= startsAt) return setError(allDay ? 'La fecha final no puede ser anterior a la inicial' : 'La hora de fin debe ser posterior al inicio')
    try {
      await create.mutateAsync({ type, title: title.trim() || undefined, startsAt, endsAt })
      onOpenChange(false)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={`Nueva ausencia · ${professional.displayName}`}>
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
          <Field label="Tipo">
            {(p) => (
              <Select {...p} value={type} onChange={(e) => setType(e.target.value as TimeOffType)}>
                {Object.entries(TYPES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Título (opcional)">
            {(p) => <Input {...p} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={TYPES[type]} maxLength={80} />}
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={allDay} onCheckedChange={setAllDay} /> Días completos
        </label>
        {allDay ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Desde">{(p) => <Input {...p} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />}</Field>
            <Field label="Hasta (incluido)">{(p) => <Input {...p} type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />}</Field>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Día">{(p) => <Input {...p} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />}</Field>
            <Field label="Desde">{(p) => <Input {...p} type="time" step={300} value={startTime} onChange={(e) => setStartTime(e.target.value)} />}</Field>
            <Field label="Hasta">{(p) => <Input {...p} type="time" step={300} value={endTime} onChange={(e) => setEndTime(e.target.value)} />}</Field>
          </div>
        )}
        <div className="flex justify-end gap-2.5 pt-1">
          <Button onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={create.isPending}>
            {create.isPending ? 'Guardando…' : 'Guardar ausencia'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/** Ausencias y vacaciones del profesional (desde hoy en adelante). */
export function TimeOffCard({
  professional,
  canRequest,
  canDecide,
}: {
  professional: Professional
  /** Puede registrar o pedir ausencias (alcance propio o mayor). */
  canRequest: boolean
  /** Gestiona la sede o el negocio: aprueba, rechaza y elimina. */
  canDecide: boolean
}) {
  const [open, setOpen] = useState(false)
  const [from] = useState(() => zonedToIso(isoToZoned(new Date().toISOString()).date))
  const { data, isLoading } = useTimeOff(professional.id, from)
  const { decide, remove } = useTimeOffActions(professional.id)
  const [error, setError] = useState<string | null>(null)

  const run = (p: Promise<unknown>) => p.catch((e) => setError(errorMessage(e)))

  return (
    <Card>
      <CardHeader
        title="Ausencias y vacaciones"
        actions={
          canRequest && (
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus size={13} aria-hidden /> {canDecide ? 'Agregar' : 'Solicitar'}
            </Button>
          )
        }
      />
      {error && (
        <div role="alert" className="mb-2 rounded-control bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">
          {error}
        </div>
      )}
      {isLoading ? (
        <Skeleton className="h-10" />
      ) : !data?.length ? (
        <p className="m-0 text-sm text-muted">Sin ausencias programadas.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {data.map((t) => (
            <li key={t.id} className="flex items-center gap-2 border-t border-line py-2.5 first:border-t-0 first:pt-0">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{t.title || TYPES[t.type]}</div>
                <div className="text-xs text-muted">{formatRange(t.startsAt, t.endsAt)}</div>
              </div>
              <Tag tone={STATUS[t.status].tone}>{STATUS[t.status].label}</Tag>
              {canDecide && t.status === 'pending' && (
                <>
                  <IconButton aria-label="Aprobar" className="text-ok" onClick={() => void run(decide.mutateAsync({ id: t.id, status: 'approved' }))}>
                    <Check size={16} />
                  </IconButton>
                  <IconButton aria-label="Rechazar" className="text-bad" onClick={() => void run(decide.mutateAsync({ id: t.id, status: 'rejected' }))}>
                    <X size={16} />
                  </IconButton>
                </>
              )}
              {(canDecide || (canRequest && t.status === 'pending')) && (
                <IconButton
                  aria-label={`Eliminar ${t.title || TYPES[t.type]}`}
                  onClick={() => window.confirm('¿Eliminar esta ausencia?') && void run(remove.mutateAsync(t.id))}
                >
                  <Trash2 size={15} />
                </IconButton>
              )}
            </li>
          ))}
        </ul>
      )}
      {open && <AddTimeOffModal open={open} onOpenChange={setOpen} professional={professional} />}
    </Card>
  )
}
