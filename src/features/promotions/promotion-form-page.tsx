import { Tag as TagIcon } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox, Segmented, Switch } from '@/components/ui/controls'
import { EmptyState, Skeleton } from '@/components/ui/display'
import { Field, Input } from '@/components/ui/field'
import { BackLink, FormActions, FormSection } from '@/components/ui/page'
import { useServices } from '@/features/services/api'
import { errorMessage } from '@/lib/api/client'
import { useAccess } from '@/lib/auth/access'
import { cn } from '@/lib/cn'
import { parseSoles } from '@/lib/format'
import { minutesToTime, timeToMinutes } from '@/lib/time'
import { promoValue, usePromotions, useSavePromotion, type Promotion } from './api'

const DAYS = [
  [1, 'Lun'],
  [2, 'Mar'],
  [3, 'Mié'],
  [4, 'Jue'],
  [5, 'Vie'],
  [6, 'Sáb'],
  [7, 'Dom'],
] as const

const chip = (on: boolean) =>
  cn('cursor-pointer rounded-full border px-3 py-[5px] text-xs font-semibold', on ? 'border-teal bg-teal-soft text-teal-ink' : 'border-line-strong bg-surface text-ink-2')

function PromotionForm({ promo }: { promo: Promotion | null }) {
  const navigate = useNavigate()
  const { readOnly } = useAccess()
  const services = useServices()
  const save = useSavePromotion()
  const [f, setF] = useState({
    code: promo?.code ?? '',
    description: promo?.description ?? '',
    type: promo?.type ?? ('percent' as 'percent' | 'amount'),
    value: promo ? (promo.type === 'percent' ? String(promo.value) : (promo.value / 100).toFixed(2)) : '',
    serviceIds: promo?.serviceIds ?? [],
    validFrom: promo?.validFrom ?? '',
    validTo: promo?.validTo ?? '',
    weekdays: promo?.weekdays ?? [],
    from: promo?.fromMinute != null ? minutesToTime(promo.fromMinute) : '',
    to: promo?.toMinute != null ? minutesToTime(promo.toMinute) : '',
    newClientsOnly: promo?.newClientsOnly ?? false,
    oncePerClient: promo?.oncePerClient ?? true,
    maxUses: promo?.maxUses != null ? String(promo.maxUses) : '',
    isActive: promo?.isActive ?? true,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const set = (patch: Partial<typeof f>) => {
    setF((x) => ({ ...x, ...patch }))
    setSaved(false)
  }
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

  const submit = async () => {
    setError(null)
    const next: Record<string, string> = {}
    const code = f.code.replace(/\s/g, '').toUpperCase()
    if (!/^[A-Z0-9_-]{3,24}$/.test(code)) next.code = 'De 3 a 24 letras o números, sin espacios'
    const value = f.type === 'percent' ? Number(f.value) : parseSoles(f.value)
    if (!value || value < 1 || (f.type === 'percent' && (value > 100 || !Number.isInteger(value)))) next.value = f.type === 'percent' ? 'Entre 1 y 100' : 'Ingresa un monto'
    const fromMinute = f.from ? timeToMinutes(f.from) : null
    const toMinute = f.to ? timeToMinutes(f.to) : null
    if (fromMinute != null && toMinute != null && toMinute <= fromMinute) next.to = 'Debe ser después de "Desde"'
    if (f.validFrom && f.validTo && f.validTo < f.validFrom) next.validTo = 'Debe ser después de "Desde"'
    if (f.maxUses && !(Number(f.maxUses) >= 1)) next.maxUses = 'Mínimo 1'
    setErrors(next)
    if (Object.keys(next).length) return
    try {
      const result = await save.mutateAsync({
        id: promo?.id,
        code,
        description: f.description.trim(),
        type: f.type,
        value: value!,
        serviceIds: f.serviceIds,
        validFrom: f.validFrom || null,
        validTo: f.validTo || null,
        weekdays: f.weekdays,
        fromMinute,
        toMinute,
        newClientsOnly: f.newClientsOnly,
        oncePerClient: f.oncePerClient,
        maxUses: f.maxUses ? Number(f.maxUses) : null,
        isActive: f.isActive,
      })
      if (!promo) navigate(`/promociones/${result.id}`, { replace: true })
      else setSaved(true)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  const active = (services.data ?? []).filter((s) => !s.isArchived)

  return (
    <Card>
      {error && (
        <div role="alert" className="mb-4 rounded-control bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">
          {error}
        </div>
      )}
      <fieldset disabled={readOnly || save.isPending} className="m-0 flex min-w-0 flex-col border-0 p-0">
        <FormSection title="Cupón" description="El código que escribe el cliente al reservar.">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Código" error={errors.code}>
              {(p) => <Input {...p} value={f.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} placeholder="OCTUBRE15" className="font-mono uppercase" autoFocus={!promo} />}
            </Field>
            <Field label="Descripción (opcional)">{(p) => <Input {...p} value={f.description} onChange={(e) => set({ description: e.target.value })} placeholder="15% en cortes todo octubre" />}</Field>
          </div>
          <div className="grid items-end gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <span className="text-2xs font-semibold text-muted">Tipo de descuento</span>
              <Segmented
                aria-label="Tipo de descuento"
                value={f.type}
                onValueChange={(v) => set({ type: v, value: '' })}
                options={[
                  { value: 'percent', label: 'Porcentaje' },
                  { value: 'amount', label: 'Monto fijo' },
                ]}
                className="self-start"
              />
            </div>
            <Field label={f.type === 'percent' ? 'Descuento (%)' : 'Descuento (S/)'} error={errors.value}>
              {(p) => <Input {...p} inputMode="decimal" value={f.value} onChange={(e) => set({ value: e.target.value })} placeholder={f.type === 'percent' ? '15' : '20.00'} />}
            </Field>
          </div>
        </FormSection>

        <FormSection title="Servicios" description="Ninguno marcado = vale para todos.">
          <div className="flex flex-wrap gap-2">
            {active.map((s) => (
              <button key={s.id} type="button" aria-pressed={f.serviceIds.includes(s.id)} onClick={() => set({ serviceIds: toggle(f.serviceIds, s.id) })} className={chip(f.serviceIds.includes(s.id))}>
                {s.name}
              </button>
            ))}
          </div>
        </FormSection>

        <FormSection title="Cuándo vale" description="Según la fecha y hora de la cita. Úsalo para llenar días u horas flojas.">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Desde (opcional)">{(p) => <Input {...p} type="date" value={f.validFrom} onChange={(e) => set({ validFrom: e.target.value })} />}</Field>
            <Field label="Hasta (opcional)" error={errors.validTo}>{(p) => <Input {...p} type="date" value={f.validTo} min={f.validFrom || undefined} onChange={(e) => set({ validTo: e.target.value })} />}</Field>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-2xs font-semibold text-muted">Días (ninguno = todos)</span>
            <div className="flex flex-wrap gap-2">
              {DAYS.map(([d, label]) => (
                <button key={d} type="button" aria-pressed={f.weekdays.includes(d)} onClick={() => set({ weekdays: toggle(f.weekdays, d) })} className={chip(f.weekdays.includes(d))}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Desde la hora (opcional)">{(p) => <Input {...p} type="time" step={900} value={f.from} onChange={(e) => set({ from: e.target.value })} />}</Field>
            <Field label="Hasta la hora (opcional)" error={errors.to}>{(p) => <Input {...p} type="time" step={900} value={f.to} onChange={(e) => set({ to: e.target.value })} />}</Field>
          </div>
        </FormSection>

        <FormSection title="Límites">
          <label className="flex cursor-pointer items-center gap-2.5 text-sm">
            <Checkbox checked={f.newClientsOnly} onCheckedChange={(v) => set({ newClientsOnly: v === true })} />
            Solo para la primera visita (clientes nuevos)
          </label>
          <label className="flex cursor-pointer items-center gap-2.5 text-sm">
            <Checkbox checked={f.oncePerClient} onCheckedChange={(v) => set({ oncePerClient: v === true })} />
            Un uso por cliente
          </label>
          <Field label="Usos totales (opcional)" error={errors.maxUses} hint="Vacío = sin límite." className="max-w-[200px]">
            {(p) => <Input {...p} inputMode="numeric" value={f.maxUses} onChange={(e) => set({ maxUses: e.target.value.replace(/\D/g, '') })} placeholder="100" />}
          </Field>
        </FormSection>

        {promo && (
          <FormSection title="Estado" description={`Usado ${promo.uses} ${promo.uses === 1 ? 'vez' : 'veces'}.`}>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm">
              <Switch checked={f.isActive} onCheckedChange={(v) => set({ isActive: v })} />
              {f.isActive ? 'Activo' : 'Pausado: no se puede usar'}
            </label>
          </FormSection>
        )}

        {!readOnly && (
          <FormActions hint={saved ? 'Cambios guardados' : f.value ? `${promoValue({ type: f.type, value: f.type === 'percent' ? Number(f.value) || 0 : parseSoles(f.value) ?? 0 })} de descuento` : undefined}>
            <Button onClick={() => navigate('/promociones')}>Volver</Button>
            <Button variant="primary" onClick={() => void submit()}>
              {save.isPending ? 'Guardando…' : promo ? 'Guardar cambios' : 'Crear cupón'}
            </Button>
          </FormActions>
        )}
      </fieldset>
    </Card>
  )
}

/** Negocio / Promociones / cupón. */
export function PromotionFormPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = !id || id === 'nueva'
  const promos = usePromotions()
  const promo = isNew ? null : (promos.data?.find((p) => p.id === id) ?? null)
  return (
    <>
      <BackLink to="/promociones" label="Promociones" />
      {!isNew && promos.isLoading ? (
        <Skeleton className="h-[400px] rounded-card" />
      ) : !isNew && !promo ? (
        <Card>
          <EmptyState icon={TagIcon} title="No encontramos este cupón" action={<Link to="/promociones" className="text-sm font-semibold text-brand hover:underline">Volver</Link>} />
        </Card>
      ) : (
        <PromotionForm key={promo?.id ?? 'new'} promo={promo} />
      )}
    </>
  )
}
