import {
  ArrowRight,
  Brain,
  Check,
  ChevronDown,
  Dumbbell,
  Eye,
  Fingerprint,
  Hand,
  KeyRound,
  Leaf,
  Link2,
  Menu,
  Moon,
  Scissors,
  Settings2,
  ShieldCheck,
  Smile,
  Sparkles,
  Sun,
  UserPlus,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Logo, TAGLINE } from '@/components/brand/logo'
import { useAuth } from '@/lib/auth/auth-context'
import { homeFor } from '@/lib/auth/home'
import { cn } from '@/lib/cn'
import { useTheme } from '@/lib/theme'
import { BookingDemo } from './booking-demo'
import { FAQS, FEATURES } from './content'
import { HeroMockup } from './hero-mockup'
import { Pricing } from './pricing'
import { AutomationsDemo, IndustriesDemo, ReportsPreview } from './showcase'
import { useReveal } from './use-reveal'

const NAV_LINKS: Array<[href: string, label: string]> = [
  ['#funciones', 'Funciones'],
  ['#reservas', 'Reservas online'],
  ['#rubros', 'Rubros'],
  ['#precios', 'Precios'],
  ['#preguntas', 'Preguntas'],
]

const MARQUEE: Array<[LucideIcon, string]> = [
  [Scissors, 'Barberías'],
  [Sparkles, 'Salones de belleza'],
  [Hand, 'Estudios de uñas'],
  [Brain, 'Psicólogos'],
  [Smile, 'Odontólogos'],
  [Leaf, 'Spas'],
  [Dumbbell, 'Entrenadores'],
  [Sparkles, 'Centros estéticos'],
]

const YEAR = new Date().getFullYear()

const delay = (ms: number) => ({ '--reveal-delay': `${ms}ms` }) as CSSProperties

/** Página de inicio pública: qué es uBook y por qué probarlo. */
export function LandingPage() {
  useReveal()

  useEffect(() => {
    const prev = document.title
    document.title = 'uBook · Reservas online, agenda y pagos para tu negocio'
    return () => {
      document.title = prev
    }
  }, [])

  return (
    <div className="min-h-screen overflow-x-clip bg-bg text-ink">
      <Header />
      <main>
        <Hero />
        <Marquee />
        <Facts />
        <ReservationsSection />
        <AutomationsSection />
        <FeaturesSection />
        <ReportsSection />
        <IndustriesSection />
        <StepsSection />
        <SecuritySection />
        <Section id="precios" eyebrow="Precios" title="Un plan para cada etapa de tu negocio" text="Empieza gratis 30 días con cualquier plan. Sin tarjeta, sin letras pequeñas.">
          <Pricing />
        </Section>
        <FaqSection />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}

/* ── Estructura ───────────────────────────────────────────── */

function Header() {
  const { status, me } = useAuth()
  const { resolved, setPreference } = useTheme()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const dark = resolved === 'dark'

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const authed = status === 'authenticated' && me

  return (
    <header
      className={cn(
        'sticky top-0 z-50 transition-[background-color,border-color,backdrop-filter]',
        scrolled || open ? 'border-b border-line bg-bg/80 backdrop-blur-xl' : 'border-b border-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-6 px-4 sm:px-6">
        <a href="#top" aria-label="uBook, inicio" className="no-underline">
          <Logo />
        </a>
        <nav aria-label="Secciones" className="hidden flex-1 items-center gap-1 md:flex">
          {NAV_LINKS.map(([href, label]) => (
            <a key={href} href={href} className="rounded-full px-3 py-1.5 text-sm font-semibold text-ink-2 no-underline hover:bg-surface hover:text-ink">
              {label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPreference(dark ? 'light' : 'dark')}
            aria-label={dark ? 'Usar modo claro' : 'Usar modo oscuro'}
            className="grid size-9 cursor-pointer place-items-center rounded-full text-ink-2 hover:bg-surface"
          >
            {dark ? <Sun size={17} aria-hidden /> : <Moon size={17} aria-hidden />}
          </button>
          {authed ? (
            <Link to={homeFor(me)} className="bg-grad hidden items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold no-underline hover:brightness-110 sm:inline-flex">
              Ir a mi panel <ArrowRight size={15} aria-hidden />
            </Link>
          ) : (
            <>
              <Link to="/login" className="hidden rounded-full px-3 py-2 text-sm font-semibold text-ink-2 no-underline hover:text-ink sm:inline-flex">
                Iniciar sesión
              </Link>
              <Link to="/registro" className="bg-grad hidden items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold no-underline hover:brightness-110 sm:inline-flex">
                Empieza gratis <ArrowRight size={15} aria-hidden />
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={open}
            className="grid size-9 cursor-pointer place-items-center rounded-full text-ink-2 hover:bg-surface md:hidden"
          >
            {open ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
          </button>
        </div>
      </div>
      {open && (
        <nav aria-label="Secciones" className="animate-pop flex flex-col gap-1 border-t border-line px-4 pt-3 pb-5 md:hidden">
          {NAV_LINKS.map(([href, label]) => (
            <a key={href} href={href} onClick={() => setOpen(false)} className="rounded-tile px-3 py-2.5 text-md font-semibold text-ink no-underline hover:bg-surface">
              {label}
            </a>
          ))}
          <div className="mt-2 grid grid-cols-2 gap-2">
            {authed ? (
              <Link to={homeFor(me)} className="bg-grad col-span-2 rounded-tile py-3 text-center text-md font-semibold no-underline">
                Ir a mi panel
              </Link>
            ) : (
              <>
                <Link to="/login" className="rounded-tile border border-line-strong py-3 text-center text-md font-semibold text-ink no-underline">
                  Iniciar sesión
                </Link>
                <Link to="/registro" className="bg-grad rounded-tile py-3 text-center text-md font-semibold no-underline">
                  Empieza gratis
                </Link>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  )
}

function Section({
  id,
  eyebrow,
  title,
  text,
  children,
  className,
}: {
  id?: string
  eyebrow: string
  title: ReactNode
  text?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section id={id} className={cn('scroll-mt-20 px-4 py-20 sm:px-6 md:py-24', className)}>
      <div className="mx-auto max-w-[1200px]">
        <div data-reveal className="mx-auto mb-12 max-w-[720px] text-center md:mb-16">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2 className="mt-4 mb-0 text-[clamp(28px,4.2vw,46px)] leading-[1.08] font-bold tracking-[-.035em]">{title}</h2>
          {text && <p className="mx-auto mt-4 mb-0 max-w-[600px] text-[clamp(14px,1.6vw,17px)] leading-relaxed text-ink-2">{text}</p>}
        </div>
        {children}
      </div>
    </section>
  )
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-teal-line bg-teal-soft px-3 py-1 text-xs font-bold tracking-[.06em] text-teal-ink uppercase">
      {children}
    </span>
  )
}

/* ── Secciones ────────────────────────────────────────────── */

function Hero() {
  return (
    <section id="top" className="relative px-4 pt-14 pb-20 sm:px-6 md:pt-20 md:pb-28">
      <div className="pointer-events-none absolute inset-0 -z-0 grid-lines" aria-hidden />
      <div className="relative mx-auto max-w-[1200px]">
        <div className="mx-auto max-w-[860px] text-center">
          <a
            href="#reservas"
            data-reveal
            className="group inline-flex items-center gap-2 rounded-full border border-line bg-surface py-1 pr-3 pl-1 text-xs font-semibold text-ink-2 no-underline shadow-card hover:border-teal"
          >
            <span className="bg-grad rounded-full px-2 py-0.5 text-2xs font-bold">Nuevo</span>
            Adelantos con Yape y Plin en tu página de reservas
            <ArrowRight size={13} className="transition group-hover:translate-x-0.5" aria-hidden />
          </a>
          <h1 data-reveal style={delay(80)} className="mt-6 mb-0 text-[clamp(38px,7vw,78px)] leading-[1.02] font-bold tracking-[-.045em]">
            Tu agenda llena.
            <br />
            <span className="text-grad">Tu negocio en orden.</span>
          </h1>
          <p data-reveal style={delay(160)} className="mx-auto mt-6 mb-0 max-w-[640px] text-[clamp(15px,1.9vw,19px)] leading-relaxed text-ink-2">
            uBook es el sistema de reservas para negocios que atienden con cita: reservas online las 24 horas, recordatorios por
            WhatsApp, adelantos con Yape, fichas de clientes y reportes. Todo en un solo lugar.
          </p>
          <div data-reveal style={delay(240)} className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/registro"
              className="bg-grad group inline-flex w-full items-center justify-center gap-2 rounded-full px-7 py-3.5 text-md font-bold no-underline shadow-[0_14px_34px_-12px_rgb(36_51_82/0.8)] transition hover:brightness-110 sm:w-auto"
            >
              Empieza gratis 30 días
              <ArrowRight size={17} className="transition group-hover:translate-x-0.5" aria-hidden />
            </Link>
            <a
              href="#reservas"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-line-strong bg-surface px-7 py-3.5 text-md font-semibold text-ink no-underline transition hover:border-teal sm:w-auto"
            >
              Prueba la reserva en vivo
            </a>
          </div>
          <ul data-reveal style={delay(320)} className="m-0 mt-7 flex list-none flex-wrap items-center justify-center gap-x-6 gap-y-2 p-0 text-sm text-ink-2">
            {['Sin tarjeta de crédito', 'Listo en 5 minutos', 'Hecho en Perú'].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <Check size={15} className="text-teal-ink" strokeWidth={3} aria-hidden /> {t}
              </li>
            ))}
          </ul>
        </div>
        <div data-reveal style={delay(380)} className="mt-16 md:mt-20">
          <HeroMockup />
        </div>
      </div>
    </section>
  )
}

function Marquee() {
  const items = [...MARQUEE, ...MARQUEE]
  return (
    <div className="border-y border-line bg-surface py-5">
      <p className="m-0 mb-4 text-center text-xs font-bold tracking-[.12em] text-muted uppercase">Hecho para negocios que atienden con cita</p>
      <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_12%,#000_88%,transparent)]">
        <ul className="animate-marquee m-0 flex w-max list-none gap-10 p-0" aria-label="Rubros">
          {items.map(([Icon, label], i) => (
            <li key={i} aria-hidden={i >= MARQUEE.length} className="flex items-center gap-2.5 text-lg font-semibold whitespace-nowrap text-ink-2">
              <Icon size={20} className="text-teal-ink" aria-hidden /> {label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function Facts() {
  const facts: Array<[string, string]> = [
    ['24/7', 'Tus clientes reservan aunque estés atendiendo o durmiendo'],
    ['6', 'Mensajes automáticos que trabajan por ti'],
    ['3', 'Niveles de acceso: lo suyo, su sede o todo'],
    ['S/ 0', 'Para empezar: 30 días gratis, sin tarjeta'],
  ]
  return (
    <section className="px-4 pt-16 pb-4 sm:px-6">
      <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-6 md:grid-cols-4">
        {facts.map(([n, t], i) => (
          <div key={n} data-reveal style={delay(i * 80)} className="text-center md:text-left">
            <div className="text-grad text-[clamp(36px,5vw,54px)] leading-none font-bold tracking-[-.04em]">{n}</div>
            <p className="mt-2 mb-0 text-sm leading-snug text-ink-2">{t}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function Bullet({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-md text-ink-2">
      <span className="mt-0.5 grid size-5 flex-none place-items-center rounded-full bg-teal-soft text-teal-ink">
        <Check size={12} strokeWidth={3} aria-hidden />
      </span>
      <span>{children}</span>
    </li>
  )
}

function SplitHeading({ eyebrow, title, text }: { eyebrow: string; title: ReactNode; text: ReactNode }) {
  return (
    <>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-4 mb-0 text-[clamp(28px,4vw,44px)] leading-[1.08] font-bold tracking-[-.035em]">{title}</h2>
      <p className="mt-4 mb-0 text-[clamp(14px,1.6vw,17px)] leading-relaxed text-ink-2">{text}</p>
    </>
  )
}

function ReservationsSection() {
  return (
    <section id="reservas" className="scroll-mt-20 px-4 py-20 sm:px-6 md:py-24">
      <div className="mx-auto grid max-w-[1200px] items-center gap-14 lg:grid-cols-[1fr_auto] lg:gap-20">
        <div data-reveal>
          <SplitHeading
            eyebrow="Reservas online"
            title={
              <>
                Deja de agendar por chat.
                <br />
                <span className="text-grad">Que reserven solos.</span>
              </>
            }
            text="Comparte tu enlace en Instagram, WhatsApp o Google Maps. Tus clientes ven solo los horarios realmente libres, eligen servicio y profesional, y pagan su adelanto. Pruébalo aquí al lado: es igual al real."
          />
          <ul className="m-0 mt-8 flex list-none flex-col gap-3.5 p-0">
            <Bullet>
              Tu propio enlace de reservas (<b className="text-ink">/reservar/tu-negocio</b>), con tu logo y colores
            </Bullet>
            <Bullet>Adelantos por Yape, Plin o transferencia: validas el comprobante y la cita se confirma</Bullet>
            <Bullet>Tus clientes reprograman o cancelan desde su enlace, sin llamarte</Bullet>
            <Bullet>¿Todo lleno? Se anotan en la lista de espera y les avisas cuando se libera un horario</Bullet>
          </ul>
        </div>
        <div data-reveal style={delay(120)}>
          <BookingDemo />
        </div>
      </div>
    </section>
  )
}

function AutomationsSection() {
  return (
    <section className="relative px-4 py-20 sm:px-6 md:py-24">
      <div className="absolute inset-x-0 inset-y-10 -z-0 rounded-[40px] bg-surface-2 md:mx-6" aria-hidden />
      <div className="relative mx-auto grid max-w-[1200px] items-center gap-12 lg:grid-cols-[0.9fr_1.3fr] lg:gap-16">
        <div data-reveal>
          <SplitHeading
            eyebrow="Automatizaciones"
            title={
              <>
                Menos faltas.
                <br />
                <span className="text-grad">Más clientes que vuelven.</span>
              </>
            }
            text="Activa los mensajes que quieras y uBook los envía en el momento justo, por correo y WhatsApp. Recordatorios para que nadie se olvide, reseñas para crecer en Google y campañas para traer de vuelta a quien dejó de venir."
          />
        </div>
        <div data-reveal style={delay(120)}>
          <AutomationsDemo />
        </div>
      </div>
    </section>
  )
}

function FeaturesSection() {
  return (
    <Section
      id="funciones"
      eyebrow="Todo incluido"
      title={
        <>
          Todo lo que tu negocio necesita,
          <br className="hidden sm:block" /> <span className="text-grad">nada que te sobre</span>
        </>
      }
      text="Desde la primera reserva hasta el reporte de fin de mes. Sin hojas de cálculo, sin cuadernos, sin chats perdidos."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <article
            key={f.title}
            data-reveal
            style={delay((i % 3) * 80)}
            className="group relative overflow-hidden rounded-[20px] border border-line bg-surface p-6 transition duration-300 hover:-translate-y-1 hover:border-teal-line hover:shadow-[0_20px_50px_-20px_rgb(36_51_82/0.4)]"
          >
            <div className="absolute -top-24 -right-24 size-48 rounded-full glow opacity-0 blur-2xl transition duration-500 group-hover:opacity-100" aria-hidden />
            <span className="bg-grad relative grid size-11 place-items-center rounded-[12px] shadow-card">
              <f.icon size={20} aria-hidden />
            </span>
            <h3 className="relative mt-5 mb-2 text-lg font-bold tracking-[-.01em]">{f.title}</h3>
            <p className="relative m-0 text-body leading-relaxed text-ink-2">{f.text}</p>
            <ul className="relative m-0 mt-4 flex list-none flex-col gap-1.5 border-t border-line p-0 pt-4">
              {f.points.map((p) => (
                <li key={p} className="flex items-center gap-2 text-sm text-ink-2">
                  <Check size={13} className="flex-none text-teal-ink" strokeWidth={3} aria-hidden /> {p}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </Section>
  )
}

function ReportsSection() {
  return (
    <section className="px-4 py-20 sm:px-6 md:py-24">
      <div className="mx-auto grid max-w-[1200px] items-center gap-12 lg:grid-cols-[1.25fr_1fr] lg:gap-16">
        <div data-reveal className="order-2 lg:order-1">
          <ReportsPreview />
        </div>
        <div data-reveal style={delay(120)} className="order-1 lg:order-2">
          <SplitHeading
            eyebrow="Reportes y dashboard"
            title={
              <>
                Decide con números,
                <br />
                <span className="text-grad">no con corazonadas.</span>
              </>
            }
            text="Cada mañana ves las citas del día, lo que requiere tu atención y la ocupación de cada profesional. A fin de mes, ventas por servicio, horas más llenas, tasa de faltas y quiénes son tus mejores clientes."
          />
          <ul className="m-0 mt-8 flex list-none flex-col gap-3.5 p-0">
            <Bullet>Comparado siempre con el periodo anterior</Bullet>
            <Bullet>Rendimiento por profesional y por sede</Bullet>
            <Bullet>Pagos registrados por método: efectivo, tarjeta, Yape, Plin</Bullet>
          </ul>
        </div>
      </div>
    </section>
  )
}

function IndustriesSection() {
  return (
    <Section
      id="rubros"
      eyebrow="Rubros"
      title={
        <>
          Se adapta a tu rubro <span className="text-grad">desde el primer minuto</span>
        </>
      }
      text="Al crear tu cuenta eliges tu tipo de negocio y uBook te propone servicios y fichas a tu medida. Luego lo ajustas todo a tu manera."
      className="bg-surface"
    >
      <div data-reveal>
        <IndustriesDemo />
      </div>
    </Section>
  )
}

function StepsSection() {
  const steps: Array<[LucideIcon, string, string]> = [
    [UserPlus, 'Crea tu cuenta', 'Elige tu rubro y tu plan. En 2 minutos tienes tu negocio con servicios sugeridos.'],
    [Settings2, 'Configura a tu gusto', 'Agrega a tu equipo, horarios, feriados y los datos para recibir adelantos.'],
    [Link2, 'Comparte tu enlace', 'Pégalo en tu bio de Instagram y en WhatsApp. Las reservas empiezan a llegar.'],
  ]
  return (
    <Section eyebrow="Cómo empezar" title="De cero a recibir reservas en 3 pasos">
      <ol className="relative m-0 grid list-none gap-6 p-0 md:grid-cols-3">
        <div className="absolute top-7 right-[16%] left-[16%] hidden h-[2px] bg-gradient-to-r from-teal/0 via-teal-line to-teal/0 md:block" aria-hidden />
        {steps.map(([Icon, title, text], i) => (
          <li key={title} data-reveal style={delay(i * 120)} className="relative flex flex-col items-center text-center">
            <span className="relative grid size-14 place-items-center rounded-full border border-line bg-surface shadow-card">
              <Icon size={22} className="text-teal-ink" aria-hidden />
              <span className="bg-grad absolute -top-1 -right-1 grid size-6 place-items-center rounded-full text-2xs font-bold">{i + 1}</span>
            </span>
            <h3 className="mt-5 mb-2 text-lg font-bold">{title}</h3>
            <p className="m-0 max-w-[300px] text-body leading-relaxed text-ink-2">{text}</p>
          </li>
        ))}
      </ol>
    </Section>
  )
}

function SecuritySection() {
  const items: Array<[LucideIcon, string, string]> = [
    [Eye, 'Cada quien ve lo suyo', 'Un profesional puede ver solo su agenda; un encargado, su sede; tú, todo el negocio.'],
    [KeyRound, 'Roles a tu medida', 'Usa los roles listos o crea los tuyos eligiendo permiso por permiso.'],
    [Fingerprint, 'Registro de auditoría', 'Quién cambió qué y cuándo, para que nada pase desapercibido.'],
    [ShieldCheck, 'Datos aislados y seguros', 'La información de tu negocio vive separada del resto y las sesiones se protegen.'],
  ]
  return (
    <section className="px-4 py-20 sm:px-6 md:py-24">
      <div data-reveal className="bg-grad relative mx-auto max-w-[1200px] overflow-hidden rounded-[32px] px-6 py-14 sm:px-12 md:py-20">
        <div className="pointer-events-none absolute -top-40 -right-40 size-[480px] rounded-full bg-white/10 blur-3xl" aria-hidden />
        <div className="relative grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <div>
            <span className="inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-bold tracking-[.06em] uppercase">Tu equipo</span>
            <h2 className="mt-4 mb-0 text-[clamp(28px,4vw,44px)] leading-[1.08] font-bold tracking-[-.035em]">
              Invita a tu equipo sin perder el control
            </h2>
            <p className="mt-4 mb-0 text-[clamp(14px,1.6vw,17px)] leading-relaxed opacity-90">
              Envía invitaciones por correo y decide exactamente qué puede ver y hacer cada persona. Tus datos y los de tus clientes,
              siempre protegidos.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map(([Icon, title, text]) => (
              <div key={title} className="rounded-[18px] bg-white/12 p-5 backdrop-blur-sm ring-1 ring-white/20">
                <Icon size={20} aria-hidden />
                <h3 className="mt-3 mb-1 text-md font-bold">{title}</h3>
                <p className="m-0 text-sm leading-relaxed opacity-90">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function FaqSection() {
  return (
    <Section id="preguntas" eyebrow="Preguntas frecuentes" title="Lo que todos preguntan antes de empezar">
      <div className="mx-auto flex max-w-[820px] flex-col gap-3">
        {FAQS.map(([q, a], i) => (
          <details
            key={q}
            data-reveal
            style={delay(i * 40)}
            className="group rounded-[16px] border border-line bg-surface px-5 open:border-teal-line open:shadow-card"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-md font-semibold [&::-webkit-details-marker]:hidden">
              {q}
              <ChevronDown size={18} className="flex-none text-muted transition group-open:rotate-180" aria-hidden />
            </summary>
            <p className="m-0 pb-5 text-body leading-relaxed text-ink-2">{a}</p>
          </details>
        ))}
      </div>
    </Section>
  )
}

function FinalCta() {
  return (
    <section className="px-4 pb-24 sm:px-6">
      <div data-reveal className="relative mx-auto max-w-[1200px] overflow-hidden rounded-[32px] border border-line bg-surface px-6 py-16 text-center sm:px-12 md:py-24">
        <div className="pointer-events-none absolute inset-0 glow opacity-60" aria-hidden />
        <div className="pointer-events-none absolute inset-0 grid-lines opacity-60" aria-hidden />
        <div className="relative">
          <h2 className="m-0 text-[clamp(30px,5vw,56px)] leading-[1.05] font-bold tracking-[-.04em]">
            Tu próxima reserva
            <br />
            <span className="text-grad">puede llegar esta noche.</span>
          </h2>
          <p className="mx-auto mt-5 mb-0 max-w-[520px] text-[clamp(14px,1.6vw,17px)] leading-relaxed text-ink-2">
            Crea tu cuenta, comparte tu enlace y deja que uBook se encargue del resto. 30 días gratis, sin tarjeta.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/registro"
              className="bg-grad group inline-flex items-center gap-2 rounded-full px-8 py-4 text-md font-bold no-underline shadow-[0_14px_34px_-12px_rgb(36_51_82/0.8)] transition hover:brightness-110"
            >
              Crear mi cuenta gratis
              <ArrowRight size={17} className="transition group-hover:translate-x-0.5" aria-hidden />
            </Link>
            <Link to="/login" className="rounded-full px-5 py-4 text-md font-semibold text-ink-2 no-underline hover:text-ink">
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  const cols: Array<[string, Array<[string, string]>]> = [
    ['Producto', [['#funciones', 'Funciones'], ['#reservas', 'Reservas online'], ['#precios', 'Precios'], ['#preguntas', 'Preguntas frecuentes']]],
    ['Rubros', [['#rubros', 'Barberías'], ['#rubros', 'Salones y uñas'], ['#rubros', 'Psicología y odontología'], ['#rubros', 'Spas y entrenadores']]],
    ['Cuenta', [['/registro', 'Crear cuenta'], ['/login', 'Iniciar sesión']]],
  ]
  return (
    <footer className="border-t border-line bg-surface px-4 pt-14 pb-10 sm:px-6">
      <div className="mx-auto max-w-[1200px]">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Logo />
            <p className="mt-3 mb-0 text-md font-semibold text-ink">{TAGLINE}</p>
            <p className="mt-1.5 mb-0 max-w-[300px] text-sm leading-relaxed text-ink-2">
              Reservas online, agenda, pagos y clientes para negocios que atienden con cita.
            </p>
          </div>
          {cols.map(([title, links]) => (
            <div key={title}>
              <h3 className="m-0 mb-3 text-xs font-bold tracking-[.08em] text-muted uppercase">{title}</h3>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {links.map(([href, label]) => (
                  <li key={label}>
                    {href.startsWith('/') ? (
                      <Link to={href} className="text-sm text-ink-2 no-underline hover:text-teal-ink">
                        {label}
                      </Link>
                    ) : (
                      <a href={href} className="text-sm text-ink-2 no-underline hover:text-teal-ink">
                        {label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-line pt-6 text-xs text-muted sm:flex-row">
          <span>© {YEAR} Unify Tec · Hecho en Perú 🇵🇪</span>
          <span>Precios en soles (PEN)</span>
        </div>
      </div>
    </footer>
  )
}
