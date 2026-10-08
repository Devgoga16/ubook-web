import { Moon, Sun } from 'lucide-react'
import type { ReactNode } from 'react'
import { Logo } from '@/components/brand/logo'
import { OrgLogo } from '@/components/ui/org-logo'
import { useTheme } from '@/lib/theme'

/** Marco de las páginas que ve el cliente final: el negocio arriba, uBook discreto abajo. */
export function PublicLayout({ title, subtitle, logoUrl, children }: { title?: string; subtitle?: ReactNode; logoUrl?: string | null; children: ReactNode }) {
  const { resolved, setPreference } = useTheme()
  const dark = resolved === 'dark'
  return (
    <div className="min-h-screen bg-bg">
      <header className="bg-grad">
        <div className="mx-auto flex max-w-[680px] items-center gap-3.5 px-4 pt-6 pb-16">
          {title && (
            <OrgLogo name={title} logoUrl={logoUrl} className="size-12 rounded-[14px] bg-white/20 text-lg font-semibold shadow-card" />
          )}
          <div className="min-w-0 flex-1">
            {title && <h1 className="m-0 truncate text-xl font-semibold">{title}</h1>}
            {subtitle && <div className="truncate text-sm opacity-90">{subtitle}</div>}
          </div>
          <button
            type="button"
            onClick={() => setPreference(dark ? 'light' : 'dark')}
            aria-label={dark ? 'Usar modo claro' : 'Usar modo oscuro'}
            className="grid size-9 cursor-pointer place-items-center rounded-full bg-white/15 hover:bg-white/25"
          >
            {dark ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
          </button>
        </div>
      </header>
      <main className="mx-auto -mt-10 flex max-w-[680px] flex-col gap-4 px-4 pb-12">{children}</main>
      <footer className="pb-8 text-center text-2xs text-muted">
        <a href="/inicio" className="inline-flex items-center gap-1.5 text-muted no-underline hover:text-ink">
          Reservas con <Logo size="sm" />
        </a>
      </footer>
    </div>
  )
}
