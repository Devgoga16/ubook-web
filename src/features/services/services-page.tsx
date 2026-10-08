import { Clock, FolderCog, Plus, Scissors } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { AvatarGroup } from '@/components/ui/avatar'
import { Pill, Tag } from '@/components/ui/badges'
import { Button } from '@/components/ui/button'
import { AddCard, Card } from '@/components/ui/card'
import { FilterChips, Switch } from '@/components/ui/controls'
import { EmptyState, Skeleton } from '@/components/ui/display'
import { useProfessionals } from '@/features/professionals/api'
import type { Professional, Service, ServiceCategory } from '@/lib/api/types'
import { useAccess } from '@/lib/auth/access'
import { formatCents, initials } from '@/lib/format'
import { useCategories, useSaveService, useServices } from './api'
import { CategoriesModal } from './categories-modal'

function ServiceCard({
  service,
  category,
  canManage,
  doers,
}: {
  service: Service
  category?: ServiceCategory
  canManage: boolean
  doers: Professional[]
}) {
  const save = useSaveService()
  return (
    <li className="flex min-w-0 flex-col overflow-hidden rounded-card bg-surface shadow-card transition-shadow hover:shadow-[0_0_0_1.5px_var(--teal-line),var(--shadow)]">
      <Link to={`/servicios/${service.id}`} className="flex flex-col gap-2 text-ink">
        <span
          aria-hidden
          className="relative grid h-[92px] place-items-center overflow-hidden text-[26px] font-semibold text-white after:absolute after:inset-0 after:bg-[radial-gradient(circle_at_30%_20%,rgb(255_255_255/.3),transparent_55%)]"
          style={{ background: `linear-gradient(140deg, ${service.color}, color-mix(in srgb, ${service.color} 60%, #1F2245))` }}
        >
          {initials(service.name)}
        </span>
        <span className="flex flex-col gap-2 px-4">
          <span className="flex items-start gap-2">
            <span className="font-semibold">{service.name}</span>
            {category && (
              <Tag tone="off" className="ml-auto">
                {category.name}
              </Tag>
            )}
          </span>
          <span className="flex flex-wrap gap-1.5">
            <Pill>
              <Clock size={12} aria-hidden /> {service.durationMinutes} min
            </Pill>
            <Pill>{formatCents(service.price)}</Pill>
            {service.deposit.enabled && <Pill>Depósito {service.deposit.value}%</Pill>}
          </span>
        </span>
      </Link>
      <div className="mt-auto flex items-center gap-2 px-4 pt-3 pb-4 text-xs text-muted">
        {doers.length > 0 ? (
          <AvatarGroup people={doers.slice(0, 4).map((p) => ({ name: p.displayName, color: p.color }))} />
        ) : (
          <span>Sin profesionales</span>
        )}
        <label className="ml-auto flex items-center gap-2">
          Reserva online
          <Switch
            checked={service.onlineBooking}
            disabled={!canManage || save.isPending}
            onCheckedChange={(onlineBooking) => save.mutate({ id: service.id, onlineBooking })}
            aria-label={`Reserva online de ${service.name}`}
          />
        </label>
      </div>
    </li>
  )
}

/** Catálogo / Servicios: lista. Cada tarjeta abre la página del servicio. */
export function ServicesPage() {
  const { can, readOnly } = useAccess()
  const navigate = useNavigate()
  const canManage = can('service.manage') && !readOnly
  const services = useServices()
  const categories = useCategories()
  const professionals = useProfessionals(can('professional.read'))
  const [filter, setFilter] = useState('all')
  const [categoriesOpen, setCategoriesOpen] = useState(false)

  const list = services.data ?? []
  const cats = categories.data ?? []
  const visible = filter === 'all' ? list : list.filter((s) => (s.categoryId ?? 'none') === filter)
  const doersOf = (serviceId: string) =>
    (professionals.data ?? []).filter((p) => p.isActive && p.services.some((s) => s.serviceId === serviceId))

  const filterOptions = [
    { value: 'all', label: `Todos · ${list.length}` },
    ...cats.filter((c) => list.some((s) => s.categoryId === c.id)).map((c) => ({ value: c.id, label: c.name })),
    ...(list.some((s) => !s.categoryId) && cats.length > 0 ? [{ value: 'none', label: 'Sin categoría' }] : []),
  ]

  if (services.isError || categories.isError) {
    return (
      <Card>
        <p className="m-0 text-sm text-bad">No se pudieron cargar los servicios. Recarga la página.</p>
      </Card>
    )
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterChips aria-label="Filtrar por categoría" value={filter} onValueChange={setFilter} options={filterOptions} />
        {canManage && (
          <div className="flex gap-2.5">
            <Button onClick={() => setCategoriesOpen(true)}>
              <FolderCog size={14} aria-hidden /> Categorías
            </Button>
            <Button variant="primary" onClick={() => navigate('/servicios/nuevo')}>
              <Plus size={14} aria-hidden /> Nuevo servicio
            </Button>
          </div>
        )}
      </div>

      {services.isLoading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[200px] rounded-card" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <Card>
          <EmptyState
            icon={Scissors}
            title="Aún no tienes servicios"
            description="Agrega lo que ofreces, con su duración y precio. Es lo que tus clientes podrán reservar."
            action={
              canManage && (
                <Button variant="primary" size="sm" onClick={() => navigate('/servicios/nuevo')}>
                  <Plus size={13} aria-hidden /> Agregar servicio
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-4 p-0">
          {visible.map((s) => (
            <ServiceCard
              key={s.id}
              service={s}
              category={cats.find((c) => c.id === s.categoryId)}
              canManage={canManage}
              doers={doersOf(s.id)}
            />
          ))}
          {canManage && (
            <li className="flex">
              <AddCard label="Agregar servicio" className="min-h-[200px] flex-1" onClick={() => navigate('/servicios/nuevo')} />
            </li>
          )}
        </ul>
      )}

      <CategoriesModal open={categoriesOpen} onOpenChange={setCategoriesOpen} categories={cats} services={list} />
    </>
  )
}
