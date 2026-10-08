import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Stepper, Timeline } from '@/components/ui/display'
import { Field, Input, PasswordInput } from '@/components/ui/field'
import { BUSINESS_TYPES } from '@/domain/business-types'
import { api, ApiError, errorMessage } from '@/lib/api/client'
import type { Branch } from '@/lib/api/types'
import { useAuth } from '@/lib/auth/auth-context'
import { homeFor } from '@/lib/auth/home'
import { cn } from '@/lib/cn'
import { AuthLayout, FormError } from './auth-layout'
import { PlanPicker } from './plan-picker'
import { usePlans } from './plans'

const STEPS = ['Tu cuenta', 'Tipo de negocio', 'Tu negocio', 'Plan', 'Listo']

const schema = z.object({
  firstName: z.string().trim().min(1, 'Ingresa tu nombre').max(60),
  lastName: z.string().trim().min(1, 'Ingresa tu apellido').max(60),
  email: z.email('Ingresa un email válido'),
  phone: z
    .string()
    .trim()
    .refine((v) => v === '' || /^9\d{8}$/.test(v.replace(/\s/g, '')), 'Ingresa un celular de 9 dígitos que empiece con 9'),
  password: z
    .string()
    .min(10, 'Mínimo 10 caracteres')
    .regex(/(?=.*[A-Za-z])(?=.*\d)/, 'Debe incluir letras y números'),
  businessType: z.string().min(1, 'Elige el tipo de negocio'),
  businessName: z.string().trim().min(2, 'Ingresa el nombre del negocio').max(80),
  branchName: z.string().trim().min(2, 'Ingresa el nombre de la sede').max(80),
  branchAddress: z.string().trim().max(200),
  planCode: z.string().min(1, 'Elige un plan'),
  ownerAttends: z.boolean(),
})
type Values = z.infer<typeof schema>

const STEP_FIELDS: Array<Array<keyof Values>> = [
  ['firstName', 'lastName', 'email', 'phone', 'password'],
  ['businessType'],
  ['businessName', 'branchName', 'branchAddress'],
  ['planCode'],
]

/** Registro de un negocio nuevo (onboarding del prototipo). */
export function RegisterPage() {
  const { status, me, register: registerBusiness } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const { data: plans } = usePlans()
  // La landing preselecciona el plan con ?plan=pro.
  const [params] = useSearchParams()

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      businessType: '',
      businessName: '',
      branchName: 'Sede principal',
      branchAddress: '',
      planCode: params.get('plan') || 'pro',
      ownerAttends: true,
    },
    mode: 'onTouched',
  })
  const {
    register,
    watch,
    setValue,
    trigger,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = form

  // Si ya había sesión al entrar, no tiene sentido registrarse.
  if (status === 'authenticated' && me && !done) return <Navigate to={homeFor(me)} replace />

  const next = async () => {
    setError(null)
    if (await trigger(STEP_FIELDS[step])) setStep((s) => s + 1)
  }

  const submit = form.handleSubmit(async (v) => {
    setError(null)
    try {
      setDone(true)
      await registerBusiness({
        firstName: v.firstName,
        lastName: v.lastName,
        email: v.email,
        phone: v.phone ? `+51${v.phone.replace(/\s/g, '')}` : undefined,
        password: v.password,
        organization: { name: v.businessName, businessType: v.businessType, planCode: v.planCode, ownerAttends: v.ownerAttends },
      })
      // La API crea una sede "Principal"; la renombramos con lo que escribió.
      try {
        const [branch] = await api<Branch[]>('/branches')
        if (branch) {
          await api(`/branches/${branch.id}`, {
            method: 'PATCH',
            body: { name: v.branchName, ...(v.branchAddress && { address: v.branchAddress }) },
          })
        }
      } catch {
        // No bloquea el registro: la sede se puede editar después.
      }
      setStep(4)
    } catch (e) {
      setDone(false)
      if (e instanceof ApiError && e.code === 'EMAIL_TAKEN') {
        setStep(0)
        setFieldError('email', { message: 'Ya existe una cuenta con este email' })
        return
      }
      setError(errorMessage(e))
    }
  })

  const businessType = watch('businessType')
  const planCode = watch('planCode')
  const values = watch()
  const plan = plans?.find((p) => p.code === planCode)
  const typeLabel = BUSINESS_TYPES.find((t) => t.key === businessType)?.label

  return (
    <AuthLayout wide>
      <div className="flex flex-col gap-5">
        <Stepper steps={STEPS} current={step} />

        <Card className="flex flex-col gap-[18px] p-6">
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault()
              if (step < 3) void next()
              else if (step === 3) void submit()
            }}
            className="flex flex-col gap-[18px]"
          >
            <FormError message={error} />

            {step === 0 && (
              <>
                <Header title="Crea tu cuenta" text="Serás el dueño del negocio en uBook." />
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <Field label="Nombre" error={errors.firstName?.message}>
                    {(p) => <Input {...p} {...register('firstName')} autoComplete="given-name" autoFocus />}
                  </Field>
                  <Field label="Apellido" error={errors.lastName?.message}>
                    {(p) => <Input {...p} {...register('lastName')} autoComplete="family-name" />}
                  </Field>
                  <Field label="Correo electrónico" error={errors.email?.message}>
                    {(p) => <Input {...p} {...register('email')} type="email" autoComplete="email" />}
                  </Field>
                  <Field label="Celular (opcional)" hint="Ej.: 987 654 321" error={errors.phone?.message}>
                    {(p) => (
                      <div className="flex">
                        <span className="grid place-items-center rounded-l-control border border-r-0 border-line-strong bg-surface-2 px-2.5 text-body text-muted">
                          +51
                        </span>
                        <Input {...p} {...register('phone')} type="tel" inputMode="numeric" autoComplete="tel-national" className="rounded-l-none" />
                      </div>
                    )}
                  </Field>
                  <Field
                    label="Contraseña"
                    hint="Mínimo 10 caracteres, con letras y números"
                    error={errors.password?.message}
                    className="sm:col-span-2"
                  >
                    {(p) => <PasswordInput {...p} {...register('password')} autoComplete="new-password" />}
                  </Field>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <Header
                  title="¿Qué tipo de negocio tienes?"
                  text="Usamos el rubro para sugerirte servicios, campos y reglas típicas. Luego puedes cambiar todo."
                />
                <div role="radiogroup" aria-label="Tipo de negocio" className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
                  {BUSINESS_TYPES.map(({ key, label, description, icon: Icon }) => {
                    const on = businessType === key
                    return (
                      <button
                        key={key}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => setValue('businessType', key, { shouldValidate: true })}
                        className={cn(
                          'flex cursor-pointer flex-col gap-2.5 rounded-card border-[1.5px] border-line bg-surface p-4 text-left text-ink hover:border-teal-line',
                          on && 'border-teal shadow-[0_0_0_4px_var(--teal-soft)]',
                        )}
                      >
                        <span
                          className={cn(
                            'grid size-10 place-items-center rounded-[11px]',
                            on ? 'bg-grad' : 'bg-brand-soft text-brand',
                          )}
                        >
                          <Icon size={20} strokeWidth={1.7} aria-hidden />
                        </span>
                        <span className="font-semibold">{label}</span>
                        <span className="text-xs text-muted">{description}</span>
                      </button>
                    )
                  })}
                </div>
                {errors.businessType && <p className="m-0 text-2xs font-semibold text-bad">{errors.businessType.message}</p>}
              </>
            )}

            {step === 2 && (
              <>
                <Header title="Cuéntanos de tu negocio" text="Podrás agregar más sedes después, según tu plan." />
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <Field label="Nombre del negocio" error={errors.businessName?.message} className="sm:col-span-2">
                    {(p) => <Input {...p} {...register('businessName')} placeholder="Ej.: Barbería Norte" autoFocus />}
                  </Field>
                  <Field label="Nombre de la sede" error={errors.branchName?.message}>
                    {(p) => <Input {...p} {...register('branchName')} placeholder="Ej.: Sede Miraflores" />}
                  </Field>
                  <Field label="Dirección (opcional)" error={errors.branchAddress?.message}>
                    {(p) => <Input {...p} {...register('branchAddress')} placeholder="Ej.: Av. Larco 812, Miraflores" autoComplete="street-address" />}
                  </Field>
                </div>
                <label className="mt-1 flex cursor-pointer items-start gap-2.5 rounded-[12px] border border-line bg-surface-2/50 px-4 py-3 text-sm">
                  <input type="checkbox" {...register('ownerAttends')} className="mt-0.5 size-4 accent-[var(--teal)]" />
                  <span>
                    <b className="font-semibold">Yo también atiendo clientes</b>
                    <span className="block text-xs text-muted">Te creamos tu agenda de profesional. Luego eliges tus servicios y tu horario.</span>
                  </span>
                </label>
              </>
            )}

            {step === 3 && (
              <>
                <Header
                  title="Elige tu plan"
                  text="Tienes 30 días gratis, sin tarjeta. Puedes cambiar de plan cuando quieras."
                />
                <PlanPicker value={planCode} onChange={(code) => setValue('planCode', code, { shouldValidate: true })} />
              </>
            )}

            {step === 4 && (
              <>
                <Header title={`¡Listo, ${values.firstName}!`} text="Tu negocio ya está creado. Esto es lo que preparamos:" />
                <Timeline
                  items={[
                    { title: values.businessName, detail: typeLabel, state: 'done' },
                    { title: values.branchName, detail: values.branchAddress || 'Agrega la dirección cuando quieras', state: 'done' },
                    { title: 'Roles del equipo', detail: 'Dueño, Administrador, Recepción y Profesional', state: 'done' },
                    { title: `30 días gratis del plan ${plan?.name ?? ''}`, detail: 'Sin tarjeta. Te avisaremos antes de que termine.', state: 'done' },
                    { title: 'Siguiente: tus servicios y tu equipo', detail: 'Los configuras desde el panel', state: 'current' },
                  ]}
                />
              </>
            )}

            <div className="flex items-center gap-2.5 border-t border-line pt-4">
              {step > 0 && step < 4 && (
                <Button onClick={() => setStep((s) => s - 1)} disabled={isSubmitting}>
                  <ArrowLeft size={14} aria-hidden /> Atrás
                </Button>
              )}
              {step === 0 && (
                <span className="text-sm text-muted">
                  ¿Ya tienes cuenta?{' '}
                  <Link to="/login" className="font-semibold text-brand hover:underline">
                    Inicia sesión
                  </Link>
                </span>
              )}
              {step < 3 && (
                <Button type="submit" variant="primary" className="ml-auto">
                  Continuar <ArrowRight size={14} aria-hidden />
                </Button>
              )}
              {step === 3 && (
                <Button type="submit" variant="primary" className="ml-auto" disabled={isSubmitting}>
                  {isSubmitting ? 'Creando tu negocio…' : 'Crear mi negocio'} <Check size={14} aria-hidden />
                </Button>
              )}
              {step === 4 && (
                <Button variant="primary" className="ml-auto" onClick={() => navigate('/', { replace: true })}>
                  Ir a mi panel <ArrowRight size={14} aria-hidden />
                </Button>
              )}
            </div>
          </form>
        </Card>
      </div>
    </AuthLayout>
  )
}

function Header({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h2 className="m-0 mb-1.5 text-2xl font-semibold">{title}</h2>
      <p className="m-0 text-muted">{text}</p>
    </div>
  )
}
