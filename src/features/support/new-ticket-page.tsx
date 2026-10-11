import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { BackLink, FormActions, FormSection } from '@/components/ui/page'
import { errorMessage } from '@/lib/api/client'
import { usePageMeta } from '@/lib/page-meta'
import { CATEGORIES, STAFF_CATEGORIES, lastVisited, uploadAttachment, useTicketActions, type TicketCategory } from './api'
import { pastedImages, ShotButton, ShotList, useShots } from './ticket-thread'

/** Ayuda y soporte / Nuevo ticket. */
export function NewTicketPage() {
  const navigate = useNavigate()
  const { create } = useTicketActions()
  const shots = useShots((file) => uploadAttachment(file))
  usePageMeta({ title: 'Nuevo ticket', crumb: 'Ayuda / Soporte / Nuevo ticket' })

  const [category, setCategory] = useState<TicketCategory>('bug')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setError(null)
    if (subject.trim().length < 4) return setError('Escribe un asunto corto, por ejemplo: "No puedo crear citas"')
    if (body.trim().length < 10) return setError('Cuéntanos qué pasó con un poco más de detalle')
    try {
      const ticket = await create.mutateAsync({
        subject: subject.trim(),
        category,
        body: body.trim(),
        attachments: shots.keys,
        context: { path: lastVisited.get(), userAgent: navigator.userAgent.slice(0, 300), viewport: `${window.innerWidth}x${window.innerHeight}` },
      })
      navigate(`/soporte/${ticket.id}`, { replace: true })
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <>
      <BackLink to="/soporte" label="Ayuda y soporte" />
      <Card>
        {error && (
          <div role="alert" className="mb-4 rounded-control bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">
            {error}
          </div>
        )}
        <FormSection title="¿En qué te ayudamos?" description="Te responde una persona del equipo de uBook. Verás la respuesta aquí y te avisamos por correo.">
          <div className="grid gap-3 sm:grid-cols-[220px_minmax(0,1fr)]">
            <Field label="Tipo">
              {(p) => (
                <Select {...p} value={category} onChange={(e) => setCategory(e.target.value as TicketCategory)}>
                  {STAFF_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORIES[c]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Asunto">{(p) => <Input {...p} value={subject} maxLength={140} onChange={(e) => setSubject(e.target.value)} placeholder="Ej.: No puedo crear citas" autoFocus />}</Field>
          </div>
        </FormSection>
        <FormSection
          title="Cuéntanos qué pasó"
          description={category === 'bug' ? 'Qué estabas haciendo, qué esperabas que pasara y qué mensaje viste. Una captura de pantalla ayuda mucho.' : 'Mientras más detalle, más rápido te podemos ayudar.'}
        >
          <Field label="Descripción">
            {(p) => (
              <Textarea
                {...p}
                rows={7}
                value={body}
                maxLength={5000}
                onChange={(e) => setBody(e.target.value)}
                onPaste={(e) => {
                  const images = pastedImages(e)
                  if (images.length) {
                    e.preventDefault()
                    void shots.add(images)
                  }
                }}
                placeholder="Ej.: Al guardar una cita para mañana a las 10 am sale un mensaje rojo que dice…"
              />
            )}
          </Field>
          <div className="flex flex-col gap-2">
            <span className="text-2xs font-semibold text-muted">Capturas de pantalla (opcional, hasta 4)</span>
            <ShotList shots={shots} />
            <div className="flex items-center gap-2">
              <ShotButton shots={shots} />
              <span className="text-2xs text-muted">También puedes pegarlas con Ctrl + V.</span>
            </div>
          </div>
        </FormSection>
        <FormActions>
          <Button onClick={() => navigate('/soporte')}>Cancelar</Button>
          <Button variant="primary" onClick={() => void submit()} disabled={create.isPending || shots.uploading}>
            {create.isPending ? 'Enviando…' : 'Enviar a soporte'}
          </Button>
        </FormActions>
      </Card>
    </>
  )
}
