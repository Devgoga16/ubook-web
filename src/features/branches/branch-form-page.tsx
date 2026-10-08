import { Clock, ExternalLink, Store } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/controls'
import { EmptyState, Skeleton } from '@/components/ui/display'
import { Field, Input } from '@/components/ui/field'
import { BackLink, FormActions, FormSection } from '@/components/ui/page'
import { useBranchesWithHours } from '@/features/availability/api'
import { ApiError, errorMessage } from '@/lib/api/client'
import type { Branch } from '@/lib/api/types'
import { useAccess } from '@/lib/auth/access'
import { useBranch } from '@/lib/auth/branch-context'
import { usePageMeta } from '@/lib/page-meta'
import { useSaveBranch } from './api'

function BranchForm({ branch }: { branch: Branch | null }) {
  const navigate = useNavigate()
  const { setCurrent } = useBranch()
  const { can, readOnly } = useAccess()
  const save = useSaveBranch()
  const [form, setForm] = useState({
    name: branch?.name ?? '',
    address: branch?.address ?? '',
    reference: branch?.reference ?? '',
    phone: branch?.phone ?? '',
    mapsUrl: branch?.mapsUrl ?? '',
    isActive: branch?.isActive ?? true,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const editable = can('branch.manage') && !readOnly
  const set = (patch: Partial<typeof form>) => {
    setForm((f) => ({ ...f, ...patch }))
    setSaved(false)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const next: Record<string, string> = {}
    if (form.name.trim().length < 2) next.name = 'Escribe el nombre de la sede'
    if (form.mapsUrl && !/^https:\/\//.test(form.mapsUrl.trim())) next.mapsUrl = 'Pega el enlace completo (https://…)'
    setErrors(next)
    if (Object.keys(next).length) return
    try {
      const result = await save.mutateAsync({
        id: branch?.id,
        name: form.name.trim(),
        address: form.address.trim(),
        reference: form.reference.trim(),
        phone: form.phone.trim(),
        mapsUrl: form.mapsUrl.trim(),
        ...(branch && { isActive: form.isActive }),
      })
      if (!branch) navigate(`/sucursales/${result.id}`, { replace: true })
      else setSaved(true)
    } catch (err) {
      setError(errorMessage(err))
      if (err instanceof ApiError && err.code === 'BRANCH_HAS_APPOINTMENTS') set({ isActive: true })
    }
  }

  return (
    <Card>
      <form noValidate onSubmit={submit} className="flex flex-col">
        {error && (
          <div role="alert" className="mb-4 rounded-control bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">
            {error}
          </div>
        )}
        <fieldset disabled={!editable || save.isPending} className="m-0 flex min-w-0 flex-col border-0 p-0">
          <FormSection title="Datos de la sede" description="Así la ven tus clientes al reservar.">
            <Field label="Nombre" error={errors.name}>
              {(p) => <Input {...p} value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ej.: Sede Miraflores" autoFocus={!branch} />}
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Dirección">
                {(p) => <Input {...p} value={form.address} onChange={(e) => set({ address: e.target.value })} placeholder="Av. Larco 812, Miraflores" />}
              </Field>
              <Field label="Teléfono (opcional)">
                {(p) => <Input {...p} value={form.phone} onChange={(e) => set({ phone: e.target.value })} inputMode="tel" placeholder="01 234 5678" />}
              </Field>
            </div>
            <Field label="Referencia (opcional)" hint="Ayuda a llegar: frente a qué está, piso, interior…">
              {(p) => <Input {...p} value={form.reference} onChange={(e) => set({ reference: e.target.value })} placeholder="Frente al parque Kennedy, 2.º piso" />}
            </Field>
            <Field label="Enlace de Google Maps (opcional)" error={errors.mapsUrl} hint="En Google Maps: Compartir → Copiar vínculo.">
              {(p) => <Input {...p} value={form.mapsUrl} onChange={(e) => set({ mapsUrl: e.target.value })} placeholder="https://maps.app.goo.gl/…" />}
            </Field>
          </FormSection>

          {branch && (
            <FormSection title="Horario y feriados" description="Se configuran en Disponibilidad.">
              <div>
                <Button
                  onClick={() => {
                    setCurrent(branch.id)
                    navigate('/disponibilidad')
                  }}
                >
                  <Clock size={14} aria-hidden /> Horario de atención de esta sede
                </Button>
              </div>
            </FormSection>
          )}

          {branch && (
            <FormSection title="Estado" description="Una sede inactiva no aparece en la agenda ni en la página de reservas.">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                <Switch checked={form.isActive} onCheckedChange={(v) => set({ isActive: v })} />
                {form.isActive ? 'Activa' : 'Inactiva'}
              </label>
            </FormSection>
          )}

          {editable && (
            <FormActions hint={saved ? 'Cambios guardados' : undefined}>
              {form.mapsUrl && /^https:\/\//.test(form.mapsUrl) && (
                <a href={form.mapsUrl} target="_blank" rel="noreferrer" className="mr-auto inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
                  <ExternalLink size={14} aria-hidden /> Probar enlace
                </a>
              )}
              <Button onClick={() => navigate('/sucursales')}>Volver</Button>
              <Button type="submit" variant="primary">
                {save.isPending ? 'Guardando…' : branch ? 'Guardar cambios' : 'Crear sede'}
              </Button>
            </FormActions>
          )}
        </fieldset>
      </form>
    </Card>
  )
}

/** Catálogo / Sucursales / sede: crear o editar en página completa. */
export function BranchFormPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = !id || id === 'nueva'
  const branches = useBranchesWithHours()
  const branch = isNew ? null : (branches.data?.find((b) => b.id === id) ?? null)
  usePageMeta({ title: isNew ? 'Nueva sede' : (branch?.name ?? 'Sede'), crumb: `Catálogo / Sucursales / ${isNew ? 'Nueva' : (branch?.name ?? '')}` })

  return (
    <>
      <BackLink to="/sucursales" label="Sucursales" />
      {!isNew && branches.isLoading ? (
        <Skeleton className="h-[360px] rounded-card" />
      ) : !isNew && !branch ? (
        <Card>
          <EmptyState
            icon={Store}
            title="No encontramos esta sede"
            action={
              <Link to="/sucursales" className="text-sm font-semibold text-brand hover:underline">
                Volver a Sucursales
              </Link>
            }
          />
        </Card>
      ) : (
        <BranchForm key={branch?.id ?? 'new'} branch={branch} />
      )}
    </>
  )
}
