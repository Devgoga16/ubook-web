import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/controls'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { FormActions, FormSection } from '@/components/ui/page'
import { useProfessionals } from '@/features/professionals/api'
import { ApiError, errorMessage } from '@/lib/api/client'
import type { Client, ClientInput, ContactChannel } from '@/lib/api/types'
import { useAccess } from '@/lib/auth/access'
import { todayLocal } from '@/lib/time'
import { CHANNEL_LABELS, formatDate, formatPhone } from './api'

const schema = z.object({
  firstName: z.string().trim().min(1, 'Escribe el nombre').max(60),
  lastName: z.string().trim().max(60),
  phone: z
    .string()
    .trim()
    .refine((v) => !v || /^9\d{8}$/.test(v.replace(/\s/g, '')), 'Celular de 9 dígitos que empiece con 9'),
  email: z.union([z.literal(''), z.email('Correo inválido')]),
  birthDate: z.string(),
  documentId: z
    .string()
    .trim()
    .refine((v) => !v || /^[A-Za-z0-9]{6,15}$/.test(v.replace(/[\s.-]/g, '')), 'DNI de 8 dígitos o carné de extranjería'),
  address: z.string().max(200),
  source: z.string(),
  preferredChannel: z.enum(['whatsapp', 'call', 'sms', 'email']),
  preferredProfessionalId: z.string(),
  tags: z.string(),
  notes: z.string().max(2000),
  dataConsent: z.boolean(),
  marketingConsent: z.boolean(),
})
type Values = z.infer<typeof schema>

const CLIENT_SOURCES = ['Recomendación', 'Instagram', 'Facebook', 'TikTok', 'Google', 'Pasó por el local', 'Página de reservas', 'Otro']

function toValues(c: Client | null): Values {
  return {
    firstName: c?.firstName ?? '',
    lastName: c?.lastName ?? '',
    phone: formatPhone(c?.phone),
    email: c?.email ?? '',
    birthDate: c?.birthDate ?? '',
    documentId: c?.documentId ?? '',
    address: c?.address ?? '',
    source: c?.source ?? '',
    preferredChannel: c?.preferredChannel ?? 'whatsapp',
    preferredProfessionalId: c?.preferredProfessionalId ?? '',
    tags: (c?.tags ?? []).join(', '),
    notes: c?.notes ?? '',
    dataConsent: !!c?.dataConsentAt,
    marketingConsent: c?.marketingConsent ?? false,
  }
}

function toInput(v: Values): ClientInput {
  return {
    firstName: v.firstName,
    lastName: v.lastName,
    phone: v.phone ? v.phone.replace(/\s/g, '') : null,
    email: v.email || null,
    birthDate: v.birthDate || null,
    documentId: v.documentId,
    address: v.address,
    source: v.source,
    preferredChannel: v.preferredChannel,
    preferredProfessionalId: v.preferredProfessionalId || null,
    tags: [...new Set(v.tags.split(',').map((t) => t.trim()).filter(Boolean))].slice(0, 12),
    notes: v.notes,
    dataConsent: v.dataConsent,
    marketingConsent: v.marketingConsent,
  }
}

/** Datos del cliente, agrupados por tema. Sirve para crear y para editar. */
export function ClientForm({
  client,
  onSubmit,
  onCancel,
  readOnly = false,
  submitLabel,
}: {
  client: Client | null
  onSubmit: (input: ClientInput) => Promise<Client>
  onCancel?: () => void
  readOnly?: boolean
  submitLabel: string
}) {
  const { can } = useAccess()
  const professionals = useProfessionals(can('professional.read'))
  const [error, setError] = useState<{ message: string; existingId?: string; pending?: ClientInput } | null>(null)
  const [saved, setSaved] = useState(false)
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues(client) })

  const save = async (input: ClientInput) => {
    setError(null)
    setSaved(false)
    try {
      const result = await onSubmit(input)
      reset(toValues(result))
      setSaved(true)
    } catch (e) {
      const code = e instanceof ApiError ? e.code : null
      const existingId =
        code === 'CLIENT_PHONE_TAKEN' || code === 'CLIENT_DOCUMENT_TAKEN' ? (e as ApiError).details?.clientId as string | undefined : undefined
      // Celular repetido: puede ser otra persona (un hijo con el número de la mamá).
      setError({ message: errorMessage(e), existingId, pending: code === 'CLIENT_PHONE_TAKEN' ? input : undefined })
    }
  }
  const submit = handleSubmit((values) => save(toInput(values)))

  const activePros = (professionals.data ?? []).filter((p) => p.isActive)

  return (
    <form noValidate onSubmit={submit} className="flex flex-col">
      {error && (
        <div role="alert" className="mb-4 rounded-control bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">
          {error.message}
          {error.existingId && (
            <>
              {' · '}
              <Link to={`/clientes/${error.existingId}`} className="underline underline-offset-2">
                Ver ese cliente
              </Link>
            </>
          )}
          {error.pending && (
            <div className="mt-2 flex flex-wrap items-center gap-2 font-normal text-ink-2">
              ¿Es otra persona que usa el mismo número?
              <Button size="sm" disabled={isSubmitting} onClick={() => void save({ ...error.pending, allowSharedPhone: true })}>
                Sí, guardar igual
              </Button>
            </div>
          )}
        </div>
      )}
      <fieldset disabled={readOnly || isSubmitting} className="m-0 flex min-w-0 flex-col border-0 p-0">
        <FormSection title="Datos personales" description="Cómo se llama y cómo identificarlo.">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nombre" error={errors.firstName?.message}>
              {(p) => <Input {...p} {...register('firstName')} autoFocus={!client} autoComplete="off" />}
            </Field>
            <Field label="Apellidos" error={errors.lastName?.message}>
              {(p) => <Input {...p} {...register('lastName')} autoComplete="off" />}
            </Field>
            <Field label="Fecha de nacimiento (opcional)" hint="Para saludarlo en su cumpleaños.">
              {(p) => <Input {...p} type="date" {...register('birthDate')} max={todayLocal()} />}
            </Field>
            <Field label="DNI / CE (opcional)" error={errors.documentId?.message}>
              {(p) => <Input {...p} {...register('documentId')} inputMode="numeric" autoComplete="off" />}
            </Field>
          </div>
        </FormSection>

        <FormSection title="Contacto" description="Por dónde le llegan confirmaciones y recordatorios.">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Celular" error={errors.phone?.message} hint="9 dígitos, sin +51.">
              {(p) => <Input {...p} {...register('phone')} inputMode="tel" placeholder="987 654 321" />}
            </Field>
            <Field label="Correo (opcional)" error={errors.email?.message}>
              {(p) => <Input {...p} type="email" {...register('email')} />}
            </Field>
            <Field label="Prefiere que lo contacten por">
              {(p) => (
                <Select {...p} {...register('preferredChannel')}>
                  {(Object.keys(CHANNEL_LABELS) as ContactChannel[]).map((k) => (
                    <option key={k} value={k}>
                      {CHANNEL_LABELS[k]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Dirección (opcional)">{(p) => <Input {...p} {...register('address')} />}</Field>
          </div>
        </FormSection>

        <FormSection title="Preferencias" description="Ayuda a recepción a atenderlo mejor.">
          <div className="grid gap-3 sm:grid-cols-2">
            {professionals.data && (
              <Field label="Profesional de preferencia">
                {(p) => (
                  <Select {...p} {...register('preferredProfessionalId')}>
                    <option value="">Sin preferencia</option>
                    {activePros.map((pro) => (
                      <option key={pro.id} value={pro.id}>
                        {pro.displayName}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            )}
            <Field label="¿Cómo nos conoció?">
              {(p) => (
                <Select {...p} {...register('source')}>
                  <option value="">—</option>
                  {CLIENT_SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
          <Field label="Etiquetas" hint='Separadas por coma. "VIP" lo destaca en la lista.'>
            {(p) => <Input {...p} {...register('tags')} placeholder="VIP, Prefiere mañanas" />}
          </Field>
          <Field label="Notas internas" hint="Solo las ve tu equipo.">
            {(p) => <Textarea {...p} {...register('notes')} rows={3} placeholder="Alergias, gustos, cómo prefiere su corte…" />}
          </Field>
        </FormSection>

        <FormSection title="Consentimientos" description="Ley N.º 29733 de Protección de Datos Personales.">
          <Controller
            control={control}
            name="dataConsent"
            render={({ field }) => (
              <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} className="mt-0.5" />
                <span>
                  Autorizó el tratamiento de sus datos personales
                  {client?.dataConsentAt && <span className="block text-2xs text-muted">Desde el {formatDate(client.dataConsentAt)}</span>}
                </span>
              </label>
            )}
          />
          <Controller
            control={control}
            name="marketingConsent"
            render={({ field }) => (
              <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} className="mt-0.5" />
                Acepta recibir promociones
              </label>
            )}
          />
        </FormSection>

        {!readOnly && (
          <FormActions hint={saved && !isDirty ? 'Cambios guardados' : undefined}>
            {onCancel && (
              <Button onClick={onCancel} disabled={isSubmitting}>
                Cancelar
              </Button>
            )}
            <Button type="submit" variant="primary" disabled={isSubmitting || (!!client && !isDirty)}>
              {isSubmitting ? 'Guardando…' : submitLabel}
            </Button>
          </FormActions>
        )}
      </fieldset>
    </form>
  )
}
