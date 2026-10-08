import { ChevronLeft, ChevronRight, Clock, Users } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router'
import { Avatar } from '@/components/ui/avatar'
import { Pill } from '@/components/ui/badges'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { EmptyState, Skeleton, SlotPicker, Stepper } from '@/components/ui/display'
import { Field, Textarea } from '@/components/ui/field'
import { MiniCalendar } from '@/components/ui/mini-calendar'
import { BackLink } from '@/components/ui/page'
import { ClientPicker } from '@/features/clients/client-picker'
import { useProfessionals } from '@/features/professionals/api'
import { useServices } from '@/features/services/api'
import { api, ApiError, errorMessage } from '@/lib/api/client'
import type { Client, Professional, Service } from '@/lib/api/types'
import { useBranch } from '@/lib/auth/branch-context'
import { cn } from '@/lib/cn'
import { formatCents } from '@/lib/format'
import { dateToYmd, formatLongDate, formatTime, todayLocal, ymdToDate } from '@/lib/time'
import { useAppointmentActions, useAvailabilityDays, useSlots } from './api'

const STEPS = ['Servicio', 'Profesional', 'Fecha y hora', 'Cliente', 'Confirmar']

function priceFor(p: Professional | undefined, s: Service): number {
  return p?.services.find((x) => x.serviceId === s.id)?.price ?? s.price
}

function monthBounds(first: Date): { from: string; to: string } {
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0)
  return { from: dateToYmd(first), to: dateToYmd(last) }
}

/* ---------------- Página ---------------- */

/** Agenda / Nueva cita (prototipo: S.nueva). */
export function NewAppointmentPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { current: branch } = useBranch()
  const services = useServices()
  const professionals = useProfessionals()
  const { create } = useAppointmentActions()
  const today = todayLocal()

  const presetPro = params.get('profesional')
  const presetService = params.get('servicio')
  // "Volver a agendar" llega con servicio (y profesional): se empieza por la fecha.
  const [step, setStep] = useState(presetService ? (presetPro ? 2 : 1) : 0)
  const [serviceId, setServiceId] = useState<string | null>(presetService)
  /** null = cualquier profesional. */
  const [proId, setProId] = useState<string | null>(presetPro)
  const [date, setDate] = useState(params.get('fecha') && params.get('fecha')! >= today ? params.get('fecha')! : today)
  const [time, setTime] = useState<string | null>(params.get('hora'))
  const [month, setMonth] = useState(() => {
    const d = ymdToDate(date)
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [pickedClient, setClient] = useState<Client | null>(null)
  const presetClientId = params.get('cliente')
  const presetClient = useQuery({
    queryKey: ['clients', 'one', presetClientId],
    queryFn: () => api<Client>(`/clients/${presetClientId}`),
    enabled: !!presetClientId,
  })
  const client = pickedClient ?? presetClient.data ?? null
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const staff = (professionals.data ?? []).filter((p) => p.isActive && branch && p.branchIds.includes(branch.id))
  const offered = (services.data ?? []).filter((s) => staff.some((p) => p.services.some((x) => x.serviceId === s.id)))
  const service = offered.find((s) => s.id === serviceId)
  const doers = service ? staff.filter((p) => p.services.some((x) => x.serviceId === service.id)) : []

  const slots = useSlots({ branchId: branch?.id, serviceId: serviceId ?? undefined, professionalId: proId ?? undefined, date })
  const days = useAvailabilityDays({ branchId: branch?.id, serviceId: serviceId ?? undefined, professionalId: proId ?? undefined, ...monthBounds(month) })

  // Une los horarios de todos los profesionales: libre si al menos uno lo está.
  const merged = new Map<string, { start: string; proId: string | null }>()
  const now = Date.now()
  for (const p of slots.data?.professionals ?? []) {
    for (const s of p.slots) {
      if (new Date(s.start).getTime() <= now) continue
      const key = formatTime(s.start)
      if (!merged.has(key)) merged.set(key, { start: s.start, proId: null })
      if (s.available && !merged.get(key)!.proId) merged.set(key, { start: s.start, proId: p.professionalId })
    }
  }
  const times = [...merged.entries()].sort(([a], [b]) => a.localeCompare(b))
  const chosen = time ? merged.get(time) : undefined
  const assignedPro = staff.find((p) => p.id === (proId ?? chosen?.proId))
  const terms = slots.data?.professionals.find((p) => p.professionalId === assignedPro?.id)
  const freeByDay = new Map((days.data?.days ?? []).map((d) => [d.date, d.free]))

  const canContinue = [!!service, !!service, !!chosen?.proId, !!client, true][step]

  const submit = async () => {
    if (!branch || !service || !chosen?.proId || !client) return
    setError(null)
    try {
      const appt = await create.mutateAsync({
        branchId: branch.id,
        serviceId: service.id,
        professionalId: chosen.proId,
        clientId: client.id,
        startsAt: chosen.start,
        notes: notes.trim() || undefined,
      })
      navigate(`/agenda?fecha=${date}&cita=${appt.id}`, { replace: true })
    } catch (e) {
      setError(errorMessage(e))
      if (e instanceof ApiError && (e.code === 'SLOT_TAKEN' || e.code === 'SLOT_UNAVAILABLE')) {
        setTime(null)
        setStep(2)
        void slots.refetch()
      }
    }
  }

  const groups: Array<[string, typeof times]> = [
    ['Mañana', times.filter(([t]) => t < '12:00')],
    ['Tarde', times.filter(([t]) => t >= '12:00' && t < '18:00')],
    ['Noche', times.filter(([t]) => t >= '18:00')],
  ]

  const actions = (
    <>
      {step > 0 && (
        <Button onClick={() => setStep((s) => s - 1)}>
          <ChevronLeft size={14} aria-hidden /> Atrás
        </Button>
      )}
      {step < 4 ? (
        <Button variant="primary" className="ml-auto" disabled={!canContinue} onClick={() => setStep((s) => s + 1)}>
          Continuar <ChevronRight size={14} aria-hidden />
        </Button>
      ) : (
        <Button variant="primary" className="ml-auto" disabled={create.isPending} onClick={() => void submit()}>
          {create.isPending ? 'Agendando…' : 'Agendar cita'}
        </Button>
      )}
    </>
  )

  if (services.isLoading || professionals.isLoading) return <Skeleton className="h-[420px] rounded-card" />

  return (
    <>
      <BackLink to={`/agenda?fecha=${date}`} label="Agenda" />
      <Stepper steps={STEPS} current={step} />

      <div className="grid items-start gap-[18px] lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          {step === 0 && (
            <>
              <CardHeader title="¿Qué servicio?" />
              {offered.length === 0 ? (
                <EmptyState icon={Users} title="No hay servicios con profesionales en esta sede" description="Asigna servicios a tus profesionales para poder agendar." />
              ) : (
                <ul role="radiogroup" aria-label="Servicio" className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
                  {offered
                    .filter((s) => !presetPro || staff.find((p) => p.id === presetPro)?.services.some((x) => x.serviceId === s.id))
                    .map((s) => {
                      const on = s.id === serviceId
                      return (
                        <li key={s.id}>
                          <button
                            type="button"
                            role="radio"
                            aria-checked={on}
                            onClick={() => {
                              setServiceId(s.id)
                              if (proId && !staff.find((p) => p.id === proId)?.services.some((x) => x.serviceId === s.id)) setProId(null)
                              setStep(presetPro ? 2 : 1)
                            }}
                            className={cn(
                              'flex w-full cursor-pointer items-center gap-3 rounded-[12px] border border-line bg-surface p-3 text-left hover:border-teal-line',
                              on && 'border-teal shadow-[0_0_0_3px_var(--teal-soft)]',
                            )}
                          >
                            <span className="size-3 flex-none rounded-full" style={{ background: s.color }} aria-hidden />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-semibold">{s.name}</span>
                              <span className="flex gap-1.5 pt-1">
                                <Pill>
                                  <Clock size={11} aria-hidden /> {s.durationMinutes} min
                                </Pill>
                                <Pill>{formatCents(s.price)}</Pill>
                              </span>
                            </span>
                          </button>
                        </li>
                      )
                    })}
                </ul>
              )}
            </>
          )}

          {step === 1 && service && (
            <>
              <CardHeader title="¿Con quién?" />
              <ul role="radiogroup" aria-label="Profesional" className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
                {[null, ...doers].map((p) => {
                  const on = (p?.id ?? null) === proId
                  return (
                    <li key={p?.id ?? 'any'}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => {
                          setProId(p?.id ?? null)
                          setTime(null)
                          setStep(2)
                        }}
                        className={cn(
                          'flex w-full cursor-pointer items-center gap-3 rounded-[12px] border border-line bg-surface p-3 text-left hover:border-teal-line',
                          on && 'border-teal shadow-[0_0_0_3px_var(--teal-soft)]',
                        )}
                      >
                        {p ? (
                          <Avatar name={p.displayName} color={p.color} round />
                        ) : (
                          <span className="grid size-[34px] place-items-center rounded-full bg-brand-soft text-brand">
                            <Users size={16} aria-hidden />
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{p ? p.displayName : 'Cualquier profesional'}</span>
                          <span className="text-xs text-muted">
                            {p ? `${p.title || 'Profesional'} · ${formatCents(priceFor(p, service))}` : 'El primero libre en el horario que elijas'}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </>
          )}

          {step === 2 && service && (
            <>
              <CardHeader title="Elige fecha y hora" />
              <div className="grid gap-7 md:grid-cols-2">
                <MiniCalendar
                  size="lg"
                  value={ymdToDate(date)}
                  today={ymdToDate(today)}
                  minDate={ymdToDate(today)}
                  onMonthChange={setMonth}
                  hasEvents={(d) => (freeByDay.get(dateToYmd(d)) ?? 0) > 0}
                  isFull={(d) => days.data !== undefined && (freeByDay.get(dateToYmd(d)) ?? 0) === 0}
                  onChange={(d) => {
                    setDate(dateToYmd(d))
                    setTime(null)
                  }}
                />
                <div className="flex flex-col gap-4">
                  <div className="font-semibold">{formatLongDate(date)}</div>
                  {slots.isLoading ? (
                    <Skeleton className="h-40" />
                  ) : times.length === 0 ? (
                    <p className="m-0 text-sm text-muted">No hay horarios este día. Prueba con otra fecha.</p>
                  ) : (
                    groups
                      .filter(([, list]) => list.length)
                      .map(([label, list]) => (
                        <div key={label} className="flex flex-col gap-2">
                          <div className="text-2xs font-semibold text-muted">{label}</div>
                          <SlotPicker
                            slots={list.map(([t, v]) => ({ time: t, disabled: !v.proId }))}
                            value={time ?? undefined}
                            onChange={setTime}
                          />
                        </div>
                      ))
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-muted">
                    <Clock size={14} aria-hidden /> {terms?.durationMinutes ?? service.durationMinutes} min
                    {service.bufferAfterMinutes > 0 && ` + ${service.bufferAfterMinutes} de limpieza`}. Los tachados ya están ocupados.
                  </div>
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <CardHeader title="¿Para quién es la cita?" />
              <ClientPicker
                value={client}
                onChange={(c) => {
                  setClient(c)
                  setStep(4)
                }}
              />
            </>
          )}

          {step === 4 && (
            <>
              <CardHeader title="Revisa y confirma" />
              {assignedPro && service && client && (
                <p className="mt-0 mb-4 text-sm text-ink-2">
                  <b>{service.name}</b> para <b>{`${client.firstName} ${client.lastName}`.trim()}</b> con{' '}
                  <b>{assignedPro.displayName}</b>, el {formatLongDate(date).toLowerCase()} a las <b>{time}</b>. Quedará{' '}
                  <b>Confirmada</b> en la agenda.
                </p>
              )}
              {error && <p role="alert" className="mt-0 rounded-control bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">{error}</p>}
              <Field label="Nota de la cita (opcional)">
                {(p) => <Textarea {...p} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej.: prefiere degradado bajo" maxLength={1000} />}
              </Field>
            </>
          )}
        </Card>

        <Card className="flex flex-col gap-3 lg:sticky lg:top-5">
          <h3 className="m-0 text-md font-bold">Resumen de la cita</h3>
          {[
            ['Servicio', service ? `${service.name} · ${terms?.durationMinutes ?? service.durationMinutes} min` : '—', 0],
            ['Profesional', assignedPro?.displayName ?? (proId === null && service ? 'Cualquiera disponible' : '—'), 1],
            ['Fecha', step >= 2 && service ? formatLongDate(date) : '—', 2],
            ['Hora', chosen && terms ? `${time} – ${formatTime(new Date(new Date(chosen.start).getTime() + terms.durationMinutes * 60_000).toISOString())}` : '—', 2],
            ['Sede', branch?.name ?? '—', -1],
            ['Cliente', client ? `${client.firstName} ${client.lastName}`.trim() : '—', 3],
          ].map(([label, value, target]) => (
            <div key={label as string} className="flex items-center justify-between gap-3 border-t border-line pt-2 text-sm first:border-t-0 first:pt-0">
              <span className="text-muted">{label}</span>
              {(target as number) >= 0 && (target as number) < step ? (
                <button type="button" className="cursor-pointer truncate text-right font-semibold text-ink hover:text-brand" onClick={() => setStep(target as number)}>
                  {value}
                </button>
              ) : (
                <b className="truncate text-right">{value}</b>
              )}
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-line pt-2 text-md">
            <span className="text-muted">Total</span>
            <b>{service ? formatCents(terms?.price ?? priceFor(assignedPro, service)) : '—'}</b>
          </div>
          <div className="hidden gap-2 pt-1 lg:flex">{actions}</div>
        </Card>
      </div>

      {/* Celular y tablet: las acciones quedan siempre a mano, al pie de la pantalla. */}
      <div className="h-16 lg:hidden" aria-hidden />
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t border-line bg-surface/95 px-4 py-3 shadow-[0_-8px_24px_rgb(31_34_69/0.08)] backdrop-blur lg:hidden">
        <div className="mr-auto min-w-0">
          <div className="text-2xs text-muted">Total</div>
          <b className="tabular text-md">{service ? formatCents(terms?.price ?? priceFor(assignedPro, service)) : '—'}</b>
        </div>
        {actions}
      </div>
    </>
  )
}
