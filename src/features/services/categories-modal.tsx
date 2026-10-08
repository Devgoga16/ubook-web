import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { Button, IconButton } from '@/components/ui/button'
import { Input } from '@/components/ui/field'
import { Modal } from '@/components/ui/overlays'
import { errorMessage } from '@/lib/api/client'
import type { Service, ServiceCategory } from '@/lib/api/types'
import { useDeleteCategory, useSaveCategory } from './api'

/** Crear, renombrar y eliminar categorías de servicios. */
export function CategoriesModal({
  open,
  onOpenChange,
  categories,
  services,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: ServiceCategory[]
  services: Service[]
}) {
  const save = useSaveCategory()
  const remove = useDeleteCategory()
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = async (fn: () => Promise<unknown>) => {
    setError(null)
    try {
      await fn()
      return true
    } catch (e) {
      setError(errorMessage(e))
      return false
    }
  }

  const add = async () => {
    if (!name.trim()) return
    if (await run(() => save.mutateAsync({ name: name.trim() }))) setName('')
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Categorías de servicios">
      <div className="flex flex-col gap-3">
        {error && (
          <div role="alert" className="rounded-control bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">
            {error}
          </div>
        )}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void add()
          }}
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nueva categoría, p. ej. Cortes"
            aria-label="Nombre de la nueva categoría"
            maxLength={50}
          />
          <Button type="submit" variant="primary" disabled={!name.trim() || save.isPending}>
            <Plus size={14} aria-hidden /> Agregar
          </Button>
        </form>

        {categories.length === 0 ? (
          <p className="m-0 py-4 text-center text-sm text-muted">Aún no tienes categorías.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {categories.map((c) => {
              const count = services.filter((s) => s.categoryId === c.id).length
              const isEditing = editing?.id === c.id
              return (
                <li key={c.id} className="flex items-center gap-2 border-t border-line py-2 first:border-t-0">
                  {isEditing ? (
                    <form
                      className="flex flex-1 gap-2"
                      onSubmit={async (e) => {
                        e.preventDefault()
                        if (await run(() => save.mutateAsync({ id: c.id, name: editing.name.trim() }))) setEditing(null)
                      }}
                    >
                      <Input
                        value={editing.name}
                        onChange={(e) => setEditing({ id: c.id, name: e.target.value })}
                        aria-label={`Nuevo nombre para ${c.name}`}
                        autoFocus
                        maxLength={50}
                      />
                      <IconButton type="submit" aria-label="Guardar nombre">
                        <Check size={16} />
                      </IconButton>
                      <IconButton aria-label="Cancelar" onClick={() => setEditing(null)}>
                        <X size={16} />
                      </IconButton>
                    </form>
                  ) : (
                    <>
                      <span className="flex-1 font-semibold">{c.name}</span>
                      <span className="text-xs text-muted">
                        {count} {count === 1 ? 'servicio' : 'servicios'}
                      </span>
                      <IconButton aria-label={`Renombrar ${c.name}`} onClick={() => setEditing({ id: c.id, name: c.name })}>
                        <Pencil size={15} />
                      </IconButton>
                      <IconButton
                        aria-label={`Eliminar ${c.name}`}
                        className="text-bad"
                        onClick={() => {
                          const ok =
                            count === 0 ||
                            window.confirm(`Los ${count} servicios de "${c.name}" quedarán sin categoría. ¿Eliminarla?`)
                          if (ok) void run(() => remove.mutateAsync(c.id))
                        }}
                      >
                        <Trash2 size={15} />
                      </IconButton>
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Modal>
  )
}
