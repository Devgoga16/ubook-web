import { CalendarCheck, CalendarClock, CalendarPlus, CalendarX2, Clock, History, MapPin, Navigation, Phone, RotateCcw, TriangleAlert, UserRound, Users } from 'lucide-react'
import { Link } from 'react-router'
import { StatusChip } from '@/components/ui/badges'
import { Card, CardHeader } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/display'
import { KpiFlat } from '@/components/ui/kpi'
import { formatDate } from '@/features/clients/api'
import type { PublicBusiness } from '@/lib/api/types'
import { formatCents } from '@/lib/format'
import { bookingUrl, countdown, whenText, type PortalAccount, type PortalAppointment, type PortalAppointments } from './api'
import { AppointmentItem, BookButton, calendarUrl, DateBlock, LinkButton, PersonTag } from './parts'

/** La próxima cita, destacada, con lo que el cliente suele necesitar a mano. */
function NextAppointment({ a, business, account }: { a: PortalAppointment; business: PublicBusiness; account: PortalAccount }) {
  const profile = account.profiles.find((p) => p.id === a.clientId)
  return (
    <Card className="flex flex-col gap-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-2xs font-bold tracking-[.1em] text-muted uppercase">Tu próxima cita</span>
        <span className="rounded-full bg-teal-soft px-2 py-0.5 text-2xs font-bold text-teal-ink">{countdown(a.startsAt)}</span>
        <StatusChip status={a.status} />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <DateBlock iso={a.startsAt} big />
        <div className="min-w-[220px] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="m-0 text-xl font-semibold">{a.serviceName}</h2>
            {account.profiles.length > 1 && <PersonTag profile={profile} />}
          </div>
          <div className="mt-0.5 text-md font-semibold text-ink-2 first-letter:uppercase">{whenText(a.startsAt)}</div>
          <div className="mt-1.5 flex flex-col gap-1 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5">
              <UserRound size={13} aria-hidden /> Con {a.professional.displayName} · {a.durationMinutes} min · {formatCents(a.price)}
            </span>
            {a.branch.name && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={13} aria-hidden /> {[a.branch.name, a.branch.address].filter(Boolean).join(' · ')}
              </span>
            )}
          </div>
        </div>
      </div>
      {a.status === 'pending' && (
        <p className="m-0 rounded-control bg-warn-bg px-3 py-2 text-sm text-warn">
          {a.deposit?.status === 'pending_review' ? `Estamos validando tu adelanto de ${formatCents(a.deposit.amount)}. Te avisamos apenas se confirme.` : 'El negocio todavía tiene que confirmar esta cita. Te avisamos apenas lo haga.'}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <LinkButton primary to={`/reserva/${a.token}`}>
          <CalendarClock size={14} aria-hidden /> Cambiar o cancelar
        </LinkButton>
        <LinkButton href={calendarUrl(a, business.name)}>
          <CalendarPlus size={14} aria-hidden /> Agregar a mi calendario
        </LinkButton>
        {a.branch.mapsUrl && (
          <LinkButton href={a.branch.mapsUrl}>
            <Navigation size={14} aria-hidden /> Cómo llegar
          </LinkButton>
        )}
      </div>
    </Card>
  )
}

/** Inicio del portal: lo próximo, lo pendiente y atajos para volver a reservar. */
export function HomeTab({ slug, business, account, appointments }: { slug: string; business: PublicBusiness; account: PortalAccount; appointments: PortalAppointments }) {
  const [next, ...later] = appointments.upcoming
  const visits = appointments.past.filter((a) => a.status === 'completed')
  const rejected = appointments.upcoming.filter((a) => a.deposit?.status === 'rejected')
  const dependents = account.profiles.filter((p) => !p.isHolder)
  const showPerson = account.profiles.length > 1

  // Lo que más repite: un atajo por combinación de persona, servicio y profesional.
  const seen = new Set<string>()
  const again = visits.filter((a) => {
    const key = `${a.clientId}|${a.serviceId}|${a.professional.id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return (
    <>
      {rejected.map((a) => (
        <div key={a.token} role="alert" className="flex flex-wrap items-center gap-2.5 rounded-card bg-bad-bg px-4 py-3 text-sm text-bad">
          <TriangleAlert size={16} aria-hidden className="flex-none" />
          <span className="min-w-[200px] flex-1">
            <b>No pudimos validar el adelanto de tu cita de {a.serviceName}</b>
            {a.deposit?.rejectReason ? `: ${a.deposit.rejectReason}.` : '.'} Escríbele al negocio si crees que es un error.
          </span>
          <LinkButton small to={`/reserva/${a.token}`}>
            Ver la cita
          </LinkButton>
        </div>
      ))}

      {next ? (
        <NextAppointment a={next} business={business} account={account} />
      ) : (
        <Card>
          <EmptyState icon={CalendarX2} title="No tienes citas próximas" description="Reserva en un minuto: ya tenemos tus datos, solo eliges el servicio y la hora." action={<BookButton slug={slug} />} />
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiFlat icon={CalendarCheck} label="Citas próximas" value={String(appointments.upcoming.length)} />
        <KpiFlat icon={History} label="Visitas realizadas" value={String(visits.length)} />
        <KpiFlat icon={Clock} label="Última visita" value={visits[0] ? formatDate(visits[0].startsAt) : '—'} />
        <KpiFlat icon={Users} label="Personas a tu cargo" value={String(dependents.length)} />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          {later.length > 0 && (
            <Card>
              <CardHeader
                title="Más adelante"
                actions={
                  <Link to="?tab=citas" className="text-xs font-semibold text-brand hover:underline">
                    Ver todas
                  </Link>
                }
              />
              <ul className="m-0 list-none p-0">
                {later.slice(0, 3).map((a) => (
                  <AppointmentItem key={a.token} a={a} slug={slug} profile={account.profiles.find((p) => p.id === a.clientId)} showPerson={showPerson} />
                ))}
              </ul>
            </Card>
          )}

          <Card>
            <CardHeader title="Reservar de nuevo" />
            {again.length === 0 ? (
              <p className="m-0 text-sm text-muted">Cuando tengas tu primera visita, aquí aparecerán tus servicios habituales para reservarlos con un toque.</p>
            ) : (
              <ul className="m-0 grid list-none gap-2.5 p-0 sm:grid-cols-2">
                {again.slice(0, 4).map((a) => (
                  <li key={a.token}>
                    <Link
                      to={bookingUrl(slug, { forClientId: a.clientId, branchId: a.branch.id, serviceId: a.serviceId, professionalId: a.professional.id })}
                      className="flex h-full items-center gap-3 rounded-[14px] border border-line-strong p-3 text-ink no-underline hover:border-teal"
                    >
                      <span className="grid size-9 flex-none place-items-center rounded-full bg-brand-soft text-brand">
                        <RotateCcw size={15} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <b className="block truncate font-semibold">{a.serviceName}</b>
                        <span className="block truncate text-xs text-muted">
                          con {a.professional.displayName}
                          {showPerson && ` · ${account.profiles.find((p) => p.id === a.clientId)?.firstName ?? ''}`}
                        </span>
                      </span>
                      <span className="tabular text-sm font-semibold">{formatCents(a.price)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card>
          <CardHeader title={business.branches.length > 1 ? 'Nuestras sedes' : 'Dónde estamos'} />
          <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
            {business.branches.map((b) => (
              <li key={b.id} className="flex flex-col gap-1 text-sm">
                <b className="font-semibold">{b.name}</b>
                {b.address && (
                  <span className="inline-flex items-start gap-1.5 text-muted">
                    <MapPin size={13} aria-hidden className="mt-0.5 flex-none" />
                    <span>
                      {b.address}
                      {b.reference && <span className="block text-xs">{b.reference}</span>}
                    </span>
                  </span>
                )}
                <div className="mt-1 flex flex-wrap gap-2">
                  {b.phone && (
                    <LinkButton small href={`tel:${b.phone.replace(/\s/g, '')}`}>
                      <Phone size={12} aria-hidden /> {b.phone}
                    </LinkButton>
                  )}
                  {b.mapsUrl && (
                    <LinkButton small href={b.mapsUrl}>
                      <Navigation size={12} aria-hidden /> Cómo llegar
                    </LinkButton>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {business.rules.freeCancellationHours != null && (
            <p className="mt-4 mb-0 border-t border-line pt-3 text-xs text-muted">Puedes cambiar o cancelar tus citas sin costo hasta {business.rules.freeCancellationHours} h antes.</p>
          )}
        </Card>
      </div>
    </>
  )
}
