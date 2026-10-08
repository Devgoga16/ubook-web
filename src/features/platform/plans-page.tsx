import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Layers, Plus } from 'lucide-react'
import { useState } from 'react'
import { Tag } from '@/components/ui/badges'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { Switch } from '@/components/ui/controls'
import { EmptyState, Skeleton } from '@/components/ui/display'
import { Field, Input, Textarea } from '@/components/ui/field'
import { Modal } from '@/components/ui/overlays'
import { FormActions, FormSection } from '@/components/ui/page'
import { formatPlanPrice, plansQueryKey } from '@/features/auth/plans'
import { api, errorMessage } from '@/lib/api/client'
import type { FeatureKey, FeatureValue, Plan } from '@/lib/api/types'
import { useAuth } from '@/lib/auth/auth-context'
import { cn } from '@/lib/cn'

interface PlatformPlan extends Plan {
  isPublic: boolean
  isActive: boolean
  updatedAt?: string
}

interface FeatureDef {
  key: FeatureKey
  type: 'flag' | 'limit'
  label: string
}

const platformPlansKey = ['platform', 'plans'] as const

/** Céntimos → texto editable en soles ("49" o "49.50"). */
const soles = (cents: number) => (cents % 100 ? (cents / 100).toFixed(2) : String(cents / 100))
/** "49.5" → 4950. `null` si no es un monto válido. */
const cents = (text: string) => (/^\d+([.,]\d{1,2})?$/.test(text.trim()) ? Math.round(Number(text.trim().replace(',', '.')) * 100) : null)

function usePlatformPlans() {
  return useQuery({ queryKey: platformPlansKey, queryFn: () => api<PlatformPlan[]>('/platform/plans') })
}

function useFeatureCatalog() {
  return useQuery({ queryKey: ['plans', 'features'], queryFn: () => api<FeatureDef[]>('/plans/features'), staleTime: Infinity })
}

/** Superadmin / Planes: precios, límites y funciones de cada plan. */
export function PlansPage() {
  const { me } = useAuth()
  const canEdit = me?.user.platformRole === 'super_admin'
  const plans = usePlatformPlans()
  const catalog = useFeatureCatalog()
  const [selected, setSelected] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const list = plans.data ?? []
  const plan = list.find((p) => p.code === selected) ?? list[0]

  return (
    <>
      <Card>
        <CardHeader
          title="Planes"
          actions={
            canEdit && (
              <Button size="sm" onClick={() => setCreating(true)}>
                <Plus size={14} aria-hidden /> Nuevo plan
              </Button>
            )
          }
        />
        <p className="mt-0 mb-4 text-sm text-muted">
          Los cambios se aplican de inmediato a todos los negocios con ese plan. Para un solo negocio, usa las excepciones en su ficha.
        </p>
        {plans.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[92px] rounded-card" />
            ))}
          </div>
        ) : plans.isError ? (
          <p className="m-0 text-sm font-semibold text-bad">{errorMessage(plans.error)}</p>
        ) : list.length === 0 ? (
          <EmptyState icon={Layers} title="Sin planes" />
        ) : (
          <div role="radiogroup" aria-label="Plan" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {list.map((p) => {
              const on = p.code === plan?.code
              return (
                <button
                  key={p.code}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setSelected(p.code)}
                  className={cn(
                    'flex cursor-pointer flex-col gap-1.5 rounded-card border-[1.5px] border-line bg-surface p-3.5 text-left text-ink hover:border-teal-line',
                    on && 'border-teal shadow-[0_0_0_4px_var(--teal-soft)]',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <b className="truncate text-md">{p.name}</b>
                    <span className="text-2xs text-muted">{p.code}</span>
                  </div>
                  <div className="tabular text-sm">
                    {formatPlanPrice(p.price.monthly, p.price.currency)} <span className="text-muted">/ mes</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {!p.isActive && <Tag tone="bad">Inactivo</Tag>}
                    {!p.isPublic && <Tag tone="off">Oculto</Tag>}
                    {p.isActive && p.isPublic && <Tag tone="ok">En la web</Tag>}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </Card>

      {plan && catalog.data && <PlanForm key={`${plan.code}:${plan.updatedAt ?? ''}`} plan={plan} catalog={catalog.data} canEdit={canEdit} />}

      {canEdit && (
        <NewPlanModal
          open={creating}
          onOpenChange={setCreating}
          base={plan}
          onCreated={(code) => {
            setCreating(false)
            setSelected(code)
          }}
        />
      )}
    </>
  )
}

function useInvalidatePlans() {
  const qc = useQueryClient()
  return () => Promise.all([qc.invalidateQueries({ queryKey: platformPlansKey }), qc.invalidateQueries({ queryKey: plansQueryKey })])
}

function PlanForm({ plan, catalog, canEdit }: { plan: PlatformPlan; catalog: FeatureDef[]; canEdit: boolean }) {
  const invalidate = useInvalidatePlans()
  const initial = {
    name: plan.name,
    description: plan.description ?? '',
    monthly: soles(plan.price.monthly),
    yearly: soles(plan.price.yearly),
    sortOrder: String(plan.sortOrder ?? 0),
    isPublic: plan.isPublic,
    isActive: plan.isActive,
    // `null` es "ilimitado": solo una función que el plan no define toma el valor por defecto.
    features: Object.fromEntries(catalog.map((f) => [f.key, f.key in plan.features ? plan.features[f.key] : f.type === 'flag' ? false : 0])) as Record<FeatureKey, FeatureValue>,
  }
  const [f, setF] = useState(initial)
  const [saved, setSaved] = useState(false)
  const set = (patch: Partial<typeof f>) => (setF({ ...f, ...patch }), setSaved(false))
  const setFeature = (key: FeatureKey, value: FeatureValue) => set({ features: { ...f.features, [key]: value } })

  const monthly = cents(f.monthly)
  const yearly = cents(f.yearly)
  const invalid = !f.name.trim() || monthly === null || yearly === null || !/^-?\d+$/.test(f.sortOrder)
  const dirty = JSON.stringify(f) !== JSON.stringify(initial)

  const save = useMutation({
    mutationFn: () =>
      api<PlatformPlan>(`/platform/plans/${plan.code}`, {
        method: 'PATCH',
        body: {
          name: f.name.trim(),
          description: f.description.trim(),
          price: { monthly: monthly!, yearly: yearly!, currency: plan.price.currency },
          sortOrder: Number(f.sortOrder),
          isPublic: f.isPublic,
          isActive: f.isActive,
          features: f.features,
        },
      }),
    onSuccess: async () => {
      setSaved(true)
      await invalidate()
    },
  })

  const limits = catalog.filter((x) => x.type === 'limit')
  const flags = catalog.filter((x) => x.type === 'flag')

  return (
    <Card>
      {save.error && (
        <p role="alert" className="mb-4 rounded-control bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">
          {errorMessage(save.error)}
        </p>
      )}
      <fieldset disabled={!canEdit || save.isPending} className="m-0 flex min-w-0 flex-col border-0 p-0">
        <FormSection title={plan.name} description={`Código "${plan.code}". El código no se puede cambiar porque lo usan las suscripciones.`}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nombre">{(p) => <Input {...p} value={f.name} onChange={(e) => set({ name: e.target.value })} />}</Field>
            <Field label="Orden" hint="Menor número = aparece primero.">
              {(p) => <Input {...p} inputMode="numeric" value={f.sortOrder} onChange={(e) => set({ sortOrder: e.target.value.replace(/[^\d-]/g, '') })} className="w-24" />}
            </Field>
          </div>
          <Field label="Descripción" hint="Se muestra en la página de precios y en el registro.">
            {(p) => <Textarea {...p} rows={2} value={f.description} onChange={(e) => set({ description: e.target.value })} />}
          </Field>
        </FormSection>

        <FormSection title="Precio" description={`En ${plan.price.currency === 'PEN' ? 'soles' : plan.price.currency}. Lo nuevo aplica a los próximos cobros.`}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Mensual" error={monthly === null ? 'Monto inválido' : undefined}>
              {(p) => <Input {...p} inputMode="decimal" value={f.monthly} onChange={(e) => set({ monthly: e.target.value })} />}
            </Field>
            <Field
              label="Anual"
              error={yearly === null ? 'Monto inválido' : undefined}
              hint={monthly && yearly !== null ? `${Math.round((1 - yearly / (monthly * 12)) * 100)}% de descuento frente a 12 meses` : undefined}
            >
              {(p) => <Input {...p} inputMode="decimal" value={f.yearly} onChange={(e) => set({ yearly: e.target.value })} />}
            </Field>
          </div>
        </FormSection>

        <FormSection title="Visibilidad">
          <ToggleRow label="Visible en la web" detail="Aparece en la landing y al registrarse." checked={f.isPublic} onChange={(v) => set({ isPublic: v })} />
          <ToggleRow
            label="Se puede contratar"
            detail="Si lo apagas, quien ya lo tiene lo conserva, pero nadie nuevo puede elegirlo."
            checked={f.isActive}
            onChange={(v) => set({ isActive: v })}
          />
        </FormSection>

        <FormSection title="Límites" description="Ilimitado = sin tope.">
          {limits.map((x) => {
            const v = f.features[x.key]
            const unlimited = v === null
            return (
              <div key={x.key} className="flex flex-wrap items-center gap-3">
                <span className="min-w-[180px] flex-1 text-sm">{x.label}</span>
                <Input
                  aria-label={x.label}
                  inputMode="numeric"
                  disabled={unlimited}
                  value={unlimited ? '' : String(v ?? 0)}
                  placeholder={unlimited ? '∞' : undefined}
                  onChange={(e) => setFeature(x.key, Number(e.target.value.replace(/\D/g, '')) || 0)}
                  className="w-24"
                />
                <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-2">
                  <Switch checked={unlimited} onCheckedChange={(on) => setFeature(x.key, on ? null : 1)} aria-label={`${x.label} ilimitado`} />
                  Ilimitado
                </label>
              </div>
            )
          })}
        </FormSection>

        <FormSection title="Funciones" description="Lo que incluye el plan.">
          <div className="grid gap-x-6 sm:grid-cols-2">
            {flags.map((x) => (
              <ToggleRow key={x.key} label={x.label} checked={f.features[x.key] === true} onChange={(v) => setFeature(x.key, v)} />
            ))}
          </div>
        </FormSection>

        {canEdit && (
          <FormActions hint={saved && !dirty ? 'Cambios guardados' : invalid ? 'Revisa los campos marcados' : undefined}>
            <Button disabled={!dirty || save.isPending} onClick={() => (setF(initial), setSaved(false))}>
              Descartar
            </Button>
            <Button variant="primary" disabled={!dirty || invalid || save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </FormActions>
        )}
      </fieldset>
    </Card>
  )
}

function ToggleRow({ label, detail, checked, onChange }: { label: string; detail?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 border-b border-line py-2.5 last:border-0">
      <span className="min-w-0">
        <span className="block text-sm">{label}</span>
        {detail && <span className="block text-2xs text-muted">{detail}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </label>
  )
}

function NewPlanModal({
  open,
  onOpenChange,
  base,
  onCreated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  base?: PlatformPlan
  onCreated: (code: string) => void
}) {
  const invalidate = useInvalidatePlans()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const validCode = /^[a-z0-9_-]{2,40}$/.test(code)
  const create = useMutation({
    mutationFn: () =>
      api<PlatformPlan>('/platform/plans', {
        method: 'POST',
        body: {
          code,
          name: name.trim(),
          price: { monthly: base?.price.monthly ?? 0, yearly: base?.price.yearly ?? 0, currency: base?.price.currency ?? 'PEN' },
          features: base?.features ?? {},
          sortOrder: (base?.sortOrder ?? 0) + 1,
          // Nace oculto: se publica cuando esté listo.
          isPublic: false,
        },
      }),
    onSuccess: async (p) => {
      await invalidate()
      setCode('')
      setName('')
      onCreated(p.code)
    },
  })

  return (
    <Modal open={open} onOpenChange={(v) => !create.isPending && onOpenChange(v)} title="Nuevo plan">
      <div className="flex flex-col gap-3.5">
        <p className="m-0 text-sm text-muted">
          {base ? `Copia precios y funciones de ${base.name}; luego los ajustas.` : 'Luego ajustas precios y funciones.'} Nace oculto en la web.
        </p>
        <Field label="Nombre">{(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} placeholder="Enterprise" />}</Field>
        <Field label="Código" hint="Minúsculas, números, guion. No se puede cambiar después." error={code && !validCode ? 'Código inválido' : undefined}>
          {(p) => <Input {...p} value={code} onChange={(e) => setCode(e.target.value.toLowerCase().replace(/\s+/g, '-'))} placeholder="enterprise" />}
        </Field>
        {create.error && <p role="alert" className="m-0 rounded-control bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">{errorMessage(create.error)}</p>}
        <div className="flex justify-end gap-2.5">
          <Button disabled={create.isPending} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="primary" disabled={!validCode || !name.trim() || create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? 'Creando…' : 'Crear plan'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
