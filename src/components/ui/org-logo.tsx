import { useState } from 'react'
import { fileUrl } from '@/lib/api/client'
import { cn } from '@/lib/cn'
import { initials } from '@/lib/format'

/**
 * Logo del negocio; sin logo (o si el enlace firmado venció) muestra las iniciales.
 * `className` define tamaño, forma y colores del recuadro de las iniciales.
 */
export function OrgLogo({ name, logoUrl, className }: { name: string; logoUrl?: string | null; className?: string }) {
  const [failed, setFailed] = useState<string | null>(null)
  const src = logoUrl && failed !== logoUrl ? fileUrl(logoUrl) : null
  return (
    <span aria-hidden className={cn('grid flex-none place-items-center overflow-hidden font-bold', src && 'bg-white', className)}>
      {src ? <img src={src} alt="" onError={() => setFailed(logoUrl!)} className="size-full object-contain" /> : initials(name)}
    </span>
  )
}
