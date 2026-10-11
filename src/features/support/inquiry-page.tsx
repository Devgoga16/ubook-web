import { CircleCheck, MessageCircle, MessagesSquare, RotateCcw, UserRound } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { Tag } from '@/components/ui/badges'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState, Skeleton } from '@/components/ui/display'
import { BackLink } from '@/components/ui/page'
import { formatPhone } from '@/features/clients/api'
import { useAccess } from '@/lib/auth/access'
import { usePageMeta } from '@/lib/page-meta'
import { CATEGORIES, INQUIRY_STATUS, formatDateTime, uploadAttachment, useInquiry, useInquiryActions } from './api'
import { Composer, Thread } from './ticket-thread'

/** Clientes / Consultas / Detalle: la conversación con el cliente. */
export function InquiryPage() {
  const { id = '' } = useParams<{ id: string }>()
  const { readOnly } = useAccess()
  const inquiry = useInquiry(id)
  const { reply, setStatus } = useInquiryActions(id)
  const t = inquiry.data
  usePageMeta(t ? { title: `Consulta #${t.number}`, crumb: `Clientes / Consultas / #${t.number}` } : null)

  if (inquiry.isLoading) return <Skeleton className="h-[420px] rounded-card" />
  if (!t) {
    return (
      <Card>
        <EmptyState icon={MessagesSquare} title="No encontramos esta consulta" action={<Link to="/consultas" className="text-sm font-semibold text-brand hover:underline">Volver a Consultas</Link>} />
      </Card>
    )
  }

  const st = INQUIRY_STATUS[t.status]
  const resolved = t.status === 'resolved'
  const digits = t.client.phone?.replace(/\D/g, '')

  return (
    <>
      <BackLink to="/consultas" label="Consultas" />
      <Card className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="min-w-[240px] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="m-0 text-lg font-semibold">{t.subject}</h2>
            <Tag tone={st.tone}>{st.label}</Tag>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted">
            <span>
              #{t.number} · {CATEGORIES[t.category]} · {formatDateTime(t.createdAt)}
            </span>
            {t.client.id && (
              <Link to={`/clientes/${t.client.id}`} className="inline-flex items-center gap-1 font-semibold text-ink-2 hover:underline">
                <UserRound size={12} aria-hidden /> {t.client.name}
              </Link>
            )}
            {t.client.phone && <span>{formatPhone(t.client.phone)}</span>}
          </div>
        </div>
        {digits && (
          <a
            href={`https://wa.me/${digits}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-control border border-line-strong bg-surface px-3.5 py-2 text-sm font-semibold text-ink-2 hover:border-teal"
          >
            <MessageCircle size={14} aria-hidden /> WhatsApp
          </a>
        )}
        {!readOnly &&
          (resolved ? (
            <Button disabled={setStatus.isPending} onClick={() => setStatus.mutate('open')}>
              <RotateCcw size={14} aria-hidden /> Reabrir
            </Button>
          ) : (
            <Button variant="primary" disabled={setStatus.isPending} onClick={() => setStatus.mutate('resolved')}>
              <CircleCheck size={14} aria-hidden /> Marcar resuelta
            </Button>
          ))}
      </Card>

      <Card className="flex flex-col gap-5">
        <Thread messages={t.messages} viewer="agent" />
        {resolved && (
          <p className="m-0 rounded-control bg-ok-bg px-3 py-2 text-sm text-ok">
            <b>Consulta resuelta{t.resolvedAt ? ` el ${formatDateTime(t.resolvedAt)}` : ''}.</b> Si el cliente vuelve a escribir, se reabre sola.
          </p>
        )}
        {!readOnly && (
          <Composer
            allowInternal
            placeholder={`Responde a ${t.client.name.split(' ')[0]}… Le avisamos por WhatsApp.`}
            upload={(file) => uploadAttachment(file)}
            onSend={(message) => reply.mutateAsync(message)}
          />
        )}
      </Card>
    </>
  )
}
