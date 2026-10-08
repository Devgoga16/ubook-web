import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check, ChevronDown } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router'
import { meets } from '@/lib/auth/access'
import { useAuth } from '@/lib/auth/auth-context'
import { useBranch } from '@/lib/auth/branch-context'
import { cn } from '@/lib/cn'
import { OrgLogo } from '@/components/ui/org-logo'
import { Logo } from '@/components/brand/logo'
import { findNavItem, visibleNav, type NavItem } from './nav'

function NavEntry({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const Icon = item.icon
  // Activo también en sus páginas hijas (/profesionales/123).
  const isActive = findNavItem(useLocation().pathname)?.path === item.path
  return (
    <Link
      to={item.path}
      onClick={onNavigate}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex items-center gap-2.5 rounded-[10px] px-2 py-1.5 text-sm font-medium whitespace-nowrap transition-colors',
        isActive ? 'bg-brand-soft font-semibold text-ink' : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
      )}
    >
      <span
        className={cn(
          'grid size-[27px] place-items-center rounded-control border',
          isActive ? 'bg-grad border-transparent shadow-sm' : 'border-line-strong text-brand',
        )}
      >
        <Icon size={14} strokeWidth={1.8} aria-hidden />
      </span>
      {item.label}
    </Link>
  )
}

function BranchSwitcher() {
  const { branches, current, setCurrent } = useBranch()
  if (!current) return null
  if (branches.length < 2) {
    return <span className="rounded-full border border-line px-2.5 py-[3px] text-2xs text-muted">{current.name}</span>
  }
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-2.5 py-[3px] text-2xs text-muted">
        {current.name}
        <ChevronDown size={11} strokeWidth={2.4} aria-hidden />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content sideOffset={6} className="z-50 min-w-[200px] rounded-[12px] bg-surface p-1.5 shadow-pop">
          <DropdownMenu.Label className="px-2.5 pt-1.5 pb-1 text-2xs font-bold tracking-[.1em] text-muted uppercase">
            Sucursal
          </DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={current.id} onValueChange={setCurrent}>
            {branches.map((b) => (
              <DropdownMenu.RadioItem
                key={b.id}
                value={b.id}
                className="flex cursor-pointer items-center gap-2 rounded-control px-2.5 py-2 text-body outline-none data-[highlighted]:bg-surface-2"
              >
                <span className="w-3.5">
                  <DropdownMenu.ItemIndicator>
                    <Check size={14} aria-hidden />
                  </DropdownMenu.ItemIndicator>
                </span>
                {b.name}
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { me } = useAuth()
  const navigate = useNavigate()
  const isPlatform = me?.context.ctx === 'platform'
  const groups = visibleNav(isPlatform ? 'platform' : 'staff', (req) => meets(me, req))
  const orgName = isPlatform ? 'Unify Tec' : (me?.organization?.name ?? '')

  return (
    <div className="flex min-h-full flex-col gap-4 px-3.5 py-5">
      <div className="flex justify-center border-b border-line px-2 pb-3.5">
        <Logo />
      </div>

      <div className="flex flex-col items-center gap-2 pt-1 pb-1.5">
        <OrgLogo
          name={orgName}
          logoUrl={isPlatform ? null : me?.organization?.logoUrl}
          className="size-[62px] rounded-full border border-line bg-surface text-lg tracking-[.04em] shadow-card"
        />
        <div className="text-center text-base font-semibold">{orgName}</div>
        {isPlatform ? (
          <span className="rounded-full border border-line px-2.5 py-[3px] text-2xs text-muted">Panel de plataforma</span>
        ) : (
          <BranchSwitcher />
        )}
      </div>

      <nav aria-label="Principal" className="flex flex-col gap-2.5">
        {groups.map((group) => (
          <div key={group.label} className="flex flex-col gap-px">
            <div className="px-2 py-1 text-2xs font-bold tracking-[.1em] text-muted uppercase">{group.label}</div>
            {group.items.map((item) => (
              <NavEntry key={item.path} item={item} onNavigate={onNavigate} />
            ))}
          </div>
        ))}
      </nav>

      {!isPlatform && (
        <div className="mt-auto flex rounded-panel border-[1.5px] border-dashed border-line-strong p-2.5">
          <button
            type="button"
            onClick={() => {
              onNavigate?.()
              navigate('/negocios/nuevo')
            }}
            className="bg-grad flex min-h-[118px] flex-1 cursor-pointer flex-col justify-between gap-4 rounded-[12px] p-4 text-left text-md leading-tight font-semibold"
          >
            Agregar nuevo negocio
            <span className="grid size-[26px] place-items-center self-center rounded-full bg-white text-[#243352]">+</span>
          </button>
        </div>
      )}
    </div>
  )
}
