import { MessagesSquare } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Avatar } from '@/components/ui/avatar'
import { Tag } from '@/components/ui/badges'
import { Card, CardHeader } from '@/components/ui/card'
import { FilterChips } from '@/components/ui/controls'
import { EmptyState, Skeleton } from '@/components/ui/display'
import { cn } from '@/lib/cn'
import { CATEGORIES, INQUIRY_STATUS, timeAgo, useInquiries } from './api'

/** Clientes / Consultas: lo que los clientes preguntan desde su portal. */
export function InquiriesPage() {
  const [status, setStatus] = useState<'active' | 'resolved'>('active')
  const list = useInquiries(status)
  const items = list.data ?? []

  return (
    <Card>
      <CardHeader
        title="Consultas de clientes"
        actions={
          <FilterChips
            aria-label="Estado"
            value={status}
            onValueChange={setStatus}
            options={[
              { value: 'active', label: `Abiertas${status === 'active' && list.data ? ` · ${items.length}` : ''}` },
              { value: 'resolved', label: 'Resueltas' },
            ]}
          />
        }
      />
      {list.isError ? (
        <p className="m-0 text-sm text-bad">No se pudieron cargar las consultas.</p>
      ) : list.isLoading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title={status === 'active' ? 'No hay consultas por atender' : 'Aún no hay consultas resueltas'}
          description={status === 'active' ? 'Cuando un cliente te escriba desde su portal ("Ayuda"), su consulta aparecerá aquí y le avisaremos por WhatsApp cuando respondas.' : undefined}
        />
      ) : (
        <ul className="m-0 list-none p-0">
          {items.map((t) => {
            const st = INQUIRY_STATUS[t.status]
            return (
              <li key={t.id} className="border-t border-line first:border-t-0">
                <Link to={`/consultas/${t.id}`} className="-mx-2 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-control px-2 py-3 hover:bg-surface-2">
                  <Avatar name={t.client.name} round />
                  <div className="min-w-[220px] flex-1">
                    <div className={cn('flex items-center gap-2 text-ink', t.unread ? 'font-bold' : 'font-semibold')}>
                      {t.unread && <span className="size-2 flex-none rounded-full bg-warn" aria-label="Sin leer" />}
                      <span className="truncate">{t.subject}</span>
                    </div>
                    <div className="truncate text-xs text-muted">
                      {t.client.name} · {CATEGORIES[t.category]} · {t.lastMessageFrom === 'agent' ? 'Tú: ' : ''}
                      {t.lastMessagePreview}
                    </div>
                  </div>
                  <span className="text-xs whitespace-nowrap text-muted">{timeAgo(t.lastMessageAt)}</span>
                  <Tag tone={st.tone}>{st.label}</Tag>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
