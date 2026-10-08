import { Command } from 'cmdk'
import type { LucideIcon } from 'lucide-react'
import { Search } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Kbd } from './badges'

export interface PaletteItem {
  id: string
  group: string
  label: string
  hint?: string
  icon?: LucideIcon
  leading?: ReactNode
  shortcut?: string
  keywords?: string[]
  onSelect: () => void
}

/** Búsqueda rápida (Ctrl/⌘ + K). */
export function CommandPalette({
  open,
  onOpenChange,
  items,
  search,
  onSearchChange,
  placeholder = 'Buscar pantallas y acciones…',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: PaletteItem[]
  /** Texto buscado, para resultados que vienen de la API (clientes). */
  search?: string
  onSearchChange?: (value: string) => void
  placeholder?: string
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  const groups = [...new Set(items.map((i) => i.group))]
  const itemValue = (i: PaletteItem) => `${i.label} ${i.id}`

  // Los resultados de la API llegan después de escribir: al cambiar el primero, se selecciona.
  const [selected, setSelected] = useState('')
  const [lastFirst, setLastFirst] = useState('')
  const first = items[0]
  const firstValue = first?.group === 'Clientes' ? itemValue(first) : ''
  if (firstValue !== lastFirst) {
    setLastFirst(firstValue)
    if (firstValue) setSelected(firstValue)
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Búsqueda rápida"
      value={selected}
      onValueChange={setSelected}
      overlayClassName="fixed inset-0 z-50 bg-overlay"
      contentClassName="fixed top-[12vh] left-1/2 z-50 w-[min(580px,calc(100%-32px))] -translate-x-1/2 overflow-hidden rounded-panel bg-surface shadow-pop"
    >
      <div className="flex items-center gap-2.5 border-b border-line px-4 py-3.5">
        <Search size={18} className="text-muted" aria-hidden />
        <Command.Input
          value={search}
          onValueChange={onSearchChange}
          placeholder={placeholder}
          className="min-w-0 flex-1 border-0 bg-transparent text-md text-ink outline-none placeholder:text-muted"
        />
        <Kbd>Esc</Kbd>
      </div>
      <Command.List className="max-h-[60vh] overflow-y-auto p-2">
        <Command.Empty className="px-2.5 py-6 text-center text-sm text-muted">Sin resultados</Command.Empty>
        {groups.map((g) => (
          <Command.Group
            key={g}
            heading={g}
            className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:tracking-[.1em] [&_[cmdk-group-heading]]:text-muted [&_[cmdk-group-heading]]:uppercase"
          >
            {items
              .filter((i) => i.group === g)
              .map(({ id, label, hint, icon: Icon, leading, shortcut, keywords, onSelect }) => (
                <Command.Item
                  key={id}
                  value={`${label} ${id}`}
                  keywords={keywords}
                  onSelect={() => {
                    onOpenChange(false)
                    onSelect()
                  }}
                  className="flex cursor-pointer items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-body data-[selected=true]:bg-surface-2"
                >
                  {leading ?? (Icon && <Icon size={16} strokeWidth={1.7} aria-hidden />)}
                  <span>{label}</span>
                  {hint && <span className="text-xs text-muted">· {hint}</span>}
                  {shortcut && <Kbd className="ml-auto">{shortcut}</Kbd>}
                </Command.Item>
              ))}
          </Command.Group>
        ))}
      </Command.List>
    </Command.Dialog>
  )
}
