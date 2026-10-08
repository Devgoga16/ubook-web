import { Box } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/controls'
import { EmptyState, Skeleton } from '@/components/ui/display'
import { Field, Input, Select } from '@/components/ui/field'
import { BackLink, FormActions, FormSection } from '@/components/ui/page'
import { useServices } from '@/features/services/api'
import { errorMessage } from '@/lib/api/client'
import { useAccess } from '@/lib/auth/access'
import { useBranch } from '@/lib/auth/branch-context'
import { cn } from '@/lib/cn'
import { usePageMeta } from '@/lib/page-meta'
import { useResources, useSaveResource, type Resource } from './api'

function ResourceForm({ resource }: { resource: Resource | null }) {
  const navigate = useNavigate()
  const { current, branches } = useBranch()
  const { can, readOnly } = useAccess()
  const services = useServices()
  const save = useSaveResource()
  const [f, setF] = useState({
    branchId: resource?.branchId ?? current?.id ?? '',
    name: resource?.name ?? '',
    kind: resource?.kind ?? '',
    capacity: String(resource?.capacity ?? 1),
    serviceIds: resource?.serviceIds ?? [],
    isActive: resource?.isActive ?? true,
  })
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const set = (patch: Partial<typeof f>) => {
    setF((x) => ({ ...x, ...patch }))
    setSaved(false)
  }
  const editable = can('resource.manage') && !readOnly

  const submit = async () => {
    setError(null)
    if (f.name.trim().length < 2) return setError('Escribe el nombre del recurso')
    const capacity = Number(f.capacity)
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 20) return setError('La capacidad va de 1 a 20')
    try {
      const result = await save.mutateAsync({ id: resource?.id, branchId: f.branchId, name: f.name.trim(), kind: f.kind.trim(), capacity, serviceIds: f.serviceIds, isActive: f.isActive })
      if (!resource) navigate(`/recursos/${result.id}`, { replace: true })
      else setSaved(true)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <Card>
      {error && (
        <div role="alert" className="mb-4 rounded-control bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">
          {error}
        </div>
      )}
      <fieldset disabled={!editable || save.isPending} className="m-0 flex min-w-0 flex-col border-0 p-0">
        <FormSection title="Recurso">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nombre">{(p) => <Input {...p} value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="Cabina 1" autoFocus={!resource} />}</Field>
            <Field label="Tipo (opcional)">{(p) => <Input {...p} value={f.kind} onChange={(e) => set({ kind: e.target.value })} placeholder="Sala privada, sillón, equipo…" />}</Field>
            {branches.length > 1 && (
              <Field label="Sede">
                {(p) => (
                  <Select {...p} value={f.branchId} onChange={(e) => set({ branchId: e.target.value })}>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            )}
            <Field label="Capacidad" hint="Cuántas citas atiende a la vez (una mesa de manicure doble = 2).">
              {(p) => <Input {...p} inputMode="numeric" value={f.capacity} onChange={(e) => set({ capacity: e.target.value.replace(/\D/g, '') })} />}
            </Field>
          </div>
        </FormSection>
        <FormSection title="Servicios que lo necesitan" description="Si un servicio usa varios recursos de la sede, basta con que uno esté libre.">
          <div className="flex flex-wrap gap-2">
            {(services.data ?? [])
              .filter((s) => !s.isArchived)
              .map((s) => {
                const on = f.serviceIds.includes(s.id)
                return (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => set({ serviceIds: on ? f.serviceIds.filter((x) => x !== s.id) : [...f.serviceIds, s.id] })}
                    className={cn('cursor-pointer rounded-full border px-3 py-[5px] text-xs font-semibold', on ? 'border-teal bg-teal-soft text-teal-ink' : 'border-line-strong bg-surface text-ink-2')}
                  >
                    {s.name}
                  </button>
                )
              })}
          </div>
        </FormSection>
        {resource && (
          <FormSection title="Estado" description="Un recurso inactivo deja de limitar la agenda.">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm">
              <Switch checked={f.isActive} onCheckedChange={(v) => set({ isActive: v })} />
              {f.isActive ? 'Activo' : 'Inactivo'}
            </label>
          </FormSection>
        )}
        {editable && (
          <FormActions hint={saved ? 'Cambios guardados' : undefined}>
            <Button onClick={() => navigate('/recursos')}>Volver</Button>
            <Button variant="primary" onClick={() => void submit()}>
              {save.isPending ? 'Guardando…' : resource ? 'Guardar cambios' : 'Crear recurso'}
            </Button>
          </FormActions>
        )}
      </fieldset>
    </Card>
  )
}

/** Catálogo / Recursos / recurso. */
export function ResourceFormPage() {
  const { id } = useParams<{ id: string }>()
  const { current } = useBranch()
  const isNew = !id || id === 'nuevo'
  const resources = useResources(current?.id, !isNew)
  const resource = isNew ? null : (resources.data?.find((r) => r.id === id) ?? null)
  usePageMeta({ title: isNew ? 'Nuevo recurso' : (resource?.name ?? 'Recurso'), crumb: `Catálogo / Recursos / ${isNew ? 'Nuevo' : (resource?.name ?? '')}` })
  return (
    <>
      <BackLink to="/recursos" label="Recursos" />
      {!isNew && resources.isLoading ? (
        <Skeleton className="h-[320px] rounded-card" />
      ) : !isNew && !resource ? (
        <Card>
          <EmptyState icon={Box} title="No encontramos este recurso en la sede actual" action={<Link to="/recursos" className="text-sm font-semibold text-brand hover:underline">Volver</Link>} />
        </Card>
      ) : (
        <ResourceForm key={resource?.id ?? 'new'} resource={resource} />
      )}
    </>
  )
}
