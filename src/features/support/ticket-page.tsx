import { CircleCheck, LifeBuoy } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { Tag } from '@/components/ui/badges'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState, Skeleton } from '@/components/ui/display'
import { BackLink } from '@/components/ui/page'
import { useAuth } from '@/lib/auth/auth-context'
import { usePageMeta } from '@/lib/page-meta'
import { CATEGORIES, CUSTOMER_STATUS, formatDateTime, uploadAttachment, useTicket, useTicketActions } from './api'
import { Composer, Thread } from './ticket-thread'

/** Ayuda y soporte / Ticket: la conversación con el equipo de uBook. */
export function TicketPage() {
  const { id = '' } = useParams<{ id: string }>()
  const { me } = useAuth()
  const ticket = useTicket(id)
  const { reply, resolve } = useTicketActions()
  const t = ticket.data
  const agentView = !!me?.context.supportView
  usePageMeta(t ? { title: `Ticket #${t.number}`, crumb: `Ayuda / Soporte / #${t.number}` } : null)

  if (ticket.isLoading) return <Skeleton className="h-[420px] rounded-card" />
  if (!t) {
    return (
      <Card>
        <EmptyState icon={LifeBuoy} title="No encontramos este ticket" action={<Link to="/soporte" className="text-sm font-semibold text-brand hover:underline">Volver a Ayuda y soporte</Link>} />
      </Card>
    )
  }

  const status = CUSTOMER_STATUS[t.status]
  const resolved = t.status === 'resolved'

  return (
    <>
      <BackLink to="/soporte" label="Ayuda y soporte" />
      <Card className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-[240px] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="m-0 text-lg font-semibold">{t.subject}</h2>
            <Tag tone={status.tone}>{status.label}</Tag>
          </div>
          <div className="mt-1 text-xs text-muted">
            #{t.number} · {CATEGORIES[t.category]} · abierto por {t.createdBy.name} el {formatDateTime(t.createdAt)}
            {t.assignedTo && ` · te atiende ${t.assignedTo}`}
          </div>
        </div>
        {!resolved && !agentView && (
          <Button disabled={resolve.isPending} onClick={() => window.confirm('¿Marcar el ticket como resuelto?') && resolve.mutate(t.id)}>
            <CircleCheck size={14} aria-hidden /> Ya quedó resuelto
          </Button>
        )}
      </Card>

      <Card className="flex flex-col gap-5">
        <Thread messages={t.messages} viewer="customer" />
        {resolved && (
          <p className="m-0 rounded-control bg-ok-bg px-3 py-2 text-sm text-ok">
            <b>Ticket resuelto{t.resolvedAt ? ` el ${formatDateTime(t.resolvedAt)}` : ''}.</b> Si el problema sigue, escribe aquí abajo y lo reabrimos.
          </p>
        )}
        {!agentView && (
          <Composer
            placeholder={resolved ? 'Escribe para reabrir el ticket…' : 'Escribe tu respuesta…'}
            upload={(file) => uploadAttachment(file)}
            onSend={(message) => reply.mutateAsync({ id: t.id, ...message })}
          />
        )}
      </Card>
    </>
  )
}
