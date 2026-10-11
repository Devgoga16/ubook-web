import { Eye, LogOut } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/api/client'
import { useAuth } from '@/lib/auth/auth-context'

/** Entra al negocio en solo lectura para ver lo mismo que ve el cliente. */
export function SupportViewButton({ organizationId, organizationName, ticketId }: { organizationId: string; organizationName: string; ticketId?: string }) {
  const { enterSupportView } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const enter = async () => {
    if (!window.confirm(`Vas a entrar a ${organizationName} en modo soporte: verás su panel en solo lectura (sin fichas clínicas). El acceso queda registrado en su auditoría.`)) return
    setBusy(true)
    setError(null)
    try {
      await enterSupportView(organizationId, ticketId)
      navigate('/')
    } catch (e) {
      setError(errorMessage(e))
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button onClick={() => void enter()} disabled={busy}>
        <Eye size={14} aria-hidden /> {busy ? 'Entrando…' : 'Ver como el negocio'}
      </Button>
      {error && <span className="text-2xs font-semibold text-bad">{error}</span>}
    </div>
  )
}

/** Aviso permanente mientras el agente está dentro de un negocio. */
export function SupportViewBanner() {
  const { me, exitSupportView } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  const exit = async () => {
    setBusy(true)
    const to = await exitSupportView()
    // Después de que la app redirija al inicio de plataforma, para volver al ticket de origen.
    setTimeout(() => navigate(to, { replace: true }), 0)
  }

  return (
    <div role="status" className="flex flex-wrap items-center gap-2.5 rounded-card bg-warn-bg px-4 py-2.5 text-sm text-warn">
      <Eye size={16} aria-hidden className="flex-none" />
      <span className="min-w-[200px] flex-1">
        <b>Modo soporte · solo lectura.</b> Estás viendo <b>{me?.organization?.name}</b> como lo ve su equipo. No puedes modificar nada y las fichas clínicas están ocultas. La vista se cierra sola a los 30 minutos.
      </span>
      <Button size="sm" onClick={() => void exit()} disabled={busy}>
        <LogOut size={13} aria-hidden /> {busy ? 'Saliendo…' : 'Salir del modo soporte'}
      </Button>
    </div>
  )
}
