import { ChevronRight, Clock, MapPin, Phone, Plus, Store, Users } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { Tag } from '@/components/ui/badges'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState, Skeleton } from '@/components/ui/display'
import { useBranchesWithHours } from '@/features/availability/api'
import { useProfessionals } from '@/features/professionals/api'
import { summarizeSchedule } from '@/features/professionals/schedule-summary'
import { useAccess } from '@/lib/auth/access'
import { useAuth } from '@/lib/auth/auth-context'
import { cn } from '@/lib/cn'

/** Catálogo / Sucursales: cada sede con su dirección, horario y equipo. */
export function BranchesPage() {
  const navigate = useNavigate()
  const { me } = useAuth()
  const { can, readOnly } = useAccess()
  const branches = useBranchesWithHours()
  const professionals = useProfessionals(can('professional.read'))
  const list = branches.data ?? []
  const active = list.filter((b) => b.isActive).length
  const limit = me?.subscription?.features.max_branches
  const atLimit = typeof limit === 'number' && active >= limit
  const canManage = can('branch.manage') && !readOnly

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-sm text-muted">
          {active} {active === 1 ? 'sede activa' : 'sedes activas'}
          {typeof limit === 'number' && ` de ${limit} en tu plan`}
        </p>
        {canManage && (
          <Button variant="primary" onClick={() => navigate('/sucursales/nueva')} disabled={atLimit} title={atLimit ? 'Llegaste al límite de sedes de tu plan' : undefined}>
            <Plus size={14} aria-hidden /> Nueva sede
          </Button>
        )}
      </div>

      {branches.isLoading ? (
        <Skeleton className="h-[180px] rounded-card" />
      ) : list.length === 0 ? (
        <Card>
          <EmptyState icon={Store} title="Sin sedes" />
        </Card>
      ) : (
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 p-0">
          {list.map((b) => {
            const hours = summarizeSchedule([{ branchId: b.id, days: b.openingHours }])
            const team = (professionals.data ?? []).filter((p) => p.isActive && p.branchIds.includes(b.id)).length
            return (
              <li key={b.id}>
                <Link
                  to={`/sucursales/${b.id}`}
                  className={cn(
                    'group flex h-full flex-col gap-3 rounded-card bg-surface px-5 py-[18px] text-ink shadow-card transition-shadow hover:shadow-[0_0_0_1.5px_var(--teal-line),var(--shadow)]',
                    !b.isActive && 'opacity-70',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 flex-none place-items-center rounded-[12px] bg-brand-soft text-brand">
                      <Store size={20} strokeWidth={1.7} aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 font-semibold">
                        <span className="truncate">{b.name}</span>
                        {!b.isActive && <Tag tone="off">Inactiva</Tag>}
                      </div>
                      <div className="truncate text-xs text-muted">{b.address || 'Sin dirección'}</div>
                    </div>
                    <ChevronRight size={18} className="text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </div>
                  <div className="mt-auto flex flex-col gap-1.5 border-t border-line pt-3 text-xs text-ink-2">
                    <span className="flex items-center gap-1.5">
                      <Clock size={14} aria-hidden className="text-teal-ink" />
                      {hours.days ? `${hours.label} · ${hours.hours} h/sem` : 'Sin horario de atención (se usa el de cada profesional)'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users size={14} aria-hidden className="text-teal-ink" />
                      {team === 1 ? '1 profesional' : `${team} profesionales`}
                    </span>
                    {b.phone && (
                      <span className="flex items-center gap-1.5">
                        <Phone size={14} aria-hidden className="text-teal-ink" /> {b.phone}
                      </span>
                    )}
                    {b.reference && (
                      <span className="flex items-center gap-1.5">
                        <MapPin size={14} aria-hidden className="text-teal-ink" /> <span className="truncate">{b.reference}</span>
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
