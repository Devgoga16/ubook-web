import { Box, ChevronRight, Plus } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { Tag } from '@/components/ui/badges'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState, Skeleton } from '@/components/ui/display'
import { useServices } from '@/features/services/api'
import { useAccess } from '@/lib/auth/access'
import { useBranch } from '@/lib/auth/branch-context'
import { cn } from '@/lib/cn'
import { useResources, type Resource } from './api'

const DAY_START = 8 * 60
const DAY_END = 21 * 60
const pos = (m: number) => `${((Math.min(Math.max(m, DAY_START), DAY_END) - DAY_START) / (DAY_END - DAY_START)) * 100}%`

/** Uso de hoy: barra de 8:00 a 21:00 con los bloques ocupados. */
function TodayBar({ r }: { r: Resource }) {
  const used = r.today.reduce((a, b) => a + (b.endMinute - b.startMinute), 0)
  const pct = Math.min(100, Math.round((used / ((DAY_END - DAY_START) * r.capacity)) * 100))
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="text-muted">Uso hoy</span>
        <b className="font-semibold">{pct}%</b>
      </div>
      <div className="relative mt-1.5 h-[18px] overflow-hidden rounded-[6px] bg-surface-2" role="img" aria-label={`${r.today.length} citas hoy`}>
        {r.today.map((b, i) => (
          <span key={i} className="absolute top-0 h-full rounded-[4px] bg-[var(--brand)] opacity-80" style={{ left: pos(b.startMinute), width: `calc(${pos(b.endMinute)} - ${pos(b.startMinute)})` }} />
        ))}
      </div>
      <div className="mt-0.5 flex justify-between text-[10px] text-muted">
        <span>8h</span>
        <span>14h</span>
        <span>21h</span>
      </div>
    </div>
  )
}

/** Catálogo / Recursos: lo que una cita ocupa además del profesional. */
export function ResourcesPage() {
  const navigate = useNavigate()
  const { current } = useBranch()
  const { can, readOnly } = useAccess()
  const resources = useResources(current?.id)
  const services = useServices()
  const list = resources.data ?? []
  const name = (id: string) => services.data?.find((s) => s.id === id)?.name
  const canManage = can('resource.manage') && !readOnly

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 max-w-[62ch] text-sm text-muted">
          Sillones, salas, camillas o equipos de {current?.name ?? 'la sede'}. Si un servicio necesita un recurso y están todos ocupados, ese horario no se ofrece.
        </p>
        {canManage && (
          <Button variant="primary" onClick={() => navigate('/recursos/nuevo')}>
            <Plus size={14} aria-hidden /> Nuevo recurso
          </Button>
        )}
      </div>
      {resources.isLoading ? (
        <Skeleton className="h-[160px] rounded-card" />
      ) : list.length === 0 ? (
        <Card>
          <EmptyState
            icon={Box}
            title="Sin recursos en esta sede"
            description="Agrégalos solo si limitan tus citas: por ejemplo, si tienes 2 cabinas de masajes y 4 masajistas, no puedes atender más de 2 masajes a la vez."
            action={
              canManage && (
                <Button variant="primary" size="sm" onClick={() => navigate('/recursos/nuevo')}>
                  <Plus size={13} aria-hidden /> Agregar recurso
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 p-0">
          {list.map((r) => (
            <li key={r.id}>
              <Link
                to={`/recursos/${r.id}`}
                className={cn('group flex h-full flex-col gap-3 rounded-card bg-surface px-5 py-[18px] text-ink shadow-card hover:shadow-[0_0_0_1.5px_var(--teal-line),var(--shadow)]', !r.isActive && 'opacity-70')}
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-10 flex-none place-items-center rounded-[11px] bg-brand-soft text-brand">
                    <Box size={18} strokeWidth={1.7} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 font-semibold">
                      <span className="truncate">{r.name}</span>
                      {!r.isActive && <Tag tone="off">Inactivo</Tag>}
                    </div>
                    <div className="truncate text-xs text-muted">{r.kind || 'Recurso'}</div>
                  </div>
                  <ChevronRight size={18} className="text-muted" aria-hidden />
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <span className="rounded-full bg-surface-2 px-2 py-0.5">Capacidad {r.capacity}</span>
                  <span className="truncate rounded-full bg-surface-2 px-2 py-0.5">
                    {r.serviceIds.length ? r.serviceIds.map(name).filter(Boolean).join(', ') : 'Ningún servicio lo usa'}
                  </span>
                </div>
                <TodayBar r={r} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
