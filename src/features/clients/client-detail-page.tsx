import { CalendarPlus, Cake, IdCard, Mail, MessageCircle, Phone, UserX } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Avatar } from '@/components/ui/avatar'
import { StatusChip, Tag } from '@/components/ui/badges'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { EmptyState, Skeleton } from '@/components/ui/display'
import { BackLink, RouteTabs, useTab } from '@/components/ui/page'
import { useClientHistory } from '@/features/agenda/api'
import { useProfessionals } from '@/features/professionals/api'
import { RecordsTab } from '@/features/records/records-tab'
import type { Appointment } from '@/lib/api/types'
import { useAccess } from '@/lib/auth/access'
import { formatCents } from '@/lib/format'
import { usePageMeta } from '@/lib/page-meta'
import { formatTime } from '@/lib/time'
import { ageFrom, CHANNEL_LABELS, formatDate, formatPhone, fullName, useClient, useUpdateClient } from './api'
import { ClientForm } from './client-form'

const TABS = ['citas', 'fichas', 'datos'] as const
type Tab = (typeof TABS)[number]

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'bad' }) {
  return (
    <div className="min-w-[84px]">
      <div className="text-2xs font-semibold text-muted">{label}</div>
      <div className={tone === 'bad' ? 'tabular text-lg font-semibold text-bad' : 'tabular text-lg font-semibold'}>{value}</div>
    </div>
  )
}

function AppointmentList({ items, empty, proName }: { items: Appointment[]; empty: string; proName: (id: string) => string | undefined }) {
  if (items.length === 0) return <p className="m-0 py-3 text-sm text-muted">{empty}</p>
  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {items.map((a) => (
        <li key={a.id} className="border-t border-line first:border-t-0">
          <Link to={`/agenda/citas/${a.id}`} className="-mx-2 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-control px-2 py-3 text-ink hover:bg-surface-2">
            <span className="tabular w-[150px] text-sm">
              <b className="font-semibold">{formatDate(a.startsAt)}</b> <span className="text-muted">{formatTime(a.startsAt)}</span>
            </span>
            <span className="min-w-[140px] flex-1">
              <span className="block truncate text-sm font-semibold">{a.serviceName}</span>
              {proName(a.professionalId) && <span className="block truncate text-2xs text-muted">con {proName(a.professionalId)}</span>}
            </span>
            <span className="tabular text-sm text-ink-2">{formatCents(a.price)}</span>
            <StatusChip status={a.status} />
          </Link>
        </li>
      ))}
    </ul>
  )
}

function Contact({ icon: Icon, children }: { icon: typeof Phone; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1">
      <Icon size={13} aria-hidden /> {children}
    </span>
  )
}

/** Perfil del cliente: quién es y su relación con el negocio, con pestañas por tema. */
export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { can, hasFeature, readOnly } = useAccess()
  const client = useClient(id)
  const history = useClientHistory(id)
  const professionals = useProfessionals(can('professional.read'))
  const update = useUpdateClient(id ?? '')
  const showRecords = can('client_record.read') && hasFeature('client_records')
  const tab = useTab<Tab>(TABS, 'citas')

  const c = client.data
  usePageMeta(c ? { title: fullName(c), crumb: `Clientes / ${fullName(c)}` } : null)

  if (client.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-[130px] rounded-card" />
        <Skeleton className="h-[300px] rounded-card" />
      </div>
    )
  }
  if (!c) {
    return (
      <Card>
        <EmptyState
          icon={UserX}
          title="No encontramos a este cliente"
          action={
            <Link to="/clientes" className="text-sm font-semibold text-brand hover:underline">
              Volver a Clientes
            </Link>
          }
        />
      </Card>
    )
  }

  const stats = history.data?.stats
  const upcoming = history.data?.upcoming ?? []
  const past = history.data?.past ?? []
  const proName = (pid: string) => professionals.data?.find((p) => p.id === pid)?.displayName
  const age = ageFrom(c.birthDate)
  const preferred = c.preferredProfessionalId ? proName(c.preferredProfessionalId) : undefined
  const digits = c.phone?.replace(/\D/g, '')
  const current = tab === 'fichas' && !showRecords ? 'citas' : tab

  return (
    <>
      <BackLink to="/clientes" label="Clientes" />

      <Card className="flex flex-col gap-5 p-6">
        <div className="flex flex-wrap items-center gap-5">
          <Avatar name={fullName(c)} size="lg" round className="size-16 text-xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="m-0 text-xl font-semibold">{fullName(c)}</h2>
              {c.tags.map((t) => (
                <Tag key={t} tone={t.toLowerCase() === 'vip' ? 'brand' : 'off'}>
                  {t}
                </Tag>
              ))}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
              {c.phone && <Contact icon={Phone}>{formatPhone(c.phone)}</Contact>}
              {c.email && <Contact icon={Mail}>{c.email}</Contact>}
              {age !== null && <Contact icon={Cake}>{age} años</Contact>}
              {c.documentId && <Contact icon={IdCard}>{c.documentId}</Contact>}
            </div>
            <div className="mt-1 text-xs text-muted">
              Prefiere {CHANNEL_LABELS[c.preferredChannel ?? 'whatsapp']}
              {preferred && ` · Se atiende con ${preferred}`}
              {c.source && ` · Llegó por ${c.source}`}
              {c.createdAt && ` · Cliente desde ${formatDate(c.createdAt)}`}
            </div>
          </div>
          <div className="flex flex-wrap gap-6">
            <Stat label="Visitas" value={stats ? String(stats.completed) : '—'} />
            <Stat label="Gastado" value={stats ? formatCents(stats.spent) : '—'} />
            <Stat label="Faltas" value={stats ? String(stats.noShows) : '—'} tone={stats?.noShows ? 'bad' : undefined} />
            <Stat label="Última visita" value={stats?.lastVisit ? formatDate(stats.lastVisit) : '—'} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {can('booking.create') && !readOnly && (
            <Button variant="primary" onClick={() => navigate(`/agenda/nueva?cliente=${c.id}`)}>
              <CalendarPlus size={14} aria-hidden /> Agendar cita
            </Button>
          )}
          {digits && digits.length >= 9 && (
            <a
              href={`https://wa.me/51${digits.slice(-9)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-control border border-line-strong bg-surface px-3.5 py-2 text-sm font-semibold text-ink-2 hover:border-teal"
            >
              <MessageCircle size={14} aria-hidden /> WhatsApp
            </a>
          )}
        </div>

        {c.notes && (
          <p className="m-0 rounded-[10px] bg-warn-bg px-4 py-3 text-sm whitespace-pre-line text-warn">
            <b className="font-semibold">Nota: </b>
            {c.notes}
          </p>
        )}
      </Card>

      <RouteTabs<Tab>
        fallback="citas"
        tabs={[
          {
            value: 'citas',
            label: 'Citas',
            badge: upcoming.length ? <span className="rounded-full bg-teal-soft px-1.5 text-2xs text-teal-ink">{upcoming.length}</span> : undefined,
          },
          ...(showRecords ? [{ value: 'fichas' as const, label: 'Fichas clínicas' }] : []),
          { value: 'datos', label: 'Datos' },
        ]}
      />

      {current === 'citas' &&
        (history.isLoading ? (
          <Skeleton className="h-[240px] rounded-card" />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Próximas" />
              <AppointmentList items={upcoming} empty="No tiene citas agendadas." proName={proName} />
            </Card>
            <Card>
              <CardHeader title="Historial" />
              <AppointmentList items={past} empty="Todavía no tiene citas anteriores." proName={proName} />
            </Card>
          </div>
        ))}

      {current === 'fichas' && <RecordsTab clientId={c.id} appointments={[...upcoming, ...past]} />}

      {current === 'datos' && (
        <Card>
          <ClientForm
            key={c.id}
            client={c}
            readOnly={readOnly || !can('client.update')}
            submitLabel="Guardar cambios"
            onSubmit={(input) => update.mutateAsync(input)}
          />
        </Card>
      )}
    </>
  )
}
