import { CircleAlert, Inbox, LifeBuoy, Search, UserCheck, UserX } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Tag } from '@/components/ui/badges'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { FilterChips } from '@/components/ui/controls'
import { EmptyState, Skeleton, Table, Td, Th, Tr } from '@/components/ui/display'
import { Input } from '@/components/ui/field'
import { KpiFlat } from '@/components/ui/kpi'
import { cn } from '@/lib/cn'
import { AGENT_STATUS, CATEGORIES, PRIORITIES, timeAgo, usePlatformTickets, useSupportSummary, type PlatformTicketFilters } from './api'

type Queue = 'active' | 'mine' | 'unassigned' | 'waiting' | 'resolved'

const QUEUES: Record<Queue, Pick<PlatformTicketFilters, 'status' | 'assignee'>> = {
  active: { status: 'active', assignee: 'all' },
  mine: { status: 'active', assignee: 'me' },
  unassigned: { status: 'active', assignee: 'none' },
  waiting: { status: 'waiting_customer', assignee: 'all' },
  resolved: { status: 'resolved', assignee: 'all' },
}

/** Bandeja de soporte del equipo de Unify Tec. */
export function PlatformSupportPage() {
  const navigate = useNavigate()
  // ?negocio=<id> llega desde la ficha de un negocio.
  const [params, setParams] = useSearchParams()
  const organizationId = params.get('negocio') ?? undefined
  const [queue, setQueue] = useState<Queue>('active')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const deferredSearch = useDeferredValue(search.trim())

  const summary = useSupportSummary()
  const list = usePlatformTickets({ ...QUEUES[queue], search: deferredSearch, organizationId, page })
  const items = list.data?.items ?? []
  const pages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.pageSize)) : 1
  const s = summary.data
  const pick = (q: Queue) => {
    setQueue(q)
    setPage(1)
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiFlat icon={Inbox} label="Por atender" value={s ? String(s.open) : '—'} />
        <KpiFlat icon={UserX} label="Sin asignar" value={s ? String(s.unassigned) : '—'} />
        <KpiFlat icon={UserCheck} label="Asignados a mí" value={s ? String(s.mine) : '—'} />
        <KpiFlat icon={CircleAlert} label="Prioridad alta o urgente" value={s ? String(s.urgent) : '—'} />
      </div>

      <Card>
        <CardHeader
          title="Tickets"
          actions={
            <label className="relative">
              <span className="sr-only">Buscar ticket</span>
              <Search size={14} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted" aria-hidden />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder="Buscar por asunto o #número"
                className="w-[250px] pl-8"
              />
            </label>
          }
        />
        <div className="mb-3 flex flex-wrap items-center gap-2.5">
          <FilterChips
            aria-label="Bandeja"
            value={queue}
            onValueChange={pick}
            options={[
              { value: 'active', label: 'Abiertos' },
              { value: 'mine', label: `Míos${s ? ` · ${s.mine}` : ''}` },
              { value: 'unassigned', label: `Sin asignar${s ? ` · ${s.unassigned}` : ''}` },
              { value: 'waiting', label: 'Esperando al negocio' },
              { value: 'resolved', label: 'Resueltos' },
            ]}
          />
          {organizationId && (
            <Button size="sm" variant="ghost" onClick={() => setParams({}, { replace: true })}>
              Solo un negocio · quitar filtro
            </Button>
          )}
        </div>

        {list.isError ? (
          <p className="m-0 text-sm text-bad">No se pudo cargar la bandeja.</p>
        ) : list.isLoading ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-11" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon={LifeBuoy} title="No hay tickets aquí" description={deferredSearch ? 'Prueba con otra búsqueda.' : queue === 'active' ? 'Todo al día: ningún negocio está esperando respuesta.' : undefined} />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Ticket</Th>
                  <Th>Negocio</Th>
                  <Th>Estado</Th>
                  <Th>Prioridad</Th>
                  <Th>A cargo</Th>
                  <Th>Último mensaje</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((t) => {
                  const status = AGENT_STATUS[t.status]
                  const priority = PRIORITIES[t.priority]
                  return (
                    <Tr key={t.id} onClick={() => navigate(`/superadmin/soporte/${t.id}`)}>
                      <Td className="max-w-[340px] whitespace-normal">
                        <Link to={`/superadmin/soporte/${t.id}`} onClick={(e) => e.stopPropagation()} className={cn('flex items-center gap-2 text-ink hover:underline', t.unread ? 'font-bold' : 'font-semibold')}>
                          {t.unread && <span className="size-2 flex-none rounded-full bg-warn" aria-label="Con novedades" />}
                          <span className="line-clamp-1">{t.subject}</span>
                        </Link>
                        <div className="line-clamp-1 text-xs text-muted">
                          #{t.number} · {CATEGORIES[t.category]} · {t.createdBy.name}
                          {t.fromClient && ' (cliente final)'}
                        </div>
                      </Td>
                      <Td>{t.organization?.name ?? 'Negocio eliminado'}</Td>
                      <Td>
                        <Tag tone={status.tone}>{status.label}</Tag>
                      </Td>
                      <Td>{t.priority === 'normal' ? <span className="text-muted">Normal</span> : <Tag tone={priority.tone}>{priority.label}</Tag>}</Td>
                      <Td className={t.assignedTo ? undefined : 'text-muted'}>{t.assignedTo?.name ?? 'Sin asignar'}</Td>
                      <Td className="text-muted">
                        {t.lastMessageFrom === 'customer' ? 'Negocio' : 'Soporte'} · {timeAgo(t.lastMessageAt)}
                      </Td>
                    </Tr>
                  )
                })}
              </tbody>
            </Table>
            {pages > 1 && (
              <div className="mt-3 flex items-center justify-end gap-2 text-sm">
                <Button size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Anterior
                </Button>
                <span className="text-muted">
                  {page} / {pages}
                </span>
                <Button size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                  Siguiente
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </>
  )
}
