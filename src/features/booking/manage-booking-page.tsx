import { CalendarClock, CalendarPlus, CalendarX2, Clock, MapPin, Phone, TriangleAlert, Users } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { StatusChip } from '@/components/ui/badges'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState, Skeleton } from '@/components/ui/display'
import { Field, Textarea } from '@/components/ui/field'
import { ApiError, errorMessage } from '@/lib/api/client'
import { formatCents } from '@/lib/format'
import { formatLongDate, formatTime, isoToZoned } from '@/lib/time'
import { bookingSource, googleCalendarUrl, useManageActions, useManagedBooking } from './api'
import { DateTimeChooser } from './date-time-chooser'
import { PublicLayout } from './public-layout'

const whenText = (iso: string) => `${formatLongDate(isoToZoned(iso).date)}, ${formatTime(iso)}`

function Row({ icon: Icon, label, children }: { icon: typeof Clock; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon size={17} className="mt-0.5 flex-none text-teal-ink" aria-hidden />
      <div className="min-w-0">
        <div className="text-2xs font-semibold text-muted">{label}</div>
        <div className="text-sm font-semibold">{children}</div>
      </div>
    </div>
  )
}

/** /reserva/:token — el cliente ve su cita y puede reprogramarla o cancelarla. */
export function ManageBookingPage() {
  const { token = '' } = useParams<{ token: string }>()
  const booking = useManagedBooking(token)
  const { cancel, reschedule } = useManageActions(token)
  const [mode, setMode] = useState<'view' | 'reschedule' | 'cancel'>('view')
  const [newTime, setNewTime] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const b = booking.data
  if (booking.isLoading) {
    return (
      <PublicLayout>
        <Skeleton className="h-[360px] rounded-card" />
      </PublicLayout>
    )
  }
  if (!b) {
    return (
      <PublicLayout title="Tu reserva">
        <Card>
          <EmptyState
            icon={CalendarX2}
            title="No encontramos esta reserva"
            description={booking.error instanceof ApiError && booking.error.status !== 404 ? booking.error.message : 'Revisa que el enlace esté completo.'}
          />
        </Card>
      </PublicLayout>
    )
  }

  const run = async (fn: () => Promise<unknown>, done: string) => {
    setError(null)
    try {
      await fn()
      setMode('view')
      setNewTime(null)
      setNotice(done)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  const closed = b.status === 'cancelled' || b.status === 'completed' || b.status === 'no_show'

  return (
    <PublicLayout title={b.organization.name} subtitle={`Cita #UB-${b.number}`} logoUrl={b.organization.logoUrl}>
      {notice && (
        <div role="status" className="rounded-control bg-ok-bg px-4 py-3 text-sm font-semibold text-ok">
          {notice}
        </div>
      )}

      <Card className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="m-0 text-lg font-semibold">Hola, {b.clientFirstName}</h2>
          <StatusChip status={b.status} />
        </div>
        {b.deposit?.status === 'pending_review' && b.status === 'pending' ? (
          <p className="m-0 text-sm text-muted">
            Recibimos tu comprobante de {formatCents(b.deposit.amount)}. El negocio está validando tu adelanto y te avisará apenas confirme la cita.
          </p>
        ) : (
          b.status === 'pending' && <p className="m-0 text-sm text-muted">El negocio todavía tiene que confirmar tu reserva. Te avisaremos por correo.</p>
        )}
        {b.deposit?.status === 'approved' && (
          <p className="m-0 text-sm text-ok">Adelanto de {formatCents(b.deposit.amount)} validado. Lo descontamos del total.</p>
        )}
        {b.deposit?.status === 'rejected' && (
          <p className="m-0 rounded-control bg-bad-bg px-3 py-2 text-sm text-bad">
            El negocio no pudo validar tu adelanto{b.deposit.rejectReason ? `: ${b.deposit.rejectReason}` : ''}. Comunícate con ellos si crees que es un error.
          </p>
        )}
        <div className="mt-1 divide-y divide-line">
          <Row icon={Clock} label="Cuándo">
            {whenText(b.startsAt)} <span className="font-normal text-muted">· {b.durationMinutes} min</span>
          </Row>
          <Row icon={Users} label="Servicio">
            {b.serviceName} con {b.professional.displayName} <span className="font-normal text-muted">· {formatCents(b.price)}</span>
          </Row>
          <Row icon={MapPin} label="Dónde">
            {[b.branch.name, b.branch.address].filter(Boolean).join(' · ')}
            {b.branch.reference && <span className="block font-normal text-muted">{b.branch.reference}</span>}
            {b.branch.mapsUrl && (
              <a href={b.branch.mapsUrl} target="_blank" rel="noreferrer" className="mt-0.5 block text-sm text-brand hover:underline">
                Cómo llegar (Google Maps)
              </a>
            )}
          </Row>
          {b.branch.phone && (
            <Row icon={Phone} label="Teléfono del negocio">
              <a href={`tel:${b.branch.phone.replace(/\s/g, '')}`} className="text-brand hover:underline">
                {b.branch.phone}
              </a>
            </Row>
          )}
        </div>

        {mode === 'view' && (
          <div className="mt-2 flex flex-wrap gap-2.5 border-t border-line pt-3.5">
            {!closed && (
              <a
                href={googleCalendarUrl(b)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-control border border-line-strong bg-surface px-3.5 py-2 text-sm font-semibold text-ink-2 hover:border-teal"
              >
                <CalendarPlus size={14} aria-hidden /> Agregar al calendario
              </a>
            )}
            {b.canReschedule && (
              <Button onClick={() => (setMode('reschedule'), setNotice(null))}>
                <CalendarClock size={14} aria-hidden /> Cambiar horario
              </Button>
            )}
            {b.canCancel && (
              <Button variant="danger" onClick={() => (setMode('cancel'), setNotice(null))}>
                <CalendarX2 size={14} aria-hidden /> Cancelar cita
              </Button>
            )}
            {closed && (
              <Link to={`/reservar/${b.organization.slug}`} className="inline-flex items-center rounded-control bg-grad px-3.5 py-2 text-sm font-semibold">
                Reservar otra cita
              </Link>
            )}
          </div>
        )}
        {mode === 'view' && b.canCancel && !b.canReschedule && (
          <p className="m-0 text-2xs text-muted">Ya no puedes cambiar el horario desde aquí. Si lo necesitas, comunícate con el negocio.</p>
        )}
      </Card>

      {mode === 'reschedule' && (
        <Card className="flex flex-col gap-3">
          <h2 className="m-0 text-md font-bold">Elige el nuevo horario</h2>
          <p className="m-0 text-xs text-muted">Mismo servicio y profesional. Tu horario actual sigue reservado hasta que confirmes el cambio.</p>
          <DateTimeChooser source={bookingSource(token)} maxAdvanceDays={60} value={newTime} onChange={setNewTime} />
          {error && (
            <p role="alert" className="m-0 text-sm font-semibold text-bad">
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2.5 border-t border-line pt-3.5">
            <Button onClick={() => (setMode('view'), setNewTime(null), setError(null))}>Volver</Button>
            <Button
              variant="primary"
              disabled={!newTime || newTime === b.startsAt || reschedule.isPending}
              onClick={() => newTime && run(() => reschedule.mutateAsync(newTime), `Listo: tu cita ahora es el ${whenText(newTime)}.`)}
            >
              {reschedule.isPending ? 'Cambiando…' : newTime ? `Cambiar a ${formatTime(newTime)}` : 'Cambiar horario'}
            </Button>
          </div>
        </Card>
      )}

      {mode === 'cancel' && (
        <Card className="flex flex-col gap-3">
          <h2 className="m-0 text-md font-bold">¿Cancelar tu cita?</h2>
          {b.lateCancellation && (
            <p className="m-0 flex items-start gap-2 rounded-control bg-warn-bg px-3 py-2.5 text-sm text-warn">
              <TriangleAlert size={16} className="mt-0.5 flex-none" aria-hidden />
              Faltan menos de {b.freeCancellationHours} h para tu cita. El negocio podría aplicar su política de cancelación tardía.
            </p>
          )}
          <Field label="Motivo (opcional)" hint="Le ayuda al negocio a organizarse.">
            {(p) => <Textarea {...p} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />}
          </Field>
          {error && (
            <p role="alert" className="m-0 text-sm font-semibold text-bad">
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2.5 border-t border-line pt-3.5">
            <Button onClick={() => (setMode('view'), setError(null))}>No, mantener</Button>
            <Button
              variant="danger"
              disabled={cancel.isPending}
              onClick={() => run(() => cancel.mutateAsync(reason.trim() || undefined), 'Tu cita fue cancelada.')}
            >
              {cancel.isPending ? 'Cancelando…' : 'Sí, cancelar'}
            </Button>
          </div>
        </Card>
      )}
    </PublicLayout>
  )
}
