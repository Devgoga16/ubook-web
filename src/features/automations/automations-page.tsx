import { CheckCheck, Mail, MessageCircle, Send, Zap } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { Tag } from '@/components/ui/badges'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { Checkbox, Switch } from '@/components/ui/controls'
import { Skeleton, Table, Td, Th, Tr } from '@/components/ui/display'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { usePromotions } from '@/features/promotions/api'
import { errorMessage } from '@/lib/api/client'
import { useAccess } from '@/lib/auth/access'
import { useAuth } from '@/lib/auth/auth-context'
import { cn } from '@/lib/cn'
import { FLOW_META, FLOW_ORDER, preview, useAutomationActions, useAutomationLog, useAutomations, type AutomationsOverview, type Channel, type FlowKey, type FlowSettings } from './api'

const FLOW_LABEL: Record<string, string> = { ...Object.fromEntries(FLOW_ORDER.map((f) => [f, FLOW_META[f].label])), cancelled: 'Cancelación', cancelled_by_business: 'Cancelación', rescheduled: 'Cambio de horario' }
const when = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'America/Lima' })

function Editor({ flow, data }: { flow: FlowKey; data: AutomationsOverview }) {
  const { me } = useAuth()
  const { readOnly } = useAccess()
  const { update, test } = useAutomationActions()
  const promos = usePromotions()
  const meta = FLOW_META[flow]
  const saved = data.flows[flow]
  const [draft, setDraft] = useState<FlowSettings>(saved)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)
  const set = (patch: Partial<FlowSettings>) => {
    setDraft((d) => ({ ...d, ...patch }))
    setNotice(null)
  }
  const save = async (patch?: Partial<FlowSettings>) => {
    setError(null)
    try {
      const result = await update.mutateAsync({ flow, ...draft, ...patch, message: (patch?.message ?? draft.message).trim() })
      setDraft(result.flows[flow])
      setNotice('Cambios guardados')
    } catch (e) {
      setError(errorMessage(e))
    }
  }
  const insert = (v: string) => {
    const el = textRef.current
    const base = draft.message || data.defaults[flow]
    const pos = el?.selectionStart ?? base.length
    set({ message: `${base.slice(0, pos)}{{${v}}}${base.slice(pos)}` })
    requestAnimationFrame(() => el?.focus())
  }
  const channel = (c: Channel, on: boolean) => set({ channels: on ? [...new Set([...draft.channels, c])] : draft.channels.filter((x) => x !== c) })
  const text = preview(flow, draft, data.defaults, me?.organization?.name ?? 'tu negocio')
  const wa = data.channels.whatsappStatus

  return (
    <div className="grid items-start gap-4 2xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1">
            <h3 className="m-0 text-lg font-semibold">{meta.label}</h3>
            <p className="m-0 text-sm text-muted">{meta.trigger(draft.offset)}</p>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
            <Switch checked={saved.enabled} disabled={readOnly || update.isPending} onCheckedChange={(v) => void save({ enabled: v })} />
            {saved.enabled ? 'Activo' : 'Apagado'}
          </label>
          <Button
            size="sm"
            disabled={test.isPending || !saved.channels.length}
            onClick={async () => {
              setError(null)
              try {
                const r = await test.mutateAsync(flow)
                setNotice(
                  [r.email && 'correo', r.whatsapp && 'WhatsApp'].filter(Boolean).length
                    ? `Prueba enviada por ${[r.email && 'correo', r.whatsapp && 'WhatsApp'].filter(Boolean).join(' y ')} a tu cuenta.`
                    : 'No se envió: revisa que tu cuenta tenga correo o celular y que el canal esté activo.',
                )
              } catch (e) {
                setError(errorMessage(e))
              }
            }}
          >
            <Send size={13} aria-hidden /> Probar
          </Button>
        </div>

        {meta.marketing && <p className="m-0 rounded-[10px] bg-surface-2 px-3 py-2 text-xs text-muted">Solo se envía a clientes que aceptaron recibir promociones.</p>}

        <div className="grid gap-4 sm:grid-cols-2">
          {meta.offset && (
            <Field label={meta.offset.label}>
              {(p) => (
                <div className="flex items-center gap-2">
                  <Input {...p} inputMode="numeric" value={draft.offset ?? ''} onChange={(e) => set({ offset: Number(e.target.value.replace(/\D/g, '')) || null })} className="w-24" />
                  <span className="text-sm text-muted">{meta.offset!.unit}</span>
                </div>
              )}
            </Field>
          )}
          <div className="flex flex-col gap-2">
            <span className="text-2xs font-semibold text-muted">Canales</span>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={draft.channels.includes('email')} disabled={!data.channels.email} onCheckedChange={(v) => channel('email', v === true)} />
              <Mail size={14} aria-hidden /> Correo
            </label>
            <label className={cn('flex items-center gap-2 text-sm', data.channels.whatsapp ? 'cursor-pointer' : 'opacity-60')}>
              <Checkbox checked={draft.channels.includes('whatsapp')} disabled={!data.channels.whatsapp} onCheckedChange={(v) => channel('whatsapp', v === true)} />
              <MessageCircle size={14} aria-hidden /> WhatsApp
              {!data.channels.whatsapp ? (
                <Tag tone="off">No incluido en tu plan</Tag>
              ) : wa.connected ? (
                <Tag tone="ok">Conectado</Tag>
              ) : (
                <Tag tone="warn">Sin conexión</Tag>
              )}
            </label>
          </div>
          {(flow === 'birthday' || flow === 'reactivation') && (
            <Field label="Cupón (opcional)" hint={promos.data?.length ? undefined : 'Crea uno en Promociones.'}>
              {(p) => (
                <Select {...p} value={draft.promoCode ?? ''} onChange={(e) => set({ promoCode: e.target.value || null })}>
                  <option value="">Sin cupón</option>
                  {(promos.data ?? []).filter((x) => x.isActive).map((x) => (
                    <option key={x.id} value={x.code}>
                      {x.code}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}
          {flow === 'review' && (
            <Field label="Enlace para dejar reseña" hint="Google: tu perfil de empresa → Pedir reseñas → copiar enlace.">
              {(p) => <Input {...p} value={draft.link ?? ''} onChange={(e) => set({ link: e.target.value || null })} placeholder="https://g.page/r/…" />}
            </Field>
          )}
        </div>

        <Field label="Mensaje" hint="Vacío = el mensaje sugerido. Toca una variable para insertarla.">
          {(p) => (
            <Textarea
              {...p}
              ref={textRef}
              rows={4}
              value={draft.message || data.defaults[flow]}
              onChange={(e) => set({ message: e.target.value === data.defaults[flow] ? '' : e.target.value })}
            />
          )}
        </Field>
        <div className="-mt-2 flex flex-wrap gap-1.5">
          {data.variables.map((v) => (
            <button key={v} type="button" onClick={() => insert(v)} className="cursor-pointer rounded-full bg-brand-soft px-2 py-0.5 font-mono text-[11px] text-brand hover:brightness-95">
              {`{{${v}}}`}
            </button>
          ))}
          {draft.message && (
            <button type="button" onClick={() => set({ message: '' })} className="cursor-pointer text-xs font-semibold text-muted hover:text-ink">
              Volver al sugerido
            </button>
          )}
        </div>

        {error && <p role="alert" className="m-0 text-sm font-semibold text-bad">{error}</p>}
        <div className="flex items-center justify-end gap-3 border-t border-line pt-3.5">
          {notice && <span className="mr-auto text-xs text-teal-ink">{notice}</span>}
          <Button onClick={() => setDraft(saved)} disabled={!dirty || update.isPending}>
            Descartar
          </Button>
          <Button variant="primary" onClick={() => void save()} disabled={!dirty || readOnly || update.isPending}>
            Guardar
          </Button>
        </div>
      </Card>

      <div className="flex flex-col gap-2">
        <span className="text-2xs font-semibold text-muted">Así lo verá tu cliente</span>
        <div className="overflow-hidden rounded-[22px] border border-line bg-[#e9e3da] shadow-card dark:bg-[#0b141a]">
          <div className="flex items-center gap-2 bg-[#075e54] px-3.5 py-2.5 text-sm font-semibold text-white">
            <span className="grid size-7 place-items-center rounded-full bg-white/20 text-xs">{(me?.organization?.name ?? 'N').slice(0, 1)}</span>
            {me?.organization?.name ?? 'Tu negocio'}
          </div>
          <div className="min-h-[220px] p-3">
            <div className="max-w-[92%] rounded-[10px] rounded-tl-none bg-white px-3 py-2 text-[13px] leading-snug whitespace-pre-line text-[#111b21] shadow-sm dark:bg-[#202c33] dark:text-[#e9edef]">
              {text}
              <span className="mt-1 flex items-center justify-end gap-1 text-[10px] text-[#667781]">
                10:00 <CheckCheck size={12} aria-hidden className="text-[#53bdeb]" />
              </span>
            </div>
          </div>
        </div>
        <span className="text-2xs text-muted">Con datos de ejemplo. El correo lleva este texto y un botón.</span>
      </div>
    </div>
  )
}

/** Negocio / Automatizaciones: mensajes que se envían solos a tus clientes. */
export function AutomationsPage() {
  const data = useAutomations()
  const log = useAutomationLog()
  const [flow, setFlow] = useState<FlowKey>('reminder')
  const d = data.data
  if (data.isLoading || !d) return <Skeleton className="h-[420px] rounded-card" />
  const sent = (f: string) => d.stats.filter((s) => s.flow === f && s.status === 'sent').reduce((a, s) => a + s.count, 0)

  return (
    <>
      <div className="grid items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="p-2">
          <div className="flex items-center gap-2 px-3 pt-2 pb-3">
            <Zap size={16} className="text-brand" aria-hidden />
            <h3 className="m-0 text-md font-bold">Flujos</h3>
          </div>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {FLOW_ORDER.map((f) => {
              const s = d.flows[f]
              return (
                <li key={f}>
                  <button
                    type="button"
                    onClick={() => setFlow(f)}
                    aria-current={flow === f}
                    className={cn('flex w-full cursor-pointer items-center gap-2 rounded-control px-3 py-2.5 text-left', flow === f ? 'bg-brand-soft' : 'hover:bg-surface-2')}
                  >
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-sm font-semibold">{FLOW_META[f].label}</b>
                      <span className="block truncate text-xs text-muted">
                        {s.channels.map((c) => (c === 'email' ? 'Correo' : 'WhatsApp')).join(' + ') || 'Sin canal'} · {sent(f)} enviados (30 días)
                      </span>
                    </span>
                    <span className={cn('size-2 flex-none rounded-full', s.enabled ? 'bg-ok' : 'bg-line-strong')} aria-label={s.enabled ? 'Activo' : 'Apagado'} />
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="m-0 px-3 py-3 text-xs text-muted">
            Las cancelaciones y cambios de horario siempre se avisan por correo. Los cupones se crean en <Link to="/promociones" className="font-semibold text-brand hover:underline">Promociones</Link>.
          </p>
        </Card>
        <Editor key={flow} flow={flow} data={d} />
      </div>

      <Card>
        <CardHeader title="Registro de envíos" actions={<span className="text-xs text-muted">Últimos 50</span>} />
        {log.isLoading ? (
          <Skeleton className="h-24" />
        ) : !log.data?.length ? (
          <p className="m-0 text-sm text-muted">Todavía no se envió ningún mensaje.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Cliente</Th>
                <Th>Mensaje</Th>
                <Th>Canal</Th>
                <Th>Fecha</Th>
                <Th>Estado</Th>
              </tr>
            </thead>
            <tbody>
              {log.data.map((l) => (
                <Tr key={l.id}>
                  <Td>{l.test ? <span className="text-muted">Prueba · {l.to}</span> : (l.clientName ?? l.to)}</Td>
                  <Td>{FLOW_LABEL[l.flow] ?? l.flow}</Td>
                  <Td>{l.channel === 'email' ? 'Correo' : 'WhatsApp'}</Td>
                  <Td className="text-muted">{when.format(new Date(l.createdAt))}</Td>
                  <Td>{l.status === 'sent' ? <Tag tone="ok">Enviado</Tag> : <Tag tone="bad">{l.error ?? 'Falló'}</Tag>}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  )
}
