import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export interface PageMeta {
  title: string
  /** Ruta completa del encabezado: "Catálogo / Profesionales / Luis Paredes". */
  crumb: string
}

const PageMetaContext = createContext<{
  meta: PageMeta | null
  setMeta: (meta: PageMeta | null) => void
} | null>(null)

export function PageMetaProvider({ children }: { children: ReactNode }) {
  const [meta, setMeta] = useState<PageMeta | null>(null)
  return <PageMetaContext.Provider value={{ meta, setMeta }}>{children}</PageMetaContext.Provider>
}

export function usePageMetaValue() {
  return useContext(PageMetaContext)?.meta ?? null
}

/** Título y ruta propios para páginas con datos (p. ej. la ficha de un profesional). */
export function usePageMeta(meta: PageMeta | null) {
  const ctx = useContext(PageMetaContext)
  const setMeta = ctx?.setMeta
  const title = meta?.title
  const crumb = meta?.crumb
  useEffect(() => {
    if (!setMeta) return
    setMeta(title && crumb ? { title, crumb } : null)
    return () => setMeta(null)
  }, [setMeta, title, crumb])
}
