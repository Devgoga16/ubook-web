import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Checkbox, Switch } from '@/components/ui/controls'
import { Field, Input, Select } from '@/components/ui/field'
import { FormActions, FormSection } from '@/components/ui/page'
import { SERVICE_COLORS } from '@/features/services/colors'
import { errorMessage } from '@/lib/api/client'
import type { Branch, Member, Professional } from '@/lib/api/types'
import { cn } from '@/lib/cn'
import { useSaveProfessional } from './api'

const schema = z.object({
  displayName: z.string().trim().min(2, 'Ingresa el nombre').max(80),
  title: z.string().trim().max(80),
  email: z.string().trim().refine((v) => v === '' || z.email().safeParse(v).success, 'Email inválido'),
  phone: z.string().trim().refine((v) => v === '' || /^9\d{8}$/.test(v.replace(/\s/g, '')), 'Celular de 9 dígitos que empiece con 9'),
  color: z.string(),
  branchIds: z.array(z.string()).min(1, 'Elige al menos una sede'),
  commission: z.string().refine((v) => v === '' || (/^\d+$/.test(v) && Number(v) <= 100), 'Entre 0 y 100'),
  membershipId: z.string(),
  isActive: z.boolean(),
})
type Values = z.infer<typeof schema>

function toValues(p: Professional | null, branches: Branch[]): Values {
  return {
    displayName: p?.displayName ?? '',
    title: p?.title ?? '',
    email: p?.email ?? '',
    phone: p?.phone?.replace(/^\+51/, '') ?? '',
    color: p?.color ?? SERVICE_COLORS[0]!,
    branchIds: p?.branchIds ?? (branches.length === 1 ? [branches[0]!.id] : []),
    commission: p?.commissionPercent != null ? String(p.commissionPercent) : '',
    membershipId: p?.membershipId ?? '',
    isActive: p?.isActive ?? true,
  }
}

/** Datos del profesional por secciones. Sirve para crear y para la pestaña Perfil. */
export function ProfileForm({
  professional,
  branches,
  members,
  takenMemberships,
  onSaved,
  onCancel,
}: {
  professional: Professional | null
  branches: Branch[]
  /** `null` si el usuario no puede ver el equipo (no se muestra la vinculación). */
  members: Member[] | null
  takenMemberships: string[]
  onSaved: (saved: Professional) => void
  onCancel?: () => void
}) {
  const save = useSaveProfessional()
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues(professional, branches) })

  const submit = handleSubmit(async (v) => {
    setError(null)
    try {
      const saved = await save.mutateAsync({
        id: professional?.id,
        displayName: v.displayName,
        title: v.title,
        email: v.email || undefined,
        phone: v.phone ? `+51${v.phone.replace(/\s/g, '')}` : undefined,
        color: v.color,
        branchIds: v.branchIds,
        commissionPercent: v.commission === '' ? null : Number(v.commission),
        ...(members && { membershipId: v.membershipId || null }),
        ...(professional && { isActive: v.isActive }),
      })
      reset(toValues(saved, branches))
      onSaved(saved)
    } catch (e) {
      setError(errorMessage(e))
    }
  })

  const name = watch('displayName')
  const color = watch('color')
  const availableMembers = (members ?? []).filter(
    (m) => m.status === 'active' && (!takenMemberships.includes(m.id) || m.id === professional?.membershipId),
  )

  return (
    <form noValidate onSubmit={submit} className="flex flex-col">
      {error && (
        <div role="alert" className="mb-4 rounded-control bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">
          {error}
        </div>
      )}

      <FormSection title="Datos" description="Así aparece en la agenda y en la página de reservas.">
        <div className="flex items-center gap-3">
          <Avatar name={name || 'Nuevo profesional'} color={color} size="lg" round />
          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            <Field label="Nombre" error={errors.displayName?.message}>
              {(p) => <Input {...p} {...register('displayName')} placeholder="Ej.: Luis Paredes" autoFocus={!professional} />}
            </Field>
            <Field label="Cargo (opcional)" error={errors.title?.message}>
              {(p) => <Input {...p} {...register('title')} placeholder="Ej.: Barbero senior" />}
            </Field>
          </div>
        </div>
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

      <FormSection title="Contacto" description="Opcional. Solo lo ve el equipo del negocio.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Email" error={errors.email?.message}>
            {(p) => <Input {...p} {...register('email')} type="email" />}
          </Field>
          <Field label="Celular" error={errors.phone?.message}>
            {(p) => (
              <div className="flex">
                <span className="grid place-items-center rounded-l-control border border-r-0 border-line-strong bg-surface-2 px-2.5 text-body text-muted">
                  +51
                </span>
                <Input {...p} {...register('phone')} inputMode="numeric" placeholder="987 654 321" className="rounded-l-none" />
              </div>
            )}
          </Field>
        </div>
      </FormSection>

      <FormSection title="Sedes" description="Dónde atiende. Luego defines su horario en cada una.">
        <Controller
          control={control}
          name="branchIds"
          render={({ field }) => (
            <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
              <legend className="sr-only">Sedes donde atiende</legend>
              {branches.map((b) => (
                <label key={b.id} className="flex items-center gap-2.5 text-sm">
                  <Checkbox
                    checked={field.value.includes(b.id)}
                    onCheckedChange={(on) => field.onChange(on ? [...field.value, b.id] : field.value.filter((x) => x !== b.id))}
                  />
                  <span>
                    <span className="font-semibold">{b.name}</span>
                    {b.address && <span className="text-muted"> · {b.address}</span>}
                  </span>
                </label>
              ))}
              {errors.branchIds && <span className="text-2xs font-semibold text-bad">{errors.branchIds.message}</span>}
            </fieldset>
          )}
        />
      </FormSection>

      <FormSection title="Comisión" description="Porcentaje de lo que factura. Se usará en los reportes.">
        <Field label="Comisión %" error={errors.commission?.message} className="max-w-[160px]">
          {(p) => <Input {...p} {...register('commission')} inputMode="numeric" placeholder="Sin comisión" />}
        </Field>
      </FormSection>

      {members && (
        <FormSection
          title="Acceso al sistema"
          description="Vincúlalo con un usuario del equipo para que vea su propia agenda y gestione su horario."
        >
          <Field label="Usuario">
            {(p) => (
              <Select {...p} {...register('membershipId')}>
                <option value="">Sin acceso al sistema</option>
                {availableMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.user ? `${m.user.firstName} ${m.user.lastName} · ${m.user.email}` : m.id}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </FormSection>
      )}

      {professional && (
        <FormSection title="Estado" description="Un profesional inactivo no recibe citas y libera un cupo de tu plan.">
          <Controller
            control={control}
            name="isActive"
            render={({ field }) => (
              <label className="flex items-center gap-3 text-sm">
                <Switch checked={field.value} onCheckedChange={field.onChange} />
                {field.value ? 'Activo' : 'Inactivo'}
              </label>
            )}
          />
        </FormSection>
      )}

      <FormActions hint={professional && isDirty ? 'Tienes cambios sin guardar' : undefined}>
        {onCancel && (
          <Button onClick={onCancel} disabled={save.isPending}>
            Cancelar
          </Button>
        )}
        <Button type="submit" variant="primary" disabled={save.isPending || (!!professional && !isDirty)}>
          {save.isPending ? 'Guardando…' : professional ? 'Guardar cambios' : 'Crear y continuar'}
        </Button>
      </FormActions>
    </form>
  )
}
