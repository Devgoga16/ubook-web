import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, Building2, CalendarCheck, ExternalLink, Globe, RotateCcw, Store, Trash2, User, Users } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Avatar } from '@/components/ui/avatar'
import { Tag, type TagTone } from '@/components/ui/badges'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { EmptyState, Skeleton } from '@/components/ui/display'
import { Field, Input, Select } from '@/components/ui/field'
import { KpiFlat } from '@/components/ui/kpi'
import { Modal } from '@/components/ui/overlays'
import { BackLink, FormActions, FormSection, RouteTabs, useTab } from '@/components/ui/page'
import { BUSINESS_TYPES } from '@/domain/business-types'
import { usePlans } from '@/features/auth/plans'
import { PaymentRow } from '@/features/billing/platform-payments'
import type { SubscriptionPayment } from '@/features/billing/api'
import { formatDate } from '@/features/clients/api'
import { api, errorMessage } from '@/lib/api/client'
import type { SubscriptionStatus } from '@/lib/api/types'
import { useAuth } from '@/lib/auth/auth-context'
import { usePageMeta } from '@/lib/page-meta'

interface Feature {
  key: string
  label: string
  type: 'flag' | 'limit'
  plan: boolean | number | null
  override?: boolean | number | null
  effective: boolean | number | null
}

interface OrgDetail {
  organization: { id: string; name: string; slug: string; businessType: string | null; timezone: string; country: string; currency: string; status: 'active' | 'suspended'; createdAt: string }
  owners: Array<{ userId: string; firstName: string; lastName: string; email: string; phone: string | null; lastLoginAt: string | null; isActive: boolean }>
  subscription: {
    planCode: string
    status: SubscriptionStatus
    effectiveStatus: SubscriptionStatus
    billingCycle: 'monthly' | 'yearly'
    trialEndsAt: string | null
    currentPeriodEnd: string | null
    readOnly: boolean
    features: Feature[]
  }
  usage: { branches: number; professionals: number; members: number; clients: number; appointments: number; appointmentsThisMonth: number; onlineBookings: number }
  payments: SubscriptionPayment[]
}

const STATUS: Record<SubscriptionStatus, { label: string; tone: TagTone }> = {
  trialing: { label: 'En prueba', tone: 'teal' },
  active: { label: 'Activa', tone: 'ok' },
  past_due: { label: 'Pago vencido', tone: 'warn' },
  cancelled: { label: 'Cancelada', tone: 'off' },
  expired: { label: 'Vencida', tone: 'bad' },
}
const TIMEZONES = ['America/Lima']
const TABS = ['resumen', 'negocio', 'dueno', 'suscripcion', 'pagos'] as const
type Tab = (typeof TABS)[number]
const ymd = (iso: string | null) => (iso ? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date(iso)) : '')
const endOfDayLima = (date: string) => new Date(`${date}T23:59:00-05:00`).toISOString()

function useSave(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ path, body }: { path: string; body: unknown }) => api<OrgDetail>(`/platform/organizations/${id}${path}`, { method: 'PATCH', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform'] }),
  })
}

function SaveBar({ busy, dirty, saved, onSave }: { busy: boolean; dirty: boolean; saved: boolean; onSave: () => void }) {
  return (
    <FormActions hint={saved && !dirty ? 'Cambios guardados' : undefined}>
      <Button variant="primary" disabled={!dirty || busy} onClick={onSave}>
        {busy ? 'Guardando…' : 'Guardar cambios'}
      </Button>
    </FormActions>
  )
}

function BusinessForm({ d, canEdit }: { d: OrgDetail; canEdit: boolean }) {
  const save = useSave(d.organization.id)
  const initial = { name: d.organization.name, slug: d.organization.slug, businessType: d.organization.businessType ?? '', timezone: d.organization.timezone }
  const [f, setF] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const dirty = JSON.stringify(f) !== JSON.stringify(initial)
  return (
    <Card>
      {error && <p role="alert" className="mb-4 rounded-control bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">{error}</p>}
      <fieldset disabled={!canEdit || save.isPending} className="m-0 flex min-w-0 flex-col border-0 p-0">
        <FormSection title="Negocio" description="Como aparece en uBook y en su página de reservas.">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nombre">{(p) => <Input {...p} value={f.name} onChange={(e) => (setF({ ...f, name: e.target.value }), setSaved(false))} />}</Field>
            <Field label="Rubro">
              {(p) => (
                <Select {...p} value={f.businessType} onChange={(e) => (setF({ ...f, businessType: e.target.value }), setSaved(false))}>
                  <option value="">Sin especificar</option>
                  {BUSINESS_TYPES.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Dirección de reservas" hint={`${window.location.origin}/reservar/${f.slug}`}>
              {(p) => <Input {...p} value={f.slug} onChange={(e) => (setF({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }), setSaved(false))} />}
            </Field>
            <Field label="Zona horaria">
              {(p) => (
                <Select {...p} value={f.timezone} onChange={(e) => (setF({ ...f, timezone: e.target.value }), setSaved(false))}>
                  {[...new Set([f.timezone, ...TIMEZONES])].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
          <p className="m-0 text-xs text-muted">
            País {d.organization.country} · moneda {d.organization.currency} · creado el {formatDate(d.organization.createdAt)}
          </p>
        </FormSection>
        {canEdit && (
          <SaveBar
            busy={save.isPending}
            dirty={dirty}
            saved={saved}
            onSave={async () => {
              setError(null)
              try {
                await save.mutateAsync({ path: '', body: { name: f.name.trim(), slug: f.slug, businessType: f.businessType || undefined, timezone: f.timezone } })
                setSaved(true)
              } catch (e) {
                setError(errorMessage(e))
              }
            }}
          />
        )}
      </fieldset>
    </Card>
  )
}

function OwnerForm({ d, owner, canEdit }: { d: OrgDetail; owner: OrgDetail['owners'][number]; canEdit: boolean }) {
  const save = useSave(d.organization.id)
  const initial = { firstName: owner.firstName, lastName: owner.lastName, email: owner.email, phone: owner.phone ?? '' }
  const [f, setF] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const set = (patch: Partial<typeof f>) => (setF({ ...f, ...patch }), setSaved(false))
  return (
    <Card>
      {error && <p role="alert" className="mb-4 rounded-control bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">{error}</p>}
      <fieldset disabled={!canEdit || save.isPending} className="m-0 flex min-w-0 flex-col border-0 p-0">
        <FormSection title="Cuenta del dueño" description="Con este correo inicia sesión. Si lo cambias, avísale.">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nombre">{(p) => <Input {...p} value={f.firstName} onChange={(e) => set({ firstName: e.target.value })} />}</Field>
            <Field label="Apellidos">{(p) => <Input {...p} value={f.lastName} onChange={(e) => set({ lastName: e.target.value })} />}</Field>
            <Field label="Correo (inicio de sesión)">{(p) => <Input {...p} type="email" value={f.email} onChange={(e) => set({ email: e.target.value })} />}</Field>
            <Field label="Celular">{(p) => <Input {...p} value={f.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="+51 987 654 321" />}</Field>
          </div>
          <p className="m-0 text-xs text-muted">
            Último ingreso: {owner.lastLoginAt ? formatDate(owner.lastLoginAt) : 'nunca'}
            {!owner.isActive && ' · cuenta desactivada'}
          </p>
        </FormSection>
        {canEdit && (
          <SaveBar
            busy={save.isPending}
            dirty={JSON.stringify(f) !== JSON.stringify(initial)}
            saved={saved}
            onSave={async () => {
              setError(null)
              try {
                await save.mutateAsync({
                  path: `/owners/${owner.userId}`,
                  body: { firstName: f.firstName.trim(), lastName: f.lastName.trim(), email: f.email.trim(), phone: f.phone.trim() || null },
                })
                setSaved(true)
              } catch (e) {
                setError(errorMessage(e))
              }
            }}
          />
        )}
      </fieldset>
    </Card>
  )
}

function featureValue(f: { type: 'flag' | 'limit' }, v: boolean | number | null | undefined): string {
  if (v === undefined) return '—'
  if (f.type === 'flag') return v ? 'Sí' : 'No'
  return v === null ? 'Ilimitado' : String(v)
}

function SubscriptionForm({ d, canEdit }: { d: OrgDetail; canEdit: boolean }) {
  const save = useSave(d.organization.id)
  const { data: plans } = usePlans()
  const s = d.subscription
  const initial = {
    planCode: s.planCode,
    status: s.status,
    billingCycle: s.billingCycle,
    trialEndsAt: ymd(s.trialEndsAt),
    currentPeriodEnd: ymd(s.currentPeriodEnd),
    overrides: Object.fromEntries(s.features.filter((x) => x.override !== undefined).map((x) => [x.key, x.override])) as Record<string, boolean | number | null>,
  }
  const [f, setF] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const set = (patch: Partial<typeof f>) => (setF({ ...f, ...patch }), setSaved(false))
  const setOverride = (key: string, value: boolean | number | null | undefined) => {
    const next = { ...f.overrides }
    if (value === undefined) delete next[key]
    else next[key] = value
    set({ overrides: next })
  }

  const submit = async () => {
    setError(null)
    // Excepciones quitadas → null para que la API vuelva al valor del plan.
    const removed = Object.keys(initial.overrides).filter((k) => !(k in f.overrides))
    try {
      await save.mutateAsync({
        path: '/subscription',
        body: {
          planCode: f.planCode,
          status: f.status,
          billingCycle: f.billingCycle,
          ...(f.trialEndsAt && { trialEndsAt: endOfDayLima(f.trialEndsAt) }),
          ...(f.currentPeriodEnd && { currentPeriodEnd: endOfDayLima(f.currentPeriodEnd) }),
          overrides: { ...f.overrides, ...Object.fromEntries(removed.map((k) => [k, null])) },
        },
      })
      setSaved(true)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <Card>
      {error && <p role="alert" className="mb-4 rounded-control bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">{error}</p>}
      <fieldset disabled={!canEdit || save.isPending} className="m-0 flex min-w-0 flex-col border-0 p-0">
        <FormSection title="Plan" description="Cambios manuales: para pagos reportados usa Aprobar en Pagos.">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Plan">
              {(p) => (
                <Select {...p} value={f.planCode} onChange={(e) => set({ planCode: e.target.value })}>
                  {(plans ?? []).map((x) => (
                    <option key={x.code} value={x.code}>
                      {x.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Estado">
              {(p) => (
                <Select {...p} value={f.status} onChange={(e) => set({ status: e.target.value as SubscriptionStatus })}>
                  {(Object.keys(STATUS) as SubscriptionStatus[]).map((k) => (
                    <option key={k} value={k}>
                      {STATUS[k].label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Ciclo">
              {(p) => (
                <Select {...p} value={f.billingCycle} onChange={(e) => set({ billingCycle: e.target.value as 'monthly' | 'yearly' })}>
                  <option value="monthly">Mensual</option>
                  <option value="yearly">Anual</option>
                </Select>
              )}
            </Field>
            <Field label="Fin de la prueba">{(p) => <Input {...p} type="date" value={f.trialEndsAt} onChange={(e) => set({ trialEndsAt: e.target.value })} />}</Field>
            <Field label="Pagado hasta">{(p) => <Input {...p} type="date" value={f.currentPeriodEnd} onChange={(e) => set({ currentPeriodEnd: e.target.value })} />}</Field>
          </div>
        </FormSection>
        <FormSection title="Límites y funciones" description="Una excepción reemplaza al valor del plan solo para este negocio.">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-2xs text-muted">
                  <th className="py-1.5 pr-3 font-medium">Función</th>
                  <th className="py-1.5 pr-3 font-medium">Plan</th>
                  <th className="py-1.5 font-medium">Excepción</th>
                </tr>
              </thead>
              <tbody>
                {s.features.map((x) => {
                  const has = x.key in f.overrides
                  const v = f.overrides[x.key]
                  return (
                    <tr key={x.key} className="border-t border-line">
                      <td className="py-2 pr-3">{x.label}</td>
                      <td className="py-2 pr-3 text-muted">{featureValue(x, x.plan)}</td>
                      <td className="py-2">
                        {x.type === 'flag' ? (
                          <Select aria-label={`Excepción de ${x.label}`} value={has ? String(v) : ''} onChange={(e) => setOverride(x.key, e.target.value === '' ? undefined : e.target.value === 'true')} className="w-[150px]">
                            <option value="">Según el plan</option>
                            <option value="true">Sí</option>
                            <option value="false">No</option>
                          </Select>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Select
                              aria-label={`Excepción de ${x.label}`}
                              value={!has ? '' : v === null ? 'unlimited' : 'number'}
                              onChange={(e) => setOverride(x.key, e.target.value === '' ? undefined : e.target.value === 'unlimited' ? null : typeof x.plan === 'number' ? x.plan : 1)}
                              className="w-[150px]"
                            >
                              <option value="">Según el plan</option>
                              <option value="number">Número</option>
                              <option value="unlimited">Ilimitado</option>
                            </Select>
                            {has && v !== null && (
                              <Input aria-label={`Valor de ${x.label}`} inputMode="numeric" value={String(v)} onChange={(e) => setOverride(x.key, Number(e.target.value.replace(/\D/g, '')) || 0)} className="w-20" />
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </FormSection>
        {canEdit && <SaveBar busy={save.isPending} dirty={JSON.stringify(f) !== JSON.stringify(initial)} saved={saved} onSave={() => void submit()} />}
      </fieldset>
    </Card>
  )
}

/** Superadmin / Negocio: la cuenta completa en uBook. */
/** Borrado definitivo: el negocio, todos sus datos, archivos y las cuentas que solo eran suyas. */
function DeleteOrganization({ d }: { d: OrgDetail }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState('')
  const remove = useMutation({
    mutationFn: () => api(`/platform/organizations/${d.organization.id}`, { method: 'DELETE', body: { confirm } }),
    onSuccess: () => {
      qc.removeQueries({ queryKey: ['platform', 'organization', d.organization.id] })
      void qc.invalidateQueries({ queryKey: ['platform'] })
      navigate('/superadmin', { replace: true })
    },
  })
  const matches = confirm.trim().toLowerCase() === d.organization.slug
  const close = (v: boolean) => {
    if (remove.isPending) return
    setOpen(v)
    setConfirm('')
    remove.reset()
  }

  return (
    <Card className="flex flex-col gap-3 border-bad/40">
      <CardHeader title="Zona de peligro" className="mb-0" />
      <div className="flex flex-wrap items-center gap-3">
        <p className="m-0 min-w-[240px] flex-1 text-sm text-muted">
          Elimina el negocio y absolutamente todo lo suyo. No se puede deshacer. Si solo quieres cortarle el acceso, usa <b className="font-semibold text-ink-2">Suspender</b>.
        </p>
        <Button variant="danger" onClick={() => setOpen(true)}>
          <Trash2 size={14} aria-hidden /> Eliminar negocio
        </Button>
      </div>

      <Modal open={open} onOpenChange={close} title={`Eliminar ${d.organization.name}`}>
        <div className="flex flex-col gap-3.5">
          <p className="m-0 rounded-control bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">Esta acción es definitiva: no hay papelera ni forma de recuperarlo.</p>
          <div className="text-sm">
            <p className="m-0 mb-1.5">Se borrará:</p>
            <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-ink-2">
              <li>
                {d.usage.appointments} citas, {d.usage.clients} clientes con sus fichas clínicas, cobros, caja y comisiones
              </li>
              <li>
                {d.usage.branches} sedes, {d.usage.professionals} profesionales, servicios, promociones, recursos y lista de espera
              </li>
              <li>Suscripción, {d.payments.length} pagos reportados y todas las fotos de comprobantes</li>
              <li>Equipo e invitaciones. Las cuentas que solo pertenecían a este negocio también se eliminan (incluida la del dueño si no tiene otro negocio)</li>
              <li>La página de reservas /reservar/{d.organization.slug} deja de existir</li>
            </ul>
          </div>
          <Field label={`Para confirmar, escribe ${d.organization.slug}`}>
            {(p) => <Input {...p} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" spellCheck={false} placeholder={d.organization.slug} autoFocus />}
          </Field>
          {remove.error && <p role="alert" className="m-0 text-sm font-semibold text-bad">{errorMessage(remove.error)}</p>}
          <div className="flex justify-end gap-2.5 pt-1">
            <Button onClick={() => close(false)} disabled={remove.isPending}>
              Cancelar
            </Button>
            <Button variant="danger" disabled={!matches || remove.isPending} onClick={() => remove.mutate()}>
              <Trash2 size={14} aria-hidden /> {remove.isPending ? 'Eliminando…' : 'Eliminar definitivamente'}
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  )
}

export function OrganizationDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const { me } = useAuth()
  const qc = useQueryClient()
  const canEdit = me?.user.platformRole === 'super_admin'
  const tab = useTab<Tab>(TABS, 'resumen')
  const { data: plans } = usePlans()
  const detail = useQuery({ queryKey: ['platform', 'organization', id], queryFn: () => api<OrgDetail>(`/platform/organizations/${id}`) })
  const status = useMutation({
    mutationFn: (s: 'active' | 'suspended') => api(`/platform/organizations/${id}/status`, { method: 'PATCH', body: { status: s } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform'] }),
  })
  const d = detail.data
  usePageMeta(d ? { title: d.organization.name, crumb: `Unify Tec / Negocios / ${d.organization.name}` } : null)

  if (detail.isLoading) return <Skeleton className="h-[420px] rounded-card" />
  if (!d) {
    return (
      <Card>
        <EmptyState icon={Building2} title="No encontramos este negocio" action={<Link to="/superadmin" className="text-sm font-semibold text-brand hover:underline">Volver</Link>} />
      </Card>
    )
  }

  const sub = d.subscription
  const st = d.organization.status === 'suspended' ? { label: 'Suspendido', tone: 'bad' as TagTone } : STATUS[sub.effectiveStatus]
  const planName = plans?.find((p) => p.code === sub.planCode)?.name ?? sub.planCode
  const owner = d.owners[0]
  const pending = d.payments.filter((p) => p.status === 'pending').length

  return (
    <>
      <BackLink to="/superadmin" label="Negocios" />
      <Card className="flex flex-wrap items-center gap-4 p-6">
        <Avatar name={d.organization.name} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="m-0 text-xl font-semibold">{d.organization.name}</h2>
            <Tag tone={st.tone}>{st.label}</Tag>
            <Tag>{planName}</Tag>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            {owner && (
              <span className="flex items-center gap-1">
                <User size={13} aria-hidden /> {owner.firstName} {owner.lastName} · {owner.email}
              </span>
            )}
            <a href={`/reservar/${d.organization.slug}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-ink">
              <Globe size={13} aria-hidden /> /reservar/{d.organization.slug} <ExternalLink size={11} aria-hidden />
            </a>
          </div>
        </div>
        {canEdit &&
          (d.organization.status === 'active' ? (
            <Button variant="danger" disabled={status.isPending} onClick={() => window.confirm(`¿Suspender ${d.organization.name}? No podrá usar uBook hasta reactivarlo.`) && status.mutate('suspended')}>
              <Ban size={14} aria-hidden /> Suspender
            </Button>
          ) : (
            <Button disabled={status.isPending} onClick={() => status.mutate('active')}>
              <RotateCcw size={14} aria-hidden /> Reactivar
            </Button>
          ))}
      </Card>

      <RouteTabs<Tab>
        fallback="resumen"
        tabs={[
          { value: 'resumen', label: 'Resumen' },
          { value: 'negocio', label: 'Negocio' },
          { value: 'dueno', label: 'Dueño' },
          { value: 'suscripcion', label: 'Suscripción' },
          { value: 'pagos', label: 'Pagos', badge: pending ? <span className="rounded-full bg-warn-bg px-1.5 text-2xs text-warn">{pending}</span> : undefined },
        ]}
      />

      {tab === 'resumen' && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiFlat icon={Store} label="Sedes activas" value={String(d.usage.branches)} />
            <KpiFlat icon={User} label="Profesionales" value={String(d.usage.professionals)} />
            <KpiFlat icon={Users} label="Clientes" value={String(d.usage.clients)} />
            <KpiFlat icon={CalendarCheck} label="Citas este mes" value={String(d.usage.appointmentsThisMonth)} />
          </div>
          <Card>
            <CardHeader title="Cuenta" />
            <dl className="m-0 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div><dt className="text-2xs font-semibold text-muted">Suscripción</dt><dd className="m-0">{planName} · {STATUS[sub.effectiveStatus].label}{sub.readOnly && ' (solo lectura)'}</dd></div>
              <div><dt className="text-2xs font-semibold text-muted">{sub.effectiveStatus === 'trialing' ? 'Fin de la prueba' : 'Pagado hasta'}</dt><dd className="m-0">{formatDate(sub.effectiveStatus === 'trialing' ? sub.trialEndsAt : sub.currentPeriodEnd)}</dd></div>
              <div><dt className="text-2xs font-semibold text-muted">Equipo con acceso</dt><dd className="m-0">{d.usage.members} {d.usage.members === 1 ? 'persona' : 'personas'}</dd></div>
              <div><dt className="text-2xs font-semibold text-muted">Citas totales</dt><dd className="m-0">{d.usage.appointments} ({d.usage.onlineBookings} online)</dd></div>
              <div><dt className="text-2xs font-semibold text-muted">Alta</dt><dd className="m-0">{formatDate(d.organization.createdAt)}</dd></div>
              <div><dt className="text-2xs font-semibold text-muted">Último ingreso del dueño</dt><dd className="m-0">{owner?.lastLoginAt ? formatDate(owner.lastLoginAt) : '—'}</dd></div>
            </dl>
          </Card>
        </>
      )}
      {tab === 'negocio' && (
        <>
          <BusinessForm key={JSON.stringify(d.organization)} d={d} canEdit={canEdit} />
          {canEdit && <DeleteOrganization d={d} />}
        </>
      )}
      {tab === 'dueno' &&
        (d.owners.length ? (
          d.owners.map((o) => <OwnerForm key={`${o.userId}-${o.email}`} d={d} owner={o} canEdit={canEdit} />)
        ) : (
          <Card>
            <p className="m-0 text-sm text-muted">Este negocio no tiene un dueño activo.</p>
          </Card>
        ))}
      {tab === 'suscripcion' && <SubscriptionForm key={JSON.stringify(sub)} d={d} canEdit={canEdit} />}
      {tab === 'pagos' && (
        <Card>
          <CardHeader title="Pagos de suscripción" />
          {d.payments.length ? (
            <ul className="m-0 list-none p-0">
              {d.payments.map((p) => (
                <PaymentRow key={p.id} p={{ ...p, organization: { id: d.organization.id, name: d.organization.name, slug: d.organization.slug } }} />
              ))}
            </ul>
          ) : (
            <p className="m-0 text-sm text-muted">Este negocio aún no reportó pagos.</p>
          )}
        </Card>
      )}
    </>
  )
}
