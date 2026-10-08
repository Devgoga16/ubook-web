import { cn } from '@/lib/cn'
import { colorFor } from '@/lib/avatar-color'
import { initials } from '@/lib/format'

type Size = 'xs' | 'md' | 'lg'

const sizes: Record<Size, string> = {
  xs: 'size-[26px] text-2xs rounded-[7px]',
  md: 'size-[34px] text-xs rounded-[9px]',
  lg: 'size-[52px] text-lg rounded-[14px]',
}

export function Avatar({
  name,
  color,
  size = 'md',
  round = false,
  className,
}: {
  name: string
  color?: string
  size?: Size
  round?: boolean
  className?: string
}) {
  return (
    <span
      role="img"
      aria-label={name}
      title={name}
      className={cn(
        'grid flex-none place-items-center font-semibold tracking-[.02em] text-white',
        sizes[size],
        round && 'rounded-full',
        className,
      )}
      style={{ background: color ?? colorFor(name) }}
    >
      {initials(name)}
    </span>
  )
}

export function AvatarGroup({ people }: { people: Array<{ name: string; color?: string }> }) {
  return (
    <span className="flex">
      {people.map((p, i) => (
        <Avatar
          key={p.name}
          name={p.name}
          color={p.color}
          size="xs"
          round
          className={cn('border-2 border-surface', i > 0 && '-ml-[7px]')}
        />
      ))}
    </span>
  )
}
