import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CalendarDays, CircleCheck, CircleHelp, LifeBuoy, MessageCircle, Phone, Plus, Receipt, Sparkles, Wrench, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Tag, type TagTone } from '@/components/ui/badges'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { EmptyState, Skeleton } from '@/components/ui/display'
import { Field, Input, Textarea } from '@/components/ui/field'
import { formatDateTime, timeAgo, type MessageInput, type TicketMessage, type TicketStatus } from '@/features/support/api'
import { Composer, pastedImages, ShotButton, ShotList, Thread, useShots } from '@/features/support/ticket-thread'
import { api, errorMessage } from '@/lib/api/client'
import type { PublicBusiness } from '@/lib/api/types'
import { cn } from '@/lib/cn'
import { portalHeaders } from './api'

type Topic = 'appointment' | 'payment' | 'service' | 'other' | 'technical'

/** A quién le llega cada tema: al negocio o al soporte técnico de uBook. */
const TOPICS: Array<{ value: Topic; label: string; hint: string; icon: LucideIcon }> = [
  { value: 'appointment', label: 'Una cita', hint: 'Cambios, retrasos, dudas sobre mi reserva', icon: CalendarDays },
  { value: 'payment', label: 'Pagos y adelantos', hint: 'Mi comprobante, un cobro, una devolución', icon: Receipt },
  { value: 'service', label: 'El servicio', hint: 'Precios, qué incluye, recomendaciones', icon: Sparkles },
  { value: 'other', label: 'Otra consulta', hint: 'Cualquier otra cosa para el negocio', icon: CircleHelp },
  { value: 'technical', label: 'Problema con la página', hint: 'No carga, un error, no me llega el código', icon: Wrench },
]

const CATEGORY_LABEL: Record<string, string> = { appointment: 'Una cita', payment: 'Pagos y adelantos', service: 'El servicio', other: 'Otra consulta', bug: 'Problema con la página' }

const STATUS: Record<TicketStatus, { label: string; tone: TagTone }> = {
  open: { label: 'Enviada', tone: 'teal' },
  in_progress: { label: 'En revisión', tone: 'brand' },
  waiting_customer: { label: 'Te respondieron', tone: 'warn' },
  resolved: { label: 'Resuelta', tone: 'ok' },
}

interface HelpTicket {
  id: string
  number: number
  subject: string
  category: string
  audience: 'business' | 'platform'
  status: TicketStatus
  lastMessageAt: string
  lastMessagePreview: string
  lastMessageFrom: 'customer' | 'agent'
  unread: boolean
  resolvedAt: string | null
  createdAt: string
}
type HelpDetail = HelpTicket & { messages: TicketMessage[] }

const base = (slug: string) => `/public/businesses/${slug}/portal/help`
const opts = (token: string) => ({ headers: portalHeaders(token), skipRefresh: true })

export function usePortalHelp(slug: string, token: string | null) {
  return useQuery({
    queryKey: ['portal', slug, 'help', token],
    queryFn: () => api<{ unread: number; items: HelpTicket[] }>(base(slug), opts(token!)),
    enabled: !!token,
    retry: false,
    refetchInterval: 60_000,
  })
}

function uploadShot(slug: string, token: string, file: File): Promise<string> {
  const body = new FormData()
  body.append('file', file)
  return api<{ key: string }>(`${base(slug)}/attachments`, { method: 'POST', body, ...opts(token) }).then((r) => r.key)
}

const answeredBy = (t: Pick<HelpTicket, 'audience'>, businessName: string) => (t.audience === 'business' ? businessName : 'Soporte técnico de uBook')

/** Formulario de una consulta nueva. */
function NewInquiry({ slug, token, business, onCreated }: { slug: string; token: string; business: PublicBusiness; onCreated: (id: string) => void }) {
  const qc = useQueryClient()
  const shots = useShots((file) => uploadShot(slug, token, file))
  const [topic, setTopic] = useState<Topic | null>(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const create = useMutation({
    mutationFn: (input: { topic: Topic; subject: string; body: string; attachments: string[]; context: { path: string; userAgent: string; viewport: string } }) =>
      api<HelpDetail>(base(slug), { method: 'POST', body: input, ...opts(token) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal', slug, 'help'] }),
  })

  const submit = async () => {
    setError(null)
    if (!topic) return setError('Elige sobre qué es tu consulta')
    if (subject.trim().length < 4) return setError('Escribe un asunto corto')
    if (body.trim().length < 5) return setError('Cuéntanos un poco más')
    try {
      const created = await create.mutateAsync({
        topic,
        subject: subject.trim(),
        body: body.trim(),
        attachments: shots.keys,
        context: { path: document.referrer ? new URL(document.referrer).pathname : '', userAgent: navigator.userAgent.slice(0, 300), viewport: `${window.innerWidth}x${window.innerHeight}` },
      })
      onCreated(created.id)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <Card>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <div>
          <h2 className="m-0 text-lg font-semibold">¿En qué te ayudamos?</h2>
          <p className="mt-1 mb-0 text-sm text-muted">Elige el tema y te responde quien puede resolverlo. Te avisamos por WhatsApp cuando haya respuesta.</p>
        </div>
        <div role="radiogroup" aria-label="Tema de la consulta" className="grid gap-2 sm:grid-cols-2">
          {TOPICS.map(({ value, label, hint, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={topic === value}
              onClick={() => setTopic(value)}
              className={cn('flex cursor-pointer items-center gap-3 rounded-[14px] border p-3 text-left', topic === value ? 'border-teal bg-teal-soft' : 'border-line-strong hover:border-teal')}
            >
              <span className="grid size-9 flex-none place-items-center rounded-full bg-brand-soft text-brand">
                <Icon size={16} aria-hidden />
              </span>
              <span className="min-w-0">
                <b className="block text-sm font-semibold text-ink">{label}</b>
                <span className="block text-xs text-muted">{hint}</span>
              </span>
            </button>
          ))}
        </div>
        {topic && (
          <p className="m-0 rounded-control bg-surface-2 px-3 py-2 text-xs text-ink-2">
            {topic === 'technical' ? (
              <>
                Te responde el <b>soporte técnico de uBook</b>, la plataforma de reservas que usa {business.name}. Una captura de pantalla ayuda mucho.
              </>
            ) : (
              <>
                Te responde el equipo de <b>{business.name}</b>.
              </>
            )}
          </p>
        )}
        <Field label="Asunto">{(p) => <Input {...p} value={subject} maxLength={140} onChange={(e) => setSubject(e.target.value)} placeholder={topic === 'technical' ? 'Ej.: No carga el calendario' : 'Ej.: ¿Puedo llegar 10 minutos tarde?'} />}</Field>
        <Field label="Tu consulta">
          {(p) => (
            <Textarea
              {...p}
              rows={5}
              value={body}
              maxLength={5000}
              onChange={(e) => setBody(e.target.value)}
              onPaste={(e) => {
                const images = pastedImages(e)
                if (images.length) {
                  e.preventDefault()
                  void shots.add(images)
                }
              }}
            />
          )}
        </Field>
        <div className="flex flex-col gap-2">
          <ShotList shots={shots} />
          <div>
            <ShotButton shots={shots} />
          </div>
        </div>
        {error && (
          <p role="alert" className="m-0 text-sm font-semibold text-bad">
            {error}
          </p>
        )}
        <div className="flex gap-2.5">
          <Button type="submit" variant="primary" disabled={create.isPending || shots.uploading}>
            {create.isPending ? 'Enviando…' : 'Enviar consulta'}
          </Button>
          <Link to="?tab=ayuda" className="inline-flex items-center rounded-control border border-line-strong bg-surface px-3.5 py-2 text-sm font-semibold text-ink-2 no-underline hover:border-teal">
            Cancelar
          </Link>
        </div>
      </form>
    </Card>
  )
}

/** Conversación de una consulta. */
function InquiryThread({ slug, token, id, business }: { slug: string; token: string; id: string; business: PublicBusiness }) {
  const qc = useQueryClient()
  const key = ['portal', slug, 'help', 'detail', id]
  const detail = useQuery({
    queryKey: key,
    queryFn: async () => {
      const ticket = await api<HelpDetail>(`${base(slug)}/${id}`, opts(token))
      // Abrirla la marca como leída: se actualiza el aviso de la pestaña.
      void qc.invalidateQueries({ queryKey: ['portal', slug, 'help', token] })
      return ticket
    },
    retry: false,
    refetchInterval: 60_000,
  })
  const update = (t: HelpDetail) => {
    qc.setQueryData(key, t)
    return qc.invalidateQueries({ queryKey: ['portal', slug, 'help', token] })
  }
  const reply = useMutation({ mutationFn: (message: MessageInput) => api<HelpDetail>(`${base(slug)}/${id}/messages`, { method: 'POST', body: message, ...opts(token) }), onSuccess: update })
  const resolve = useMutation({ mutationFn: () => api<HelpDetail>(`${base(slug)}/${id}/resolve`, { method: 'POST', ...opts(token) }), onSuccess: update })

  const back = (
    <Link to="?tab=ayuda" className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-muted no-underline hover:text-ink">
      <ArrowLeft size={15} aria-hidden /> Mis consultas
    </Link>
  )
  if (detail.isLoading) {
    return (
      <>
        {back}
        <Skeleton className="h-[320px] rounded-card" />
      </>
    )
  }
  const t = detail.data
  if (!t) {
    return (
      <>
        {back}
        <Card>
          <EmptyState icon={LifeBuoy} title="No encontramos esta consulta" />
        </Card>
      </>
    )
  }

  const st = STATUS[t.status]
  const resolved = t.status === 'resolved'
  const who = answeredBy(t, business.name)
  return (
    <>
      {back}
      <Card className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-[220px] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="m-0 text-lg font-semibold">{t.subject}</h2>
            <Tag tone={st.tone}>{st.label}</Tag>
          </div>
          <div className="mt-1 text-xs text-muted">
            #{t.number} · {CATEGORY_LABEL[t.category] ?? 'Consulta'} · {formatDateTime(t.createdAt)} · responde {who}
          </div>
        </div>
        {!resolved && (
          <Button disabled={resolve.isPending} onClick={() => resolve.mutate()}>
            <CircleCheck size={14} aria-hidden /> Ya quedó resuelto
          </Button>
        )}
      </Card>
      <Card className="flex flex-col gap-5">
        <Thread messages={t.messages} viewer="customer" agentLabel={t.audience === 'business' ? business.name : 'Soporte uBook'} />
        {resolved && (
          <p className="m-0 rounded-control bg-ok-bg px-3 py-2 text-sm text-ok">
            <b>Consulta resuelta.</b> Si necesitas algo más sobre este tema, escribe aquí abajo y la reabrimos.
          </p>
        )}
        <Composer placeholder={resolved ? 'Escribe para reabrir la consulta…' : 'Escribe tu respuesta…'} upload={(file) => uploadShot(slug, token, file)} onSend={(message) => reply.mutateAsync(message)} />
      </Card>
    </>
  )
}

/** Ayuda: consultas al negocio o al soporte técnico, y cómo contactar directo. */
export function HelpTab({ slug, token, business }: { slug: string; token: string; business: PublicBusiness }) {
  const [params, setParams] = useSearchParams()
  const current = params.get('c')
  const help = usePortalHelp(slug, token)

  if (current === 'nueva') return <NewInquiry slug={slug} token={token} business={business} onCreated={(id) => setParams({ tab: 'ayuda', c: id }, { replace: true })} />
  if (current) return <InquiryThread slug={slug} token={token} id={current} business={business} />

  const items = help.data?.items ?? []
  const phones = business.branches.filter((b) => b.phone)
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader
          title="Mis consultas"
          actions={
            <Link to="?tab=ayuda&c=nueva" className="bg-grad inline-flex items-center gap-1.5 rounded-control px-3.5 py-2 text-sm font-semibold no-underline hover:brightness-110">
              <Plus size={14} aria-hidden /> Nueva consulta
            </Link>
          }
        />
        {help.isLoading ? (
          <div className="flex flex-col gap-2">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : help.isError ? (
          <p className="m-0 text-sm text-bad">No pudimos cargar tus consultas.</p>
        ) : items.length === 0 ? (
          <EmptyState
            icon={LifeBuoy}
            title="¿Tienes alguna duda?"
            description={`Escríbele a ${business.name} sobre tus citas, pagos o el servicio. Si algo de la página no funciona, te ayuda el soporte técnico.`}
            action={
              <Link to="?tab=ayuda&c=nueva" className="bg-grad inline-flex items-center gap-1.5 rounded-control px-3.5 py-2 text-sm font-semibold no-underline hover:brightness-110">
                <MessageCircle size={14} aria-hidden /> Hacer una consulta
              </Link>
            }
          />
        ) : (
          <ul className="m-0 list-none p-0">
            {items.map((t) => {
              const st = STATUS[t.status]
              return (
                <li key={t.id} className="border-t border-line first:border-t-0">
                  <Link to={`?tab=ayuda&c=${t.id}`} className="-mx-2 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-control px-2 py-3 text-ink no-underline hover:bg-surface-2">
                    <div className="min-w-[200px] flex-1">
                      <div className={cn('flex items-center gap-2', t.unread ? 'font-bold' : 'font-semibold')}>
                        {t.unread && <span className="size-2 flex-none rounded-full bg-warn" aria-label="Respuesta sin leer" />}
                        <span className="truncate">{t.subject}</span>
                      </div>
                      <div className="truncate text-xs text-muted">
                        {answeredBy(t, business.name)} · {t.lastMessageFrom === 'agent' ? 'Te respondieron: ' : ''}
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

      <Card>
        <CardHeader title="¿Es urgente?" />
        <p className="mt-0 mb-3 text-sm text-muted">Si tu cita es hoy o necesitas respuesta inmediata, llama directamente.</p>
        {phones.length === 0 ? (
          <p className="m-0 text-sm text-muted">{business.name} no publicó un teléfono. Escríbeles con una consulta y te responden por aquí.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            {phones.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-2 text-sm">
                <b className="min-w-[120px] flex-1 font-semibold">{b.name}</b>
                <a href={`tel:${b.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 rounded-control border border-line-strong bg-surface px-2.5 py-[5px] text-2xs font-semibold text-ink-2 no-underline hover:border-teal">
                  <Phone size={12} aria-hidden /> {b.phone}
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
