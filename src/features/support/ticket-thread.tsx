import { ImagePlus, Loader2, Lock, Send, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/controls'
import { Textarea } from '@/components/ui/field'
import { errorMessage, fileUrl } from '@/lib/api/client'
import { cn } from '@/lib/cn'
import { formatDateTime, type MessageInput, type TicketMessage } from './api'

const MAX_ATTACHMENTS = 4
const MAX_BYTES = 6 * 1024 * 1024
const TYPES = ['image/jpeg', 'image/png', 'image/webp']

/** Conversación del ticket. Los mensajes de quien mira van a la derecha. */
export function Thread({ messages, viewer, agentLabel = 'Soporte uBook' }: { messages: TicketMessage[]; viewer: 'customer' | 'agent'; /** Cómo se presenta quien responde ante el cliente. */ agentLabel?: string }) {
  return (
    <ol className="m-0 flex list-none flex-col gap-3 p-0">
      {messages.map((m) => {
        const mine = m.from === viewer
        return (
          <li key={m.id} className={cn('flex max-w-[min(640px,92%)] flex-col gap-1', mine ? 'items-end self-end' : 'items-start self-start')}>
            <div className="flex items-center gap-1.5 text-2xs text-muted">
              <b className="font-semibold text-ink-2">{m.from === 'agent' && viewer === 'customer' ? `${m.authorName.split(' ')[0]} · ${agentLabel}` : m.authorName}</b>
              <span>{formatDateTime(m.createdAt)}</span>
              {m.internal && (
                <span className="flex items-center gap-1 font-semibold text-warn">
                  <Lock size={11} aria-hidden /> Nota interna
                </span>
              )}
            </div>
            <div
              className={cn(
                'rounded-[14px] px-3.5 py-2.5 text-sm break-words whitespace-pre-wrap',
                m.internal ? 'border border-dashed border-warn bg-warn-bg text-ink' : mine ? 'bg-brand-soft text-ink' : 'bg-surface-2 text-ink',
              )}
            >
              {m.body}
            </div>
            {m.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {m.attachments.map((url, i) => (
                  <a key={url} href={fileUrl(url)} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-[10px] border border-line hover:border-teal">
                    <img src={fileUrl(url)} alt={`Captura ${i + 1} de ${m.authorName}`} loading="lazy" className="block size-24 object-cover" />
                  </a>
                ))}
              </div>
            )}
          </li>
        )
      })}
    </ol>
  )
}

interface Shot {
  id: number
  preview: string
  key: string | null
}

/**
 * Capturas de pantalla para un mensaje: se suben apenas se eligen (o se pegan
 * con Ctrl+V) y devuelve las claves listas para adjuntar.
 */
export function useShots(upload: (file: File) => Promise<string>) {
  const [shots, setShots] = useState<Shot[]>([])
  const [error, setError] = useState<string | null>(null)
  const nextId = useRef(1)
  const previews = useRef<string[]>([])
  useEffect(() => () => previews.current.forEach((p) => URL.revokeObjectURL(p)), [])

  const add = async (files: File[]) => {
    setError(null)
    let count = shots.length
    for (const file of files) {
      if (!TYPES.includes(file.type)) return setError('Solo se pueden adjuntar capturas en JPG, PNG o WebP')
      if (file.size > MAX_BYTES) return setError('La captura pesa más de 6 MB')
      if (count >= MAX_ATTACHMENTS) return setError(`Máximo ${MAX_ATTACHMENTS} capturas por mensaje`)
      count += 1
      const id = nextId.current++
      const preview = URL.createObjectURL(file)
      previews.current.push(preview)
      setShots((s) => [...s, { id, preview, key: null }])
      try {
        const key = await upload(file)
        setShots((s) => s.map((x) => (x.id === id ? { ...x, key } : x)))
      } catch (e) {
        setShots((s) => s.filter((x) => x.id !== id))
        setError(errorMessage(e))
      }
    }
  }

  return {
    shots,
    error,
    add,
    remove: (id: number) => setShots((s) => s.filter((x) => x.id !== id)),
    clear: () => setShots([]),
    uploading: shots.some((s) => !s.key),
    keys: shots.flatMap((s) => (s.key ? [s.key] : [])),
    full: shots.length >= MAX_ATTACHMENTS,
  }
}

export function ShotList({ shots }: { shots: ReturnType<typeof useShots> }) {
  if (!shots.shots.length && !shots.error) return null
  return (
    <div className="flex flex-col gap-1.5">
      {shots.shots.length > 0 && (
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {shots.shots.map((s, i) => (
            <li key={s.id} className="relative">
              <img src={s.preview} alt={`Captura ${i + 1}`} className={cn('block size-16 rounded-[10px] border border-line object-cover', !s.key && 'opacity-50')} />
              {!s.key && <Loader2 size={16} className="absolute inset-0 m-auto animate-spin text-ink" aria-label="Subiendo" />}
              <button
                type="button"
                onClick={() => shots.remove(s.id)}
                aria-label={`Quitar captura ${i + 1}`}
                className="absolute -top-1.5 -right-1.5 grid size-5 cursor-pointer place-items-center rounded-full border border-line-strong bg-surface text-ink-2 hover:text-bad"
              >
                <X size={11} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      {shots.error && <span className="text-2xs font-semibold text-bad">{shots.error}</span>}
    </div>
  )
}

export function ShotButton({ shots }: { shots: ReturnType<typeof useShots> }) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <>
      <input
        ref={input}
        type="file"
        accept={TYPES.join(',')}
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          void shots.add([...(e.target.files ?? [])])
          e.target.value = ''
        }}
      />
      <Button size="sm" variant="ghost" disabled={shots.full} onClick={() => input.current?.click()}>
        <ImagePlus size={14} aria-hidden /> Adjuntar captura
      </Button>
    </>
  )
}

/** Imágenes pegadas con Ctrl+V en un campo de texto. */
export function pastedImages(e: React.ClipboardEvent): File[] {
  return [...e.clipboardData.files].filter((f) => f.type.startsWith('image/'))
}

/** Caja para responder en la conversación. */
export function Composer({
  onSend,
  upload,
  allowInternal,
  placeholder,
  disabled,
}: {
  onSend: (message: MessageInput) => Promise<unknown>
  upload: (file: File) => Promise<string>
  /** Equipo de plataforma: permite dejar notas que el negocio no ve. */
  allowInternal?: boolean
  placeholder: string
  disabled?: boolean
}) {
  const [body, setBody] = useState('')
  const [internal, setInternal] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const shots = useShots(upload)

  const send = async () => {
    if (!body.trim() || sending || shots.uploading) return
    setSending(true)
    setError(null)
    try {
      await onSend({ body: body.trim(), attachments: shots.keys, ...(allowInternal && { internal }) })
      setBody('')
      setInternal(false)
      shots.clear()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setSending(false)
    }
  }

  return (
    <fieldset disabled={disabled || sending} className={cn('m-0 flex min-w-0 flex-col gap-2.5 rounded-[14px] border border-line-strong p-3', internal && 'border-dashed border-warn bg-warn-bg')}>
      <Textarea
        aria-label={internal ? 'Nota interna' : 'Tu mensaje'}
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onPaste={(e) => {
          const images = pastedImages(e)
          if (images.length) {
            e.preventDefault()
            void shots.add(images)
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void send()
        }}
        placeholder={internal ? 'Nota para el equipo. El negocio no la verá.' : placeholder}
        className="border-0 bg-transparent p-0 focus-visible:outline-none"
      />
      <ShotList shots={shots} />
      {error && (
        <span role="alert" className="text-2xs font-semibold text-bad">
          {error}
        </span>
      )}
      <div className="flex flex-wrap items-center gap-2.5">
        <ShotButton shots={shots} />
        {allowInternal && (
          <label className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-ink-2">
            <Checkbox checked={internal} onCheckedChange={(v) => setInternal(v === true)} /> Nota interna
          </label>
        )}
        <span className="ml-auto hidden text-2xs text-muted sm:inline">Ctrl + Enter para enviar</span>
        <Button variant="primary" size="sm" className="ml-auto sm:ml-0" disabled={!body.trim() || shots.uploading} onClick={() => void send()}>
          <Send size={13} aria-hidden /> {sending ? 'Enviando…' : internal ? 'Guardar nota' : 'Enviar'}
        </Button>
      </div>
    </fieldset>
  )
}
