import { LifeBuoy, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Tag } from '@/components/ui/badges'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { FilterChips } from '@/components/ui/controls'
import { EmptyState, Skeleton } from '@/components/ui/display'
import { useAuth } from '@/lib/auth/auth-context'
import { cn } from '@/lib/cn'
import { CATEGORIES, CUSTOMER_STATUS, timeAgo, useTickets } from './api'

type Filter = 'active' | 'resolved'

/** Ayuda y soporte: los tickets que el negocio abrió con el equipo de uBook. */
export function SupportPage() {
  const navigate = useNavigate()
  const { me } = useAuth()
  const tickets = useTickets()
  const [filter, setFilter] = useState<Filter>('active')
  const agentView = !!me?.context.supportView

  const all = tickets.data?.items ?? []
  const active = all.filter((t) => t.status !== 'resolved')
  const items = filter === 'active' ? active : all.filter((t) => t.status === 'resolved')

  return (
    <Card>
      <CardHeader
        title={tickets.data?.canSeeAll ? 'Tickets del negocio' : 'Mis tickets'}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <FilterChips
              aria-label="Estado"
              value={filter}
              onValueChange={setFilter}
              options={[
                { value: 'active', label: `Abiertos${tickets.data ? ` · ${active.length}` : ''}` },
                { value: 'resolved', label: 'Resueltos' },
              ]}
            />
            {!agentView && (
              <Button variant="primary" onClick={() => navigate('/soporte/nuevo')}>
                <Plus size={14} aria-hidden /> Nuevo ticket
              </Button>
            )}
          </div>
        }
      />
      {tickets.isError ? (
        <p className="m-0 text-sm text-bad">No se pudieron cargar los tickets.</p>
      ) : tickets.isLoading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={LifeBuoy}
          title={filter === 'active' ? '¿Necesitas ayuda?' : 'Aún no hay tickets resueltos'}
          description={filter === 'active' ? 'Cuéntanos qué pasó o qué duda tienes. Te responde una persona del equipo de uBook, aquí mismo y por correo.' : undefined}
          action={
            filter === 'active' && !agentView ? (
              <Button variant="primary" onClick={() => navigate('/soporte/nuevo')}>
                <Plus size={14} aria-hidden /> Escribir a soporte
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="m-0 list-none p-0">
          {items.map((t) => {
            const status = CUSTOMER_STATUS[t.status]
            return (
              <li key={t.id} className="border-t border-line first:border-t-0">
                <Link to={`/soporte/${t.id}`} className="-mx-2 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-control px-2 py-3 hover:bg-surface-2">
                  <div className="min-w-[220px] flex-1">
                    <div className={cn('flex items-center gap-2 text-ink', t.unread ? 'font-bold' : 'font-semibold')}>
                      {t.unread && <span className="size-2 flex-none rounded-full bg-warn" aria-label="Respuesta sin leer" />}
                      <span className="truncate">{t.subject}</span>
                    </div>
                    <div className="truncate text-xs text-muted">
                      #{t.number} · {CATEGORIES[t.category]}
                      {tickets.data?.canSeeAll && ` · ${t.createdBy.name}`} · {t.lastMessageFrom === 'agent' ? 'Soporte: ' : ''}
                      {t.lastMessagePreview}
                    </div>
                  </div>
                  <span className="text-xs whitespace-nowrap text-muted">{timeAgo(t.lastMessageAt)}</span>
                  <Tag tone={status.tone}>{status.label}</Tag>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
