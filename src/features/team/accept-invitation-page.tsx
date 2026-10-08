import { useQuery } from '@tanstack/react-query'
import { MailX } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState, Skeleton } from '@/components/ui/display'
import { Field, Input, PasswordInput } from '@/components/ui/field'
import { AuthLayout, FormError } from '@/features/auth/auth-layout'
import { ApiError, api, errorMessage } from '@/lib/api/client'
import type { InvitationPreview } from '@/lib/api/types'
import { useAuth } from '@/lib/auth/auth-context'
import { homeFor } from '@/lib/auth/home'

/** /invitacion/:token — crear el acceso (o entrar con la cuenta existente) y unirse al negocio. */
export function AcceptInvitationPage() {
  const { token = '' } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { acceptInvitation } = useAuth()
  const preview = useQuery({
    queryKey: ['invitation', token],
    queryFn: () => api<InvitationPreview>(`/auth/invitations/${token}`, { skipRefresh: true }),
    retry: false,
  })
  const [form, setForm] = useState({ firstName: '', lastName: '', password: '', confirm: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const inv = preview.data
  const firstName = form.firstName || inv?.firstName || ''
  const lastName = form.lastName || inv?.lastName || ''

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inv) return
    setError(null)
    const next: Record<string, string> = {}
    if (!inv.accountExists) {
      if (!firstName.trim()) next.firstName = 'Escribe tu nombre'
      if (!lastName.trim()) next.lastName = 'Escribe tu apellido'
      if (!/^(?=.*[A-Za-z])(?=.*\d).{10,}$/.test(form.password)) next.password = 'Mínimo 10 caracteres, con letras y números'
      else if (form.password !== form.confirm) next.confirm = 'Las contraseñas no coinciden'
    } else if (!form.password) next.password = 'Ingresa tu contraseña'
    setErrors(next)
    if (Object.keys(next).length) return
    setBusy(true)
    try {
      const me = await acceptInvitation({
        token,
        password: form.password,
        ...(!inv.accountExists && { firstName: firstName.trim(), lastName: lastName.trim() }),
      })
      navigate(homeFor(me), { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.code === 'INVALID_CREDENTIALS') setErrors({ password: 'Contraseña incorrecta' })
      else setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <AuthLayout>
      {preview.isLoading ? (
        <Skeleton className="h-[380px] rounded-card" />
      ) : !inv ? (
        <Card>
          <EmptyState
            icon={MailX}
            title="Invitación no disponible"
            description={preview.error instanceof ApiError ? preview.error.message : 'No pudimos abrir la invitación.'}
            action={
              <Link to="/login" className="text-sm font-semibold text-brand hover:underline">
                Ir a iniciar sesión
              </Link>
            }
          />
        </Card>
      ) : (
        <Card className="flex flex-col gap-5 p-7">
          <div>
            <p className="m-0 text-xs font-semibold tracking-wide text-teal-ink uppercase">Invitación</p>
            <h2 className="mt-1 mb-0 text-2xl font-semibold">Únete a {inv.organizationName}</h2>
            <p className="mt-1 mb-0 text-sm text-muted">
              Te invitaron como <b className="text-ink">{inv.roleNames.join(', ')}</b>.{' '}
              {inv.accountExists ? 'Ya tienes cuenta en uBook: entra con tu contraseña.' : 'Crea tu contraseña para entrar.'}
            </p>
          </div>
          <form noValidate onSubmit={submit} className="flex flex-col gap-3.5">
            <FormError message={error} />
            <Field label="Correo">{(p) => <Input {...p} value={inv.email} readOnly disabled />}</Field>
            {!inv.accountExists && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nombre" error={errors.firstName}>
                  {(p) => <Input {...p} value={firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} autoComplete="given-name" />}
                </Field>
                <Field label="Apellido" error={errors.lastName}>
                  {(p) => (
                    <Input {...p} value={lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} autoComplete="family-name" autoFocus={!!inv.firstName} />
                  )}
                </Field>
              </div>
            )}
            <Field label={inv.accountExists ? 'Tu contraseña' : 'Crea una contraseña'} error={errors.password} hint={inv.accountExists ? undefined : 'Mínimo 10 caracteres, con letras y números.'}>
              {(p) => (
                <PasswordInput
                  {...p}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  autoComplete={inv.accountExists ? 'current-password' : 'new-password'}
                  autoFocus={inv.accountExists}
                />
              )}
            </Field>
            {!inv.accountExists && (
              <Field label="Repite la contraseña" error={errors.confirm}>
                {(p) => <PasswordInput {...p} value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} autoComplete="new-password" />}
              </Field>
            )}
            <Button type="submit" variant="primary" disabled={busy} className="mt-1 py-2.5">
              {busy ? 'Entrando…' : inv.accountExists ? 'Aceptar y entrar' : 'Crear acceso y entrar'}
            </Button>
          </form>
        </Card>
      )}
    </AuthLayout>
  )
}
