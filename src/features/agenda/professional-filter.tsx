import * as PopoverPrimitive from '@radix-ui/react-popover'
import { ChevronDown, Users } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/controls'
import type { Professional } from '@/lib/api/types'
import { cn } from '@/lib/cn'

const INLINE_MAX = 5

/**
 * Selector de profesionales visibles en la agenda: "Todos" o los que elijas.
 * Cada chip muestra cuántas citas tiene en el rango visible.
 */
export function ProfessionalFilter({
  professionals,
  counts,
  selected,
  onChange,
}: {
  professionals: Professional[]
  counts: Record<string, number>
  /** Ids visibles; vacío = todos. */
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  const all = selected.length === 0 || selected.length === professionals.length
  const isOn = (id: string) => all || selected.includes(id)

  const toggle = (id: string) => {
    const current = all ? [] : selected
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    onChange(next.length === professionals.length ? [] : next)
  }

  /** En la lista con casillas, desmarcar desde "Todos" deja a los demás marcados. */
  const toggleChecked = (id: string) => {
    const current = all ? professionals.map((p) => p.id) : selected
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    onChange(next.length === professionals.length || next.length === 0 ? [] : next)
  }

  const chip = (p: Professional) => {
    const on = !all && selected.includes(p.id)
    return (
      <button
        key={p.id}
        type="button"
        aria-pressed={on}
        onClick={() => toggle(p.id)}
        className={cn(
          'flex cursor-pointer items-center gap-2 rounded-full border bg-surface py-1 pr-2.5 pl-1 text-xs font-semibold transition-all',
          on ? 'border-transparent text-ink' : 'border-line-strong text-ink-2 hover:border-teal-line',
          !all && !on && 'opacity-60',
        )}
        style={on ? { boxShadow: `0 0 0 2px ${p.color}` } : undefined}
      >
        <Avatar name={p.displayName} color={p.color} size="xs" round />
        {p.displayName.split(' ')[0]}
        <span className="tabular rounded-full bg-surface-2 px-1.5 text-2xs text-muted">{counts[p.id] ?? 0}</span>
      </button>
    )
  }

  const inline = professionals.length <= INLINE_MAX

  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Profesionales visibles">
      <button
        type="button"
        aria-pressed={all}
        onClick={() => onChange([])}
        className={cn(
          'flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
          all ? 'border-ink bg-ink text-surface' : 'border-line-strong bg-surface text-ink-2 hover:border-teal-line',
        )}
      >
        <Users size={13} aria-hidden /> Todos
      </button>
      {inline ? (
        professionals.map(chip)
      ) : (
        <PopoverPrimitive.Root>
          <PopoverPrimitive.Trigger className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 py-1.5 text-xs font-semibold text-ink-2">
            {all ? `${professionals.length} profesionales` : `${selected.length} de ${professionals.length}`}
            <ChevronDown size={13} aria-hidden />
          </PopoverPrimitive.Trigger>
          <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content align="end" sideOffset={8} className="z-50 max-h-[60vh] w-[260px] overflow-y-auto rounded-panel bg-surface p-2 shadow-pop">
              {professionals.map((p) => (
                <label key={p.id} className="flex cursor-pointer items-center gap-2.5 rounded-control px-2 py-1.5 text-sm hover:bg-surface-2">
                  <Checkbox checked={isOn(p.id)} onCheckedChange={() => toggleChecked(p.id)} />
                  <Avatar name={p.displayName} color={p.color} size="xs" round />
                  <span className="flex-1 truncate">{p.displayName}</span>
                  <span className="tabular text-2xs text-muted">{counts[p.id] ?? 0}</span>
                </label>
              ))}
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>
      )}
    </div>
  )
}
