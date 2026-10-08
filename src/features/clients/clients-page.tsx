import { CalendarCheck, ChevronLeft, ChevronRight, Plus, Search, Sparkles, TriangleAlert, Users } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Avatar } from '@/components/ui/avatar'
import { Tag } from '@/components/ui/badges'
import { Button, IconButton } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FilterChips } from '@/components/ui/controls'
import { EmptyState, Skeleton, Table, Td, Th, Tr } from '@/components/ui/display'
import { Input } from '@/components/ui/field'
import { KpiFlat } from '@/components/ui/kpi'
import type { ClientSegment } from '@/lib/api/types'
import { useAccess } from '@/lib/auth/access'
import { formatCents } from '@/lib/format'
import { formatDate, formatPhone, fullName, useClientDirectory, useClientSummary } from './api'

const SEGMENTS: ClientSegment[] = ['all', 'new', 'upcoming', 'at_risk', 'vip']

/** Clientes: indicadores, segmentos, búsqueda y la lista paginada. */
export function ClientsPage() {
  const navigate = useNavigate()
  const { can, readOnly } = useAccess()
  const [params, setParams] = useSearchParams()
  const segment = SEGMENTS.includes(params.get('segmento') as ClientSegment) ? (params.get('segmento') as ClientSegment) : 'all'
  const page = Math.max(1, Number(params.get('pagina')) || 1)
  const [search, setSearch] = useState('')
  const deferred = useDeferredValue(search)

  const summary = useClientSummary()
  const directory = useClientDirectory({ search: deferred, segment, page })
  const s = summary.data
  const data = directory.data
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  const update = (next: { segmento?: ClientSegment; pagina?: number }) => {
    const p = new URLSearchParams(params)
    if (next.segmento) p.set('segmento', next.segmento)
    if (next.segmento === 'all') p.delete('segmento')
    p.set('pagina', String(next.pagina ?? 1))
    if ((next.pagina ?? 1) === 1) p.delete('pagina')
    setParams(p, { replace: true })
  }

  const count = (n: number | undefined) => (n === undefined ? '' : ` · ${n}`)
  const canCreate = can('client.create') && !readOnly

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiFlat icon={Users} label="Clientes" value={s ? String(s.total) : '—'} />
        <KpiFlat icon={Sparkles} label="Nuevos (30 días)" value={s ? String(s.new) : '—'} />
        <KpiFlat icon={CalendarCheck} label="Con cita próxima" value={s ? String(s.upcoming) : '—'} />
        <KpiFlat icon={TriangleAlert} label="Por recuperar" value={s ? String(s.atRisk) : '—'} />
      </div>

      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-[220px] flex-1 sm:max-w-[340px]">
            <span className="sr-only">Buscar cliente</span>
            <Search size={15} aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted" />
            <Input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                if (page !== 1) update({ segmento: segment })
              }}
              placeholder="Nombre, celular o DNI"
              className="pl-8"
            />
          </label>
          {canCreate && (
            <Button variant="primary" className="ml-auto" onClick={() => navigate('/clientes/nuevo')}>
              <Plus size={14} aria-hidden /> Nuevo cliente
            </Button>
          )}
        </div>

        <FilterChips
          aria-label="Segmento"
          value={segment}
          onValueChange={(v) => update({ segmento: v })}
          options={[
            { value: 'all', label: `Todos${count(s?.total)}` },
            { value: 'new', label: `Nuevos${count(s?.new)}` },
            { value: 'upcoming', label: `Con cita${count(s?.upcoming)}` },
            { value: 'at_risk', label: `Por recuperar${count(s?.atRisk)}` },
            { value: 'vip', label: `VIP${count(s?.vip)}` },
          ]}
        />
        {segment === 'at_risk' && (
          <p className="m-0 text-xs text-muted">Vinieron alguna vez, pero no en los últimos 45 días y no tienen cita agendada.</p>
        )}

        {directory.isError ? (
          <p className="m-0 text-sm text-bad">No se pudo cargar la lista. Recarga la página.</p>
        ) : directory.isLoading ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-11" />
            ))}
          </div>
        ) : !data || data.items.length === 0 ? (
          s?.total === 0 && !deferred ? (
            <EmptyState
              icon={Users}
              title="Aún no tienes clientes"
              description="Se registran solos al agendar una cita, o puedes agregarlos aquí con sus datos de contacto."
              action={
                canCreate && (
                  <Button variant="primary" size="sm" onClick={() => navigate('/clientes/nuevo')}>
                    <Plus size={13} aria-hidden /> Agregar cliente
                  </Button>
                )
              }
            />
          ) : (
            <p className="m-0 py-8 text-center text-sm text-muted">
              {deferred ? `Nadie coincide con "${deferred}".` : 'No hay clientes en este segmento.'}
            </p>
          )
        ) : (
          <>
            <Table aria-busy={directory.isFetching} className={directory.isPlaceholderData ? 'opacity-60' : undefined}>
              <thead>
                <tr>
                  <Th>Cliente</Th>
                  <Th className="hidden text-right sm:table-cell">Visitas</Th>
                  <Th className="hidden md:table-cell">Última visita</Th>
                  <Th>Próxima cita</Th>
                  <Th className="hidden text-right lg:table-cell">Gastado</Th>
                  <Th className="hidden lg:table-cell">Etiquetas</Th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((c) => (
                  <Tr key={c.id} onClick={() => navigate(`/clientes/${c.id}`)}>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={fullName(c)} size="md" round />
                        <div className="min-w-0">
                          <a
                            href={`/clientes/${c.id}`}
                            onClick={(e) => {
                              e.preventDefault()
                              navigate(`/clientes/${c.id}`)
                            }}
                            className="font-semibold text-ink hover:underline"
                          >
                            {fullName(c)}
                          </a>
                          <div className="text-2xs text-muted">{formatPhone(c.phone) || c.email || 'Sin contacto'}</div>
                        </div>
                      </div>
                    </Td>
                    <Td className="hidden text-right sm:table-cell">
                      {c.stats.visits}
                      {c.stats.noShows > 0 && (
                        <span className="ml-1.5 text-2xs font-semibold text-bad" title="No asistió">
                          · {c.stats.noShows} faltas
                        </span>
                      )}
                    </Td>
                    <Td className="hidden text-ink-2 md:table-cell">{formatDate(c.stats.lastVisit)}</Td>
                    <Td>{c.stats.nextAppointment ? <Tag tone="teal">{formatDate(c.stats.nextAppointment)}</Tag> : <span className="text-muted">—</span>}</Td>
                    <Td className="hidden text-right lg:table-cell">{c.stats.spent ? formatCents(c.stats.spent) : '—'}</Td>
                    <Td className="hidden lg:table-cell">
                      <div className="flex gap-1">
                        {c.tags.slice(0, 3).map((t) => (
                          <Tag key={t} tone={t.toLowerCase() === 'vip' ? 'brand' : 'off'}>
                            {t}
                          </Tag>
                        ))}
                      </div>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>

            <div className="flex items-center justify-between gap-3 text-xs text-muted">
              <span>
                {(data.page - 1) * data.pageSize + 1}–{(data.page - 1) * data.pageSize + data.items.length} de {data.total}
              </span>
              {pages > 1 && (
                <div className="flex items-center gap-1">
                  <IconButton aria-label="Página anterior" disabled={page <= 1} onClick={() => update({ segmento: segment, pagina: page - 1 })}>
                    <ChevronLeft size={16} aria-hidden />
                  </IconButton>
                  <span className="tabular px-1">
                    {page} / {pages}
                  </span>
                  <IconButton aria-label="Página siguiente" disabled={page >= pages} onClick={() => update({ segmento: segment, pagina: page + 1 })}>
                    <ChevronRight size={16} aria-hidden />
                  </IconButton>
                </div>
              )}
            </div>
          </>
        )}
      </Card>
    </>
  )
}
