import { useQuery } from '@tanstack/react-query'
import { ExternalLink } from 'lucide-react'
import { Skeleton } from '@/components/ui/display'
import { api, errorMessage, fileUrl } from '@/lib/api/client'

/** Foto de un comprobante. `path` devuelve un enlace temporal y firmado, así que no se guarda en caché. */
export function ProofImage({ path }: { path: string }) {
  const proof = useQuery({ queryKey: ['proof', path], queryFn: () => api<{ url: string }>(path), gcTime: 0, staleTime: 0, retry: false })
  if (proof.isLoading) return <Skeleton className="h-[360px] rounded-card" />
  if (!proof.data) return <p className="m-0 text-sm font-semibold text-bad">{errorMessage(proof.error)}</p>
  const src = fileUrl(proof.data.url)
  return (
    <div className="flex flex-col gap-2.5">
      <img src={src} alt="Comprobante de pago" className="max-h-[65vh] w-full rounded-[12px] bg-surface-2 object-contain" />
      <a href={src} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 self-end text-xs font-semibold text-brand hover:underline">
        <ExternalLink size={12} aria-hidden /> Abrir en otra pestaña
      </a>
    </div>
  )
}
