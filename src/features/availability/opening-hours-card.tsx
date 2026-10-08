import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Copy, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { Button, IconButton } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { Switch } from '@/components/ui/controls'
import { Table, Td, Th } from '@/components/ui/display'
import { errorMessage } from '@/lib/api/client'
import type { BranchWithHours, DaySchedule } from '@/lib/api/types'
import { minutesToTime, timeToMinutes, WEEKDAYS } from '@/lib/time'
import { useCopyOpeningHours, useSaveOpeningHours } from './api'

interface Row {
  open: boolean
  start: string
  end: string
  /** Pausa opcional (p. ej. almuerzo). */
  breakStart: string
  breakEnd: string
}
type Draft = Record<number, Row>

const EMPTY: Row = { open: false, start: '09:00', end: '20:00', breakStart: '', breakEnd: '' }

function toDraft(days: DaySchedule[]): Draft {
  const draft: Draft = {}
  for (const w of WEEKDAYS) {
    const day = days.find((d) => d.weekday === w.iso)
    if (!day?.intervals.length) {
      draft[w.iso] = { ...EMPTY }
      continue
    }
    const first = day.intervals[0]!
    const last = day.intervals[day.intervals.length - 1]!
    const second = day.intervals[1]
    draft[w.iso] = {
      open: true,
      start: minutesToTime(first.start),
      end: minutesToTime(last.end),
      breakStart: second ? minutesToTime(first.end) : '',
      breakEnd: second ? minutesToTime(second.start) : '',
    }
  }
  return draft
}

function fromDraft(draft: Draft): { days: DaySchedule[]; error: string | null } {
  const days: DaySchedule[] = []
  for (const w of WEEKDAYS) {
    const r = draft[w.iso]!
    if (!r.open) continue
    const start = timeToMinutes(r.start)
    const end = timeToMinutes(r.end)
    if (start === null || end === null || end <= start) return { days, error: `${w.long}: revisa la apertura y el cierre` }
    if (r.breakStart || r.breakEnd) {
      const bs = timeToMinutes(r.breakStart)
      const be = timeToMinutes(r.breakEnd)
      if (bs === null || be === null || bs <= start || be >= end || be <= bs) {
        return { days, error: `${w.long}: la pausa debe quedar dentro del horario` }
      }
      days.push({ weekday: w.iso, intervals: [{ start, end: bs }, { start: be, end }] })
    } else {
      days.push({ weekday: w.iso, intervals: [{ start, end }] })
    }
  }
  return { days, error: null }
}

const timeInput =
  'w-[92px] rounded-control border border-line-strong bg-surface px-2 py-1 text-body text-ink disabled:border-transparent disabled:bg-transparent disabled:text-muted'

/** Horario de atención de la sede (tabla del prototipo: Día · Abierto · Apertura · Cierre · Pausa). */
export function OpeningHoursCard({
  branch,
  branches,
  canEdit,
}: {
  branch: BranchWithHours
  branches: BranchWithHours[]
  canEdit: boolean
}) {
  const save = useSaveOpeningHours()
  const copy = useCopyOpeningHours()
  const initial = toDraft(branch.openingHours)
  const [draft, setDraft] = useState<Draft>(initial)
  // Si el horario cambia desde fuera (p. ej. al copiarlo desde otra sede) y no hay edición en curso, se refleja.
  const serverKey = JSON.stringify(branch.openingHours)
  const [seenKey, setSeenKey] = useState(serverKey)
  if (serverKey !== seenKey) {
    setSeenKey(serverKey)
    setDraft(initial)
  }
  const [message, setMessage] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null)
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial)
  const others = branches.filter((b) => b.id !== branch.id)

  const update = (weekday: number, patch: Partial<Row>) => setDraft((d) => ({ ...d, [weekday]: { ...d[weekday]!, ...patch } }))

  const submit = async () => {
    const { days, error } = fromDraft(draft)
    if (error) return setMessage({ tone: 'bad', text: error })
    setMessage(null)
    try {
      await save.mutateAsync({ branchId: branch.id, days })
      setMessage({ tone: 'ok', text: 'Horario guardado' })
    } catch (e) {
      setMessage({ tone: 'bad', text: errorMessage(e) })
    }
  }

  const copyTo = async (to: BranchWithHours) => {
    if (!window.confirm(`¿Reemplazar el horario de ${to.name} por el de ${branch.name}?`)) return
    try {
      await copy.mutateAsync({ from: branch.id, to: to.id })
      setMessage({ tone: 'ok', text: `Horario copiado a ${to.name}` })
    } catch (e) {
      setMessage({ tone: 'bad', text: errorMessage(e) })
    }
  }

  return (
    <Card>
      <CardHeader
        title={`Horario de atención · ${branch.name}`}
        actions={
          canEdit &&
          others.length > 0 && (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <Button size="sm" disabled={dirty || branch.openingHours.length === 0} title={dirty ? 'Guarda los cambios antes de copiar' : undefined}>
                  <Copy size={13} aria-hidden /> Copiar a otra sede
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content align="end" sideOffset={6} className="z-50 min-w-[200px] rounded-[12px] bg-surface p-1.5 shadow-pop">
                  {others.map((b) => (
                    <DropdownMenu.Item
                      key={b.id}
                      onSelect={() => void copyTo(b)}
                      className="cursor-pointer rounded-control px-2.5 py-2 text-body outline-none data-[highlighted]:bg-surface-2"
                    >
                      {b.name}
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          )
        }
      />
      {branch.openingHours.length === 0 && !dirty && (
        <p className="mt-0 mb-3 rounded-control bg-warn-bg px-3 py-2 text-xs text-warn">
          Esta sede aún no tiene horario de atención. Mientras tanto, la agenda solo usa el horario de cada profesional.
        </p>
      )}
      <Table>
        <thead>
          <tr>
            <Th>Día</Th>
            <Th>Abierto</Th>
            <Th>Apertura</Th>
            <Th>Cierre</Th>
            <Th>Pausa</Th>
          </tr>
        </thead>
        <tbody>
          {WEEKDAYS.map((w) => {
            const r = draft[w.iso]!
            const hasBreak = !!(r.breakStart || r.breakEnd)
            return (
              <tr key={w.iso}>
                <Td className="font-semibold">{w.long}</Td>
                <Td>
                  <Switch
                    checked={r.open}
                    disabled={!canEdit}
                    onCheckedChange={(open) => update(w.iso, { open })}
                    aria-label={`Abierto el ${w.long.toLowerCase()}`}
                  />
                </Td>
                <Td>
                  {r.open ? (
                    <input type="time" step={300} value={r.start} disabled={!canEdit} aria-label={`Apertura ${w.long}`} onChange={(e) => update(w.iso, { start: e.target.value })} className={timeInput} />
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </Td>
                <Td>
                  {r.open ? (
                    <input type="time" step={300} value={r.end} disabled={!canEdit} aria-label={`Cierre ${w.long}`} onChange={(e) => update(w.iso, { end: e.target.value })} className={timeInput} />
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </Td>
                <Td>
                  {!r.open ? (
                    <span className="text-muted">—</span>
                  ) : hasBreak ? (
                    <span className="flex items-center gap-1">
                      <input type="time" step={300} value={r.breakStart} disabled={!canEdit} aria-label={`Inicio de pausa ${w.long}`} onChange={(e) => update(w.iso, { breakStart: e.target.value })} className={timeInput} />
                      <span className="text-muted">–</span>
                      <input type="time" step={300} value={r.breakEnd} disabled={!canEdit} aria-label={`Fin de pausa ${w.long}`} onChange={(e) => update(w.iso, { breakEnd: e.target.value })} className={timeInput} />
                      {canEdit && (
                        <IconButton aria-label={`Quitar pausa del ${w.long.toLowerCase()}`} onClick={() => update(w.iso, { breakStart: '', breakEnd: '' })}>
                          <X size={14} />
                        </IconButton>
                      )}
                    </span>
                  ) : canEdit ? (
                    <Button size="sm" variant="ghost" onClick={() => update(w.iso, { breakStart: '13:00', breakEnd: '14:00' })}>
                      <Plus size={12} aria-hidden /> Pausa
                    </Button>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </Td>
              </tr>
            )
          })}
        </tbody>
      </Table>
      {(canEdit && dirty) || message ? (
        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          {message && (
            <span role="status" className={message.tone === 'ok' ? 'text-sm text-ok' : 'text-sm font-semibold text-bad'}>
              {message.text}
            </span>
          )}
          {canEdit && dirty && (
            <div className="ml-auto flex gap-2.5">
              <Button size="sm" onClick={() => setDraft(initial)} disabled={save.isPending}>
                Descartar
              </Button>
              <Button size="sm" variant="primary" onClick={() => void submit()} disabled={save.isPending}>
                {save.isPending ? 'Guardando…' : 'Guardar horario'}
              </Button>
            </div>
          )}
        </div>
      ) : null}
    </Card>
  )
}
