import { ImagePlus, Loader2, RefreshCw } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { errorMessage } from '@/lib/api/client'
import { cn } from '@/lib/cn'

const MAX_BYTES = 6 * 1024 * 1024
const TYPES = ['image/jpeg', 'image/png', 'image/webp']

/**
 * Foto de un comprobante: la sube apenas se elige y devuelve la clave del archivo.
 * Muestra la vista previa para que la persona confirme que se lee bien.
 */
export function ProofUpload({
  upload,
  onChange,
  error,
  label = 'Foto del comprobante',
}: {
  upload: (file: File) => Promise<string>
  onChange: (key: string | null) => void
  error?: string
  label?: string
}) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview])

  const pick = async (file: File | undefined) => {
    if (!file) return
    setFailure(null)
    if (!TYPES.includes(file.type)) return setFailure('Sube una foto JPG, PNG o WebP')
    if (file.size > MAX_BYTES) return setFailure('La foto pesa más de 6 MB')
    setPreview(URL.createObjectURL(file))
    onChange(null)
    setUploading(true)
    try {
      onChange(await upload(file))
    } catch (err) {
      setPreview(null)
      setFailure(errorMessage(err))
    } finally {
      setUploading(false)
      if (input.current) input.current.value = ''
    }
  }

  const message = failure ?? error
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-2xs font-semibold text-muted">
        {label}
      </label>
      <input ref={input} id={id} type="file" accept={TYPES.join(',')} className="sr-only" onChange={(e) => void pick(e.target.files?.[0])} />
      {preview ? (
        <div className="flex items-center gap-3 rounded-[12px] border border-line bg-surface p-2.5">
          <img src={preview} alt="Vista previa del comprobante" className="size-16 flex-none rounded-[8px] object-cover" />
          <div className="min-w-0 flex-1 text-sm">
            {uploading ? (
              <span className="flex items-center gap-1.5 text-muted">
                <Loader2 size={14} className="animate-spin" aria-hidden /> Subiendo…
              </span>
            ) : (
              <span className="font-semibold text-ok">Foto lista</span>
            )}
          </div>
          <button
            type="button"
            disabled={uploading}
            onClick={() => input.current?.click()}
            className="flex cursor-pointer items-center gap-1 text-xs font-semibold text-brand hover:underline disabled:opacity-50"
          >
            <RefreshCw size={12} aria-hidden /> Cambiar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className={cn(
            'flex cursor-pointer flex-col items-center gap-1 rounded-[12px] border border-dashed border-line-strong bg-surface-2 px-4 py-5 text-sm text-muted hover:border-teal',
            message && 'border-bad',
          )}
        >
          <ImagePlus size={22} className="text-teal-ink" aria-hidden />
          <span className="font-semibold text-ink-2">Subir foto o captura</span>
          <span className="text-2xs">JPG, PNG o WebP · máx. 6 MB</span>
        </button>
      )}
      {message && <span className="text-2xs font-semibold text-bad">{message}</span>}
    </div>
  )
}
