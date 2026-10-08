import { useQuery } from '@tanstack/react-query'
import { AlertCircle, CalendarCheck, CalendarDays, CircleDollarSign, Gauge, Hourglass, Lock, Plus, Receipt, UserPlus, UserX, Users, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Avatar } from '@/components/ui/avatar'
import { StatusChip } from '@/components/ui/badges'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { Segmented } from '@/components/ui/controls'
import { EmptyState, ProgressBar, Skeleton } from '@/components/ui/display'
import { Kpi } from '@/components/ui/kpi'
import { appointmentsKey, useAppointmentActions } from '@/features/agenda/api'
import { api, errorMessage } from '@/lib/api/client'
import type { AppointmentStatusValue } from '@/lib/api/types'
import { useAccess } from '@/lib/auth/access'
import { useAuth } from '@/lib/auth/auth-context'
import { useBranch } from '@/lib/auth/branch-context'
import { cn } from '@/lib/cn'
import { formatCents } from '@/lib/format'
import { addDaysYmd, formatLongDate, formatTime, isoToZoned } from '@/lib/time'

interface Dashboard {
  date: string
  branch: { id: string; name: string }
  kpis: {
    appointments: { today: number; lastWeek: number; remaining: number }
    revenue: { collected: number; sales: number; tips: number; count: number } | null
    occupancy: { percent: number | null; bookedMinutes: number; capacityMinutes: number }
    noShows: { count: number; percent: number }
    newClients: { count: number; online: number } | null
  }
  upcoming: Array<{
    id: string
    startsAt: string
    endsAt: string
    status: AppointmentStatusValue
    serviceName: string
    channel: 'backoffice' | 'online'
    clientName: string
    professionalName: string
    professionalColor: string | null
  }>
  professionals: Array<{ professionalId: string; displayName: string; color: string; appointments: number; bookedMinutes: number; capacityMinutes: number; percent: number | null }>
  attention: Array<{ kind: 'deposit' | 'pending' | 'unpaid' | 'cash' | 'setup'; title: string; detail: string; appointmentId?: string; count?: number }>
}

const WEEKDAY_NAME = ['', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
const hours = (min: number) => {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h && m ? `${h} h ${m} min` : h ? `${h} h` : `${m} min`
}

function greeting(): string {
  const h = Number(isoToZoned(new Date().toISOString()).time.slice(0, 2))
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
}

const ATTENTION = {
  deposit: { icon: Receipt, tone: 'bg-warn-bg text-warn', action: 'Validar' },
  pending: { icon: Hourglass, tone: 'bg-warn-bg text-warn', action: 'Revisar' },
  unpaid: { icon: Wallet, tone: 'bg-bad-bg text-bad', action: 'Cobrar' },
  cash: { icon: Lock, tone: 'bg-info-bg text-info', action: 'Ir a caja' },
  setup: { icon: AlertCircle, tone: 'bg-warn-bg text-warn', action: 'Configurar' },
} as const

/** Acción rápida según el estado: confirmar, marcar llegada o cobrar. */
function QuickAction({ id, status }: { id: string; status: AppointmentStatusValue }) {
  const navigate = useNavigate()
  const { can, readOnly } = useAccess()
  const { changeStatus } = useAppointmentActions()
  const [error, setError] = useState<string | null>(null)
  if (readOnly) return null
  const go = async (to: AppointmentStatusValue) => {
    setError(null)
    try {
      await changeStatus.mutateAsync({ id, status: to })
    } catch (e) {
      setError(errorMessage(e))
    }
  }
  const btn = (label: string, onClick: () => void) => (
    <Button
      size="sm"
      disabled={changeStatus.isPending}
      title={error ?? undefined}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      {label}
    </Button>
  )
  if (status === 'pending' && can('booking.update')) return btn('Confirmar', () => void go('confirmed'))
  if (status === 'confirmed' && can('booking.update')) return btn('Llegó', () => void go('checked_in'))
  if ((status === 'checked_in' || status === 'in_progress') && can('payment.create')) return btn('Cobrar', () => navigate(`/agenda/citas/${id}`))
  return null
}

/** Inicio: cómo va el día en la sede actual. */
export function DashboardPage() {
  const navigate = useNavigate()
  const { me } = useAuth()
  const { current } = useBranch()
  const { can, readOnly } = useAccess()
  const [range, setRange] = useState<'today' | 'tomorrow' | 'week'>('today')
  const dash = useQuery({
    // Bajo la clave de citas: cualquier cambio de cita o cobro lo refresca.
    queryKey: [...appointmentsKey, 'dashboard', current?.id],
    queryFn: () => api<Dashboard>(`/dashboard?branchId=${current!.id}`),
    enabled: !!current,
    refetchInterval: 60_000,
  })

  const d = dash.data
  if (!current || dash.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-[220px] rounded-card" />
        <Skeleton className="h-[320px] rounded-card" />
      </div>
    )
  }
  if (!d) {
    return (
      <Card>
        <p className="m-0 text-sm text-bad">{errorMessage(dash.error)}</p>
      </Card>
    )
  }

  const k = d.kpis
  const free = Math.max(0, k.occupancy.capacityMinutes - k.occupancy.bookedMinutes)
  const diff = k.appointments.today - k.appointments.lastWeek
  const weekday = WEEKDAY_NAME[new Date(`${d.date}T12:00:00Z`).getUTCDay() || 7]
  const tomorrow = addDaysYmd(d.date, 1)
  const visible = d.upcoming.filter((u) => {
    const day = isoToZoned(u.startsAt).date
    return range === 'today' ? day === d.date : range === 'tomorrow' ? day === tomorrow : true
  })

  return (
    <>
      <section className="bg-grad flex flex-col gap-5 rounded-card p-6">
        <div>
          <h2 className="m-0 text-2xl font-semibold">
            {greeting()}, {me?.user.firstName}
          </h2>
          <p className="mt-1 mb-0 text-sm opacity-90">
            {formatLongDate(d.date)} · {d.branch.name}.{' '}
            {k.appointments.today === 0 ? (
              'Hoy aún no hay citas.'
            ) : (
              <>
                Hoy hay <b>{k.appointments.today === 1 ? '1 cita' : `${k.appointments.today} citas`}</b>
                {k.appointments.remaining > 0 && ` (${k.appointments.remaining} por atender)`}
              </>
            )}
            {k.occupancy.capacityMinutes > 0 && ` y ${hours(free)} libres en la agenda.`}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <Kpi
            featured
            icon={CalendarCheck}
            label="Citas hoy"
            value={String(k.appointments.today)}
            detail={diff === 0 ? `Igual que el ${weekday} pasado` : `${diff > 0 ? '+' : ''}${diff} vs. el ${weekday} pasado`}
            onClick={() => navigate('/agenda')}
          />
          {k.revenue && (
            <Kpi
              icon={CircleDollarSign}
              label="Cobrado hoy"
              value={formatCents(k.revenue.collected)}
              detail={`${k.revenue.count} ${k.revenue.count === 1 ? 'cobro' : 'cobros'}${k.revenue.tips ? ` · ${formatCents(k.revenue.tips)} propinas` : ''}`}
              onClick={() => navigate('/pagos')}
            />
          )}
          <Kpi
            icon={Gauge}
            label="Ocupación"
            value={k.occupancy.percent != null ? `${k.occupancy.percent}%` : '—'}
            detail={k.occupancy.capacityMinutes ? `${hours(k.occupancy.bookedMinutes)} de ${hours(k.occupancy.capacityMinutes)}` : 'Sin horario hoy'}
          />
          <Kpi icon={UserX} label="Faltas" value={String(k.noShows.count)} detail={k.noShows.count ? `${k.noShows.percent}% de las citas` : 'Ninguna hoy'} />
          {k.newClients && (
            <Kpi
              icon={UserPlus}
              label="Clientes nuevos"
              value={String(k.newClients.count)}
              detail={k.newClients.online ? `${k.newClients.online} por la página online` : 'Registrados hoy'}
              onClick={() => navigate('/clientes?segmento=new')}
            />
          )}
        </div>
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader
            title="Próximas citas"
            actions={
              <Segmented
                aria-label="Periodo"
                value={range}
                onValueChange={setRange}
                options={[
                  { value: 'today', label: 'Hoy' },
                  { value: 'tomorrow', label: 'Mañana' },
                  { value: 'week', label: 'Semana' },
                ]}
              />
            }
          />
          {visible.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title={range === 'today' ? 'No quedan citas por hoy' : 'Sin citas en este periodo'}
              action={
                can('booking.create') &&
                !readOnly && (
                  <Button variant="primary" size="sm" onClick={() => navigate('/agenda/nueva')}>
                    <Plus size={13} aria-hidden /> Nueva cita
                  </Button>
                )
              }
            />
          ) : (
            <ul className="m-0 list-none p-0">
              {visible.map((u, i) => {
                const day = isoToZoned(u.startsAt).date
                const showDay = range === 'week' && (i === 0 || isoToZoned(visible[i - 1]!.startsAt).date !== day)
                return (
                  <li key={u.id}>
                    {showDay && <div className="pt-3 pb-1 text-2xs font-semibold tracking-wide text-muted uppercase">{formatLongDate(day)}</div>}
                    <div
                      role="link"
                      tabIndex={0}
                      onClick={() => navigate(`/agenda/citas/${u.id}`)}
                      onKeyDown={(e) => e.key === 'Enter' && navigate(`/agenda/citas/${u.id}`)}
                      className="-mx-2 grid cursor-pointer grid-cols-[48px_34px_minmax(0,1fr)_auto] items-center gap-3 rounded-control border-t border-line px-2 py-2.5 first:border-t-0 hover:bg-surface-2 sm:grid-cols-[48px_34px_minmax(0,1fr)_auto_auto]"
                    >
                      <b className="tabular text-sm font-semibold">{formatTime(u.startsAt)}</b>
                      <Avatar name={u.clientName} round />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{u.clientName}</div>
                        <div className="truncate text-xs text-muted">
                          {u.serviceName} · con {u.professionalName.split(' ')[0]}
                          {u.channel === 'online' && ' · online'}
                        </div>
                      </div>
                      <StatusChip status={u.status} className="hidden sm:inline-flex" />
                      <QuickAction id={u.id} status={u.status} />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          {d.attention.length > 0 && (
            <Card>
              <CardHeader title="Requiere atención" />
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {d.attention.map((a) => {
                  const meta = ATTENTION[a.kind]
                  const to =
                    a.kind === 'cash' ? '/pagos' : a.kind === 'setup' ? '/profesionales' : a.appointmentId ? `/agenda/citas/${a.appointmentId}` : '/agenda'
                  return (
                    <li key={a.kind} className="flex items-center gap-3">
                      <span className={cn('grid size-9 flex-none place-items-center rounded-[10px]', meta.tone)}>
                        <meta.icon size={16} aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold">{a.title}</div>
                        <div className="truncate text-xs text-muted">{a.detail}</div>
                      </div>
                      <Link to={to} className="text-xs font-semibold whitespace-nowrap text-brand hover:underline">
                        {meta.action}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </Card>
          )}

          <Card>
            <CardHeader title="Ocupación por profesional" actions={<span className="text-xs text-muted">Hoy</span>} />
            {d.professionals.length === 0 ? (
              <EmptyState icon={Users} title="Sin profesionales en esta sede" />
            ) : (
              <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
                {d.professionals.map((p) => (
                  <li key={p.professionalId} className="flex items-center gap-3">
                    <Avatar name={p.displayName} color={p.color} size="xs" round />
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between gap-2 text-sm">
                        <span className="truncate font-semibold">{p.displayName}</span>
                        <span className="text-muted">
                          {p.percent != null ? `${p.percent}%` : 'No atiende hoy'}
                          {p.appointments > 0 && ` · ${p.appointments} ${p.appointments === 1 ? 'cita' : 'citas'}`}
                        </span>
                      </div>
                      <ProgressBar value={p.percent ?? 0} label={`Ocupación de ${p.displayName}`} className="mt-1.5" />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}
