import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  ArrowLeftRight,
  CircleUser,
  House,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Search,
  Settings,
  Sun,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { NotificationsPanel } from '@/features/notifications/notifications-panel'
import { useAccess } from '@/lib/auth/access'
import { useAuth } from '@/lib/auth/auth-context'
import { cn } from '@/lib/cn'
import { useTheme, type ThemePreference } from '@/lib/theme'
import { Kbd } from '../ui/badges'
import { IconButton } from '../ui/button'

const THEME_OPTIONS: Array<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Oscuro', icon: Moon },
  { value: 'system', label: 'Según el sistema', icon: Monitor },
]

function ThemeMenu() {
  const { preference, resolved, setPreference } = useTheme()
  const Icon = resolved === 'dark' ? Moon : Sun
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <IconButton aria-label="Tema de color">
          <Icon size={19} strokeWidth={1.7} />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={8} className="z-50 min-w-[190px] rounded-[12px] bg-surface p-1.5 shadow-pop">
          <DropdownMenu.RadioGroup value={preference} onValueChange={(v) => setPreference(v as ThemePreference)}>
            {THEME_OPTIONS.map(({ value, label, icon: OptIcon }) => (
              <DropdownMenu.RadioItem
                key={value}
                value={value}
                className="flex cursor-pointer items-center gap-2.5 rounded-control px-2.5 py-2 text-body outline-none data-[highlighted]:bg-surface-2 data-[state=checked]:font-semibold"
              >
                <OptIcon size={15} aria-hidden />
                {label}
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

function ProfileMenu() {
  const { me, logout } = useAuth()
  const navigate = useNavigate()
  if (!me) return null
  const { user } = me
  const canSwitch = me.context.ctx !== 'platform' && me.organizations.length > 1
  const item =
    'flex cursor-pointer items-center gap-2.5 rounded-control px-2.5 py-2 text-body outline-none data-[highlighted]:bg-surface-2'
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <IconButton aria-label="Mi perfil">
          <CircleUser size={19} strokeWidth={1.7} />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={8} className="z-50 min-w-[230px] rounded-[12px] bg-surface p-1.5 shadow-pop">
          <div className="px-2.5 pt-1.5 pb-2">
            <div className="font-semibold">
              {user.firstName} {user.lastName}
            </div>
            <div className="text-xs text-muted">{user.email}</div>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          {canSwitch && (
            <DropdownMenu.Item className={item} onSelect={() => navigate('/negocios')}>
              <ArrowLeftRight size={15} aria-hidden /> Cambiar de negocio
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Item
            className={cn(item, 'text-bad')}
            onSelect={() => {
              void logout().then(() => navigate('/login'))
            }}
          >
            <LogOut size={15} aria-hidden /> Cerrar sesión
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

export function Topbar({
  crumb,
  title,
  onOpenSearch,
  onOpenMenu,
}: {
  crumb: string
  title: string
  onOpenSearch: () => void
  onOpenMenu: () => void
}) {
  const { can } = useAccess()
  const canConfigure = can('organization.manage')
  const isPlatform = useAuth().me?.context.ctx === 'platform'
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-2">
        <IconButton aria-label="Abrir menú" onClick={onOpenMenu} className="nav:hidden -ml-1">
          <Menu size={20} />
        </IconButton>
        <div>
          <div className="flex items-center gap-[5px] text-2xs text-muted">
            <House size={12} aria-hidden /> / {crumb}
          </div>
          <h1 className="m-0 mt-[3px] text-base font-bold text-brand">{title}</h1>
        </div>
      </div>
      <div className="flex w-full items-center gap-3 sm:w-auto">
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-[9px] border border-line-strong bg-surface px-2.5 py-[7px] text-sm text-muted sm:min-w-[240px] sm:flex-none"
        >
          <Search size={15} className="flex-none" aria-hidden />
          <span className="truncate">{!isPlatform && can('client.read') ? 'Buscar clientes…' : 'Buscar…'}</span>
          <Kbd className="ml-auto hidden sm:inline-flex">Ctrl K</Kbd>
        </button>
        <ThemeMenu />
        <ProfileMenu />
        {canConfigure && (
        <Link
          to="/configuracion"
          aria-label="Configuración"
          className="grid place-items-center rounded-control p-1 text-ink-2 hover:bg-surface-2"
        >
          <Settings size={19} strokeWidth={1.7} />
        </Link>
        )}
        <NotificationsPanel />
      </div>
    </header>
  )
}
