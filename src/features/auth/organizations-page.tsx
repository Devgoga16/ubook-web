import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, ArrowRight, LogOut, Plus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { z } from 'zod'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input, Select } from '@/components/ui/field'
import { BUSINESS_TYPES } from '@/domain/business-types'
import { errorMessage } from '@/lib/api/client'
import { useAuth } from '@/lib/auth/auth-context'
import { AuthLayout, FormError } from './auth-layout'
import { PlanPicker } from './plan-picker'

/** Elegir en qué negocio trabajar (usuarios con varios negocios o ninguno). */
export function OrganizationsPage() {
  const { me, switchOrganization, logout } = useAuth()
  const navigate = useNavigate()
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  if (!me) return null

  const choose = async (organizationId: string) => {
    setError(null)
    setPending(organizationId)
    try {
      await switchOrganization(organizationId)
      navigate('/', { replace: true })
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setPending(null)
    }
  }

  return (
    <AuthLayout>
      <Card className="flex flex-col gap-5 p-7">
        <div>
          <h2 className="m-0 text-2xl font-semibold">Hola, {me.user.firstName}</h2>
          <p className="mt-1 mb-0 text-muted">
            {me.organizations.length ? '¿En qué negocio quieres trabajar?' : 'Todavía no perteneces a ningún negocio.'}
          </p>
        </div>
        <FormError message={error} />
        {me.organizations.length > 0 && (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {me.organizations.map((org) => {
              const active = me.context.organizationId === org.organizationId
              return (
                <li key={org.organizationId}>
                  <button
                    type="button"
                    disabled={pending !== null}
                    onClick={() => (active ? navigate('/') : void choose(org.organizationId))}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-[12px] border border-line bg-surface p-3 text-left hover:border-teal-line disabled:cursor-wait"
                  >
                    <Avatar name={org.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{org.name}</span>
                      <span className="block text-xs text-muted">
                        {org.roles.join(', ')}
                        {active && ' · Actual'}
                      </span>
                    </span>
                    <ArrowRight size={16} className="text-muted" aria-hidden />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        <div className="flex flex-col gap-2.5">
          <Button variant="primary" onClick={() => navigate('/negocios/nuevo')}>
            <Plus size={14} aria-hidden /> Crear un negocio
          </Button>
          <Button variant="ghost" onClick={() => void logout().then(() => navigate('/login'))}>
            <LogOut size={14} aria-hidden /> Cerrar sesión
          </Button>
        </div>
      </Card>
    </AuthLayout>
  )
}

const schema = z.object({
  name: z.string().trim().min(2, 'Ingresa el nombre del negocio').max(80),
  businessType: z.string().min(1, 'Elige el tipo de negocio'),
  planCode: z.string().min(1),
})
type Values = z.infer<typeof schema>

/** Crear otro negocio con la misma cuenta (con su propia prueba gratis). */
export function NewOrganizationPage() {
  const { me, createOrganization } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: '', businessType: '', planCode: 'pro' } })

  const onSubmit = handleSubmit(async (v) => {
    setError(null)
    try {
      await createOrganization(v)
      navigate('/', { replace: true })
    } catch (e) {
      setError(errorMessage(e))
    }
  })

  return (
    <AuthLayout wide>
      <Card className="flex flex-col gap-5 p-6">
        <div>
          <h2 className="m-0 text-2xl font-semibold">Nuevo negocio</h2>
          <p className="mt-1 mb-0 text-muted">Cada negocio tiene sus propios datos, equipo y plan, con 30 días gratis.</p>
        </div>
        <form noValidate onSubmit={onSubmit} className="flex flex-col gap-[18px]">
          <FormError message={error} />
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field label="Nombre del negocio" error={errors.name?.message}>
              {(p) => <Input {...p} {...register('name')} autoFocus />}
            </Field>
            <Field label="Tipo de negocio" error={errors.businessType?.message}>
              {(p) => (
                <Select {...p} {...register('businessType')}>
                  <option value="">Elige una opción</option>
                  {BUSINESS_TYPES.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
          <PlanPicker value={watch('planCode')} onChange={(code) => setValue('planCode', code)} />
          <div className="flex items-center gap-2.5 border-t border-line pt-4">
            <Button onClick={() => navigate(me?.context.ctx === 'staff' ? '/' : '/negocios')}>
              <ArrowLeft size={14} aria-hidden /> Volver
            </Button>
            <Button type="submit" variant="primary" className="ml-auto" disabled={isSubmitting}>
              {isSubmitting ? 'Creando…' : 'Crear negocio'}
            </Button>
          </div>
        </form>
      </Card>
    </AuthLayout>
  )
}
