import { BellRing, CalendarCheck, Globe, ListTodo, Plus, RotateCcw, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Avatar } from '@/components/ui/avatar'
import { Tag } from '@/components/ui/badges'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FilterChips } from '@/components/ui/controls'
import { EmptyState, Skeleton } from '@/components/ui/display'
import { formatDate } from '@/features/clients/api'
import { errorMessage } from '@/lib/api/client'
import { useAccess } from '@/lib/auth/access'
import { useBranch } from '@/lib/auth/branch-context'
import { formatLongDate, formatTime } from '@/lib/time'
import { TIME_OF_DAY, useWaitlist, useWaitlistActions, type WaitlistEntry } from './api'

const shortDay = new Intl.DateTimeFormat('es-PE', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'America/Lima' })

function Entry({ e, canAct }: { e: WaitlistEntry; canAct: boolean }) {
  const navigate = useNavigate()
  const { book, notify, remove, restore } = useWaitlistActions()
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const options = e.options ?? []
  const range = e.dateFrom === e.dateTo ? formatLongDate(e.dateFrom) : `${formatDate(`${e.dateFrom}T12:00:00Z`)} – ${formatDate(`${e.dateTo}T12:00:00Z`)}`

  const run = async (fn: () => Promise<unknown>) => {
    setError(null)
    try {
      return await fn()
    } catch (err) {
      setError(errorMessage(err))
      return null
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start gap-3">
        <Avatar name={e.client?.name ?? 'Cliente'} round />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {e.client ? (
              <Link to={`/clientes/${e.client.id}`} className="font-semibold text-ink hover:underline">
                {e.client.name}
              </Link>
            ) : (
              <b>Cliente</b>
            )}
            {e.source === 'online' && (
              <Tag tone="teal">
                <Globe size={11} aria-hidden className="mr-1 inline" />
                Online
              </Tag>
            )}
            {e.notifiedAt && <Tag tone="off">Avisado {formatDate(e.notifiedAt)}</Tag>}
          </div>
          <div className="text-sm text-ink-2">
            {e.serviceName} · {e.professionalName ? `con ${e.professionalName}` : 'cualquier profesional'}
          </div>
          <div className="text-xs text-muted">
            {range} · {TIME_OF_DAY[e.timeOfDay]}
            {e.client?.phone && ` · ${e.client.phone.replace('+51', '')}`}
            {e.notes && ` · ${e.notes}`}
          </div>
        </div>
        {canAct && e.status === 'waiting' && (
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={!options.length || notify.isPending}
              title={options.length ? 'Avisar por WhatsApp y correo' : 'No hay horarios libres que le sirvan'}
              onClick={async () => {
                const res = await run(() => notify.mutateAsync(e.id))
                if (!res) return
                const r = res as { emailSent: boolean; phone: string | null; whatsappText: string }
                if (r.phone) window.open(`https://wa.me/${r.phone.replace(/\D/g, '')}?text=${encodeURIComponent(r.whatsappText)}`, '_blank', 'noreferrer')
                setNotice(r.emailSent ? 'Le enviamos un correo y abrimos WhatsApp con el mensaje.' : r.phone ? 'Abrimos WhatsApp con el mensaje listo.' : 'No tiene celular ni correo registrados.')
              }}
            >
              <BellRing size={13} aria-hidden /> Avisar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => window.confirm(`¿Quitar a ${e.client?.name ?? 'esta persona'} de la lista?`) && void run(() => remove.mutateAsync(e.id))}>
              <X size={13} aria-hidden /> Quitar
            </Button>
          </div>
        )}
        {canAct && e.status === 'removed' && (
          <Button size="sm" onClick={() => void run(() => restore.mutateAsync(e.id))}>
            <RotateCcw size={13} aria-hidden /> Volver a la lista
          </Button>
        )}
        {e.status === 'booked' && e.appointmentId && (
          <Link to={`/agenda/citas/${e.appointmentId}`} className="text-sm font-semibold text-brand hover:underline">
            Ver cita
          </Link>
        )}
      </div>

      {e.status === 'waiting' && (
        <div className="flex flex-col gap-2 border-t border-line pt-3">
          {options.length === 0 ? (
            <p className="m-0 text-xs text-muted">Todavía no hay horarios libres que le sirvan. Esta lista se actualiza sola.</p>
          ) : (
            <>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-ok">
                <CalendarCheck size={14} aria-hidden /> Horarios libres que le sirven
              </span>
              <div className="flex flex-wrap gap-2">
                {options.map((o) => (
                  <button
                    key={`${o.startsAt}-${o.professionalId}`}
                    type="button"
                    disabled={!canAct || book.isPending}
                    onClick={async () => {
                      const when = `${shortDay.format(new Date(o.startsAt))} ${formatTime(o.startsAt)}`
                      if (!window.confirm(`¿Agendar a ${e.client?.name ?? 'esta persona'} el ${when} con ${o.professionalName}?`)) return
                      const appt = (await run(() => book.mutateAsync({ id: e.id, professionalId: o.professionalId, startsAt: o.startsAt }))) as { id: string } | null
                      if (appt) navigate(`/agenda/citas/${appt.id}`)
                    }}
                    className="cursor-pointer rounded-control border border-line-strong bg-surface px-3 py-1.5 text-left text-xs hover:border-teal disabled:cursor-default disabled:opacity-60"
                  >
                    <b className="block font-semibold capitalize">
                      {shortDay.format(new Date(o.startsAt))} · {formatTime(o.startsAt)}
                    </b>
                    <span className="text-muted">con {o.professionalName}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      {notice && <p className="m-0 text-xs text-teal-ink">{notice}</p>}
      {error && <p className="m-0 text-xs font-semibold text-bad">{error}</p>}
    </Card>
  )
}

/** Operación / Lista de espera. */
export function WaitlistPage() {
  const navigate = useNavigate()
  const { current } = useBranch()
  const { can, readOnly } = useAccess()
  const [status, setStatus] = useState<'waiting' | 'booked' | 'removed'>('waiting')
  const list = useWaitlist(current?.id, status)
  const canAct = can('booking.create') && !readOnly
  const items = list.data ?? []
  const withOptions = status === 'waiting' ? items.filter((e) => e.options?.length).length : 0

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterChips
          aria-label="Estado"
          value={status}
          onValueChange={setStatus}
          options={[
            { value: 'waiting', label: 'En espera' },
            { value: 'booked', label: 'Agendados' },
            { value: 'removed', label: 'Quitados' },
          ]}
        />
        {canAct && (
          <Button variant="primary" onClick={() => navigate('/lista-espera/nueva')}>
            <Plus size={14} aria-hidden /> Agregar a la lista
          </Button>
        )}
      </div>
      {status === 'waiting' && withOptions > 0 && (
        <div role="status" className="rounded-[12px] bg-ok-bg px-4 py-3 text-sm font-semibold text-ok">
          {withOptions === 1 ? '1 persona tiene' : `${withOptions} personas tienen`} horarios libres que le sirven ahora. Avísales o agéndalas.
        </div>
      )}
      {list.isLoading ? (
        <Skeleton className="h-[200px] rounded-card" />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon={ListTodo}
            title={status === 'waiting' ? 'Nadie en espera' : status === 'booked' ? 'Aún no se agendó a nadie desde la lista' : 'Sin personas quitadas'}
            description={
              status === 'waiting'
                ? 'Cuando no haya horario para alguien, anótalo aquí. Te mostraremos los horarios que le sirvan apenas se liberen. Tus clientes también pueden anotarse desde la página de reservas.'
                : undefined
            }
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((e) => (
            <Entry key={e.id} e={e} canAct={canAct} />
          ))}
        </div>
      )}
      {status === 'waiting' && items.length > 0 && <p className="m-0 text-xs text-muted">Se buscan horarios hasta 14 días adelante dentro de las fechas de cada persona.</p>}
    </>
  )
}

