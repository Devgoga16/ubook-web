import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input, PasswordInput } from '@/components/ui/field'
import { errorMessage } from '@/lib/api/client'
import { useAuth } from '@/lib/auth/auth-context'
import { homeFor } from '@/lib/auth/home'
import { AuthLayout, FormError } from './auth-layout'

const schema = z.object({
  email: z.email('Ingresa un email válido'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
})
type Values = z.infer<typeof schema>

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const state = useLocation().state as { from?: string; notice?: string } | null
  const from = state?.from
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) })

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setError(null)
    try {
      const me = await login(email, password)
      navigate(me.context.ctx === 'staff' && from ? from : homeFor(me), { replace: true })
    } catch (e) {
      setError(errorMessage(e))
    }
  })

  return (
    <AuthLayout>
      <Card className="flex flex-col gap-5 p-7">
        <div>
          <h2 className="m-0 text-2xl font-semibold">Inicia sesión</h2>
          <p className="mt-1 mb-0 text-muted">Bienvenido de nuevo a uBook.</p>
        </div>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3.5">
          {state?.notice && !error && (
            <div role="status" className="rounded-control bg-ok-bg px-3 py-2.5 text-sm font-semibold text-ok">
              {state.notice}
            </div>
          )}
          <FormError message={error} />
          <Field label="Correo electrónico" error={errors.email?.message}>
            {(p) => <Input {...p} {...register('email')} type="email" autoComplete="email" autoFocus />}
          </Field>
          <Field label="Contraseña" error={errors.password?.message}>
            {(p) => <PasswordInput {...p} {...register('password')} autoComplete="current-password" />}
          </Field>
          <Link to="/olvide-contrasena" className="-mt-1.5 self-end text-xs font-semibold text-brand hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
          <Button type="submit" variant="primary" disabled={isSubmitting} className="mt-1 py-2.5">
            {isSubmitting ? 'Ingresando…' : 'Ingresar'}
          </Button>
        </form>
        <p className="m-0 text-center text-sm text-muted">
          ¿Aún no usas uBook?{' '}
          <Link to="/registro" className="font-semibold text-brand hover:underline">
            Crea tu negocio gratis
          </Link>
        </p>
      </Card>
    </AuthLayout>
  )
}
