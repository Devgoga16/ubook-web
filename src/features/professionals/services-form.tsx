import { Clock, Scissors } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Pill } from '@/components/ui/badges'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/controls'
import { EmptyState } from '@/components/ui/display'
import { Input } from '@/components/ui/field'
import { FormActions } from '@/components/ui/page'
import { errorMessage } from '@/lib/api/client'
import type { Professional, Service } from '@/lib/api/types'
import { cn } from '@/lib/cn'
import { formatCents, parseSoles } from '@/lib/format'
import { useSaveProfessional } from './api'

type Draft = Record<string, { on: boolean; price: string }>

function toDraft(p: Professional, services: Service[]): Draft {
  return Object.fromEntries(
    services.map((s) => {
      const own = p.services.find((x) => x.serviceId === s.id)
      return [s.id, { on: !!own, price: own?.price != null ? (own.price / 100).toFixed(2) : '' }]
    }),
  )
}

/** Pestaña Servicios: qué servicios realiza y si cobra un precio distinto. */
export function ServicesForm({
  professional,
  services,
  canEdit,
}: {
  professional: Professional
  services: Service[]
  canEdit: boolean
}) {
  const save = useSaveProfessional()
  const [draft, setDraft] = useState(() => toDraft(professional, services))
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const initial = JSON.stringify(toDraft(professional, services))
  const dirty = JSON.stringify(draft) !== initial
  const selected = Object.values(draft).filter((d) => d.on).length

  if (services.length === 0) {
    return (
      <EmptyState
        icon={Scissors}
        title="Aún no hay servicios en el catálogo"
        description="Crea tus servicios y luego elige cuáles realiza cada profesional."
        action={
          <Link to="/servicios/nuevo" className="text-sm font-semibold text-brand hover:underline">
            Crear un servicio
          </Link>
        }
      />
    )
  }

  const submit = async () => {
    setError(null)
    setSaved(false)
    const bad = services.find((s) => draft[s.id]?.on && draft[s.id]!.price && parseSoles(draft[s.id]!.price) === null)
    if (bad) return setError(`Precio inválido en "${bad.name}"`)
    try {
      await save.mutateAsync({
        id: professional.id,
        services: services
          .filter((s) => draft[s.id]?.on)
          .map((s) => ({ serviceId: s.id, price: draft[s.id]!.price ? parseSoles(draft[s.id]!.price) : null })),
      })
      setSaved(true)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-sm text-muted">
        Marca lo que realiza. Si cobra distinto al precio del catálogo, escribe su precio; si no, déjalo vacío.
      </p>
      {error && (
        <div role="alert" className="rounded-control bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">
          {error}
        </div>
      )}
      <ul className="m-0 flex list-none flex-col p-0">
        {services.map((s) => {
          const row = draft[s.id]!
          return (
            <li
              key={s.id}
              className={cn('flex flex-wrap items-center gap-3 border-t border-line py-3 first:border-t-0', !row.on && 'opacity-75')}
            >
              <label className="flex min-w-0 flex-1 items-center gap-3">
                <Checkbox
                  checked={row.on}
                  disabled={!canEdit}
                  onCheckedChange={(on) => setDraft((d) => ({ ...d, [s.id]: { ...d[s.id]!, on: on === true } }))}
                />
                <span className="size-3 flex-none rounded-full" style={{ background: s.color }} aria-hidden />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{s.name}</span>
                  <span className="flex gap-1.5 pt-0.5">
                    <Pill>
                      <Clock size={11} aria-hidden /> {s.durationMinutes} min
                    </Pill>
                    <Pill>{formatCents(s.price)}</Pill>
                  </span>
                </span>
              </label>
              <label className="flex items-center gap-2 text-xs text-muted">
                Su precio
                <Input
                  value={row.price}
                  onChange={(e) => setDraft((d) => ({ ...d, [s.id]: { ...d[s.id]!, price: e.target.value } }))}
                  aria-label={`Precio propio de ${s.name}`}
                  placeholder={formatCents(s.price)}
                  inputMode="decimal"
                  disabled={!canEdit || !row.on}
                  className="w-28"
                />
              </label>
            </li>
          )
        })}
      </ul>
      {canEdit && (
        <FormActions hint={saved && !dirty ? 'Cambios guardados' : `${selected} de ${services.length} seleccionados`}>
          <Button onClick={() => setDraft(toDraft(professional, services))} disabled={!dirty || save.isPending}>
            Descartar
          </Button>
          <Button variant="primary" onClick={() => void submit()} disabled={!dirty || save.isPending}>
            {save.isPending ? 'Guardando…' : 'Guardar servicios'}
          </Button>
        </FormActions>
      )}
    </div>
  )
}
