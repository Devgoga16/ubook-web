import { Check } from 'lucide-react'
import { Checkbox } from '@/components/ui/controls'
import type { Branch, Role } from '@/lib/api/types'
import { cn } from '@/lib/cn'
import { ROLE_HINTS } from './api'

/** Dueño y Administrador ya incluyen todo: no se combinan con otros roles. */
const EXCLUSIVE = ['owner', 'admin']

/**
 * Roles de la persona. Se pueden combinar (p. ej. Recepción + Profesional):
 * tiene el permiso más amplio de cada uno.
 */
export function RolePicker({
  roles,
  value,
  onChange,
  canAssignOwner,
  error,
}: {
  roles: Role[]
  value: string[]
  onChange: (ids: string[]) => void
  canAssignOwner: boolean
  error?: string
}) {
  const options = roles.filter((r) => r.templateKey !== 'owner' || canAssignOwner)
  const isExclusive = (id: string) => EXCLUSIVE.includes(roles.find((r) => r.id === id)?.templateKey ?? '')
  const toggle = (id: string) => {
    if (value.includes(id)) return onChange(value.length > 1 ? value.filter((x) => x !== id) : value)
    if (isExclusive(id)) return onChange([id])
    onChange([...value.filter((x) => !isExclusive(x)), id])
  }
  return (
    <div className="flex flex-col gap-1.5">
      <div role="group" aria-label="Rol" className="grid gap-2.5 sm:grid-cols-2">
        {options.map((r) => {
          const on = value.includes(r.id)
          return (
            <button
              key={r.id}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => toggle(r.id)}
              className={cn(
                'flex cursor-pointer items-start gap-2.5 rounded-[12px] border-[1.5px] border-line bg-surface p-3.5 text-left text-ink hover:border-teal-line',
                on && 'border-teal bg-teal-soft/40',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'mt-0.5 grid size-[18px] flex-none place-items-center rounded-[5px] border-[1.5px] border-line-strong',
                  on && 'border-teal bg-teal text-on-teal',
                )}
              >
                {on && <Check size={11} strokeWidth={3} />}
              </span>
              <span className="min-w-0">
                <b className="block text-sm font-semibold">{r.name}</b>
                <span className="block text-xs text-muted">{r.description || (r.templateKey ? ROLE_HINTS[r.templateKey] : 'Rol personalizado')}</span>
              </span>
            </button>
          )
        })}
      </div>
      <span className="text-2xs text-muted">Puedes combinar Recepción y Profesional, por ejemplo para alguien que atiende y también agenda.</span>
      {error && <span className="text-2xs font-semibold text-bad">{error}</span>}
    </div>
  )
}

/** Sedes donde opera. Ninguna marcada = todas. */
export function BranchPicker({ branches, value, onChange }: { branches: Branch[]; value: string[]; onChange: (ids: string[]) => void }) {
  const all = value.length === 0
  return (
    <div className="flex flex-col gap-2">
      <label className="flex cursor-pointer items-center gap-2.5 text-sm">
        <Checkbox checked={all} onCheckedChange={(v) => v === true && onChange([])} />
        Todas las sedes
      </label>
      {branches.map((b) => (
        <label key={b.id} className="flex cursor-pointer items-center gap-2.5 text-sm">
          <Checkbox
            checked={!all && value.includes(b.id)}
            onCheckedChange={(v) => onChange(v === true ? [...value, b.id] : value.filter((x) => x !== b.id))}
          />
          {b.name}
        </label>
      ))}
    </div>
  )
}
