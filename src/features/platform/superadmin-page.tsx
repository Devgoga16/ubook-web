import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Building2, CircleAlert, Clock, Search } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Avatar } from '@/components/ui/avatar'
import { Tag, type TagTone } from '@/components/ui/badges'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { PlatformPayments } from '@/features/billing/platform-payments'
import { EmptyState, Skeleton, Table, Td, Th, Tr } from '@/components/ui/display'
import { Input } from '@/components/ui/field'
import { KpiFlat } from '@/components/ui/kpi'
import { BUSINESS_TYPES } from '@/domain/business-types'
import { usePlans } from '@/features/auth/plans'
import { formatDate } from '@/features/clients/api'
import { api } from '@/lib/api/client'
import type { Paginated, PlatformOrganization, SubscriptionStatus } from '@/lib/api/types'

const STATUS: Record<SubscriptionStatus, { label: string; tone: TagTone }> = {
  trialing: { label: 'En prueba', tone: 'teal' },
  active: { label: 'Activo', tone: 'ok' },
  past_due: { label: 'Pago vencido', tone: 'warn' },
  cancelled: { label: 'Cancelado', tone: 'off' },
  expired: { label: 'Vencido', tone: 'bad' },
}

const PAGE_SIZE = 25
const DAY = 86_400_000

function statusLabel(org: PlatformOrganization): { label: string; tone: TagTone } {
  if (org.status === 'suspended') return { label: 'Suspendido', tone: 'bad' }
  const sub = org.subscription
  if (!sub) return { label: 'Sin suscripción', tone: 'off' }
  const base = STATUS[sub.effectiveStatus]
  if (sub.effectiveStatus === 'trialing' && sub.trialEndsAt) {
    const days = Math.max(0, Math.ceil((new Date(sub.trialEndsAt).getTime() - Date.now()) / DAY))
    return { ...base, label: `En prueba · ${days} ${days === 1 ? 'día' : 'días'}` }
  }
  return base
}

/** Negocios de la plataforma (equipo Unify Tec). */
export function SuperadminPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const deferredSearch = useDeferredValue(search.trim())

  const { data, isLoading, isError } = useQuery({
    queryKey: ['platform', 'organizations', deferredSearch, page],
    queryFn: () =>
      api<Paginated<PlatformOrganization>>(
        `/platform/organizations?page=${page}&pageSize=${PAGE_SIZE}${deferredSearch ? `&search=${encodeURIComponent(deferredSearch)}` : ''}`,
      ),
    placeholderData: keepPreviousData,
  })

  const { data: plans } = usePlans()
  const planName = (code: string) => plans?.find((p) => p.code === code)?.name ?? code
  const items = data?.items ?? []
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiFlat icon={Building2} label="Negocios" value={data ? String(data.total) : '—'} />
        <KpiFlat
          icon={Clock}
          label="En prueba (esta página)"
          value={data ? String(items.filter((o) => o.subscription?.effectiveStatus === 'trialing').length) : '—'}
        />
        <KpiFlat
          icon={CircleAlert}
          label="Vencidos (esta página)"
          value={data ? String(items.filter((o) => o.subscription?.effectiveStatus === 'expired').length) : '—'}
        />
      </div>

      <PlatformPayments />

      <Card>
        <CardHeader
          title="Negocios"
          actions={
            <label className="relative">
              <span className="sr-only">Buscar negocio</span>
              <Search size={14} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted" aria-hidden />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder="Buscar por nombre"
                className="w-[240px] pl-8"
              />
            </label>
          }
        />
        {isError ? (
          <p className="m-0 text-sm text-bad">No se pudo cargar la lista.</p>
        ) : isLoading ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon={Building2} title="No hay negocios" description={deferredSearch ? 'Prueba con otro nombre.' : undefined} />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Negocio</Th>
                  <Th>Tipo</Th>
                  <Th>Plan</Th>
                  <Th>Alta</Th>
                  <Th>Estado</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((org) => {
                  const status = statusLabel(org)
                  return (
                    <Tr key={org.id} onClick={() => navigate(`/superadmin/negocios/${org.id}`)}>
                      <Td>
                        <div className="flex items-center gap-2.5 font-semibold">
                          <Avatar name={org.name} size="xs" />
                          <Link to={`/superadmin/negocios/${org.id}`} className="text-ink hover:underline" onClick={(e) => e.stopPropagation()}>
                            {org.name}
                          </Link>
                        </div>
                      </Td>
                      <Td>{BUSINESS_TYPES.find((t) => t.key === org.businessType)?.label ?? '—'}</Td>
                      <Td>{org.subscription ? <Tag>{planName(org.subscription.planCode)}</Tag> : '—'}</Td>
                      <Td className="text-muted">{formatDate(org.createdAt)}</Td>
                      <Td>
                        <Tag tone={status.tone}>{status.label}</Tag>
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
