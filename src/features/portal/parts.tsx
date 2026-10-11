import { CalendarPlus, ChevronRight, MapPin, RotateCcw } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { StatusChip } from '@/components/ui/badges'
import { cn } from '@/lib/cn'
import { formatCents, LOCALE, TIMEZONE } from '@/lib/format'
import { formatTime } from '@/lib/time'
import { bookingUrl, fullName, type PortalAppointment, type PortalProfile } from './api'

const part = (iso: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(LOCALE, { timeZone: TIMEZONE, ...options }).format(new Date(iso)).replace('.', '')

/** Bloque de fecha tipo calendario: "LUN / 13 / oct". */
export function DateBlock({ iso, big, muted }: { iso: string; big?: boolean; muted?: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        'flex flex-none flex-col items-center justify-center rounded-[14px] leading-none',
        big ? 'h-[84px] w-[76px] gap-1' : 'h-[58px] w-[54px] gap-0.5',
        muted ? 'bg-surface-2 text-ink-2' : 'bg-brand-soft text-brand',
      )}
    >
      <span className={cn('font-bold tracking-wide uppercase', big ? 'text-2xs' : 'text-[10px]')}>{part(iso, { weekday: 'short' })}</span>
      <span className={cn('tabular font-bold text-ink', big ? 'text-[28px]' : 'text-lg')}>{part(iso, { day: 'numeric' })}</span>
      <span className={cn('font-semibold', big ? 'text-xs' : 'text-[10px]')}>{part(iso, { month: 'short' })}</span>
    </div>
  )
}

/** "Para Lía": de quién es la cita cuando la cuenta gestiona a varias personas. */
export function PersonTag({ profile }: { profile: PortalProfile | undefined }) {
  if (!profile) return null
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-2xs font-semibold', profile.isHolder ? 'bg-surface-2 text-ink-2' : 'bg-teal-soft text-teal-ink')}>
      {profile.isHolder ? profile.firstName : `Para ${profile.firstName}`}
    </span>
  )
}

/** Botón-enlace con el estilo de los botones de la app. */
export function LinkButton({ to, href, primary, small, children }: { to?: string; href?: string; primary?: boolean; small?: boolean; children: ReactNode }) {
  const className = cn(
    'inline-flex items-center justify-center gap-1.5 rounded-control font-semibold whitespace-nowrap no-underline',
    small ? 'px-2.5 py-[5px] text-2xs' : 'px-3.5 py-2 text-sm',
    primary ? 'bg-grad border border-transparent hover:brightness-110' : 'border border-line-strong bg-surface text-ink-2 hover:border-teal',
  )
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {children}
      </a>
    )
  }
  return (
    <Link to={to ?? '#'} className={className}>
      {children}
    </Link>
  )
}

/** Una cita en las listas del portal. */
export function AppointmentItem({ a, slug, profile, showPerson }: { a: PortalAppointment; slug: string; profile: PortalProfile | undefined; showPerson: boolean }) {
  const canRebook = !a.upcoming && a.status !== 'cancelled'
  return (
    <li className="flex flex-wrap items-center gap-3 border-t border-line py-3 first:border-t-0">
      <DateBlock iso={a.startsAt} muted={!a.upcoming} />
      <div className="min-w-[200px] flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <b className="font-semibold">{a.serviceName}</b>
          <StatusChip status={a.status} />
          {showPerson && <PersonTag profile={profile} />}
        </div>
        <div className="text-sm text-ink-2">
          {formatTime(a.startsAt)} · {a.durationMinutes} min · con {a.professional.displayName}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
          {a.branch.name && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={11} aria-hidden /> {a.branch.name}
            </span>
          )}
          <span className="tabular">{formatCents(a.price)}</span>
          {a.deposit?.status === 'pending_review' && <span className="font-semibold text-warn">Adelanto en revisión</span>}
          {a.deposit?.status === 'rejected' && <span className="font-semibold text-bad">Adelanto no validado</span>}
          {a.deposit?.status === 'approved' && <span className="text-ok">Adelanto de {formatCents(a.deposit.amount)} validado</span>}
        </div>
      </div>
      <div className="flex gap-2">
        {canRebook && (
          <LinkButton small to={bookingUrl(slug, { forClientId: a.clientId, branchId: a.branch.id, serviceId: a.serviceId, professionalId: a.professional.id })}>
            <RotateCcw size={12} aria-hidden /> Reservar de nuevo
          </LinkButton>
        )}
        <LinkButton small primary={a.upcoming} to={`/reserva/${a.token}`}>
          {a.upcoming ? 'Cambiar o cancelar' : 'Ver detalle'} <ChevronRight size={12} aria-hidden />
        </LinkButton>
      </div>
    </li>
  )
}

/** Enlace "Agregar a Google Calendar" de una cita. */
export function calendarUrl(a: PortalAppointment, businessName: string): string {
  const fmt = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${a.serviceName} · ${businessName}`,
    dates: `${fmt(a.startsAt)}/${fmt(a.endsAt)}`,
    details: `Con ${a.professional.displayName}. Cita #UB-${a.number}.`,
    location: [a.branch.name, a.branch.address].filter(Boolean).join(', '),
  })
  return `https://calendar.google.com/calendar/render?${params}`
}

export function BookButton({ slug, forClientId, label = 'Reservar una cita', small }: { slug: string; forClientId?: string; label?: string; small?: boolean }) {
  return (
    <LinkButton primary small={small} to={bookingUrl(slug, { forClientId })}>
      <CalendarPlus size={small ? 12 : 14} aria-hidden /> {label}
    </LinkButton>
  )
}

export const personName = (profiles: PortalProfile[], clientId: string) => {
  const p = profiles.find((x) => x.id === clientId)
  return p ? fullName(p) : ''
}
