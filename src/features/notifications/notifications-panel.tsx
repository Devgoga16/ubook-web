import { Bell, BellOff, CalendarCheck, CalendarClock, CalendarX, Hourglass, ListTodo, Receipt, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button, IconButton } from '@/components/ui/button'
import { Segmented } from '@/components/ui/controls'
import { Skeleton } from '@/components/ui/display'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/overlays'
import { errorMessage } from '@/lib/api/client'
import { useAccess } from '@/lib/auth/access'
import { cn } from '@/lib/cn'
import { useMarkAllRead, useNotifications, type AppNotification, type NotificationType } from './api'

const META: Record<NotificationType, { icon: LucideIcon; tone: string }> = {
  booking_created: { icon: CalendarCheck, tone: 'bg-ok-bg text-ok' },
  booking_pending: { icon: Hourglass, tone: 'bg-warn-bg text-warn' },
  deposit_submitted: { icon: Receipt, tone: 'bg-warn-bg text-warn' },
  booking_rescheduled: { icon: CalendarClock, tone: 'bg-info-bg text-info' },
  booking_cancelled: { icon: CalendarX, tone: 'bg-bad-bg text-bad' },
  waitlist_joined: { icon: ListTodo, tone: 'bg-brand-soft text-brand' },
}

const rtf = new Intl.RelativeTimeFormat('es-PE', { numeric: 'auto' })

/** "hace 5 minutos", "ayer"… */
function ago(iso: string, now: number): string {
  const s = Math.round((new Date(iso).getTime() - now) / 1000)
  const abs = Math.abs(s)
  if (abs < 60) return 'justo ahora'
  if (abs < 3600) return rtf.format(Math.round(s / 60), 'minute')
  if (abs < 86_400) return rtf.format(Math.round(s / 3600), 'hour')
  return rtf.format(Math.round(s / 86_400), 'day')
}

/** Campana del encabezado: lo que hicieron los clientes desde la página de reservas. */
export function NotificationsPanel() {
  const { can } = useAccess()
  const enabled = can('booking.read')
  const navigate = useNavigate()
  const feed = useNotifications(enabled)
  const markAll = useMarkAllRead()
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [now, setNow] = useState(() => Date.now())

  if (!enabled) return null
  const unread = feed.data?.unread ?? 0
  const items = (feed.data?.items ?? []).filter((n) => filter === 'all' || !n.read)

  const go = (n: AppNotification) => {
    setOpen(false)
    navigate(n.type === 'waitlist_joined' ? '/lista-espera' : n.appointmentId ? `/agenda/citas/${n.appointmentId}` : '/agenda')
  }

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (v) setNow(Date.now())
      }}
    >
      <PopoverTrigger asChild>
        <IconButton aria-label={unread ? `Notificaciones, ${unread} sin leer` : 'Notificaciones'}>
          <Bell size={19} strokeWidth={1.7} />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-bad px-1 text-[10px] leading-none font-bold text-white ring-2 ring-bg">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </IconButton>
      </PopoverTrigger>
      <PopoverContent aria-label="Notificaciones" className="p-0">
        <div className="flex items-center gap-2 border-b border-line px-4 pt-4 pb-3">
          <span className="text-md font-semibold">Notificaciones</span>
          {unread > 0 && (
            <Button size="sm" variant="ghost" className="ml-auto text-brand" disabled={markAll.isPending} onClick={() => markAll.mutate()}>
              Marcar todo como leído
            </Button>
          )}
        </div>
        {(feed.data?.items.length ?? 0) > 0 && (
          <div className="px-4 pt-3">
            <Segmented
              aria-label="Filtrar notificaciones"
              value={filter}
              onValueChange={setFilter}
              options={[
                { value: 'all', label: 'Todas' },
                { value: 'unread', label: `Sin leer${unread ? ` · ${unread}` : ''}` },
              ]}
            />
          </div>
        )}
        {feed.isLoading ? (
          <div className="flex flex-col gap-2 p-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14 rounded-tile" />
            ))}
          </div>
        ) : feed.isError ? (
          <p className="m-0 p-4 text-sm font-semibold text-bad">{errorMessage(feed.error)}</p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
            <span className="grid size-10 place-items-center rounded-full bg-surface-2 text-muted">
              <BellOff size={18} aria-hidden />
            </span>
            <p className="m-0 text-sm font-semibold">Estás al día</p>
            <p className="m-0 text-xs text-muted">Aquí verás las reservas online, adelantos, cambios y cancelaciones que hagan tus clientes.</p>
          </div>
        ) : (
          <ul className="m-0 flex list-none flex-col p-2">
            {items.map((n) => {
              const meta = META[n.type]
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => go(n)}
                    className={cn('flex w-full cursor-pointer items-start gap-3 rounded-tile p-2.5 text-left hover:bg-surface-2', !n.read && 'bg-teal-soft/40')}
                  >
                    <span className={cn('grid size-9 flex-none place-items-center rounded-[10px]', meta.tone)}>
                      <meta.icon size={16} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold">{n.title}</span>
                        {!n.read && <span className="size-2 flex-none rounded-full bg-teal" aria-label="Sin leer" />}
                      </span>
                      <span className="line-clamp-2 block text-xs text-ink-2">{n.body}</span>
                      <span className="mt-0.5 block text-2xs text-muted">{ago(n.createdAt, now)}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
