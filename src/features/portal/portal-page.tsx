import { CalendarDays, CalendarPlus, House, LifeBuoy, LogOut, MessageCircle, Moon, Receipt, Store, Sun, UserRound, Users, type LucideIcon } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { Logo } from '@/components/brand/logo'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState, Skeleton } from '@/components/ui/display'
import { Field, Input } from '@/components/ui/field'
import { OrgLogo } from '@/components/ui/org-logo'
import { useBusiness } from '@/features/booking/api'
import { ApiError, errorMessage } from '@/lib/api/client'
import type { PublicBusiness } from '@/lib/api/types'
import { cn } from '@/lib/cn'
import { useTheme } from '@/lib/theme'
import { AppointmentsTab } from './appointments-tab'
import { bookingUrl, isSessionExpired, openPortalSession, portalSession, prettyPhone, requestPortalCode, usePortalAccount, usePortalAppointments } from './api'
import { FamilyTab } from './family-tab'
import { HelpTab, usePortalHelp } from './help-tab'
import { HomeTab } from './home-tab'
import { PaymentsTab } from './payments-tab'
import { ProfileTab } from './profile-tab'

const TABS = [
  { value: 'inicio', label: 'Inicio', icon: House },
  { value: 'citas', label: 'Citas', icon: CalendarDays },
  { value: 'familia', label: 'Familia', icon: Users },
  { value: 'pagos', label: 'Pagos', icon: Receipt },
  { value: 'ayuda', label: 'Ayuda', icon: LifeBuoy },
  { value: 'perfil', label: 'Perfil', icon: UserRound },
] as const satisfies ReadonlyArray<{ value: string; label: string; icon: LucideIcon }>
type Tab = (typeof TABS)[number]['value']

function ThemeToggle() {
  const { resolved, setPreference } = useTheme()
  const dark = resolved === 'dark'
  return (
    <button
      type="button"
      onClick={() => setPreference(dark ? 'light' : 'dark')}
      aria-label={dark ? 'Usar modo claro' : 'Usar modo oscuro'}
      className="grid size-9 flex-none cursor-pointer place-items-center rounded-full bg-white/15 hover:bg-white/25"
    >
      {dark ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
    </button>
  )
}

/** Marco del portal: el negocio arriba, las secciones como pestañas (abajo en el celular). */
function PortalFrame({
  business,
  title,
  subtitle,
  actions,
  tab,
  badges,
  children,
}: {
  business?: PublicBusiness
  title: string
  subtitle?: ReactNode
  actions?: ReactNode
  /** Sin pestaña activa (antes de entrar) no se muestra la navegación. */
  tab?: Tab
  /** Avisos por pestaña (p. ej. respuestas sin leer en Ayuda). */
  badges?: Partial<Record<Tab, number>>
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-bg pb-24 sm:pb-12">
      <header className="bg-grad">
        <div className={cn('mx-auto flex max-w-[1040px] items-center gap-3.5 px-4 pt-6', tab ? 'pb-[76px]' : 'pb-16')}>
          <OrgLogo name={business?.name ?? title} logoUrl={business?.logoUrl} className="size-12 flex-none rounded-[14px] bg-white/20 text-lg font-semibold shadow-card" />
          <div className="min-w-0 flex-1">
            <h1 className="m-0 truncate text-xl font-semibold">{title}</h1>
            {subtitle && <div className="truncate text-sm opacity-90">{subtitle}</div>}
          </div>
          {actions}
          <ThemeToggle />
        </div>
      </header>

      <div className={cn('mx-auto flex max-w-[1040px] flex-col gap-4 px-4', tab ? '-mt-[52px]' : '-mt-10')}>
        {tab && (
          <nav aria-label="Secciones del portal" className="hidden gap-1 rounded-card bg-surface p-1.5 shadow-card sm:flex">
            {TABS.map(({ value, label, icon: Icon }) => (
              <Link
                key={value}
                to={`?tab=${value}`}
                aria-current={value === tab ? 'page' : undefined}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-[11px] px-3 py-2.5 text-sm font-semibold no-underline transition-colors',
                  value === tab ? 'bg-brand-soft text-ink' : 'text-muted hover:bg-surface-2 hover:text-ink',
                )}
              >
                <Icon size={16} strokeWidth={1.8} aria-hidden /> {label}
                {!!badges?.[value] && <span className="rounded-full bg-warn-bg px-1.5 text-2xs font-bold text-warn">{badges[value]}</span>}
              </Link>
            ))}
          </nav>
        )}
        {children}
        <footer className="pt-4 text-center text-2xs text-muted">
          <a href="/inicio" className="inline-flex items-center gap-1.5 text-muted no-underline hover:text-ink">
            Reservas con <Logo size="sm" />
          </a>
        </footer>
      </div>

      {tab && (
        <nav aria-label="Secciones del portal" className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface px-1 pt-1 pb-[max(4px,env(safe-area-inset-bottom))] sm:hidden">
          {TABS.map(({ value, label, icon: Icon }) => (
            <Link
              key={value}
              to={`?tab=${value}`}
              aria-current={value === tab ? 'page' : undefined}
              className={cn('flex flex-1 flex-col items-center gap-0.5 rounded-[10px] py-1.5 text-[10px] font-semibold no-underline', value === tab ? 'text-brand' : 'text-muted')}
            >
              <span className="relative">
                <Icon size={19} strokeWidth={value === tab ? 2.1 : 1.7} aria-hidden />
                {!!badges?.[value] && <span className="absolute -top-1 -right-1.5 size-2 rounded-full bg-warn" aria-label={`${badges[value]} sin leer`} />}
              </span>
              {label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  )
}

/** Entrar: celular → código de 6 dígitos que llega por WhatsApp. */
function SignIn({ slug, businessName, onSignedIn }: { slug: string; businessName: string; onSignedIn: (session: { token: string; phone: string }) => void }) {
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const digits = phone.replace(/\D/g, '')

  const send = async () => {
    setError(null)
    if (!/^9\d{8}$/.test(digits)) return setError('Escribe tu celular de 9 dígitos, empezando con 9')
    setBusy(true)
    try {
      await requestPortalCode(slug, digits)
      setSentTo(digits)
      setCode('')
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const verify = async () => {
    setError(null)
    if (!/^\d{6}$/.test(code)) return setError('El código tiene 6 dígitos')
    setBusy(true)
    try {
      onSignedIn(await openPortalSession(slug, sentTo!, code))
    } catch (e) {
      setError(errorMessage(e))
      setBusy(false)
    }
  }

  return (
    <Card className="grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-10 md:p-8">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          void (sentTo ? verify() : send())
        }}
      >
        <div>
          <h2 className="m-0 text-xl font-semibold">{sentTo ? 'Revisa tu WhatsApp' : 'Entra a tu cuenta'}</h2>
          <p className="mt-1 mb-0 text-sm text-muted">
            {sentTo
              ? `Si el ${prettyPhone(sentTo)} tiene citas en ${businessName}, te llegó un código de 6 dígitos. Vence en 10 minutos.`
              : `Usa el celular con el que reservas en ${businessName}. Te enviamos un código por WhatsApp; no necesitas contraseña.`}
          </p>
        </div>
        {sentTo ? (
          <Field label="Código de 6 dígitos">
            {(p) => (
              <Input
                {...p}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                autoFocus
                className="max-w-[220px] text-center text-lg tracking-[.4em]"
              />
            )}
          </Field>
        ) : (
          <Field label="Celular">
            {(p) => <Input {...p} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" autoComplete="tel-national" placeholder="987 654 321" autoFocus className="max-w-[260px]" />}
          </Field>
        )}
        {error && (
          <p role="alert" className="m-0 text-sm font-semibold text-bad">
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button type="submit" variant="primary" disabled={busy} className="px-5 py-2.5">
            <MessageCircle size={14} aria-hidden /> {busy ? 'Un momento…' : sentTo ? 'Entrar' : 'Enviarme el código'}
          </Button>
          {sentTo && (
            <>
              <Button variant="ghost" disabled={busy} onClick={() => void send()}>
                Reenviar
              </Button>
              <Button variant="ghost" disabled={busy} onClick={() => (setSentTo(null), setError(null))}>
                Cambiar celular
              </Button>
            </>
          )}
        </div>
        <p className="m-0 text-xs text-muted">
          ¿Primera vez aquí?{' '}
          <Link to={`/reservar/${slug}`} className="font-semibold text-brand hover:underline">
            Reserva tu primera cita
          </Link>{' '}
          y tu cuenta se crea sola.
        </p>
      </form>

      <ul className="m-0 flex list-none flex-col justify-center gap-4 rounded-[16px] bg-surface-2 p-5">
        {(
          [
            [CalendarDays, 'Todas tus citas en un lugar', 'Cámbialas o cancélalas sin llamar.'],
            [CalendarPlus, 'Reserva en segundos', 'Ya tenemos tus datos; repite tu servicio habitual con un toque.'],
            [Users, 'Tu familia en tu cuenta', 'Reserva para tus hijos o tus padres sin crearles una cuenta.'],
            [Receipt, 'Tus pagos y adelantos', 'Mira lo que pagaste y el estado de cada comprobante.'],
          ] as Array<[LucideIcon, string, string]>
        ).map(([Icon, title, text]) => (
          <li key={title} className="flex items-start gap-3">
            <span className="grid size-9 flex-none place-items-center rounded-full bg-brand-soft text-brand">
              <Icon size={16} aria-hidden />
            </span>
            <span className="text-sm">
              <b className="block font-semibold">{title}</b>
              <span className="text-muted">{text}</span>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

/** /reservar/:slug/mi-cuenta — portal del cliente de un negocio. */
export function PortalPage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const [params] = useSearchParams()
  const business = useBusiness(slug)
  const [session, setSession] = useState(() => portalSession.get(slug))
  const account = usePortalAccount(slug, session?.token ?? null)
  const appointments = usePortalAppointments(slug, session?.token ?? null)
  const help = usePortalHelp(slug, session?.token ?? null)

  const requested = params.get('tab')
  const tab: Tab = TABS.find((t) => t.value === requested)?.value ?? 'inicio'

  const signOut = () => {
    portalSession.clear(slug)
    setSession(null)
  }

  // Sesión vencida: vuelve a pedir el celular.
  const expired = isSessionExpired(account.error) || isSessionExpired(appointments.error)
  useEffect(() => {
    if (!expired) return
    portalSession.clear(slug)
    setSession(null)
  }, [expired, slug])

  const b = business.data
  if (business.isLoading) {
    return (
      <PortalFrame title="Mi cuenta">
        <Skeleton className="h-[360px] rounded-card" />
      </PortalFrame>
    )
  }
  if (!b || !b.portal) {
    return (
      <PortalFrame business={b} title={b?.name ?? 'Mi cuenta'}>
        <Card>
          <EmptyState
            icon={Store}
            title={b ? 'Este negocio aún no tiene portal de clientes' : 'Página no disponible'}
            description={b ? 'Puedes gestionar cada cita con el enlace que te enviamos al reservar.' : business.error instanceof ApiError ? business.error.message : 'Revisa que el enlace esté completo.'}
            action={
              b ? (
                <Link to={`/reservar/${slug}`} className="text-sm font-semibold text-brand hover:underline">
                  Reservar una cita
                </Link>
              ) : undefined
            }
          />
        </Card>
      </PortalFrame>
    )
  }

  if (!session) {
    return (
      <PortalFrame business={b} title={b.name} subtitle="Portal de clientes">
        <SignIn
          slug={slug}
          businessName={b.name}
          onSignedIn={(s) => {
            const next = { token: s.token, phone: s.phone }
            portalSession.set(slug, next)
            setSession(next)
          }}
        />
      </PortalFrame>
    )
  }

  const a = account.data
  const holder = a?.profiles.find((p) => p.isHolder)
  const frame = (children: ReactNode) => (
    <PortalFrame
      business={b}
      title={b.name}
      subtitle={holder ? `Hola, ${holder.firstName}` : 'Portal de clientes'}
      tab={tab}
      badges={{ ayuda: help.data?.unread }}
      actions={
        <>
          <Link to={bookingUrl(slug)} className="hidden items-center gap-1.5 rounded-control bg-white px-3.5 py-2 text-sm font-semibold text-[#243352] no-underline hover:brightness-95 sm:inline-flex">
            <CalendarPlus size={14} aria-hidden /> Reservar
          </Link>
          <button type="button" onClick={signOut} aria-label="Cerrar sesión" className="grid size-9 flex-none cursor-pointer place-items-center rounded-full bg-white/15 hover:bg-white/25">
            <LogOut size={16} aria-hidden />
          </button>
        </>
      }
    >
      {children}
    </PortalFrame>
  )

  if (!a || !appointments.data) {
    const failed = (account.isError || appointments.isError) && !expired
    return frame(
      failed ? (
        <Card>
          <p className="m-0 text-sm text-bad">{errorMessage(account.error ?? appointments.error)}</p>
        </Card>
      ) : (
        <>
          <Skeleton className="h-[220px] rounded-card" />
          <Skeleton className="h-[160px] rounded-card" />
        </>
      ),
    )
  }

  return frame(
    <>
      {tab === 'inicio' && <HomeTab slug={slug} business={b} account={a} appointments={appointments.data} />}
      {tab === 'citas' && <AppointmentsTab slug={slug} account={a} appointments={appointments.data} />}
      {tab === 'familia' && <FamilyTab slug={slug} token={session.token} account={a} appointments={appointments.data} />}
      {tab === 'pagos' && <PaymentsTab slug={slug} token={session.token} account={a} appointments={appointments.data} />}
      {tab === 'ayuda' && <HelpTab slug={slug} token={session.token} business={b} />}
      {tab === 'perfil' && <ProfileTab key={a.profiles.map((p) => p.id).join()} slug={slug} token={session.token} account={a} businessName={b.name} onSignOut={signOut} />}
      {tab === 'inicio' && (
        <Link to={bookingUrl(slug)} className="bg-grad fixed right-4 bottom-[76px] z-30 inline-flex items-center gap-1.5 rounded-full px-4 py-3 text-sm font-semibold no-underline shadow-pop sm:hidden">
          <CalendarPlus size={15} aria-hidden /> Reservar
        </Link>
      )}
    </>,
  )
}
