import {
  Box,
  Building2,
  Calendar,
  CalendarPlus,
  ChartColumn,
  CreditCard,
  Globe,
  House,
  Layers,
  ListTodo,
  Palette,
  Scissors,
  SlidersHorizontal,
  Store,
  Tag,
  User,
  UserCog,
  Users,
  Clock,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { Requirement } from '@/lib/auth/access'

export interface NavItem {
  path: string
  label: string
  icon: LucideIcon
  /** Ruta de navegación mostrada en el encabezado. */
  crumb: string
  /** Pantalla construida. Las demás muestran "Próximamente". */
  ready?: boolean
  /** Solo visible en desarrollo. */
  devOnly?: boolean
  /** Permiso y/o funcionalidad del plan necesarios para verla. */
  requires?: Requirement
  /** Solo para el equipo de plataforma (Unify Tec). */
  platform?: boolean
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

/**
 * Menú principal, en el orden del prototipo. Cada ítem se muestra solo si
 * el usuario tiene el permiso y su plan incluye la funcionalidad.
 */
export const NAV: NavGroup[] = [
  {
    label: 'Operación',
    items: [
      { path: '/', label: 'Dashboard', icon: House, crumb: 'Dashboard', requires: { permission: 'booking.read' }, ready: true },
      { path: '/agenda', label: 'Agenda', icon: Calendar, crumb: 'Agenda', requires: { permission: 'booking.read' }, ready: true },
      { path: '/agenda/nueva', label: 'Nueva cita', icon: CalendarPlus, crumb: 'Agenda / Nueva cita', requires: { permission: 'booking.create' }, ready: true },
      { path: '/lista-espera', label: 'Lista de espera', icon: ListTodo, crumb: 'Agenda / Lista de espera', requires: { permission: 'booking.read' }, ready: true },
    ],
  },
  {
    label: 'Clientes',
    items: [
      { path: '/clientes', label: 'Clientes', icon: Users, crumb: 'Clientes', requires: { permission: 'client.read' }, ready: true },
    ],
  },
  {
    label: 'Catálogo',
    items: [
      { path: '/servicios', label: 'Servicios', icon: Scissors, crumb: 'Catálogo / Servicios', requires: { permission: 'service.read' }, ready: true },
      { path: '/profesionales', label: 'Profesionales', icon: User, crumb: 'Catálogo / Profesionales', requires: { permission: 'professional.read' }, ready: true },
      { path: '/recursos', label: 'Recursos', icon: Box, crumb: 'Catálogo / Recursos', requires: { permission: 'resource.read', feature: 'resources' }, ready: true },
      { path: '/sucursales', label: 'Sucursales', icon: Store, crumb: 'Catálogo / Sucursales', requires: { permission: 'branch.manage' }, ready: true },
    ],
  },
  {
    label: 'Negocio',
    items: [
      { path: '/pagos', label: 'Pagos', icon: CreditCard, crumb: 'Negocio / Pagos', requires: { permission: 'payment.read', feature: 'manual_payments' }, ready: true },
      { path: '/promociones', label: 'Promociones', icon: Tag, crumb: 'Negocio / Promociones', requires: { permission: 'organization.manage' }, ready: true },
      { path: '/automatizaciones', label: 'Automatizaciones', icon: Zap, crumb: 'Negocio / Automatizaciones', requires: { permission: 'organization.manage' }, ready: true },
      { path: '/pagina-reservas', label: 'Página de reservas', icon: Globe, crumb: 'Negocio / Página de reservas', requires: { permission: 'organization.manage', feature: 'public_booking_page' }, ready: true },
      { path: '/reportes', label: 'Reportes', icon: ChartColumn, crumb: 'Negocio / Reportes', requires: { permission: 'report.view' }, ready: true },
    ],
  },
  {
    label: 'Ajustes',
    items: [
      { path: '/disponibilidad', label: 'Disponibilidad', icon: Clock, crumb: 'Ajustes / Disponibilidad', requires: { permission: 'organization.manage' }, ready: true },
      { path: '/equipo', label: 'Equipo', icon: UserCog, crumb: 'Ajustes / Equipo', requires: { permission: 'member.read' }, ready: true },
      { path: '/configuracion', label: 'Configuración', icon: SlidersHorizontal, crumb: 'Ajustes / Configuración', requires: { permission: 'organization.manage' }, ready: true },
    ],
  },
  {
    label: 'Plataforma',
    items: [
      { path: '/superadmin', label: 'Negocios', icon: Building2, crumb: 'Unify Tec / Superadmin', platform: true, ready: true },
      { path: '/superadmin/planes', label: 'Planes', icon: Layers, crumb: 'Unify Tec / Planes', platform: true, ready: true },
      { path: '/design', label: 'Sistema de diseño', icon: Palette, crumb: 'Desarrollo / Sistema de diseño', ready: true, devOnly: true },
    ],
  },
]

export const NAV_ITEMS = NAV.flatMap((g) => g.items).filter((i) => !i.devOnly || import.meta.env.DEV)

/** Menú visible para la sesión actual. */
export function visibleNav(ctx: 'staff' | 'platform', allowed: (req: Requirement) => boolean): NavGroup[] {
  return NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (item.devOnly) return import.meta.env.DEV
      if (ctx === 'platform') return !!item.platform
      return !item.platform && allowed(item.requires ?? {})
    }),
  })).filter((group) => group.items.length > 0)
}

/** Ítem exacto o, en rutas hijas (/profesionales/123), el padre más cercano. */
export function findNavItem(pathname: string): NavItem | undefined {
  return (
    NAV_ITEMS.find((i) => i.path === pathname) ??
    NAV_ITEMS.filter((i) => i.path !== '/' && pathname.startsWith(`${i.path}/`)).sort(
      (a, b) => b.path.length - a.path.length,
    )[0]
  )
}
