import { zodResolver } from '@hookform/resolvers/zod'
import { Archive, ChevronRight, FileQuestion } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router'
import { z } from 'zod'
import { Avatar } from '@/components/ui/avatar'
import { Tag } from '@/components/ui/badges'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/controls'
import { EmptyState, Skeleton } from '@/components/ui/display'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { BackLink, FormActions, FormSection } from '@/components/ui/page'
import { useProfessionals } from '@/features/professionals/api'
import { errorMessage } from '@/lib/api/client'
import type { Service, ServiceCategory, ServiceInput } from '@/lib/api/types'
import { useAccess } from '@/lib/auth/access'
import { cn } from '@/lib/cn'
import { formatCents, initials, parseSoles } from '@/lib/format'
import { usePageMeta } from '@/lib/page-meta'
import { useCategories, useSaveService, useServices } from './api'
import { SERVICE_COLORS } from './colors'

const minutes = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .refine((v) => /^\d+$/.test(v) && Number(v) >= min && Number(v) <= max, `${label}: entre ${min} y ${max} minutos`)

const schema = z
  .object({
    name: z.string().trim().min(2, 'Ingresa el nombre').max(80),
    categoryId: z.string(),
    description: z.string().max(500),
    color: z.string(),
    durationMinutes: minutes(5, 720, 'Duración'),
    price: z.string().refine((v) => parseSoles(v) !== null, 'Ingresa un precio válido, p. ej. 50 o 49.90'),
    bufferBeforeMinutes: minutes(0, 240, 'Antes'),
    bufferAfterMinutes: minutes(0, 240, 'Después'),
    onlineBooking: z.boolean(),
    depositEnabled: z.boolean(),
    depositPercent: z.string(),
  })
  .refine(
    (v) =>
      !v.depositEnabled ||
      (/^\d+$/.test(v.depositPercent) && Number(v.depositPercent) >= 1 && Number(v.depositPercent) <= 100),
    { path: ['depositPercent'], message: 'Entre 1 y 100 %' },
  )
type Values = z.infer<typeof schema>

function toValues(s: Service | null): Values {
  return {
    name: s?.name ?? '',
    categoryId: s?.categoryId ?? '',
    description: s?.description ?? '',
    color: s?.color ?? SERVICE_COLORS[0]!,
    durationMinutes: String(s?.durationMinutes ?? 30),
    price: s ? (s.price / 100).toFixed(2) : '',
    bufferBeforeMinutes: String(s?.bufferBeforeMinutes ?? 0),
    bufferAfterMinutes: String(s?.bufferAfterMinutes ?? 0),
    onlineBooking: s?.onlineBooking ?? true,
    depositEnabled: s?.deposit.enabled ?? false,
    depositPercent: String(s?.deposit.type === 'percent' && s.deposit.value ? s.deposit.value : 30),
  }
}

function toInput(v: Values): ServiceInput {
  return {
    name: v.name,
    categoryId: v.categoryId || null,
    description: v.description,
    color: v.color,
    durationMinutes: Number(v.durationMinutes),
    price: parseSoles(v.price)!,
    bufferBeforeMinutes: Number(v.bufferBeforeMinutes),
    bufferAfterMinutes: Number(v.bufferAfterMinutes),
    onlineBooking: v.onlineBooking,
    deposit: { enabled: v.depositEnabled, type: 'percent', value: v.depositEnabled ? Number(v.depositPercent) : 0 },
  }
}

function ServiceForm({
  service,
  categories,
  readOnly,
}: {
  service: Service | null
  categories: ServiceCategory[]
  readOnly: boolean
}) {
  const navigate = useNavigate()
  const save = useSaveService()
  const { can } = useAccess()
  const professionals = useProfessionals(can('professional.read'))
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues(service) })

  const submit = handleSubmit(async (values) => {
    setError(null)
    try {
      const saved = await save.mutateAsync({ id: service?.id, ...toInput(values) })
      if (service) reset(toValues(saved))
      else navigate('/servicios', { replace: true })
    } catch (e) {
      setError(errorMessage(e))
    }
  })

  const archive = async () => {
    if (!service || !window.confirm(`¿Archivar "${service.name}"? Dejará de ofrecerse, pero se conserva en el historial.`)) return
    try {
      await save.mutateAsync({ id: service.id, isArchived: true })
      navigate('/servicios', { replace: true })
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  const name = watch('name')
  const color = watch('color')
  const duration = Number(watch('durationMinutes')) || 0
  const before = Number(watch('bufferBeforeMinutes')) || 0
  const after = Number(watch('bufferAfterMinutes')) || 0
  const price = parseSoles(watch('price'))
  const depositEnabled = watch('depositEnabled')
  const depositPercent = Number(watch('depositPercent'))
  const doers = service
    ? (professionals.data ?? []).filter((p) => p.isActive && p.services.some((s) => s.serviceId === service.id))
    : []

  return (
    <form noValidate onSubmit={submit} className="flex flex-col">
      {error && (
        <div role="alert" className="mb-4 rounded-control bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">
          {error}
        </div>
      )}
      <fieldset disabled={readOnly || save.isPending} className="m-0 flex min-w-0 flex-col border-0 p-0">
        <FormSection title="Información" description="Lo que ve tu cliente al reservar.">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="grid size-[52px] flex-none place-items-center rounded-[14px] text-lg font-semibold text-white"
              style={{ background: `linear-gradient(140deg, ${color}, color-mix(in srgb, ${color} 60%, #1F2245))` }}
            >
              {initials(name || 'Servicio')}
            </span>
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              <Field label="Nombre" error={errors.name?.message}>
                {(p) => <Input {...p} {...register('name')} placeholder="Ej.: Corte + barba" autoFocus={!service} />}
              </Field>
              <Field label="Categoría">
                {(p) => (
                  <Select {...p} {...register('categoryId')}>
                    <option value="">Sin categoría</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>
          </div>
          <Field label="Descripción (opcional)" error={errors.description?.message}>
            {(p) => <Textarea {...p} {...register('description')} placeholder="Qué incluye, recomendaciones…" />}
          </Field>
          <Controller
            control={control}
            name="color"
            render={({ field }) => (
              <div className="flex flex-col gap-1.5">
                <span className="text-2xs font-semibold text-muted">Color en la agenda</span>
                <div role="radiogroup" aria-label="Color en la agenda" className="flex gap-2">
                  {SERVICE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      role="radio"
                      aria-checked={field.value === c}
                      aria-label={`Color ${c}`}
                      onClick={() => field.onChange(c)}
                      className={cn(
                        'size-7 cursor-pointer rounded-full border-2 border-surface shadow-[0_0_0_1px_var(--line-strong)]',
                        field.value === c && 'shadow-[0_0_0_2px_var(--teal)]',
                      )}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>
            )}
          />
        </FormSection>

        <FormSection
          title="Duración y precio"
          description="Los tiempos antes y después bloquean la agenda pero no los ve el cliente (preparación, limpieza)."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Duración (min)" error={errors.durationMinutes?.message}>
              {(p) => <Input {...p} {...register('durationMinutes')} inputMode="numeric" />}
            </Field>
            <Field label="Precio (S/)" error={errors.price?.message}>
              {(p) => <Input {...p} {...register('price')} inputMode="decimal" placeholder="50.00" />}
            </Field>
            <Field label="Tiempo antes (min)" error={errors.bufferBeforeMinutes?.message}>
              {(p) => <Input {...p} {...register('bufferBeforeMinutes')} inputMode="numeric" />}
            </Field>
            <Field label="Tiempo después (min)" error={errors.bufferAfterMinutes?.message}>
              {(p) => <Input {...p} {...register('bufferAfterMinutes')} inputMode="numeric" />}
            </Field>
          </div>
          {duration > 0 && (
            <p className="m-0 rounded-control bg-surface-2 px-3 py-2 text-xs text-muted">
              Cada cita ocupa <b className="text-ink">{before + duration + after} min</b> de la agenda
              {before + after > 0 && ` (${duration} de atención + ${before + after} de preparación y limpieza)`}.
            </p>
          )}
        </FormSection>

        <FormSection title="Reserva online" description="Cómo se ofrece en tu página de reservas.">
          <Controller
            control={control}
            name="onlineBooking"
            render={({ field }) => (
              <label className="flex items-center justify-between gap-3">
                <span>
                  <span className="block text-sm font-semibold">Se puede reservar online</span>
                  <span className="text-xs text-muted">Si lo apagas, solo el equipo puede agendarlo</span>
                </span>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </label>
            )}
          />
          <Controller
            control={control}
            name="depositEnabled"
            render={({ field }) => (
              <label className="flex items-center justify-between gap-3">
                <span>
                  <span className="block text-sm font-semibold">Pedir depósito</span>
                  <span className="text-xs text-muted">
                    {depositEnabled && price !== null && depositPercent >= 1 && depositPercent <= 100
                      ? `${depositPercent}% al reservar online · ${formatCents(Math.round((price * depositPercent) / 100))}`
                      : 'Un porcentaje del precio al reservar online'}
                  </span>
                </span>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </label>
            )}
          />
          {depositEnabled && (
            <Field label="Depósito (%)" error={errors.depositPercent?.message} className="max-w-[140px]">
              {(p) => <Input {...p} {...register('depositPercent')} inputMode="numeric" />}
            </Field>
          )}
        </FormSection>

        {service && professionals.data && (
          <FormSection title="Quién lo realiza" description="Se asigna desde la ficha de cada profesional.">
            {doers.length === 0 ? (
              <p className="m-0 text-sm text-muted">
                Nadie todavía.{' '}
                <Link to="/profesionales" className="font-semibold text-brand hover:underline">
                  Ir a Profesionales
                </Link>
              </p>
            ) : (
              <ul className="m-0 flex list-none flex-col p-0">
                {doers.map((p) => {
                  const own = p.services.find((x) => x.serviceId === service.id)?.price
                  return (
                    <li key={p.id} className="border-t border-line first:border-t-0">
                      <Link
                        to={`/profesionales/${p.id}?tab=servicios`}
                        className="flex items-center gap-2.5 py-2 text-sm text-ink hover:text-brand"
                      >
                        <Avatar name={p.displayName} color={p.color} size="xs" round />
                        <span className="font-semibold">{p.displayName}</span>
                        <span className="ml-auto text-xs text-muted">
                          {own != null ? `Cobra ${formatCents(own)}` : 'Precio del catálogo'}
                        </span>
                        <ChevronRight size={15} className="text-muted" aria-hidden />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </FormSection>
        )}
      </fieldset>

      {!readOnly && (
        <FormActions hint={service && isDirty ? 'Tienes cambios sin guardar' : undefined}>
          {service && (
            <Button variant="danger" onClick={() => void archive()} disabled={save.isPending}>
              <Archive size={14} aria-hidden /> Archivar
            </Button>
          )}
          <Button onClick={() => navigate('/servicios')} disabled={save.isPending}>
            {service ? 'Volver' : 'Cancelar'}
          </Button>
          <Button type="submit" variant="primary" disabled={save.isPending || (!!service && !isDirty)}>
            {save.isPending ? 'Guardando…' : service ? 'Guardar cambios' : 'Crear servicio'}
          </Button>
        </FormActions>
      )}
    </form>
  )
}

/** /servicios/nuevo y /servicios/:id */
export function ServiceFormPage() {
  const { id } = useParams<{ id: string }>()
  const { can, readOnly } = useAccess()
  const services = useServices()
  const categories = useCategories()
  const service = id ? (services.data?.find((s) => s.id === id) ?? null) : null
  const category = categories.data?.find((c) => c.id === service?.categoryId)
  usePageMeta(
    id && service
      ? { title: service.name, crumb: `Catálogo / Servicios / ${service.name}` }
      : !id
        ? { title: 'Nuevo servicio', crumb: 'Catálogo / Servicios / Nuevo' }
        : null,
  )

  if (services.isLoading || categories.isLoading) return <Skeleton className="h-[420px] rounded-card" />
  if (id && !service) {
    return (
      <Card>
        <EmptyState
          icon={FileQuestion}
          title="No encontramos este servicio"
          description="Puede que esté archivado."
          action={
            <Link to="/servicios" className="text-sm font-semibold text-brand hover:underline">
              Volver a Servicios
            </Link>
          }
        />
      </Card>
    )
  }

  return (
    <>
      <BackLink to="/servicios" label="Servicios" />
      {service && (
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="m-0 text-xl font-semibold">{service.name}</h2>
          {category && <Tag tone="off">{category.name}</Tag>}
          {!service.onlineBooking && <Tag tone="warn">Solo agenda interna</Tag>}
        </div>
      )}
      <Card className="p-6">
        <ServiceForm
          key={service?.id ?? 'new'}
          service={service}
          categories={categories.data ?? []}
          readOnly={readOnly || !can('service.manage')}
        />
      </Card>
    </>
  )
}
