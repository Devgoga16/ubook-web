import * as Dialog from '@radix-ui/react-dialog'
import { useQuery } from '@tanstack/react-query'
import { Calendar, CalendarPlus, Clock, Lock, UserPlus } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router'
import { formatPhone } from '@/features/clients/api'
import { api } from '@/lib/api/client'
import type { Client } from '@/lib/api/types'
import { meets } from '@/lib/auth/access'
import { useAuth } from '@/lib/auth/auth-context'
import { BranchProvider } from '@/lib/auth/branch-context'
import { PageMetaProvider, usePageMetaValue } from '@/lib/page-meta'
import { Avatar } from '../ui/avatar'
import { CommandPalette, type PaletteItem } from '../ui/command-palette'
import { findNavItem, visibleNav } from './nav'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'

const DAY = 86_400_000

/** Aviso de prueba gratis o de suscripción inactiva. */
function SubscriptionNotice() {
  const { me } = useAuth()
  const sub = me?.subscription
  const canBill = !!me?.access?.permissions['subscription.manage']
  if (!sub) return null

  if (sub.suspended || sub.readOnly) {
    return (
      <div role="status" className="flex items-center gap-2.5 rounded-card bg-bad-bg px-4 py-3 text-sm text-bad">
        <Lock size={16} aria-hidden className="flex-none" />
        <span>
          <b>{sub.suspended ? 'Tu negocio está suspendido.' : 'Tu suscripción no está activa.'}</b> Puedes consultar
          tus datos, pero no modificarlos.{' '}
          {!sub.suspended && canBill ? (
            <Link to="/configuracion?tab=plan" className="font-semibold underline underline-offset-2">
              Registrar mi pago
            </Link>
          ) : (
            'Escríbenos para reactivarla.'
          )}
        </span>
      </div>
    )
  }

  if (sub.status === 'trialing' && sub.trialEndsAt) {
    const days = Math.max(0, Math.ceil((new Date(sub.trialEndsAt).getTime() - Date.now()) / DAY))
    return (
      <div role="status" className="flex items-center gap-2.5 rounded-card bg-teal-soft px-4 py-2.5 text-sm text-teal-ink">
        <Clock size={16} aria-hidden className="flex-none" />
        <span>
          Estás en la prueba gratis del plan <b>{sub.planName}</b>: te {days === 1 ? 'queda 1 día' : `quedan ${days} días`}.
          {canBill && (
            <>
              {' '}
              <Link to="/configuracion?tab=plan" className="font-semibold underline underline-offset-2">
                Ver planes y pagar
              </Link>
            </>
          )}
        </span>
      </div>
    )
  }
  return null
}

/** Estructura de la app: menú lateral fijo + contenido. */
export function AppShell() {
  return (
    <PageMetaProvider>
      <Shell />
    </PageMetaProvider>
  )
}

function Shell() {
  const pageMeta = usePageMetaValue()
  const { me } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const current = findNavItem(pathname)
  const isPlatform = me?.context.ctx === 'platform'
  const allowed = (req: Parameters<typeof meets>[1]) => meets(me, req)

  // Clientes desde la API mientras se escribe (2+ letras).
  const [search, setSearch] = useState('')
  const term = useDeferredValue(search.trim())
  const canSearchClients = !isPlatform && allowed({ permission: 'client.read' })
  const clients = useQuery({
    queryKey: ['clients', 'palette', term],
    queryFn: () => api<Client[]>(`/clients?limit=6&search=${encodeURIComponent(term)}`),
    enabled: paletteOpen && canSearchClients && term.length >= 2,
    placeholderData: (prev) => prev,
  })
  const clientItems: PaletteItem[] =
    canSearchClients && term.length >= 2
      ? (clients.data ?? []).map((c) => {
          const name = `${c.firstName} ${c.lastName ?? ''}`.trim()
          return {
            id: `client:${c.id}`,
            group: 'Clientes',
            label: name,
            hint: formatPhone(c.phone) || c.email || undefined,
            leading: <Avatar name={name} size="xs" round />,
            // La API ya filtró (por nombre, celular o DNI): que cmdk no los descarte.
            keywords: [search],
            onSelect: () => navigate(`/clientes/${c.id}`),
          }
        })
      : []

  const paletteItems: PaletteItem[] = [
    ...clientItems,
    ...(isPlatform
      ? []
      : [
          ...(allowed({ permission: 'booking.create' })
            ? [{ id: 'new-appointment', group: 'Acciones', label: 'Nueva cita', icon: CalendarPlus, shortcut: 'N', onSelect: () => navigate('/agenda/nueva') }]
            : []),
          ...(allowed({ permission: 'client.create' })
            ? [{ id: 'new-client', group: 'Acciones', label: 'Nuevo cliente', icon: UserPlus, shortcut: 'C', onSelect: () => navigate('/clientes/nuevo') }]
            : []),
          ...(allowed({ permission: 'booking.read' })
            ? [{ id: 'today', group: 'Acciones', label: 'Ir a la agenda de hoy', icon: Calendar, onSelect: () => navigate('/agenda') }]
            : []),
        ]),
    ...visibleNav(isPlatform ? 'platform' : 'staff', allowed)
      .flatMap((g) => g.items)
      .map((item) => ({
        id: `go:${item.path}`,
        group: 'Ir a',
        label: item.label,
        icon: item.icon,
        keywords: [item.crumb],
        onSelect: () => navigate(item.path),
      })),
  ]

  return (
    <BranchProvider key={me?.organization?.id ?? 'platform'}>
      <div className="nav:grid-cols-[240px_minmax(0,1fr)] grid min-h-screen grid-cols-[minmax(0,1fr)]">
        <aside className="nav:block scroll-reveal sticky top-0 hidden h-screen overflow-y-auto border-r border-line bg-surface">
          <Sidebar />
        </aside>

        <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay" />
            <Dialog.Content className="scroll-reveal fixed inset-y-0 left-0 z-50 w-[min(280px,85vw)] overflow-y-auto bg-surface shadow-pop focus:outline-none">
              <Dialog.Title className="sr-only">Menú</Dialog.Title>
              <Dialog.Description className="sr-only">Navegación principal</Dialog.Description>
              <Sidebar onNavigate={() => setMenuOpen(false)} />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        <main className="nav:px-7 flex min-w-0 flex-col gap-5 px-4 pt-5 pb-12">
          <Topbar
            crumb={pageMeta?.crumb ?? current?.crumb ?? ''}
            title={pageMeta?.title ?? current?.label ?? ''}
            onOpenSearch={() => setPaletteOpen(true)}
            onOpenMenu={() => setMenuOpen(true)}
          />
          <SubscriptionNotice />
          <section className="flex min-w-0 flex-col gap-5">
            <Outlet />
          </section>
        </main>

        <CommandPalette
          open={paletteOpen}
          onOpenChange={(v) => {
            setPaletteOpen(v)
            if (!v) setSearch('')
          }}
          items={paletteItems}
          search={search}
          onSearchChange={setSearch}
          placeholder={canSearchClients ? 'Buscar clientes, pantallas y acciones…' : 'Buscar pantallas y acciones…'}
        />
      </div>
    </BranchProvider>
  )
}
