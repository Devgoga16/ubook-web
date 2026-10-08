import { useId } from 'react'
import { cn } from '@/lib/cn'

/**
 * Ícono de uBook: calendario azul noche con el check ámbar.
 * Colores fijos (es la marca). Sobre fondos oscuros lleva un borde tenue
 * (`--logo-ring`) para que el calendario no se pierda con el fondo.
 */
export function BrandIcon({ className, title }: { className?: string; title?: string }) {
  const clip = useId()
  return (
    <svg viewBox="0 0 64 64" className={cn('flex-none', className)} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <defs>
        <clipPath id={clip}>
          <rect x="4" y="9" width="56" height="51" rx="15" />
        </clipPath>
      </defs>
      <rect x="4" y="9" width="56" height="51" rx="15" fill="#293453" />
      <path d="M60 31C49 46 33 56 12 62H60Z" fill="#586D88" clipPath={`url(#${clip})`} />
      <rect x="5" y="10" width="54" height="49" rx="14" fill="none" stroke="var(--logo-ring, transparent)" strokeWidth="2" />
      <rect x="13" y="20" width="38" height="29" rx="8" fill="#fff" />
      <path d="M21.5 34.5l6.5 6.5 13.5-13.5" fill="none" stroke="#F4B550" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="16.5" y="2" width="8" height="15" rx="4" fill="#586D88" stroke="#fff" strokeWidth="2.5" />
      <rect x="39.5" y="2" width="8" height="15" rx="4" fill="#586D88" stroke="#fff" strokeWidth="2.5" />
    </svg>
  )
}

const SIZES = {
  sm: { icon: 'size-5', text: 'text-[17px]', gap: 'gap-1.5' },
  md: { icon: 'size-7', text: 'text-[23px]', gap: 'gap-2' },
  lg: { icon: 'size-10', text: 'text-[32px]', gap: 'gap-2.5' },
} as const

/**
 * Logo completo: ícono + "uBook" ("u" ámbar, "Book" azul noche).
 * `onDark`: sobre fondos oscuros o el degradado, "Book" va en blanco.
 */
export function Logo({
  size = 'md',
  onDark,
  iconOnly,
  className,
}: {
  size?: keyof typeof SIZES
  onDark?: boolean
  iconOnly?: boolean
  className?: string
}) {
  const s = SIZES[size]
  if (iconOnly) return <BrandIcon className={cn(s.icon, className)} title="uBook" />
  return (
    <span className={cn('inline-flex items-center font-bold tracking-[-.03em]', s.gap, className)}>
      <BrandIcon className={cn(s.icon, onDark && '[--logo-ring:rgb(255_255_255/.35)]')} />
      <span className={cn('leading-none', s.text)}>
        <span className="text-logo-accent">u</span>
        <span className={onDark ? 'text-white' : 'text-logo-ink'}>Book</span>
      </span>
    </span>
  )
}

export const TAGLINE = 'Tu negocio. Tus reservas.'
