import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  Box,
  Ban,
  CalendarClock,
  Calendar,
  ChevronDown,
  CircleCheck,
  Clock,
  FileQuestion,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Receipt,
  RefreshCw,
  Repeat,
  Scissors,
  User,
  UserRoundX,
  Users,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Avatar } from '@/components/ui/avatar'
import { StatusChip, Tag } from '@/components/ui/badges'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { Segmented } from '@/components/ui/controls'
import { DefinitionList, EmptyState, Skeleton, SlotPicker, Timeline, type TimelineState } from '@/components/ui/display'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { Modal } from '@/components/ui/overlays'
import { BackLink } from '@/components/ui/page'
import { APPOINTMENT_STATUS_META } from '@/domain/appointment-status'
import { useBranchesWithHours } from '@/features/availability/api'
import { ClientPicker } from '@/features/clients/client-picker'
import { formatPhone } from '@/features/clients/api'
import { useProfessionals } from '@/features/professionals/api'
import { useServices } from '@/features/services/api'
import { errorMessage } from '@/lib/api/client'
import type { Appointment, AppointmentStatusValue } from '@/lib/api/types'
import { useAccess } from '@/lib/auth/access'
import { cn } from '@/lib/cn'
import { formatCents } from '@/lib/format'
import { DepositSection } from '@/features/payments/deposit-section'
import { PaymentSection } from '@/features/payments/payment-section'
import { useResources } from '@/features/resources/api'
import { usePageMeta } from '@/lib/page-meta'
import { formatLongDate, formatTime, isoToZoned, todayLocal } from '@/lib/time'
import { useAppointment, useAppointmentActions, useClientHistory, useSlots } from './api'

const NEXT: Partial<Record<AppointmentStatusValue, { to: AppointmentStatusValue; label: string; icon: typeof CircleCheck }>> = {
  pending: { to: 'confirmed', label: 'Confirmar cita', icon: CircleCheck },
  confirmed: { to: 'checked_in', label: 'Marcar llegada', icon: User },
  checked_in: { to: 'in_progress', label: 'Iniciar atención', icon: Clock },
  in_progress: { to: 'completed', label: 'Completar', icon: CircleCheck },
}

const FLOW: AppointmentStatusValue[] = ['confirmed', 'checked_in', 'in_progress', 'completed']

const at = new Intl.DateTimeFormat('es-PE', {
  timeZone: 'America/Lima',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})
const shortDate = new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', weekday: 'short', day: 'numeric', month: 'short' })

const editable = (s: AppointmentStatusValue) => s === 'pending' || s === 'confirmed'

/* ---------- Progreso del estado ---------- */

function StatusProgress({ a }: { a: Appointment }) {
  if (a.status === 'cancelled' || a.status === 'no_show') {
    const last = a.history.at(-1)
    return (
      <div className={cn('flex items-center gap-2.5 rounded-[12px] px-4 py-3 text-sm', a.status === 'cancelled' ? 'bg-bad-bg text-bad' : 'bg-off-bg text-off')}>
        {a.status === 'cancelled' ? <Ban size={16} aria-hidden /> : <UserRoundX size={16} aria-hidden />}
        <span>
          <b>{a.status === 'cancelled' ? 'Cita cancelada' : 'El cliente no asistió'}</b>
          {last && ` · ${at.format(new Date(last.at))}`}
          {last?.note && ` · ${last.note}`}
        </span>
      </div>
    )
  }
  const current = FLOW.indexOf(a.status === 'pending' ? 'confirmed' : a.status)
  return (
    <ol className="m-0 grid list-none grid-cols-4 gap-2 p-0" aria-label="Avance de la cita">
      {FLOW.map((s, i) => {
        const done = i < current || a.status === 'completed'
        const isCurrent = i === current && a.status !== 'completed'
        return (
          <li key={s} className="flex flex-col gap-1.5">
            <span className={cn('h-1.5 rounded-full', done ? 'bg-teal' : isCurrent ? 'bg-grad' : 'bg-surface-2 shadow-[inset_0_0_0_1px_var(--line)]')} />
            <span className={cn('text-2xs font-semibold', done || isCurrent ? 'text-ink' : 'text-muted')}>
              {a.status === 'pending' && i === 0 ? 'Por confirmar' : APPOINTMENT_STATUS_META[s].label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/* ---------- Modificar servicio / profesional / horario ---------- */

function EditDetails({ a, onDone }: { a: Appointment; onDone: () => void }) {
  const services = useServices()
  const professionals = useProfessionals()
  const { reschedule } = useAppointmentActions()
  const [serviceId, setServiceId] = useState(a.serviceId)
  const [proId, setProId] = useState(a.professionalId)
  const [date, setDate] = useState(isoToZoned(a.startsAt).date)
  const [time, setTime] = useState<string | null>(formatTime(a.startsAt))
  const [error, setError] = useState<string | null>(null)

  const staff = (professionals.data ?? []).filter((p) => p.isActive && p.branchIds.includes(a.branchId))
  const offered = (services.data ?? []).filter((s) => staff.some((p) => p.services.some((x) => x.serviceId === s.id)))
  const doers = staff.filter((p) => p.services.some((x) => x.serviceId === serviceId))
  const slots = useSlots({ branchId: a.branchId, serviceId, professionalId: proId, date, excludeAppointmentId: a.id })
  const pro = slots.data?.professionals[0]
  const now = Date.now()
  const list = (pro?.slots ?? []).filter((s) => new Date(s.start).getTime() > now)
  const chosen = list.find((s) => formatTime(s.start) === time)
  const changed = serviceId !== a.serviceId || proId !== a.professionalId || chosen?.start !== a.startsAt

  const submit = async () => {
    if (!chosen) return
    setError(null)
    try {
      await reschedule.mutateAsync({
        id: a.id,
        startsAt: chosen.start,
        ...(proId !== a.professionalId && { professionalId: proId }),
        ...(serviceId !== a.serviceId && { serviceId }),
      })
      onDone()
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Servicio">
          {(p) => (
            <Select
              {...p}
              value={serviceId}
              onChange={(e) => {
                setServiceId(e.target.value)
                const stillDoes = staff.find((x) => x.id === proId)?.services.some((x) => x.serviceId === e.target.value)
                if (!stillDoes) setProId(staff.find((x) => x.services.some((y) => y.serviceId === e.target.value))?.id ?? '')
                setTime(null)
              }}
            >
              {offered.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Profesional">
          {(p) => (
            <Select {...p} value={proId} onChange={(e) => { setProId(e.target.value); setTime(null) }}>
              {doers.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.displayName}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Fecha">
          {(p) => <Input {...p} type="date" value={date} min={todayLocal()} onChange={(e) => { setDate(e.target.value); setTime(null) }} />}
        </Field>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-2xs font-semibold text-muted">Hora · {formatLongDate(date)}</span>
        {slots.isLoading ? (
          <Skeleton className="h-16" />
        ) : list.length === 0 ? (
          <p className="m-0 text-sm text-muted">No hay horarios libres ese día con este profesional.</p>
        ) : (
          <SlotPicker slots={list.map((s) => ({ time: formatTime(s.start), disabled: !s.available }))} value={time ?? undefined} onChange={setTime} />
        )}
      </div>
      {pro && (serviceId !== a.serviceId || proId !== a.professionalId) && (
        <p className="m-0 rounded-control bg-surface-2 px-3 py-2 text-xs text-muted">
          Con el cambio, la cita pasa a <b className="text-ink">{pro.durationMinutes} min</b> y <b className="text-ink">{formatCents(pro.price)}</b> (antes{' '}
          {a.durationMinutes} min y {formatCents(a.price)}).
        </p>
      )}
      {error && <p role="alert" className="m-0 rounded-control bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">{error}</p>}
      <div className="flex justify-end gap-2.5">
        <Button onClick={onDone} disabled={reschedule.isPending}>
          Descartar
        </Button>
        <Button variant="primary" disabled={!changed || !chosen || reschedule.isPending} onClick={() => void submit()}>
          {reschedule.isPending ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </div>
    </div>
  )
}

/* ---------- Panel del cliente ---------- */

function ClientPanel({ a, canEdit }: { a: Appointment; canEdit: boolean }) {
  const history = useClientHistory(a.client?.id)
  const { update } = useAppointmentActions()
  const [changing, setChanging] = useState(false)
  const name = a.client ? `${a.client.firstName} ${a.client.lastName}`.trim() : 'Cliente'
  const digits = a.client?.phone?.replace(/\D/g, '')
  const stats = history.data?.stats
  const upcoming = (history.data?.upcoming ?? []).filter((x) => x.id !== a.id)
  const past = (history.data?.past ?? []).filter((x) => x.id !== a.id).slice(0, 5)

  const linkBtn = 'inline-flex items-center gap-1.5 rounded-control border border-line-strong px-2.5 py-[5px] text-2xs font-semibold text-ink-2 hover:border-teal'

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Avatar name={name} size="lg" round />
        <div className="min-w-0 flex-1">
          {a.client ? (
            <Link to={`/clientes/${a.client.id}`} className="block truncate text-lg font-semibold text-ink hover:underline">
              {name}
            </Link>
          ) : (
            <div className="truncate text-lg font-semibold">{name}</div>
          )}
          <div className="text-xs text-muted">{a.client?.phone ? formatPhone(a.client.phone) : 'Sin celular'}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {digits && (
          <>
            <a href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer" className={linkBtn}>
              <MessageCircle size={13} aria-hidden /> WhatsApp
            </a>
            <a href={`tel:+${digits}`} className={linkBtn}>
              <Phone size={13} aria-hidden /> Llamar
            </a>
          </>
        )}
        {canEdit && (
          <button type="button" className={cn(linkBtn, 'cursor-pointer')} onClick={() => setChanging(true)}>
            <Users size={13} aria-hidden /> Cambiar cliente
          </button>
        )}
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-2">
          {[
            ['Citas', String(stats.total)],
            ['Completadas', String(stats.completed)],
            ['No asistió', String(stats.noShows)],
            ['Gastado', formatCents(stats.spent)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[10px] bg-surface-2 px-3 py-2">
              <div className="text-2xs text-muted">{label}</div>
              <div className={cn('tabular font-semibold', label === 'No asistió' && Number(value) > 0 && 'text-bad')}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="text-2xs font-semibold text-muted">Próximas citas</div>
          {upcoming.map((x) => (
            <Link key={x.id} to={`/agenda/citas/${x.id}`} className="flex items-center gap-2 rounded-control px-2 py-1.5 text-sm text-ink hover:bg-surface-2">
              <span className="tabular w-[92px] text-xs text-muted">{shortDate.format(new Date(x.startsAt))}</span>
              <span className="flex-1 truncate">{x.serviceName}</span>
              <span className="tabular text-xs text-muted">{formatTime(x.startsAt)}</span>
            </Link>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <div className="text-2xs font-semibold text-muted">Últimas visitas</div>
        {history.isLoading ? (
          <Skeleton className="h-16" />
        ) : past.length === 0 ? (
          <p className="m-0 text-xs text-muted">Es su primera cita.</p>
        ) : (
          past.map((x) => (
            <Link key={x.id} to={`/agenda/citas/${x.id}`} className="flex items-center gap-2 rounded-control px-2 py-1.5 text-sm text-ink hover:bg-surface-2">
              <span className="tabular w-[92px] text-xs text-muted">{shortDate.format(new Date(x.startsAt))}</span>
              <span className="flex-1 truncate">{x.serviceName}</span>
              <StatusChip status={x.status} className="px-1.5 py-0" />
            </Link>
          ))
        )}
      </div>

      <Modal open={changing} onOpenChange={setChanging} title="Cambiar cliente de la cita">
        <ClientPicker
          value={null}
          onChange={(c) => {
            void update.mutateAsync({ id: a.id, clientId: c.id }).then(() => setChanging(false))
          }}
        />
      </Modal>
    </Card>
  )
}

/* ---------- Página ---------- */

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} actions={action} />
      {children}
    </Card>
  )
}

/** Agenda / Cita #UB-…: gestión completa de una cita. */
export function AppointmentPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: a, isLoading, isError } = useAppointment(id)
  const professionals = useProfessionals()
  const branches = useBranchesWithHours()
  const { hasFeature, can: canDo } = useAccess()
  const resources = useResources(a?.branchId, hasFeature('resources') && canDo('resource.read') && !!a?.resourceId)
  const { changeStatus, update } = useAppointmentActions()
  const { can, readOnly } = useAccess()
  const [editing, setEditing] = useState(false)
  const [notes, setNotes] = useState<string | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelBy, setCancelBy] = useState<'cliente' | 'negocio'>('cliente')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const name = a?.client ? `${a.client.firstName} ${a.client.lastName}`.trim() : 'Cliente'
  usePageMeta(a ? { title: `Cita #UB-${a.number}`, crumb: `Agenda / Cita #UB-${a.number}` } : null)

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-[140px] rounded-card" />
        <Skeleton className="h-[320px] rounded-card" />
      </div>
    )
  }
  if (isError || !a) {
    return (
      <Card>
        <EmptyState
          icon={FileQuestion}
          title="No encontramos esta cita"
          action={
            <Link to="/agenda" className="text-sm font-semibold text-brand hover:underline">
              Volver a la agenda
            </Link>
          }
        />
      </Card>
    )
  }

  const pro = professionals.data?.find((p) => p.id === a.professionalId)
  const branch = branches.data?.find((b) => b.id === a.branchId)
  const resource = resources.data?.find((r) => r.id === a.resourceId)
  const date = isoToZoned(a.startsAt).date
  const canUpdate = can('booking.update') && !readOnly
  const next = NEXT[a.status]
  const rebook = () =>
    navigate(`/agenda/nueva?cliente=${a.client?.id ?? ''}&servicio=${a.serviceId}&profesional=${a.professionalId}`)

  const run = async (status: AppointmentStatusValue, note?: string, by?: 'client' | 'business') => {
    setError(null)
    try {
      await changeStatus.mutateAsync({ id: a.id, status, note, by })
      setCancelOpen(false)
      setReason('')
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  const historyItems = a.history.map((h, i) => {
    const prev = a.history[i - 1]
    const isChange = prev && prev.status === h.status
    return {
      title: isChange ? 'Modificada' : APPOINTMENT_STATUS_META[h.status].label,
      detail: at.format(new Date(h.at)),
      extra: h.note,
      state: (h.status === 'cancelled' ? 'bad' : h.status === 'no_show' ? 'off' : 'done') as TimelineState,
    }
  })

  const menuItem = 'flex cursor-pointer items-center gap-2.5 rounded-control px-2.5 py-2 text-body outline-none data-[highlighted]:bg-surface-2'

  return (
    <>
      <BackLink to={`/agenda?fecha=${date}`} label="Agenda" />

      {/* Encabezado */}
      <Card className="flex flex-col gap-5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted">
              Cita #UB-{a.number} <StatusChip status={a.status} />
              {a.channel === 'online' && <Tag tone="teal">Reservada online</Tag>}
              {a.rescheduleCount > 0 && <span>· reprogramada {a.rescheduleCount} {a.rescheduleCount === 1 ? 'vez' : 'veces'}</span>}
            </div>
            <h2 className="m-0 mt-1.5 text-2xl font-semibold">{name}</h2>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2">
              <span className="flex items-center gap-1.5">
                <Scissors size={14} className="text-muted" aria-hidden /> {a.serviceName}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar size={14} className="text-muted" aria-hidden /> {formatLongDate(date)} · {formatTime(a.startsAt)} – {formatTime(a.endsAt)}
              </span>
              {pro && (
                <span className="flex items-center gap-1.5">
                  <Avatar name={pro.displayName} color={pro.color} size="xs" round className="size-5 text-[9px]" /> {pro.displayName}
                </span>
              )}
            </div>
          </div>
          {canUpdate && (
            <div className="flex flex-wrap items-center gap-2">
              {next && (
                <Button variant="primary" disabled={changeStatus.isPending} onClick={() => void run(next.to)}>
                  <next.icon size={15} aria-hidden /> {next.label}
                </Button>
              )}
              {!next && (
                <Button variant="primary" onClick={rebook} disabled={!can('booking.create')}>
                  <Repeat size={15} aria-hidden /> Volver a agendar
                </Button>
              )}
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <Button>
                    Más acciones <ChevronDown size={14} aria-hidden />
                  </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content align="end" sideOffset={6} className="z-50 min-w-[220px] rounded-[12px] bg-surface p-1.5 shadow-pop">
                    {editable(a.status) && (
                      <DropdownMenu.Item className={menuItem} onSelect={() => setEditing(true)}>
                        <CalendarClock size={15} aria-hidden /> Cambiar horario o servicio
                      </DropdownMenu.Item>
                    )}
                    {next && can('booking.create') && (
                      <DropdownMenu.Item className={menuItem} onSelect={rebook}>
                        <Repeat size={15} aria-hidden /> Agendar otra cita igual
                      </DropdownMenu.Item>
                    )}
                    {a.status === 'confirmed' && (
                      <DropdownMenu.Item className={menuItem} onSelect={() => void run('no_show')}>
                        <UserRoundX size={15} aria-hidden /> Marcar "No asistió"
                      </DropdownMenu.Item>
                    )}
                    {a.status === 'no_show' && (
                      <DropdownMenu.Item className={menuItem} onSelect={() => void run('confirmed', 'Se corrigió: sí asistió')}>
                        <RefreshCw size={15} aria-hidden /> Deshacer "No asistió"
                      </DropdownMenu.Item>
                    )}
                    {can('booking.cancel') && ['pending', 'confirmed', 'checked_in'].includes(a.status) && (
                      <>
                        <DropdownMenu.Separator className="my-1 h-px bg-line" />
                        <DropdownMenu.Item className={cn(menuItem, 'text-bad')} onSelect={() => setCancelOpen(true)}>
                          <Ban size={15} aria-hidden /> Cancelar cita
                        </DropdownMenu.Item>
                      </>
                    )}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>
          )}
        </div>
        <StatusProgress a={a} />
        {error && <p role="alert" className="m-0 rounded-control bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">{error}</p>}
      </Card>

      <div className="grid items-start gap-[18px] lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-[18px]">
          <Section
            title={editing ? 'Cambiar horario o servicio' : 'Detalles de la cita'}
            action={
              canUpdate &&
              editable(a.status) &&
              !editing && (
                <Button size="sm" onClick={() => setEditing(true)}>
                  <Pencil size={13} aria-hidden /> Modificar
                </Button>
              )
            }
          >
            {editing ? (
              <EditDetails a={a} onDone={() => setEditing(false)} />
            ) : (
              <DefinitionList
                items={[
                  { icon: Scissors, label: 'Servicio', value: `${a.serviceName} · ${a.durationMinutes} min` },
                  { icon: User, label: 'Profesional', value: pro?.displayName ?? '—' },
                  { icon: Calendar, label: 'Fecha', value: formatLongDate(date) },
                  { icon: Clock, label: 'Hora', value: `${formatTime(a.startsAt)} – ${formatTime(a.endsAt)}` },
                  { icon: MapPin, label: 'Sede', value: branch?.name ?? '—' },
                  ...(a.resourceId && resource ? [{ icon: Box, label: 'Recurso', value: resource.name }] : []),
                  { icon: Receipt, label: 'Precio', value: a.promotionCode && a.listPrice ? `${formatCents(a.price)} (cupón ${a.promotionCode}, antes ${formatCents(a.listPrice)})` : formatCents(a.price) },
                ]}
              />
            )}
          </Section>

          <DepositSection a={a} />

          <PaymentSection a={a} />

          <Section title="Nota de la cita">
            <div className="flex flex-col gap-2.5">
              <Textarea
                aria-label="Nota de la cita"
                value={notes ?? a.notes ?? ''}
                disabled={!canUpdate}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Preferencias, indicaciones, lo que deba saber quien atienda…"
                className="min-h-24"
              />
              {canUpdate && notes !== null && notes !== (a.notes ?? '') && (
                <div className="flex justify-end gap-2">
                  <Button size="sm" onClick={() => setNotes(null)}>Descartar</Button>
                  <Button size="sm" variant="primary" disabled={update.isPending} onClick={() => void update.mutateAsync({ id: a.id, notes }).then(() => setNotes(null))}>
                    Guardar nota
                  </Button>
                </div>
              )}
            </div>
          </Section>

          <Section title="Historial">
            <Timeline items={historyItems} />
          </Section>
        </div>

        <ClientPanel a={a} canEdit={canUpdate && editable(a.status)} />
      </div>

      <Modal open={cancelOpen} onOpenChange={setCancelOpen} title={`Cancelar la cita de ${name}`}>
        <div className="flex flex-col gap-3.5">
          <p className="m-0 text-sm text-muted">
            {a.serviceName} · {formatLongDate(date)} a las {formatTime(a.startsAt)}. El horario quedará libre para otra reserva.
          </p>
          <div className="flex flex-col gap-1.5">
            <span className="text-2xs font-semibold text-muted">¿Quién cancela?</span>
            <Segmented
              aria-label="Quién cancela"
              value={cancelBy}
              onValueChange={setCancelBy}
              options={[
                { value: 'cliente', label: 'El cliente' },
                { value: 'negocio', label: 'El negocio' },
              ]}
              className="self-start"
            />
          </div>
          <Field label="Motivo (opcional)">
            {(p) => <Input {...p} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej.: viaje de trabajo" maxLength={250} />}
          </Field>
          <div className="flex justify-end gap-2.5 pt-1">
            <Button onClick={() => setCancelOpen(false)}>Volver</Button>
            <Button
              variant="danger"
              disabled={changeStatus.isPending}
              onClick={() =>
                void run(
                  'cancelled',
                  `Cancelada por ${cancelBy === 'cliente' ? 'el cliente' : 'el negocio'}${reason.trim() ? `: ${reason.trim()}` : ''}`,
                  cancelBy === 'cliente' ? 'client' : 'business',
                )
              }
            >
              Cancelar cita
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
