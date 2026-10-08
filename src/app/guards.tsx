import { ShieldOff } from 'lucide-react'
import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { findNavItem } from '@/components/layout/nav'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/display'
import { meets } from '@/lib/auth/access'
import { useAuth } from '@/lib/auth/auth-context'
import { Logo } from '@/components/brand/logo'
import { homeFor } from '@/lib/auth/home'
import { LandingPage } from '@/features/landing/landing-page'

function Splash() {
  return (
    <div className="grid min-h-screen place-items-center" role="status" aria-label="Cargando">
      <Logo size="lg" className="animate-pulse" />
    </div>
  )
}

/** Requiere sesión iniciada. Sin sesión, la raíz muestra la landing en vez de mandar al login. */
export function RequireSession() {
  const { status } = useAuth()
  const { pathname } = useLocation()
  if (status === 'loading') return <Splash />
  if (status === 'anonymous') {
    if (pathname === '/') return <LandingPage />
    return <Navigate to="/login" replace state={{ from: pathname }} />
  }
  return <Outlet />
}

/** Login y registro: si ya hay sesión, se va al inicio. */
export function PublicOnly() {
  const { status, me } = useAuth()
  if (status === 'loading') return <Splash />
  if (status === 'authenticated' && me) return <Navigate to={homeFor(me)} replace />
  return <Outlet />
}

/**
 * Dentro de la app: la sesión `account` debe elegir negocio primero, y el
 * equipo de plataforma solo ve sus pantallas.
 */
export function AppGate({ children }: { children: ReactNode }) {
  const { me } = useAuth()
  const { pathname } = useLocation()
  if (!me) return null
  if (me.context.ctx === 'account') return <Navigate to="/negocios" replace />

  const item = findNavItem(pathname)
  if (me.context.ctx === 'platform' && item && !item.platform && !item.devOnly) {
    return <Navigate to="/superadmin" replace />
  }
  if (me.context.ctx === 'staff' && item?.platform) return <Navigate to="/" replace />
  return <>{children}</>
}

/** Muestra la pantalla solo si el rol y el plan lo permiten. */
export function ScreenGate({ path, children }: { path: string; children: ReactNode }) {
  const { me } = useAuth()
  const item = findNavItem(path)
  if (me?.context.ctx === 'staff' && item?.requires && !meets(me, item.requires)) {
    return (
      <Card>
        <EmptyState
          icon={ShieldOff}
          title="No tienes acceso a esta sección"
          description="Tu rol o tu plan no incluyen esta funcionalidad. Si la necesitas, pídesela al dueño del negocio."
        />
      </Card>
    )
  }
  return <>{children}</>
}
