import { Building2, CircleCheck, LifeBuoy, RotateCcw, UserCheck } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { Tag } from '@/components/ui/badges'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { EmptyState, Skeleton } from '@/components/ui/display'
import { Field, Select } from '@/components/ui/field'
import { BackLink } from '@/components/ui/page'
import { usePlans } from '@/features/auth/plans'
import { errorMessage } from '@/lib/api/client'
import { useAuth } from '@/lib/auth/auth-context'
import { usePageMeta } from '@/lib/page-meta'
import {
  AGENT_STATUS,
  CATEGORIES,
  PRIORITIES,
  formatDateTime,
  uploadAttachment,
  usePlatformAgents,
  usePlatformTicket,
  usePlatformTicketActions,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from './api'
import { SupportViewButton } from './support-view'
import { Composer, Thread } from './ticket-thread'

const SUBSCRIPTION: Record<string, string> = { trialing: 'En prueba', active: 'Activa', past_due: 'Pago vencido', cancelled: 'Cancelada', expired: 'Vencida' }

/** "Chrome 141 · Windows" a partir del user agent, para leerlo de un vistazo. */
const BROWSERS: Array<[RegExp, string]> = [
  [/Edg\/(\d+)/, 'Edge'],
  [/OPR\/(\d+)/, 'Opera'],
  [/Chrome\/(\d+)/, 'Chrome'],
  [/Firefox\/(\d+)/, 'Firefox'],
  [/Version\/(\d+).*Safari/, 'Safari'],
]

function describeBrowser(ua: string): string {
  if (!ua) return '—'
  let browser = 'Navegador'
  for (const [pattern, name] of BROWSERS) {
    const match = pattern.exec(ua)
    if (match) {
      browser = `${name} ${match[1]}`
      break
    }
  }
  const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : ''
  return os ? `${browser} · ${os}` : browser
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-2xs font-semibold text-muted">{label}</dt>
      <dd className="m-0 break-words">{children}</dd>
    </div>
  )
}

/** Soporte / Ticket: conversación, notas internas y gestión del ticket. */
export function PlatformTicketPage() {
  const { id = '' } = useParams<{ id: string }>()
  const { me } = useAuth()
  const ticket = usePlatformTicket(id)
  const agents = usePlatformAgents()
  const { data: plans } = usePlans()
  const { reply, update } = usePlatformTicketActions(id)
  const [error, setError] = useState<string | null>(null)
  const t = ticket.data
  usePageMeta(t ? { title: `Ticket #${t.number}`, crumb: `Unify Tec / Soporte / #${t.number}` } : null)

  if (ticket.isLoading) return <Skeleton className="h-[420px] rounded-card" />
  if (!t) {
    return (
      <Card>
        <EmptyState icon={LifeBuoy} title="No encontramos este ticket" action={<Link to="/superadmin/soporte" className="text-sm font-semibold text-brand hover:underline">Volver a Soporte</Link>} />
      </Card>
    )
  }

  const status = AGENT_STATUS[t.status]
  const resolved = t.status === 'resolved'
  const mine = t.assignedTo?.userId === me?.user.id
  const change = (body: Parameters<typeof update.mutate>[0]) => {
    setError(null)
    update.mutate(body, { onError: (e) => setError(errorMessage(e)) })
  }
  const planName = t.subscription ? (plans?.find((p) => p.code === t.subscription!.planCode)?.name ?? t.subscription.planCode) : null

  return (
    <>
      <BackLink to="/superadmin/soporte" label="Soporte" />
      <Card className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-[240px] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="m-0 text-lg font-semibold">{t.subject}</h2>
            <Tag tone={status.tone}>{status.label}</Tag>
            {t.priority !== 'normal' && <Tag tone={PRIORITIES[t.priority].tone}>Prioridad {PRIORITIES[t.priority].label.toLowerCase()}</Tag>}
            {t.fromClient && <Tag tone="off">Cliente final</Tag>}
          </div>
          <div className="mt-1 text-xs text-muted">
            #{t.number} · {t.organization?.name ?? 'Negocio eliminado'} · abierto por {t.createdBy.name} el {formatDateTime(t.createdAt)}
          </div>
        </div>
        {!mine && !resolved && (
          <Button disabled={update.isPending} onClick={() => change({ assignedToUserId: me!.user.id, ...(t.status === 'open' && { status: 'in_progress' as const }) })}>
            <UserCheck size={14} aria-hidden /> Tomar ticket
          </Button>
        )}
        {resolved ? (
          <Button disabled={update.isPending} onClick={() => change({ status: 'open' })}>
            <RotateCcw size={14} aria-hidden /> Reabrir
          </Button>
        ) : (
          <Button variant="primary" disabled={update.isPending} onClick={() => window.confirm('¿Marcar el ticket como resuelto? El negocio verá que quedó cerrado.') && change({ status: 'resolved' })}>
            <CircleCheck size={14} aria-hidden /> Marcar resuelto
          </Button>
        )}
      </Card>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="flex flex-col gap-5">
          <Thread messages={t.messages} viewer="agent" />
          <Composer
            allowInternal
            placeholder="Responde al negocio…"
            upload={(file) => uploadAttachment(file, t.id)}
            onSend={(message) => reply.mutateAsync(message)}
          />
        </Card>

        <div className="flex min-w-0 flex-col gap-5">
          <Card>
            <CardHeader title="Gestión" />
            <div className="flex flex-col gap-3">
              {error && (
                <p role="alert" className="m-0 text-xs font-semibold text-bad">
                  {error}
                </p>
              )}
              <Field label="Estado">
                {(p) => (
                  <Select {...p} value={t.status} disabled={update.isPending} onChange={(e) => change({ status: e.target.value as TicketStatus })}>
                    {(Object.keys(AGENT_STATUS) as TicketStatus[]).map((k) => (
                      <option key={k} value={k}>
                        {AGENT_STATUS[k].label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="A cargo">
                {(p) => (
                  <Select {...p} value={t.assignedTo?.userId ?? ''} disabled={update.isPending} onChange={(e) => change({ assignedToUserId: e.target.value || null })}>
                    <option value="">Sin asignar</option>
                    {/* Quien lo tenía puede ya no estar activo en el equipo. */}
                    {t.assignedTo && !agents.data?.some((a) => a.id === t.assignedTo!.userId) && <option value={t.assignedTo.userId}>{t.assignedTo.name}</option>}
                    {(agents.data ?? []).map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                        {a.id === me?.user.id ? ' (yo)' : ''}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Prioridad">
                {(p) => (
                  <Select {...p} value={t.priority} disabled={update.isPending} onChange={(e) => change({ priority: e.target.value as TicketPriority })}>
                    {(Object.keys(PRIORITIES) as TicketPriority[]).map((k) => (
                      <option key={k} value={k}>
                        {PRIORITIES[k].label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Tipo">
                {(p) => (
                  <Select {...p} value={t.category} disabled={update.isPending} onChange={(e) => change({ category: e.target.value as TicketCategory })}>
                    {(Object.keys(CATEGORIES) as TicketCategory[]).map((k) => (
                      <option key={k} value={k}>
                        {CATEGORIES[k]}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader title="Negocio" />
            {t.organization ? (
              <div className="flex flex-col gap-3">
                <dl className="m-0 flex flex-col gap-2 text-sm">
                  <Row label="Negocio">
                    <Link to={`/superadmin/negocios/${t.organization.id}`} className="inline-flex items-center gap-1.5 font-semibold text-ink hover:underline">
                      <Building2 size={13} aria-hidden /> {t.organization.name}
                    </Link>
                    {t.organization.status === 'suspended' && <Tag tone="bad" className="ml-2">Suspendido</Tag>}
                  </Row>
                  {t.subscription && (
                    <Row label="Plan">
                      {planName} · {SUBSCRIPTION[t.subscription.effectiveStatus] ?? t.subscription.effectiveStatus}
                    </Row>
                  )}
                  <Row label={t.fromClient ? 'Cliente del negocio que reporta' : 'Quien reporta'}>
                    {t.createdBy.name}
                    {t.createdBy.email && (
                      <>
                        <br />
                        <a href={`mailto:${t.createdBy.email}`} className="text-brand hover:underline">
                          {t.createdBy.email}
                        </a>
                      </>
                    )}
                    {t.createdBy.phone && (
                      <>
                        <br />
                        {t.createdBy.phone}
                      </>
                    )}
                  </Row>
                </dl>
                <SupportViewButton organizationId={t.organization.id} organizationName={t.organization.name} ticketId={t.id} />
                <Link to={`/superadmin/soporte?negocio=${t.organization.id}`} className="text-xs font-semibold text-brand hover:underline">
                  Ver todos los tickets de este negocio
                </Link>
              </div>
            ) : (
              <p className="m-0 text-sm text-muted">El negocio ya no existe.</p>
            )}
          </Card>

          <Card>
            <CardHeader title="Contexto técnico" />
            <dl className="m-0 flex flex-col gap-2 text-sm">
              <Row label="Pantalla donde estaba">{t.context.path ? <code className="text-xs">{t.context.path}</code> : '—'}</Row>
              <Row label="Navegador">
                <span title={t.context.userAgent}>{describeBrowser(t.context.userAgent)}</span>
              </Row>
              <Row label="Tamaño de ventana">{t.context.viewport || '—'}</Row>
            </dl>
          </Card>
        </div>
      </div>
    </>
  )
}
