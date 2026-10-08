import { CalendarCheck, ShieldCheck, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Logo, TAGLINE } from '@/components/brand/logo'
import { cn } from '@/lib/cn'

/** Pantalla dividida: marca a la izquierda (desde tablet), formulario a la derecha. */
export function AuthLayout({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <aside className="bg-grad hidden flex-col justify-between p-10 lg:flex">
        <Link to="/" aria-label="uBook, inicio" className="flex flex-col gap-2 self-start no-underline">
          <Logo size="lg" onDark />
          <span className="text-sm text-white/80">{TAGLINE}</span>
        </Link>
        <div className="flex flex-col gap-6">
          <h1 className="m-0 text-3xl leading-tight font-semibold">Tu agenda, tus clientes y tu equipo en un solo lugar.</h1>
          <ul className="m-0 flex list-none flex-col gap-3.5 p-0 text-md">
            {[
              [CalendarCheck, 'Reservas online las 24 horas'],
              [Users, 'Fichas de clientes y recordatorios'],
              [ShieldCheck, 'Cada persona ve solo lo que le toca'],
            ].map(([Icon, text]) => {
              const I = Icon as typeof CalendarCheck
              return (
                <li key={text as string} className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-[10px] bg-white/20">
                    <I size={18} aria-hidden />
                  </span>
                  {text as string}
                </li>
              )
            })}
          </ul>
        </div>
        <div className="text-xs opacity-80">Unify Tec · Hecho en Perú</div>
      </aside>
      <main className="flex items-start justify-center px-4 py-10 sm:items-center">
        <div className={cn('w-full', wide ? 'max-w-[880px]' : 'max-w-[400px]')}>
          <Link to="/" aria-label="uBook, inicio" className="mb-6 flex justify-center no-underline lg:hidden">
            <Logo size="md" />
          </Link>
          {children}
        </div>
      </main>
    </div>
  )
}

/** Mensaje de error de formulario (fuera de un campo). */
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null
  return (
    <div role="alert" className="rounded-control bg-bad-bg px-3 py-2.5 text-sm font-semibold text-bad">
      {message}
    </div>
  )
}
