import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, CircleAlert, Copy, ExternalLink, MessageCircle, Settings2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { Field, Input, Textarea } from '@/components/ui/field'
import { useProfessionals } from '@/features/professionals/api'
import { summarizeSchedule } from '@/features/professionals/schedule-summary'
import { useServices } from '@/features/services/api'
import { api, errorMessage } from '@/lib/api/client'
import type { DepositInfo } from '@/lib/api/types'
import { useAccess } from '@/lib/auth/access'
import { useAuth } from '@/lib/auth/auth-context'
import { cn } from '@/lib/cn'

function ChecklistItem({ ok, children, to, action }: { ok: boolean; children: React.ReactNode; to?: string; action?: string }) {
  return (
    <li className="flex items-center gap-3 border-t border-line py-3 first:border-t-0">
      <span className={cn('grid size-7 flex-none place-items-center rounded-full', ok ? 'bg-ok-bg text-ok' : 'bg-warn-bg text-warn')}>
        {ok ? <Check size={15} aria-hidden /> : <CircleAlert size={15} aria-hidden />}
      </span>
      <span className="flex-1 text-sm">{children}</span>
      {!ok && to && (
        <Link to={to} className="text-xs font-semibold text-brand hover:underline">
          {action}
        </Link>
      )}
    </li>
  )
}

const EMPTY: DepositInfo = { yape: '', plin: '', bank: '', notes: '' }

/** A dónde paga el cliente el adelanto de los servicios que lo piden. */
function DepositInfoCard() {
  const qc = useQueryClient()
  const { can, readOnly } = useAccess()
  const org = useQuery({ queryKey: ['organization'], queryFn: () => api<{ depositInfo?: DepositInfo }>('/organization') })
  const [draft, setDraft] = useState<DepositInfo | null>(null)
  const [saved, setSaved] = useState(false)
  const save = useMutation({
    mutationFn: (depositInfo: DepositInfo) => api('/organization', { method: 'PATCH', body: { depositInfo } }),
    onSuccess: () => {
      setDraft(null)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      void qc.invalidateQueries({ queryKey: ['organization'] })
    },
  })
  const current = { ...EMPTY, ...org.data?.depositInfo }
  const value = draft ?? current
  const editable = can('organization.manage') && !readOnly
  const set = (k: keyof DepositInfo) => (e: { target: { value: string } }) => setDraft({ ...value, [k]: e.target.value })
  const empty = !current.yape && !current.plin && !current.bank

  return (
    <Card className="flex flex-col gap-4">
      <CardHeader title="Datos para adelantos" className="mb-0" />
      <p className="m-0 text-sm text-muted">
        Si un servicio pide adelanto, el cliente ve estos datos al reservar, paga y sube la foto del comprobante. Tú la validas desde la cita o el Dashboard.
      </p>
      {empty && !draft && (
        <p className="m-0 rounded-control bg-warn-bg px-3 py-2 text-sm text-warn">Completa al menos un medio de pago para que tus clientes sepan a dónde enviar el adelanto.</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Yape" hint="Número y nombre del titular">
          {(p) => <Input {...p} value={value.yape} onChange={set('yape')} disabled={!editable} maxLength={120} placeholder="987 654 321 · Barbería Lima" />}
        </Field>
        <Field label="Plin">
          {(p) => <Input {...p} value={value.plin} onChange={set('plin')} disabled={!editable} maxLength={120} />}
        </Field>
      </div>
      <Field label="Transferencia" hint="Banco, n.º de cuenta y CCI">
        {(p) => <Textarea {...p} rows={2} value={value.bank} onChange={set('bank')} disabled={!editable} maxLength={300} placeholder="BCP 191-1234567-0-12 · CCI 002-191-001234567012-55" />}
      </Field>
      <Field label="Indicaciones (opcional)">
        {(p) => <Textarea {...p} rows={2} value={value.notes} onChange={set('notes')} disabled={!editable} maxLength={500} placeholder="Ej.: el adelanto no es reembolsable si cancelas con menos de 24 h." />}
      </Field>
      {save.error && <p role="alert" className="m-0 text-sm font-semibold text-bad">{errorMessage(save.error)}</p>}
      {editable && (
        <div className="flex items-center justify-end gap-2.5">
          {saved && <span className="text-sm font-semibold text-ok">Guardado</span>}
          {draft && <Button onClick={() => setDraft(null)}>Descartar</Button>}
          <Button variant="primary" disabled={!draft || save.isPending} onClick={() => draft && save.mutate(draft)}>
            {save.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      )}
    </Card>
  )
}

/** Negocio / Página de reservas: el enlace para compartir y qué falta para recibir reservas. */
export function BookingSettingsPage() {
  const { me } = useAuth()
  const services = useServices()
  const professionals = useProfessionals()
  const [copied, setCopied] = useState(false)

  const slug = me?.organization?.slug ?? ''
  const url = `${window.location.origin}/reservar/${slug}`
  const online = (services.data ?? []).filter((s) => !s.isArchived && s.onlineBooking)
  const ready = (professionals.data ?? []).filter(
    (p) => p.isActive && summarizeSchedule(p.schedules).days > 0 && p.services.some((x) => online.some((s) => s.id === x.serviceId)),
  )
  const share = `https://wa.me/?text=${encodeURIComponent(`Reserva tu cita en ${me?.organization?.name ?? 'nuestro negocio'}: ${url}`)}`

  const copy = async () => {
    await navigator.clipboard?.writeText(url).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <Card className="flex flex-col gap-4">
        <CardHeader title="Tu enlace de reservas" className="mb-0" />
        <p className="m-0 text-sm text-muted">
          Compártelo en tu Instagram, WhatsApp o Google. Tus clientes eligen servicio, profesional y horario, sin crear cuenta.
        </p>
        <div className="flex gap-2">
          <Input readOnly value={url} aria-label="Enlace de reservas" onFocus={(e) => e.target.select()} />
          <Button onClick={copy}>
            {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />} {copied ? 'Copiado' : 'Copiar'}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-control bg-grad px-3.5 py-2 text-sm font-semibold"
          >
            <ExternalLink size={14} aria-hidden /> Ver mi página
          </a>
          <a
            href={share}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-control border border-line-strong bg-surface px-3.5 py-2 text-sm font-semibold text-ink-2 hover:border-teal"
          >
            <MessageCircle size={14} aria-hidden /> Compartir por WhatsApp
          </a>
        </div>
      </Card>

      <Card>
        <CardHeader title="Para recibir reservas" />
        <ul className="m-0 list-none p-0">
          <ChecklistItem ok={online.length > 0} to="/servicios" action="Ir a Servicios">
            {online.length > 0
              ? `${online.length} ${online.length === 1 ? 'servicio se puede' : 'servicios se pueden'} reservar online`
              : 'Ningún servicio tiene activada la reserva online'}
          </ChecklistItem>
          <ChecklistItem ok={ready.length > 0} to="/profesionales" action="Ir a Profesionales">
            {ready.length > 0
              ? `${ready.length} ${ready.length === 1 ? 'profesional tiene' : 'profesionales tienen'} horario y servicios online`
              : 'Ningún profesional tiene horario y servicios online'}
          </ChecklistItem>
        </ul>
      </Card>

      <DepositInfoCard />

      <Card className="flex flex-wrap items-center gap-3">
        <Settings2 size={20} className="text-brand" aria-hidden />
        <p className="m-0 flex-1 text-sm text-muted">
          Anticipación mínima, hasta cuándo se puede reservar, aprobación manual y cambios permitidos se configuran en Disponibilidad.
        </p>
        <Link to="/disponibilidad" className="text-sm font-semibold text-brand hover:underline">
          Reglas de reserva
        </Link>
      </Card>
    </>
  )
}
