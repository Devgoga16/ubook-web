import { ChevronRight, FilePlus2, FileText, LayoutTemplate } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Tag } from '@/components/ui/badges'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/display'
import { errorMessage } from '@/lib/api/client'
import { cn } from '@/lib/cn'
import { useRecordPresets, useRecordTemplates, useSaveTemplate } from './api'

/** Configuración / Fichas clínicas: plantillas del negocio y punto de partida para crear más. */
export function TemplatesSection() {
  const navigate = useNavigate()
  const templates = useRecordTemplates(true)
  const presets = useRecordPresets()
  const save = useSaveTemplate()
  const [error, setError] = useState<string | null>(null)

  const fromPreset = async (key: string) => {
    setError(null)
    try {
      const t = await save.mutateAsync({ preset: key })
      navigate(`/configuracion/fichas/${t.id}`)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  const list = templates.data ?? []

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader title="Plantillas de ficha" />
        <p className="mt-0 mb-4 text-sm text-muted">
          Definen qué se registra en cada atención. Al cambiar una plantilla, las fichas ya escritas no se modifican.
        </p>
        {templates.isLoading ? (
          <Skeleton className="h-20" />
        ) : list.length === 0 ? (
          <p className="m-0 rounded-[10px] bg-surface-2 px-4 py-3 text-sm text-muted">Aún no tienes plantillas. Empieza con una lista abajo.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {list.map((t) => (
              <li key={t.id} className="border-t border-line first:border-t-0">
                <Link
                  to={`/configuracion/fichas/${t.id}`}
                  className={cn('-mx-2 flex items-center gap-3 rounded-control px-2 py-3 text-ink hover:bg-surface-2', !t.isActive && 'opacity-70')}
                >
                  <span className="grid size-9 flex-none place-items-center rounded-[10px] bg-brand-soft text-brand">
                    <FileText size={17} strokeWidth={1.7} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 font-semibold">
                      {t.name} {!t.isActive && <Tag tone="off">Inactiva</Tag>}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {t.fields.length} campos{t.description ? ` · ${t.description}` : ''}
                    </span>
                  </span>
                  <ChevronRight size={18} className="text-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Crear plantilla"
          actions={
            <Button size="sm" onClick={() => navigate('/configuracion/fichas/nueva')}>
              <FilePlus2 size={13} aria-hidden /> En blanco
            </Button>
          }
        />
        {error && (
          <div role="alert" className="mb-3 rounded-control bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">
            {error}
          </div>
        )}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
          {(presets.data ?? []).map((p) => (
            <button
              key={p.key}
              type="button"
              disabled={save.isPending}
              onClick={() => fromPreset(p.key)}
              className="flex cursor-pointer flex-col gap-1.5 rounded-card border-[1.5px] border-line bg-surface p-4 text-left text-ink hover:border-teal disabled:cursor-wait disabled:opacity-60"
            >
              <LayoutTemplate size={20} strokeWidth={1.7} aria-hidden className="text-teal-ink" />
              <b className="font-semibold">{p.name}</b>
              <span className="text-xs text-muted">{p.description}</span>
              <span className="mt-auto pt-1 text-2xs font-semibold text-brand">Usar · {p.fieldCount} campos</span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  )
}
