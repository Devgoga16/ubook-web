import { LogOut, ShieldCheck, Smartphone } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/controls'
import { Field, Input } from '@/components/ui/field'
import { errorMessage } from '@/lib/api/client'
import { fullName, prettyPhone, usePortalActions, type PortalAccount, type PortalProfile } from './api'

function HolderForm({ slug, token, profile, title }: { slug: string; token: string; profile: PortalProfile; title: string }) {
  const { updateProfile } = usePortalActions(slug, token)
  const [f, setF] = useState({ firstName: profile.firstName, lastName: profile.lastName, email: profile.email, birthDate: profile.birthDate, marketingConsent: profile.marketingConsent })
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const set = (patch: Partial<typeof f>) => {
    setF({ ...f, ...patch })
    setSaved(false)
  }

  const submit = async () => {
    setError(null)
    if (!f.firstName.trim()) return setError('Escribe tu nombre')
    try {
      await updateProfile.mutateAsync({
        clientId: profile.id,
        firstName: f.firstName.trim(),
        lastName: f.lastName.trim(),
        email: f.email.trim() || null,
        birthDate: f.birthDate || null,
        marketingConsent: f.marketingConsent,
      })
      setSaved(true)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <Card>
      <CardHeader title={title} />
      <form
        className="flex flex-col gap-3.5"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nombre">{(p) => <Input {...p} value={f.firstName} onChange={(e) => set({ firstName: e.target.value })} autoComplete="given-name" />}</Field>
          <Field label="Apellidos">{(p) => <Input {...p} value={f.lastName} onChange={(e) => set({ lastName: e.target.value })} autoComplete="family-name" />}</Field>
          <Field label="Correo (opcional)" hint="Para recibir también por correo la confirmación de tus citas.">
            {(p) => <Input {...p} type="email" value={f.email} onChange={(e) => set({ email: e.target.value })} autoComplete="email" />}
          </Field>
          <Field label="Fecha de nacimiento (opcional)">{(p) => <Input {...p} type="date" value={f.birthDate} onChange={(e) => set({ birthDate: e.target.value })} />}</Field>
        </div>
        <label className="flex cursor-pointer items-start gap-2.5 text-sm">
          <Checkbox checked={f.marketingConsent} onCheckedChange={(v) => set({ marketingConsent: v === true })} className="mt-0.5" />
          <span>Quiero recibir promociones y novedades de este negocio.</span>
        </label>
        {error && (
          <p role="alert" className="m-0 text-sm font-semibold text-bad">
            {error}
          </p>
        )}
        <div className="flex items-center gap-3">
          <Button type="submit" variant="primary" disabled={updateProfile.isPending}>
            {updateProfile.isPending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
          {saved && <span className="text-xs font-semibold text-ok">Datos guardados</span>}
        </div>
      </form>
    </Card>
  )
}

/** Mi perfil: los datos del titular (o titulares, si comparten celular) y la sesión. */
export function ProfileTab({ slug, token, account, businessName, onSignOut }: { slug: string; token: string; account: PortalAccount; businessName: string; onSignOut: () => void }) {
  const holders = account.profiles.filter((p) => p.isHolder)
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-4">
        {holders.map((p) => (
          <HolderForm key={p.id} slug={slug} token={token} profile={p} title={holders.length > 1 ? `Datos de ${fullName(p)}` : 'Mis datos'} />
        ))}
      </div>
      <Card className="flex flex-col gap-4">
        <CardHeader title="Mi cuenta" className="mb-0" />
        <div className="flex items-start gap-3 text-sm">
          <Smartphone size={17} className="mt-0.5 flex-none text-teal-ink" aria-hidden />
          <div>
            <div className="text-2xs font-semibold text-muted">Celular con el que entras</div>
            <b className="font-semibold">{prettyPhone(account.phone)}</b>
            <div className="text-xs text-muted">Para cambiarlo, pídeselo a {businessName}: es el número con el que te identifican.</div>
          </div>
        </div>
        <div className="flex items-start gap-3 text-sm">
          <ShieldCheck size={17} className="mt-0.5 flex-none text-teal-ink" aria-hidden />
          <div>
            <div className="text-2xs font-semibold text-muted">Tu sesión</div>
            <div className="text-xs text-muted">Queda abierta 30 días en este dispositivo y solo sirve para {businessName}. Si estás en un equipo compartido, sal al terminar.</div>
          </div>
        </div>
        <div>
          <Button variant="danger" onClick={onSignOut}>
            <LogOut size={14} aria-hidden /> Cerrar sesión
          </Button>
        </div>
      </Card>
    </div>
  )
}
