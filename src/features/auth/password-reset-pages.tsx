import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, LinkIcon, MailCheck } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState, Skeleton } from '@/components/ui/display'
import { Field, Input, PasswordInput } from '@/components/ui/field'
import { api, errorMessage } from '@/lib/api/client'
import { useAuth } from '@/lib/auth/auth-context'
import { AuthLayout, FormError } from './auth-layout'

const STRONG = /^(?=.*[A-Za-z])(?=.*\d).{10,}$/

/** /olvide-contrasena — pide el enlace por correo. */
export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | undefined>()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const value = email.trim()
    if (!/^\S+@\S+\.\S+$/.test(value)) return setFieldError('Ingresa un correo válido')
    setFieldError(undefined)
    setBusy(true)
    try {
      await api('/auth/forgot-password', { method: 'POST', body: { email: value }, skipRefresh: true })
      setSentTo(value)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout>
      <Card className="flex flex-col gap-5 p-7">
        {sentTo ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="bg-grad grid size-14 place-items-center rounded-full">
              <MailCheck size={26} aria-hidden />
            </span>
            <h2 className="m-0 text-xl font-semibold">Revisa tu correo</h2>
            <p className="m-0 text-sm text-muted">
              Si <b className="text-ink">{sentTo}</b> tiene una cuenta en uBook, te enviamos un enlace para crear una contraseña nueva. Vence en 1 hora.
            </p>
            <p className="m-0 text-xs text-muted">¿No llega? Revisa la carpeta de spam o vuelve a intentarlo en unos minutos.</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <Button onClick={() => setSentTo(null)}>Usar otro correo</Button>
              <Link to="/login" className="inline-flex items-center rounded-control px-3.5 py-2 text-sm font-semibold text-brand hover:underline">
                Volver a iniciar sesión
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div>
              <h2 className="m-0 text-2xl font-semibold">¿Olvidaste tu contraseña?</h2>
              <p className="mt-1 mb-0 text-muted">Escribe el correo de tu cuenta y te enviamos un enlace para crear una nueva.</p>
            </div>
            <form onSubmit={(e) => void submit(e)} noValidate className="flex flex-col gap-3.5">
              <FormError message={error} />
              <Field label="Correo electrónico" error={fieldError}>
                {(p) => <Input {...p} type="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />}
              </Field>
              <Button type="submit" variant="primary" disabled={busy} className="mt-1 py-2.5">
                {busy ? 'Enviando…' : 'Enviar enlace'}
              </Button>
            </form>
            <Link to="/login" className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-brand hover:underline">
              <ArrowLeft size={14} aria-hidden /> Volver a iniciar sesión
            </Link>
          </>
        )}
      </Card>
    </AuthLayout>
  )
}

/** /restablecer/:token — crea la contraseña nueva con el enlace del correo. */
export function ResetPasswordPage() {
  const { token = '' } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { status, logout } = useAuth()
  const preview = useQuery({
    queryKey: ['password-reset', token],
    queryFn: () => api<{ email: string }>(`/auth/password-reset/${token}`, { skipRefresh: true }),
    retry: false,
    staleTime: Infinity,
  })
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const next: typeof errors = {}
    if (!STRONG.test(form.password)) next.password = 'Mínimo 10 caracteres, con letras y números'
    else if (form.password !== form.confirm) next.confirm = 'Las contraseñas no coinciden'
    setErrors(next)
    if (next.password || next.confirm) return
    setBusy(true)
    try {
      await api('/auth/reset-password', { method: 'POST', body: { token, password: form.password }, skipRefresh: true })
      // La API cerró todas las sesiones: si había una abierta aquí, también se cierra.
      if (status === 'authenticated') await logout().catch(() => undefined)
      navigate('/login', { replace: true, state: { notice: 'Listo, tu contraseña cambió. Inicia sesión con la nueva.' } })
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <AuthLayout>
      <Card className="flex flex-col gap-5 p-7">
        {preview.isLoading ? (
          <Skeleton className="h-[260px] rounded-card" />
        ) : preview.isError ? (
          <EmptyState
            icon={LinkIcon}
            title="Este enlace ya no sirve"
            description={`${errorMessage(preview.error)} Los enlaces vencen en 1 hora y sirven una sola vez.`}
            action={
              <Link to="/olvide-contrasena" className="bg-grad inline-flex rounded-control px-3.5 py-2 text-sm font-semibold">
                Pedir un enlace nuevo
              </Link>
            }
          />
        ) : (
          <>
            <div>
              <h2 className="m-0 text-2xl font-semibold">Crea tu contraseña nueva</h2>
              <p className="mt-1 mb-0 text-muted">
                Para la cuenta <b className="text-ink">{preview.data?.email}</b>. Al guardarla se cierran las sesiones abiertas en otros dispositivos.
              </p>
            </div>
            <form onSubmit={(e) => void submit(e)} noValidate className="flex flex-col gap-3.5">
              <FormError message={error} />
              <Field label="Contraseña nueva" error={errors.password} hint="Mínimo 10 caracteres, con letras y números.">
                {(p) => <PasswordInput {...p} autoComplete="new-password" autoFocus value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />}
              </Field>
              <Field label="Repite la contraseña" error={errors.confirm}>
                {(p) => <PasswordInput {...p} autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />}
              </Field>
              <Button type="submit" variant="primary" disabled={busy} className="mt-1 py-2.5">
                {busy ? 'Guardando…' : 'Guardar contraseña'}
              </Button>
            </form>
          </>
        )}
      </Card>
    </AuthLayout>
  )
}
