import { ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { OrgLogo } from '@/components/ui/org-logo'
import { FormSection } from '@/components/ui/page'
import { api, errorMessage } from '@/lib/api/client'
import { useAccess } from '@/lib/auth/access'
import { useAuth } from '@/lib/auth/auth-context'

const MAX_BYTES = 6 * 1024 * 1024
const TYPES = ['image/jpeg', 'image/png', 'image/webp']

/** Logo del negocio: reemplaza las iniciales en el menú y en la página de reservas. */
export function LogoSection() {
  const { me, reload } = useAuth()
  const { hasFeature, readOnly } = useAccess()
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<'upload' | 'remove' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const org = me?.organization
  if (!org) return null

  const allowed = hasFeature('branding')
  const run = async (kind: 'upload' | 'remove', fn: () => Promise<unknown>) => {
    setError(null)
    setBusy(kind)
    try {
      await fn()
      await reload()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(null)
      if (input.current) input.current.value = ''
    }
  }

  const pick = (file: File | undefined) => {
    if (!file) return
    if (!TYPES.includes(file.type)) return setError('Sube una imagen JPG, PNG o WebP')
    if (file.size > MAX_BYTES) return setError('La imagen pesa más de 6 MB')
    const body = new FormData()
    body.append('file', file)
    void run('upload', () => api('/organization/logo', { method: 'POST', body }))
  }

  return (
    <Card>
      <FormSection title="Logo" description="Se muestra en el menú de la app y en tu página de reservas, en lugar de las iniciales.">
        <div className="flex flex-wrap items-center gap-5">
          <OrgLogo
            name={org.name}
            logoUrl={org.logoUrl}
            className="size-24 rounded-[20px] border border-line bg-surface-2 text-2xl tracking-[.04em] text-ink-2"
          />
          <div className="flex min-w-0 flex-col gap-2.5">
            {allowed ? (
              <>
                <input ref={input} id={id} type="file" accept={TYPES.join(',')} className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary" disabled={!!busy || readOnly} onClick={() => input.current?.click()}>
                    {busy === 'upload' ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <ImagePlus size={14} aria-hidden />}
                    {org.logoUrl ? 'Cambiar logo' : 'Subir logo'}
                  </Button>
                  {org.logoUrl && (
                    <Button variant="danger" disabled={!!busy || readOnly} onClick={() => void run('remove', () => api('/organization/logo', { method: 'DELETE' }))}>
                      {busy === 'remove' ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Trash2 size={14} aria-hidden />}
                      Quitar
                    </Button>
                  )}
                </div>
                <p className="m-0 text-xs text-muted">Cuadrado y de al menos 256 × 256 px. JPG, PNG o WebP de hasta 6 MB. Mejor con fondo blanco o transparente.</p>
              </>
            ) : (
              <p className="m-0 text-sm text-muted">Tu plan no incluye marca propia.</p>
            )}
            {error && (
              <p role="alert" className="m-0 rounded-control bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">
                {error}
              </p>
            )}
          </div>
        </div>
      </FormSection>
    </Card>
  )
}
