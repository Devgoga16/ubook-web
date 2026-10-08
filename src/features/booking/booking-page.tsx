import { CalendarPlus, CheckCircle2, Clock, Hourglass, MapPin, Pencil, Store, Users } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/controls'
import { EmptyState, Skeleton } from '@/components/ui/display'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { ProofUpload } from '@/components/ui/proof-upload'
import { ApiError, api, errorMessage } from '@/lib/api/client'
import type { DepositInfo, DepositMethod, PublicBookingView, PublicBusiness } from '@/lib/api/types'
import { cn } from '@/lib/cn'
import { formatCents } from '@/lib/format'
import { formatLongDate, formatTime, isoToZoned } from '@/lib/time'
import { DEPOSIT_METHOD_LABEL, businessSource, depositAmount, googleCalendarUrl, priceFrom, uploadDepositProof, useBusiness, useCreateBooking } from './api'
import { DateTimeChooser } from './date-time-chooser'
import { JoinWaitlist } from './join-waitlist'
import { PublicLayout } from './public-layout'

type Step = 'branch' | 'service' | 'professional' | 'time' | 'details'

const fmtDuration = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`)
const whenText = (iso: string) => `${formatLongDate(isoToZoned(iso).date)}, ${formatTime(iso)}`

/** Paso ya elegido: una línea con lo elegido y "Cambiar". */
function Done({ icon: Icon, label, value, onEdit }: { icon: typeof Clock; label: string; value: ReactNode; onEdit?: () => void }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className="grid size-9 flex-none place-items-center rounded-[10px] bg-brand-soft text-brand">
        <Icon size={16} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-2xs font-semibold text-muted">{label}</div>
        <div className="truncate text-sm font-semibold">{value}</div>
      </div>
      {onEdit && (
        <button type="button" onClick={onEdit} className="flex cursor-pointer items-center gap-1 text-xs font-semibold text-brand hover:underline">
          <Pencil size={12} aria-hidden /> Cambiar
        </button>
      )}
    </div>
  )
}

function OptionButton({ onClick, children, className }: { onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full cursor-pointer items-center gap-3 rounded-[12px] border border-line bg-surface px-4 py-3.5 text-left text-ink hover:border-teal hover:shadow-[0_0_0_1px_var(--teal-line)]',
        className,
      )}
    >
      {children}
    </button>
  )
}

function Success({ business, booking, token, onAnother }: { business: PublicBusiness; booking: PublicBookingView; token: string; onAnother: () => void }) {
  const pending = booking.status === 'pending'
  return (
    <Card className="flex flex-col items-center gap-4 px-6 py-8 text-center">
      <span className={cn('grid size-14 place-items-center rounded-full', pending ? 'bg-warn-bg text-warn' : 'bg-ok-bg text-ok')}>
        {pending ? <Hourglass size={26} aria-hidden /> : <CheckCircle2 size={28} aria-hidden />}
      </span>
      <div>
        <h2 className="m-0 text-xl font-semibold">{pending ? `¡Gracias, ${booking.clientFirstName}!` : `¡Listo, ${booking.clientFirstName}!`}</h2>
        <p className="mt-1 mb-0 max-w-[44ch] text-sm text-muted">
          {booking.deposit
            ? `Recibimos tu comprobante de ${formatCents(booking.deposit.amount)}. ${business.name} validará tu adelanto y te avisará apenas confirme la cita.`
            : pending
            ? `${business.name} revisará tu reserva y te avisará apenas la confirme.`
            : 'Tu cita quedó confirmada. Si dejaste tu correo, te enviamos los detalles y un recordatorio el día antes.'}
        </p>
      </div>
      <div className="w-full max-w-[420px] rounded-[14px] bg-surface-2 px-4 py-3 text-left">
        <Done icon={Clock} label="Cuándo" value={whenText(booking.startsAt)} />
        <Done icon={Users} label="Servicio" value={`${booking.serviceName} con ${booking.professional.displayName}`} />
        <Done icon={MapPin} label="Dónde" value={[booking.branch.name, booking.branch.address].filter(Boolean).join(' · ')} />
      </div>
      <div className="flex flex-wrap justify-center gap-2.5">
        <a
          href={googleCalendarUrl(booking)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-control border border-line-strong bg-surface px-3.5 py-2 text-sm font-semibold text-ink-2 hover:border-teal"
        >
          <CalendarPlus size={14} aria-hidden /> Agregar a mi calendario
        </a>
        <Link to={`/reserva/${token}`} className="inline-flex items-center rounded-control bg-grad px-3.5 py-2 text-sm font-semibold">
          Ver o cambiar mi reserva
        </Link>
      </div>
      <p className="m-0 text-2xs text-muted">Guarda el enlace "Ver o cambiar mi reserva" para cancelar o reprogramar.</p>
      <button type="button" onClick={onAnother} className="cursor-pointer text-sm font-semibold text-brand hover:underline">
        Reservar otra cita
      </button>
    </Card>
  )
}

type DepositDraft = { method: DepositMethod | ''; reference: string; proofKey: string | null }

/** El servicio pide adelanto: dónde pagar, cuánto y la foto del comprobante. */
function DepositStep({
  info,
  amount,
  approx,
  value,
  onChange,
  upload,
  errors,
}: {
  info: DepositInfo
  amount: number
  approx: boolean
  value: DepositDraft
  onChange: (next: DepositDraft) => void
  upload: (file: File) => Promise<string>
  errors: { method?: string; proof?: string }
}) {
  const ways = [
    info.yape && { label: 'Yape', text: info.yape },
    info.plin && { label: 'Plin', text: info.plin },
    info.bank && { label: 'Transferencia', text: info.bank },
  ].filter(Boolean) as Array<{ label: string; text: string }>
  return (
    <div className="flex flex-col gap-3 rounded-[12px] border border-teal-line bg-teal-soft/40 px-4 py-3.5">
      <div>
        <h3 className="m-0 text-sm font-bold">Adelanto para separar tu cita</h3>
        <p className="mt-0.5 mb-0 text-sm text-ink-2">
          Paga <b className="tabular">{formatCents(amount)}</b>
          {approx && ' (aprox., según el profesional)'} y sube la captura. El negocio la valida y te confirma la cita.
        </p>
      </div>
      {ways.length > 0 && (
        <dl className="m-0 grid gap-1.5 rounded-[10px] bg-surface px-3 py-2.5 text-sm">
          {ways.map((w) => (
            <div key={w.label} className="flex gap-2">
              <dt className="w-[104px] flex-none text-muted">{w.label}</dt>
              <dd className="m-0 font-semibold break-words whitespace-pre-line">{w.text}</dd>
            </div>
          ))}
        </dl>
      )}
      {info.notes && <p className="m-0 text-xs whitespace-pre-line text-muted">{info.notes}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="¿Cómo pagaste?" error={errors.method}>
          {(p) => (
            <Select {...p} value={value.method} onChange={(e) => onChange({ ...value, method: e.target.value as DepositMethod })}>
              <option value="">Elige…</option>
              {(Object.keys(DEPOSIT_METHOD_LABEL) as DepositMethod[]).map((m) => (
                <option key={m} value={m}>
                  {DEPOSIT_METHOD_LABEL[m]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="N.º de operación (opcional)">
          {(p) => <Input {...p} value={value.reference} maxLength={60} onChange={(e) => onChange({ ...value, reference: e.target.value })} />}
        </Field>
      </div>
      <ProofUpload upload={upload} onChange={(proofKey) => onChange({ ...value, proofKey })} error={errors.proof} />
    </div>
  )
}

/** /reservar/:slug — página pública para que el cliente reserve sin cuenta. */
export function BookingPage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const business = useBusiness(slug)
  const create = useCreateBooking(slug)

  const [branchId, setBranchId] = useState<string | null>(null)
  const [serviceId, setServiceId] = useState<string | null>(null)
  const [professionalId, setProfessionalId] = useState<string | null>(null) // 'any' = cualquiera
  const [startsAt, setStartsAt] = useState<string | null>(null)
  const [editing, setEditing] = useState<Step | null>(null)
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', email: '', notes: '', acceptsTerms: false, marketingConsent: false })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ token: string; booking: PublicBookingView } | null>(null)
  const [promoInput, setPromoInput] = useState('')
  const [promo, setPromo] = useState<{ code: string; type: 'percent' | 'amount'; value: number; description: string } | null>(null)
  const [promoError, setPromoError] = useState<string | null>(null)
  const [checkingPromo, setCheckingPromo] = useState(false)
  const [deposit, setDeposit] = useState<{ method: DepositMethod | ''; reference: string; proofKey: string | null }>({ method: '', reference: '', proofKey: null })

  const b = business.data
  const branch = b && (b.branches.length === 1 ? b.branches[0]! : b.branches.find((x) => x.id === branchId))
  const service = b?.services.find((s) => s.id === serviceId)
  const pros = useMemo(
    () => (b && branch && service ? b.professionals.filter((p) => p.branchIds.includes(branch.id) && p.services.some((s) => s.serviceId === service.id)) : []),
    [b, branch, service],
  )
  const onlyPro = pros.length === 1 ? pros[0]!.id : null
  const chosenPro = professionalId ?? onlyPro
  const pro = pros.find((p) => p.id === chosenPro)

  const step: Step = editing ?? (!branch ? 'branch' : !service ? 'service' : !chosenPro ? 'professional' : !startsAt ? 'time' : 'details')

  const reset = (from: Step) => {
    if (from === 'branch') setServiceId(null)
    if (from === 'branch' || from === 'service') setProfessionalId(null)
    setStartsAt(null)
    setEditing(null)
  }

  if (business.isLoading) {
    return (
      <PublicLayout>
        <Skeleton className="h-[420px] rounded-card" />
      </PublicLayout>
    )
  }
  if (!b) {
    return (
      <PublicLayout title="Reservas">
        <Card>
          <EmptyState
            icon={Store}
            title="Página no disponible"
            description={business.error instanceof ApiError ? business.error.message : 'No pudimos cargar esta página. Revisa el enlace.'}
          />
        </Card>
      </PublicLayout>
    )
  }

  const servicesInBranch = branch ? b.services.filter((s) => b.professionals.some((p) => p.branchIds.includes(branch.id) && p.services.some((x) => x.serviceId === s.id))) : []
  const price = service && branch ? (pro ? (pro.services.find((s) => s.serviceId === service.id)?.price ?? service.price) : priceFrom(b, service.id, branch.id).min) : 0
  const priceVaries = service && branch && !pro ? priceFrom(b, service.id, branch.id).varies : false
  const finalPrice = promo ? price - Math.min(price, promo.type === 'percent' ? Math.round((price * promo.value) / 100) : promo.value) : price
  const depositDue = service?.deposit ? depositAmount(service.deposit, finalPrice) : 0

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const next: Record<string, string> = {}
    if (!form.firstName.trim()) next.firstName = 'Escribe tu nombre'
    if (!form.lastName.trim()) next.lastName = 'Escribe tu apellido'
    if (!/^9\d{8}$/.test(form.phone.replace(/\s/g, ''))) next.phone = 'Celular de 9 dígitos que empiece con 9'
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'Correo inválido'
    if (!form.acceptsTerms) next.acceptsTerms = 'Necesitamos tu autorización para agendar'
    if (depositDue) {
      if (!deposit.method) next.depositMethod = 'Elige cómo pagaste'
      if (!deposit.proofKey) next.depositProof = 'Sube la foto de tu comprobante'
    }
    setErrors(next)
    if (Object.keys(next).length || !branch || !service || !startsAt) return
    try {
      const res = await create.mutateAsync({
        branchId: branch.id,
        serviceId: service.id,
        professionalId: chosenPro === 'any' ? undefined : (chosenPro ?? undefined),
        startsAt,
        client: { firstName: form.firstName.trim(), lastName: form.lastName.trim(), phone: form.phone.replace(/\s/g, ''), email: form.email.trim() || undefined },
        notes: form.notes.trim() || undefined,
        acceptsTerms: true,
        marketingConsent: form.marketingConsent,
        promoCode: promo?.code,
        ...(depositDue && deposit.proofKey && deposit.method && {
          deposit: { proofKey: deposit.proofKey, method: deposit.method, reference: deposit.reference.trim() || undefined },
        }),
      })
      setResult(res)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      if (err instanceof ApiError && err.code.startsWith('PROMO_')) {
        setPromo(null)
        setPromoError(err.message)
      } else if (err instanceof ApiError && (err.code === 'INVALID_PROOF' || err.code === 'INVALID_IMAGE')) {
        setDeposit((d) => ({ ...d, proofKey: null }))
        setErrors((x) => ({ ...x, depositProof: err.message }))
      } else if (err instanceof ApiError && (err.code === 'SLOT_TAKEN' || err.code === 'SLOT_UNAVAILABLE')) {
        setStartsAt(null)
        setError('Alguien acaba de tomar ese horario. Elige otro, por favor.')
      } else setError(errorMessage(err))
    }
  }

  const subtitle = branch ? (
    <span className="flex items-center gap-1">
      <MapPin size={13} aria-hidden /> {[branch.name, branch.address].filter(Boolean).join(' · ')}
    </span>
  ) : (
    'Reserva tu cita en línea'
  )

  if (result) {
    return (
      <PublicLayout title={b.name} subtitle={subtitle} logoUrl={b.logoUrl}>
        <Success
          business={b}
          booking={result.booking}
          token={result.token}
          onAnother={() => {
            setResult(null)
            setServiceId(null)
            reset('service')
          }}
        />
      </PublicLayout>
    )
  }

  return (
    <PublicLayout title={b.name} subtitle={subtitle} logoUrl={b.logoUrl}>
      {error && step !== 'details' && (
        <div role="alert" className="rounded-control bg-warn-bg px-4 py-3 text-sm font-semibold text-warn">
          {error}
        </div>
      )}

      {(step !== 'branch' || service) && (branch || service) && (
        <Card className="py-2">
          {b.branches.length > 1 && branch && (
            <Done icon={Store} label="Sede" value={branch.name} onEdit={() => (reset('branch'), setBranchId(null))} />
          )}
          {service && step !== 'service' && (
            <Done
              icon={Users}
              label="Servicio"
              value={`${service.name} · ${fmtDuration(pro?.services.find((s) => s.serviceId === service.id)?.durationMinutes ?? service.durationMinutes)}`}
              onEdit={() => (reset('service'), setServiceId(null))}
            />
          )}
          {chosenPro && step !== 'professional' && (
            <Done
              icon={Users}
              label="Profesional"
              value={chosenPro === 'any' ? 'Cualquiera disponible' : (pro?.displayName ?? '')}
              onEdit={pros.length > 1 ? () => (setStartsAt(null), setProfessionalId(null), setEditing(null)) : undefined}
            />
          )}
          {startsAt && step === 'details' && <Done icon={Clock} label="Cuándo" value={whenText(startsAt)} onEdit={() => setStartsAt(null)} />}
        </Card>
      )}

      {step === 'branch' && (
        <Card className="flex flex-col gap-3">
          <h2 className="m-0 text-md font-bold">¿En qué sede?</h2>
          {b.branches.map((x) => (
            <OptionButton key={x.id} onClick={() => (setBranchId(x.id), reset('branch'))}>
              <MapPin size={18} className="flex-none text-teal-ink" aria-hidden />
              <span className="min-w-0 flex-1">
                <b className="block font-semibold">{x.name}</b>
                {x.address && <span className="block truncate text-xs text-muted">{x.address}</span>}
                {x.reference && <span className="block truncate text-xs text-muted">{x.reference}</span>}
              </span>
            </OptionButton>
          ))}
        </Card>
      )}

      {step === 'service' && branch && (
        <Card className="flex flex-col gap-4">
          <h2 className="m-0 text-md font-bold">¿Qué servicio quieres?</h2>
          {servicesInBranch.length === 0 && <p className="m-0 text-sm text-muted">Esta sede no tiene servicios para reservar online por ahora.</p>}
          {[...b.categories, { id: null as string | null, name: b.categories.length ? 'Otros' : '' }].map((cat) => {
            const list = servicesInBranch.filter((s) => s.categoryId === cat.id || (cat.id === null && !b.categories.some((c) => c.id === s.categoryId)))
            if (!list.length) return null
            return (
              <div key={cat.id ?? 'none'} className="flex flex-col gap-2">
                {cat.name && <h3 className="m-0 text-xs font-semibold tracking-wide text-muted uppercase">{cat.name}</h3>}
                {list.map((s) => {
                  const p = priceFrom(b, s.id, branch.id)
                  return (
                    <OptionButton key={s.id} onClick={() => (setServiceId(s.id), reset('service'))}>
                      <span aria-hidden className="h-10 w-1 flex-none rounded-full" style={{ background: s.color }} />
                      <span className="min-w-0 flex-1">
                        <b className="block font-semibold">{s.name}</b>
                        {s.description && <span className="line-clamp-2 block text-xs text-muted">{s.description}</span>}
                        <span className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                          <Clock size={12} aria-hidden /> {fmtDuration(s.durationMinutes)}
                        </span>
                      </span>
                      <span className="tabular text-right text-sm font-semibold whitespace-nowrap">
                        {p.varies && <span className="block text-2xs font-normal text-muted">desde</span>}
                        {formatCents(p.min)}
                      </span>
                    </OptionButton>
                  )
                })}
              </div>
            )
          })}
        </Card>
      )}

      {step === 'professional' && service && (
        <Card className="flex flex-col gap-3">
          <h2 className="m-0 text-md font-bold">¿Con quién?</h2>
          <OptionButton onClick={() => (setProfessionalId('any'), setStartsAt(null), setEditing(null))}>
            <span className="grid size-[34px] flex-none place-items-center rounded-full bg-teal-soft text-teal-ink">
              <Users size={16} aria-hidden />
            </span>
            <span className="flex-1">
              <b className="block font-semibold">Cualquiera disponible</b>
              <span className="block text-xs text-muted">Te mostramos todos los horarios libres</span>
            </span>
          </OptionButton>
          {pros.map((p) => {
            const own = p.services.find((s) => s.serviceId === service.id)
            return (
              <OptionButton key={p.id} onClick={() => (setProfessionalId(p.id), setStartsAt(null), setEditing(null))}>
                <Avatar name={p.displayName} color={p.color} round />
                <span className="min-w-0 flex-1">
                  <b className="block font-semibold">{p.displayName}</b>
                  {p.title && <span className="block truncate text-xs text-muted">{p.title}</span>}
                </span>
                <span className="tabular text-sm font-semibold">{formatCents(own?.price ?? service.price)}</span>
              </OptionButton>
            )
          })}
        </Card>
      )}

      {step === 'time' && branch && service && chosenPro && (
        <Card className="flex flex-col gap-3">
          <h2 className="m-0 text-md font-bold">Elige día y hora</h2>
          <DateTimeChooser
            source={businessSource(slug, { branchId: branch.id, serviceId: service.id, professionalId: chosenPro === 'any' ? undefined : chosenPro })}
            maxAdvanceDays={b.rules.maxAdvanceDays}
            value={startsAt}
            onChange={(t) => {
              setStartsAt(t)
              setError(null)
              setEditing(null)
            }}
          />
          <div className="border-t border-line pt-3">
            <JoinWaitlist
              key={`${branch.id}-${service.id}-${chosenPro}`}
              slug={slug}
              businessName={b.name}
              branchId={branch.id}
              serviceId={service.id}
              professionalId={chosenPro === 'any' ? undefined : chosenPro}
            />
          </div>
        </Card>
      )}

      {step === 'details' && service && (
        <Card>
          <form noValidate onSubmit={submit} className="flex flex-col gap-3.5">
            <h2 className="m-0 text-md font-bold">Tus datos</h2>
            {error && (
              <div role="alert" className="rounded-control bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">
                {error}
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nombre" error={errors.firstName}>
                {(p) => <Input {...p} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} autoComplete="given-name" autoFocus />}
              </Field>
              <Field label="Apellido" error={errors.lastName}>
                {(p) => <Input {...p} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} autoComplete="family-name" />}
              </Field>
              <Field label="Celular" error={errors.phone}>
                {(p) => (
                  <Input {...p} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} inputMode="tel" autoComplete="tel-national" placeholder="987 654 321" />
                )}
              </Field>
              <Field label="Correo (opcional)" error={errors.email} hint="Para la confirmación y el recordatorio.">
                {(p) => <Input {...p} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />}
              </Field>
            </div>
            <Field label="¿Algo que debamos saber? (opcional)">
              {(p) => <Textarea {...p} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={500} />}
            </Field>

            <div className="flex flex-col gap-2 rounded-[12px] bg-surface-2 px-4 py-3">
              <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                <Checkbox checked={form.acceptsTerms} onCheckedChange={(v) => setForm({ ...form, acceptsTerms: v === true })} className="mt-0.5" />
                <span>
                  Autorizo a {b.name} a usar mis datos para gestionar mi cita y enviarme avisos sobre ella (Ley N.º 29733).
                  {errors.acceptsTerms && <span className="block text-2xs font-semibold text-bad">{errors.acceptsTerms}</span>}
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                <Checkbox checked={form.marketingConsent} onCheckedChange={(v) => setForm({ ...form, marketingConsent: v === true })} className="mt-0.5" />
                Quiero recibir promociones (opcional)
              </label>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-2xs font-semibold text-muted">¿Tienes un cupón?</span>
              {promo ? (
                <p className="m-0 flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded-[6px] bg-teal-soft px-2 py-0.5 font-mono font-semibold text-teal-ink">{promo.code}</span>
                  <span className="text-ok">−{promo.type === 'percent' ? `${promo.value}%` : formatCents(promo.value)}</span>
                  {promo.description && <span className="text-xs text-muted">{promo.description}</span>}
                  <button type="button" onClick={() => setPromo(null)} className="cursor-pointer text-xs font-semibold text-brand hover:underline">
                    Quitar
                  </button>
                </p>
              ) : (
                <div className="flex gap-2">
                  <Input aria-label="Código de cupón" value={promoInput} onChange={(e) => (setPromoInput(e.target.value.toUpperCase()), setPromoError(null))} placeholder="CÓDIGO" className="max-w-[200px] font-mono uppercase" />
                  <Button
                    disabled={!promoInput.trim() || checkingPromo}
                    onClick={async () => {
                      setCheckingPromo(true)
                      setPromoError(null)
                      try {
                        setPromo(await api(`/public/businesses/${slug}/promotions/${encodeURIComponent(promoInput.trim())}?serviceId=${service.id}`, { skipRefresh: true }))
                      } catch (err) {
                        setPromoError(errorMessage(err))
                      } finally {
                        setCheckingPromo(false)
                      }
                    }}
                  >
                    Aplicar
                  </Button>
                </div>
              )}
              {promoError && <span className="text-2xs font-semibold text-bad">{promoError}</span>}
            </div>

            {depositDue > 0 && (
              <DepositStep
                info={b.depositInfo}
                amount={depositDue}
                approx={priceVaries}
                value={deposit}
                onChange={(next) => {
                  setDeposit(next)
                  setErrors(({ depositMethod, depositProof, ...rest }) => ({
                    ...rest,
                    ...(!next.method && depositMethod && { depositMethod }),
                    ...(!next.proofKey && depositProof && { depositProof }),
                  }))
                }}
                upload={(file) => uploadDepositProof(slug, file)}
                errors={{ method: errors.depositMethod, proof: errors.depositProof }}
              />
            )}

            <div className="flex flex-wrap items-center gap-3 border-t border-line pt-3.5">
              <div className="flex-1">
                <div className="text-2xs text-muted">{depositDue ? 'Total del servicio' : 'Total a pagar en el local'}</div>
                <div className="tabular text-lg font-semibold">
                  {priceVaries && <span className="text-xs font-normal text-muted">desde </span>}
                  {promo ? (
                    <>
                      <span className="mr-2 text-sm font-normal text-muted line-through">{formatCents(price)}</span>
                      {formatCents(finalPrice)}
                    </>
                  ) : (
                    formatCents(price)
                  )}
                </div>
                {depositDue > 0 && (
                  <div className="text-2xs text-muted">
                    Adelanto {formatCents(depositDue)} · resto en el local {formatCents(Math.max(0, finalPrice - depositDue))}
                  </div>
                )}
                {promo && <div className="text-2xs text-muted">El descuento se confirma al reservar según el día y la hora.</div>}
              </div>
              <Button type="submit" variant="primary" disabled={create.isPending} className="px-5 py-2.5">
                {create.isPending ? 'Reservando…' : 'Confirmar reserva'}
              </Button>
            </div>
            {b.rules.freeCancellationHours != null && (
              <p className="m-0 text-2xs text-muted">Puedes cancelar o cambiar tu cita sin costo hasta {b.rules.freeCancellationHours} h antes.</p>
            )}
          </form>
        </Card>
      )}
    </PublicLayout>
  )
}
