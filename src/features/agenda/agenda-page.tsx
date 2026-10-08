import { useQueries } from '@tanstack/react-query'
import { CalendarDays, CalendarX, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Button, IconButton } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Segmented } from '@/components/ui/controls'
import { EmptyState, Skeleton } from '@/components/ui/display'
import { MiniCalendar } from '@/components/ui/mini-calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/overlays'
import { useBranchesWithHours, useExceptions } from '@/features/availability/api'
import { useProfessionals } from '@/features/professionals/api'
import { api } from '@/lib/api/client'
import type { Appointment, TimeOff } from '@/lib/api/types'
import { useAccess } from '@/lib/auth/access'
import { useBranch } from '@/lib/auth/branch-context'
import { cn } from '@/lib/cn'
import { formatCents, MONTHS } from '@/lib/format'
import {
  addDaysYmd,
  dateToYmd,
  formatLongDate,
  isoToZoned,
  minutesOfDay,
  minutesToTime,
  todayLocal,
  ymdToDate,
  zonedToIso,
} from '@/lib/time'
import { AgendaGrid, visibleRange, workingWindows, type DayTimeOff } from './agenda-grid'
import { useRangeAppointments } from './api'
import { monthGridStart, MonthView } from './month-view'
import { ProfessionalFilter } from './professional-filter'
import { startOfWeek, WeekView } from './week-view'

type View = 'dia' | 'semana' | 'mes'

/** Recorta una ausencia (que puede durar varios días) al día mostrado. */
function clipToDay(t: TimeOff, date: string): DayTimeOff | null {
  const s = isoToZoned(t.startsAt)
  const e = isoToZoned(t.endsAt)
  if (s.date > date || e.date < date) return null
  const start = s.date < date ? 0 : minutesOfDay(t.startsAt)
  const end = e.date > date ? 24 * 60 : minutesOfDay(t.endsAt)
  return end > start ? { id: t.id, title: t.title, start, end } : null
}

const shortDay = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', timeZone: 'UTC' })

function rangeLabel(view: View, date: string): string {
  if (view === 'dia') return formatLongDate(date)
  if (view === 'mes') return `${MONTHS[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`
  const start = startOfWeek(date)
  const end = addDaysYmd(start, 6)
  return `${shortDay.format(new Date(`${start}T12:00:00Z`))} – ${shortDay.format(new Date(`${end}T12:00:00Z`))} ${end.slice(0, 4)}`
}

function rangeOf(view: View, date: string): { from: string; to: string } {
  if (view === 'dia') return { from: date, to: addDaysYmd(date, 1) }
  if (view === 'semana') {
    const from = startOfWeek(date)
    return { from, to: addDaysYmd(from, 7) }
  }
  const from = monthGridStart(date)
  return { from, to: addDaysYmd(from, 42) }
}

function shift(view: View, date: string, dir: 1 | -1): string {
  if (view === 'dia') return addDaysYmd(date, dir)
  if (view === 'semana') return addDaysYmd(date, 7 * dir)
  const d = ymdToDate(date)
  return dateToYmd(new Date(d.getFullYear(), d.getMonth() + dir, 1))
}

function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: 'warn' }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className={cn('tabular text-lg font-semibold', tone === 'warn' && 'text-warn')}>{value}</span>
      <span className="text-xs text-muted">{label}</span>
    </div>
  )
}

/** Operación / Agenda: vistas de día, semana y mes. */
export function AgendaPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { can, readOnly } = useAccess()
  const { current: branchCtx } = useBranch()
  const today = todayLocal()
  const date = params.get('fecha') ?? today
  const view = (['dia', 'semana', 'mes'] as const).find((v) => v === params.get('vista')) ?? 'dia'
  const [pickerOpen, setPickerOpen] = useState(false)
  const [selectedPros, setSelectedPros] = useState<string[]>([])

  const range = rangeOf(view, date)
  const branches = useBranchesWithHours()
  const branch = branches.data?.find((b) => b.id === branchCtx?.id)
  const professionals = useProfessionals()
  const appointments = useRangeAppointments(branch?.id, range.from, range.to)
  const exceptions = useExceptions(branch?.id ?? '', range.from)

  const staff = (professionals.data ?? []).filter((p) => p.isActive && branch && p.branchIds.includes(branch.id))
  const visible = selectedPros.length ? staff.filter((p) => selectedPros.includes(p.id)) : staff
  const visibleIds = new Set(visible.map((p) => p.id))
  const list = (appointments.data ?? []).filter((a) => visibleIds.has(a.professionalId))

  const timeOff = useQueries({
    queries: (view === 'dia' ? staff : []).map((p) => ({
      queryKey: ['professionals', p.id, 'time-off', date],
      queryFn: () =>
        api<TimeOff[]>(
          `/professionals/${p.id}/time-off?from=${encodeURIComponent(zonedToIso(date))}&to=${encodeURIComponent(zonedToIso(addDaysYmd(date, 1)))}`,
        ),
    })),
  })

  const go = (patch: { fecha?: string; vista?: View }) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      if (patch.fecha) next.set('fecha', patch.fecha)
      if (patch.vista) next.set('vista', patch.vista)
      return next
    })
  const openAppointment = (a: Appointment) => navigate(`/agenda/citas/${a.id}`)
  const canCreate = can('booking.create') && !readOnly
  const exceptionsInRange = (exceptions.data ?? []).filter((e) => e.date >= range.from && e.date < range.to)
  const nowMinutes = minutesOfDay(new Date().toISOString())

  // Resumen del rango visible
  const active = list.filter((a) => a.status !== 'cancelled' && a.status !== 'no_show')
  const toConfirm = list.filter((a) => a.status === 'pending').length
  const done = list.filter((a) => a.status === 'completed').length
  const revenue = active.reduce((acc, a) => acc + a.price, 0)
  const counts = Object.fromEntries(
    staff.map((p) => [p.id, (appointments.data ?? []).filter((a) => a.professionalId === p.id && a.status !== 'cancelled').length]),
  )

  const content = () => {
    if (!branch) return <EmptyState icon={CalendarX} title="Elige una sede" description="La agenda se muestra por sede." />
    if (staff.length === 0) {
      return (
        <EmptyState
          icon={CalendarX}
          title="No hay profesionales en esta sede"
          description="Agrega profesionales con su horario para empezar a agendar."
          action={
            can('professional.manage') && (
              <Button size="sm" variant="primary" onClick={() => navigate('/profesionales/nuevo')}>
                Agregar profesional
              </Button>
            )
          }
        />
      )
    }

    if (view === 'mes') {
      return (
        <MonthView
          date={date}
          today={today}
          appointments={list}
          professionals={staff}
          exceptions={exceptionsInRange}
          onOpenDay={(d) => go({ fecha: d, vista: 'dia' })}
          onSelect={openAppointment}
        />
      )
    }

    if (view === 'semana') {
      const days = Array.from({ length: 7 }, (_, i) => addDaysYmd(range.from, i)).map((d) => {
        const exception = exceptionsInRange.find((e) => e.date === d)
        return {
          date: d,
          windows: visible.flatMap((p) => workingWindows(p, branch, d, exception)),
          appointments: list.filter((a) => isoToZoned(a.startsAt).date === d),
          closedReason: exception?.type === 'closed' ? 'Cerrado' : undefined,
        }
      })
      const weekRange = visibleRange(
        days.map((d) => d.windows),
        list,
      )
      return (
        <WeekView
          days={days}
          professionals={visible}
          range={weekRange}
          today={today}
          nowMinutes={nowMinutes}
          onSelect={openAppointment}
          onOpenDay={(d) => go({ fecha: d, vista: 'dia' })}
          onEmptySlot={
            canCreate
              ? (d, minutes) =>
                  navigate(
                    `/agenda/nueva?fecha=${d}&hora=${minutesToTime(minutes)}${visible.length === 1 ? `&profesional=${visible[0]!.id}` : ''}`,
                  )
              : undefined
          }
        />
      )
    }

    const exception = exceptionsInRange.find((e) => e.date === date)
    const columns = visible.map((p) => ({
      professional: p,
      windows: workingWindows(p, branch, date, exception),
      timeOff: (timeOff[staff.indexOf(p)]?.data ?? [])
        .filter((t) => t.status === 'approved')
        .map((t) => clipToDay(t, date))
        .filter((t): t is DayTimeOff => !!t),
      appointments: list.filter((a) => a.professionalId === p.id),
    }))
    return (
      <AgendaGrid
        columns={columns}
        range={visibleRange(
          columns.map((c) => c.windows),
          list,
        )}
        nowMinutes={date === today ? nowMinutes : null}
        selectedId={null}
        onSelect={openAppointment}
        onEmptySlot={
          canCreate
            ? (p, minutes) => navigate(`/agenda/nueva?fecha=${date}&profesional=${p.id}&hora=${minutesToTime(minutes)}`)
            : undefined
        }
      />
    )
  }

  const isCurrent = view === 'dia' ? date === today : rangeOf(view, today).from === range.from
  const dayException = view === 'dia' ? exceptionsInRange.find((e) => e.date === date) : undefined

  return (
    <>
      {/* Barra de herramientas */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-full border border-line bg-surface p-1 shadow-card">
            <IconButton aria-label="Anterior" className="rounded-full" onClick={() => go({ fecha: shift(view, date, -1) })}>
              <ChevronLeft size={18} />
            </IconButton>
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex min-w-[210px] cursor-pointer items-center justify-center gap-2 rounded-full px-3 py-1 text-md font-semibold hover:bg-surface-2"
                  aria-label="Elegir fecha"
                >
                  <CalendarDays size={16} className="text-brand" aria-hidden />
                  {rangeLabel(view, date)}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[300px]">
                <MiniCalendar
                  value={ymdToDate(date)}
                  today={ymdToDate(today)}
                  onChange={(d) => {
                    go({ fecha: dateToYmd(d) })
                    setPickerOpen(false)
                  }}
                />
              </PopoverContent>
            </Popover>
            <IconButton aria-label="Siguiente" className="rounded-full" onClick={() => go({ fecha: shift(view, date, 1) })}>
              <ChevronRight size={18} />
            </IconButton>
          </div>
          {!isCurrent && (
            <Button size="sm" className="rounded-full" onClick={() => go({ fecha: today })}>
              {view === 'dia' ? 'Hoy' : view === 'semana' ? 'Esta semana' : 'Este mes'}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          <Segmented
            aria-label="Vista"
            value={view}
            onValueChange={(v) => go({ vista: v })}
            options={[
              { value: 'dia', label: 'Día' },
              { value: 'semana', label: 'Semana' },
              { value: 'mes', label: 'Mes' },
            ]}
          />
          {canCreate && (
            <Button variant="primary" onClick={() => navigate(`/agenda/nueva?fecha=${date >= today ? date : today}`)}>
              <Plus size={14} aria-hidden /> Nueva cita
            </Button>
          )}
        </div>
      </div>

      {/* Resumen y profesionales */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Stat value={active.length} label={active.length === 1 ? 'cita' : 'citas'} />
          {toConfirm > 0 && <Stat value={toConfirm} label="por confirmar" tone="warn" />}
          {done > 0 && <Stat value={done} label={done === 1 ? 'completada' : 'completadas'} />}
          {can('payment.read') && <Stat value={formatCents(revenue)} label="estimado" />}
        </div>
        {staff.length > 1 && (
          <ProfessionalFilter professionals={staff} counts={counts} selected={selectedPros} onChange={setSelectedPros} />
        )}
      </div>

      {dayException && (
        <div role="status" className="rounded-card bg-warn-bg px-4 py-2.5 text-sm text-warn">
          <b>{dayException.name}</b> ·{' '}
          {dayException.type === 'closed'
            ? 'la sede está cerrada este día'
            : `horario especial ${dayException.intervals.map((r) => `${minutesToTime(r.start)}–${minutesToTime(r.end)}`).join(', ')}`}
        </div>
      )}

      <Card className="overflow-hidden p-0">
        {branches.isLoading || professionals.isLoading ? <Skeleton className="m-5 h-[480px]" /> : content()}
      </Card>
    </>
  )
}
