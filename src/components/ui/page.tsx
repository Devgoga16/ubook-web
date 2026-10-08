import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { cn } from '@/lib/cn'

/** Enlace "← Volver a …" sobre el encabezado de una ficha o formulario. */
export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-muted hover:text-ink">
      <ArrowLeft size={15} aria-hidden /> {label}
    </Link>
  )
}

/**
 * Bloque de formulario: título y explicación a la izquierda, campos a la
 * derecha (en pantallas anchas). Agrupa por tema en vez de una lista larga.
 */
export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        'grid gap-4 border-t border-line py-6 first:border-t-0 first:pt-0 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)] lg:gap-8',
        className,
      )}
    >
      <div>
        <h3 className="m-0 text-md font-bold">{title}</h3>
        {description && <p className="mt-1 mb-0 text-xs text-muted">{description}</p>}
      </div>
      <div className="flex min-w-0 flex-col gap-3.5">{children}</div>
    </section>
  )
}

/** Barra de acciones fija al pie del formulario (Guardar / Cancelar). */
export function FormActions({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-5 -mb-[18px] mt-2 flex flex-wrap items-center gap-2.5 rounded-b-card border-t border-line bg-surface/95 px-5 py-3.5 backdrop-blur">
      {hint && <span className="text-xs text-muted">{hint}</span>}
      <div className="ml-auto flex gap-2.5">{children}</div>
    </div>
  )
}

/** Pestañas como enlaces: la pestaña activa queda en la URL (?tab=horario). */
export function RouteTabs<T extends string>({
  tabs,
  fallback,
}: {
  tabs: Array<{ value: T; label: string; badge?: ReactNode }>
  fallback: T
}) {
  const [params] = useSearchParams()
  const current = (params.get('tab') as T | null) ?? fallback
  return (
    <nav aria-label="Secciones" className="flex gap-1 overflow-x-auto border-b border-line [scrollbar-width:none]">
      {tabs.map((t) => {
        const on = t.value === current
        return (
          <Link
            key={t.value}
            to={`?tab=${t.value}`}
            replace
            aria-current={on ? 'page' : undefined}
            className={cn(
              '-mb-px flex items-center gap-1.5 border-b-2 border-transparent px-3.5 py-2.5 text-body font-semibold whitespace-nowrap text-muted hover:text-ink',
              on && 'border-teal text-brand',
            )}
          >
            {t.label}
            {t.badge}
          </Link>
        )
      })}
    </nav>
  )
}

export function useTab<T extends string>(allowed: readonly T[], fallback: T): T {
  const [params] = useSearchParams()
  const tab = params.get('tab') as T | null
  return tab && allowed.includes(tab) ? tab : fallback
}
