import { useQuery } from '@tanstack/react-query'
import { CircleAlert, Clock, MapPin, Phone, Scissors, UserX } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { Avatar } from '@/components/ui/avatar'
import { Tag } from '@/components/ui/badges'
import { Card } from '@/components/ui/card'
import { EmptyState, Skeleton } from '@/components/ui/display'
import { BackLink, RouteTabs, useTab } from '@/components/ui/page'
import { useServices } from '@/features/services/api'
import { api } from '@/lib/api/client'
import type { Branch } from '@/lib/api/types'
import { useAccess } from '@/lib/auth/access'
import { branchesQueryKey } from '@/lib/auth/branch-context'
import { usePageMeta } from '@/lib/page-meta'
import { useMembers, useProfessionals } from './api'
import { ProfileForm } from './profile-form'
import { summarizeSchedule } from './schedule-summary'
import { ServicesForm } from './services-form'
import { TimeOffCard } from './time-off-card'
import { useCanActOn } from './use-can-act-on'
import { WeekSchedule } from './week-schedule'

const TABS = ['horario', 'ausencias', 'servicios', 'perfil'] as const
type Tab = (typeof TABS)[number]

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[96px]">
      <div className="text-2xs font-semibold text-muted">{label}</div>
      <div className="tabular text-lg font-semibold">{value}</div>
    </div>
  )
}

/** Ficha del profesional: encabezado fijo con quién es y pestañas por tema. */
export function ProfessionalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const tab = useTab<Tab>(TABS, 'horario')
  const { can, scope, readOnly } = useAccess()
  const canActOn = useCanActOn()

  const professionals = useProfessionals()
  const services = useServices()
  const branches = useQuery({ queryKey: branchesQueryKey, queryFn: () => api<Branch[]>('/branches') })
  const members = useMembers(can('member.read'))

  const list = professionals.data ?? []
  const p = list.find((x) => x.id === id)
  usePageMeta(p ? { title: p.displayName, crumb: `Catálogo / Profesionales / ${p.displayName}` } : null)

  if (professionals.isLoading || branches.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-[120px] rounded-card" />
        <Skeleton className="h-[320px] rounded-card" />
      </div>
    )
  }
  if (!p) {
    return (
      <Card>
        <EmptyState
          icon={UserX}
          title="No encontramos a este profesional"
          action={
            <Link to="/profesionales" className="text-sm font-semibold text-brand hover:underline">
              Volver a Profesionales
            </Link>
          }
        />
      </Card>
    )
  }

  const activeBranches = (branches.data ?? []).filter((b) => b.isActive)
  const branchNames = activeBranches.filter((b) => p.branchIds.includes(b.id)).map((b) => b.name)
  const summary = summarizeSchedule(p.schedules)
  const catalog = services.data ?? []
  const canManageProfile = !readOnly && can('professional.manage') && canActOn('professional.manage', p)
  const canEditSchedule = !readOnly && canActOn('schedule.manage', p)
  const scheduleScope = scope('schedule.manage')
  const canDecide = canEditSchedule && (scheduleScope === 'branch' || scheduleScope === 'organization')

  const missing = [
    p.services.length === 0 && { tab: 'servicios', label: 'Asignar servicios' },
    summary.days === 0 && { tab: 'horario', label: 'Definir su horario' },
  ].filter(Boolean) as Array<{ tab: Tab; label: string }>

  return (
    <>
      <BackLink to="/profesionales" label="Profesionales" />

      <Card className="flex flex-col gap-5 p-6">
        <div className="flex flex-wrap items-center gap-5">
          <Avatar name={p.displayName} color={p.color} size="lg" round className="size-16 text-xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="m-0 text-xl font-semibold">{p.displayName}</h2>
              <Tag tone={p.isActive ? 'ok' : 'off'}>{p.isActive ? 'Activo' : 'Inactivo'}</Tag>
              {p.membershipId ? (
                <Tag tone="teal">Con acceso</Tag>
              ) : (
                can('member.manage') &&
                !readOnly && (
                  <Link to={`/equipo/invitar?profesional=${p.id}`} className="text-xs font-semibold text-brand hover:underline">
                    Dar acceso a uBook
                  </Link>
                )
              )}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
              <span>{p.title || 'Profesional'}</span>
              {branchNames.length > 0 && (
                <span className="flex items-center gap-1">
                  <MapPin size={13} aria-hidden /> {branchNames.join(', ')}
                </span>
              )}
              {p.phone && (
                <span className="flex items-center gap-1">
                  <Phone size={13} aria-hidden /> {p.phone}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-6">
            <Stat label="Servicios" value={String(p.services.length)} />
            <Stat label="Horas / semana" value={summary.hours ? String(summary.hours) : '—'} />
            <Stat label="Comisión" value={p.commissionPercent != null ? `${p.commissionPercent}%` : '—'} />
          </div>
        </div>

        {missing.length > 0 && (
          <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[10px] bg-warn-bg px-4 py-3 text-sm text-warn">
            <CircleAlert size={16} aria-hidden className="flex-none" />
            <span className="font-semibold">Para recibir reservas falta:</span>
            {missing.map((m) => (
              <Link key={m.tab} to={`?tab=${m.tab}`} replace className="font-semibold underline underline-offset-2">
                {m.label}
              </Link>
            ))}
          </div>
        )}
      </Card>

      <RouteTabs<Tab>
        fallback="horario"
        tabs={[
          {
            value: 'horario',
            label: 'Horario',
            badge: summary.label ? <span className="text-2xs font-medium text-muted">{summary.label}</span> : undefined,
          },
          { value: 'ausencias', label: 'Ausencias' },
          {
            value: 'servicios',
            label: 'Servicios',
            badge: <span className="rounded-full bg-surface-2 px-1.5 text-2xs">{p.services.length}</span>,
          },
          { value: 'perfil', label: 'Perfil' },
        ]}
      />

      {tab === 'horario' && <WeekSchedule key={p.id} professional={p} branches={activeBranches} canEdit={canEditSchedule} />}

      {tab === 'ausencias' && (
        <TimeOffCard key={p.id} professional={p} canRequest={canEditSchedule} canDecide={canDecide} />
      )}

      {tab === 'servicios' && (
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <Scissors size={16} aria-hidden className="text-brand" />
            <h3 className="m-0 text-md font-bold">Servicios que realiza</h3>
          </div>
          <ServicesForm key={p.id} professional={p} services={catalog} canEdit={canManageProfile} />
        </Card>
      )}

      {tab === 'perfil' &&
        (canManageProfile ? (
          <Card>
            <ProfileForm
              key={p.id}
              professional={p}
              branches={activeBranches}
              members={members.data ?? (can('member.read') ? [] : null)}
              takenMemberships={list.map((x) => x.membershipId).filter((m): m is string => !!m)}
              onSaved={() => {}}
              onCancel={() => navigate('?tab=horario', { replace: true })}
            />
          </Card>
        ) : (
          <Card>
            <p className="m-0 flex items-center gap-2 text-sm text-muted">
              <Clock size={15} aria-hidden /> Solo quien gestiona al equipo puede editar el perfil.
            </p>
          </Card>
        ))}
    </>
  )
}
