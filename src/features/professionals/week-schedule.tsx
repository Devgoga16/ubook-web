import { CalendarClock, Copy, Pencil, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { Button, IconButton } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { Segmented, Switch } from '@/components/ui/controls'
import { errorMessage } from '@/lib/api/client'
import type { Branch, DaySchedule, Professional, TimeRange } from '@/lib/api/types'
import { cn } from '@/lib/cn'
import { minutesToTime, timeToMinutes, WEEKDAYS } from '@/lib/time'
import { useSaveSchedule } from './api'

const DEFAULT_BLOCK: TimeRange = { start: 9 * 60, end: 18 * 60 }

/** Horas del eje: de 8 a 22 h, ampliando si el horario se sale. */
function axisRange(days: DaySchedule[]): [number, number] {
  const all = days.flatMap((d) => d.intervals)
  const min = Math.min(8 * 60, ...all.map((r) => r.start))
  const max = Math.max(22 * 60, ...all.map((r) => r.end))
  return [Math.floor(min / 120) * 120, Math.ceil(max / 120) * 120]
}

function DayTrack({
  intervals,
  range,
  elsewhere,
}: {
  intervals: TimeRange[]
  range: [number, number]
  /** Ese día trabaja en otra sede (no es descanso). */
  elsewhere?: { branch: string; intervals: TimeRange[] }
}) {
  const [from, to] = range
  const pct = (m: number) => `${((m - from) / (to - from)) * 100}%`
  if (intervals.length === 0 && elsewhere?.intervals.length) {
    const first = elsewhere.intervals[0]!
    const last = elsewhere.intervals[elsewhere.intervals.length - 1]!
    return (
      <div className="relative h-7 rounded-[7px] bg-surface-2 shadow-[inset_0_0_0_1px_var(--line)]">
        <span className="absolute inset-[3px] flex items-center gap-1 rounded-[5px] border border-dashed border-line-strong px-1.5 text-2xs font-semibold whitespace-nowrap text-muted">
          En {elsewhere.branch} · {minutesToTime(first.start)} – {minutesToTime(last.end)}
        </span>
      </div>
    )
  }
  if (intervals.length === 0) {
    return (
      <div className="relative h-7 rounded-[7px] bg-surface-2 shadow-[inset_0_0_0_1px_var(--line)]">
        <span className="absolute inset-[3px] flex items-center rounded-[5px] border border-line-strong bg-off-bg px-1.5 text-2xs font-semibold text-muted">
          Descanso
        </span>
      </div>
    )
  }
  return (
    <div className="relative h-7 rounded-[7px] bg-surface-2 shadow-[inset_0_0_0_1px_var(--line)]">
      {intervals.map((r, i) => {
        const next = intervals[i + 1]
        return (
          <span key={r.start}>
            <span
              className="absolute top-[3px] bottom-[3px] flex items-center overflow-hidden rounded-[5px] border border-teal px-1.5 text-2xs font-semibold whitespace-nowrap text-ink"
              style={{
                left: pct(r.start),
                width: `calc(${pct(r.end)} - ${pct(r.start)})`,
                background: 'color-mix(in srgb, var(--teal) 28%, var(--surface))',
              }}
            >
              {minutesToTime(r.start)} – {minutesToTime(r.end)}
            </span>
            {next && (
              <span
                aria-hidden
                className="absolute top-[3px] bottom-[3px] rounded-[5px] border border-line-strong"
                style={{
                  left: pct(r.end),
                  width: `calc(${pct(next.start)} - ${pct(r.end)})`,
                  background: 'repeating-linear-gradient(135deg, var(--surface-2) 0 5px, var(--line) 5px 6px)',
                }}
              />
            )}
          </span>
        )
      })}
    </div>
  )
}

type Draft = Record<number, Array<{ start: string; end: string }>>

function toDraft(days: DaySchedule[]): Draft {
  const draft: Draft = {}
  for (const w of WEEKDAYS) {
    const day = days.find((d) => d.weekday === w.iso)
    draft[w.iso] = (day?.intervals ?? []).map((r) => ({ start: minutesToTime(r.start), end: minutesToTime(r.end) }))
  }
  return draft
}

function fromDraft(draft: Draft): { days: DaySchedule[]; error: string | null } {
  const days: DaySchedule[] = []
  for (const w of WEEKDAYS) {
    const intervals: TimeRange[] = []
    for (const r of draft[w.iso] ?? []) {
      const start = timeToMinutes(r.start)
      const end = timeToMinutes(r.end)
      if (start === null || end === null) return { days, error: `${w.long}: completa las horas` }
      if (end <= start) return { days, error: `${w.long}: la hora de fin debe ser posterior al inicio` }
      intervals.push({ start, end })
    }
    if (intervals.length) days.push({ weekday: w.iso, intervals })
  }
  return { days, error: null }
}

/** Horario semanal del profesional por sede (prototipo: "Horario semanal · Luis Paredes"). */
export function WeekSchedule({
  professional,
  branches,
  canEdit,
}: {
  professional: Professional
  branches: Branch[]
  canEdit: boolean
}) {
  const ownBranches = branches.filter((b) => professional.branchIds.includes(b.id))
  const [branchId, setBranchId] = useState(ownBranches[0]?.id ?? '')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [error, setError] = useState<string | null>(null)
  const save = useSaveSchedule(professional.id)

  const days = professional.schedules.find((s) => s.branchId === branchId)?.days ?? []
  const elsewhereOn = (weekday: number) => {
    for (const s of professional.schedules) {
      if (s.branchId === branchId) continue
      const day = s.days.find((d) => d.weekday === weekday)
      const branch = branches.find((b) => b.id === s.branchId)
      if (day?.intervals.length && branch) return { branch: branch.name, intervals: day.intervals }
    }
    return undefined
  }
  const isEmpty = days.length === 0 && !WEEKDAYS.some((w) => elsewhereOn(w.iso))
  const range = axisRange(days)
  const ticks: number[] = []
  for (let m = range[0]; m <= range[1]; m += 120) ticks.push(m)

  const startEdit = () => {
    setError(null)
    setDraft(toDraft(days))
  }

  const submit = async () => {
    if (!draft) return
    const { days: next, error: invalid } = fromDraft(draft)
    if (invalid) return setError(invalid)
    setError(null)
    try {
      await save.mutateAsync({ branchId, days: next })
      setDraft(null)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  const update = (weekday: number, fn: (rows: Draft[number]) => Draft[number]) =>
    setDraft((d) => (d ? { ...d, [weekday]: fn(d[weekday] ?? []) } : d))

  return (
    <Card>
      <CardHeader
        title={ownBranches.length > 1 ? 'Horario semanal por sede' : 'Horario semanal'}
        actions={
          <>
            {ownBranches.length > 1 && (
              <Segmented
                aria-label="Sede"
                value={branchId}
                onValueChange={(v) => {
                  setBranchId(v)
                  setDraft(null)
                }}
                options={ownBranches.map((b) => ({ value: b.id, label: b.name }))}
              />
            )}
            {canEdit && !draft && !isEmpty && (
              <Button size="sm" onClick={startEdit} disabled={!branchId}>
                <Pencil size={13} aria-hidden /> Editar
              </Button>
            )}
            {draft && (
              <Button
                size="sm"
                onClick={() => setDraft((d) => d && Object.fromEntries(WEEKDAYS.map((w) => [w.iso, w.iso <= 5 ? [...d[1]!] : d[w.iso]!])))}
                title="Copia el horario del lunes de martes a viernes"
              >
                <Copy size={13} aria-hidden /> Copiar lunes a días hábiles
              </Button>
            )}
          </>
        }
      />

      {!branchId ? (
        <p className="m-0 text-sm text-muted">Asigna una sede al profesional para definir su horario.</p>
      ) : draft ? (
        <div className="flex flex-col gap-2">
          {error && (
            <div role="alert" className="rounded-control bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">
              {error}
            </div>
          )}
          {WEEKDAYS.map((w) => {
            const rows = draft[w.iso] ?? []
            return (
              <div key={w.iso} className="flex flex-wrap items-center gap-2 border-t border-line py-2 first:border-t-0">
                <span className="w-24 font-semibold">{w.long}</span>
                <Switch
                  checked={rows.length > 0}
                  onCheckedChange={(on) =>
                    update(w.iso, () => (on ? [{ start: minutesToTime(DEFAULT_BLOCK.start), end: minutesToTime(DEFAULT_BLOCK.end) }] : []))
                  }
                  aria-label={`Trabaja el ${w.long.toLowerCase()}`}
                />
                {rows.length === 0 && <span className="text-sm text-muted">Descanso</span>}
                {rows.map((r, i) => (
                  <span key={i} className="flex items-center gap-1">
                    <input
                      type="time"
                      step={300}
                      value={r.start}
                      aria-label={`${w.long}, bloque ${i + 1}, inicio`}
                      onChange={(e) => update(w.iso, (rs) => rs.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))}
                      className="rounded-control border border-line-strong bg-surface px-2 py-1 text-body text-ink"
                    />
                    <span className="text-muted">–</span>
                    <input
                      type="time"
                      step={300}
                      value={r.end}
                      aria-label={`${w.long}, bloque ${i + 1}, fin`}
                      onChange={(e) => update(w.iso, (rs) => rs.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))}
                      className="rounded-control border border-line-strong bg-surface px-2 py-1 text-body text-ink"
                    />
                    {rows.length > 1 && (
                      <IconButton
                        aria-label={`Quitar bloque ${i + 1} del ${w.long.toLowerCase()}`}
                        onClick={() => update(w.iso, (rs) => rs.filter((_, j) => j !== i))}
                      >
                        <X size={14} />
                      </IconButton>
                    )}
                  </span>
                ))}
                {rows.length > 0 && rows.length < 4 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      update(w.iso, (rs) => {
                        const last = timeToMinutes(rs[rs.length - 1]!.end) ?? 13 * 60
                        const start = Math.min(last + 60, 23 * 60)
                        return [...rs, { start: minutesToTime(start), end: minutesToTime(Math.min(start + 180, 24 * 60)) }]
                      })
                    }
                  >
                    <Plus size={13} aria-hidden /> Bloque
                  </Button>
                )}
              </div>
            )
          })}
          <div className="flex justify-end gap-2.5 pt-2">
            <Button onClick={() => setDraft(null)} disabled={save.isPending}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={() => void submit()} disabled={save.isPending}>
              {save.isPending ? 'Guardando…' : 'Guardar horario'}
            </Button>
          </div>
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="grid size-12 place-items-center rounded-[14px] bg-brand-soft text-brand">
            <CalendarClock size={22} aria-hidden />
          </span>
          <div className="text-md font-bold">Aún no tiene horario{ownBranches.length > 1 ? ' en esta sede' : ''}</div>
          <p className="m-0 max-w-[46ch] text-sm text-muted">
            Define qué días y horas atiende. Sin horario no se le pueden agendar citas.
          </p>
          {canEdit && (
            <Button variant="primary" size="sm" onClick={startEdit}>
              <Pencil size={13} aria-hidden /> Definir horario
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-[40px_minmax(0,1fr)] items-center gap-x-3 gap-y-2 text-xs">
            <span />
            <div className="relative h-3.5 text-[11px] text-muted">
              {ticks.map((m) => (
                <span
                  key={m}
                  className="absolute -translate-x-1/2"
                  style={{ left: `${((m - range[0]) / (range[1] - range[0])) * 100}%` }}
                >
                  {m / 60}h
                </span>
              ))}
            </div>
            {WEEKDAYS.map((w) => (
              <div key={w.iso} className="contents">
                <span className={cn('font-semibold')}>{w.short}</span>
                <DayTrack
                  intervals={days.find((d) => d.weekday === w.iso)?.intervals ?? []}
                  range={range}
                  elsewhere={elsewhereOn(w.iso)}
                />
              </div>
            ))}
          </div>
          <p className="mt-3.5 mb-0 text-xs text-muted">Las franjas rayadas son descansos entre bloques.</p>
        </>
      )}
    </Card>
  )
}
