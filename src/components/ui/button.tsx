import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'default' | 'primary' | 'danger' | 'ghost'
type Size = 'md' | 'sm'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variants: Record<Variant, string> = {
  default: 'border border-line-strong bg-surface text-ink-2 hover:border-teal',
  primary: 'bg-grad border border-transparent hover:brightness-110',
  danger: 'border border-line-strong bg-surface text-bad hover:border-bad',
  ghost: 'border border-transparent bg-transparent text-ink-2 hover:bg-surface-2',
}

const sizes: Record<Size, string> = {
  md: 'px-3.5 py-2 text-sm',
  sm: 'px-2.5 py-[5px] text-2xs',
}

export function Button({ variant = 'default', size = 'md', className, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-control font-semibold whitespace-nowrap transition-[border-color,filter,background-color]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  )
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Obligatorio: los botones de ícono necesitan nombre accesible. */
  'aria-label': string
}

export function IconButton({ className, type = 'button', ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'relative grid cursor-pointer place-items-center rounded-control p-1 text-ink-2 hover:bg-surface-2',
        className,
      )}
      {...props}
    />
  )
}
