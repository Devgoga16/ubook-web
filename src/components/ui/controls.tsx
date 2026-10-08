import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import * as SwitchPrimitive from '@radix-ui/react-switch'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import * as ToggleGroup from '@radix-ui/react-toggle-group'
import { Check } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

/** Interruptor (on/off). Requiere `aria-label` o una etiqueta asociada. */
export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        'relative h-5 w-[34px] flex-none cursor-pointer rounded-full bg-line-strong transition-colors data-[state=checked]:bg-teal',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-3.5 translate-x-[3px] rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-[17px]" />
    </SwitchPrimitive.Root>
  )
}

export function Checkbox({ className, ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        'inline-grid size-4 flex-none cursor-pointer place-items-center rounded-[4px] border-[1.5px] border-line-strong bg-surface text-white',
        'data-[state=checked]:border-brand data-[state=checked]:bg-brand dark:data-[state=checked]:text-bg',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        <Check size={11} strokeWidth={3} aria-hidden />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

interface Option<T extends string> {
  value: T
  label: string
}

interface SingleSelectProps<T extends string> {
  value: T
  onValueChange: (value: T) => void
  options: Option<T>[]
  'aria-label': string
  className?: string
}

/** Selector segmentado (Día / Semana / Mes). */
export function Segmented<T extends string>({ value, onValueChange, options, className, ...rest }: SingleSelectProps<T>) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(v) => v && onValueChange(v as T)}
      aria-label={rest['aria-label']}
      className={cn('inline-flex flex-wrap rounded-[9px] border border-line bg-surface-2 p-[3px]', className)}
    >
      {options.map((o) => (
        <ToggleGroup.Item
          key={o.value}
          value={o.value}
          className="cursor-pointer rounded-[7px] px-3 py-[5px] text-xs font-semibold text-muted data-[state=on]:bg-surface data-[state=on]:text-ink data-[state=on]:shadow-card"
        >
          {o.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  )
}

/** Chips de filtro (Todos / VIP / Nuevos…). */
export function FilterChips<T extends string>({ value, onValueChange, options, className, ...rest }: SingleSelectProps<T>) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(v) => v && onValueChange(v as T)}
      aria-label={rest['aria-label']}
      className={cn('flex flex-wrap gap-2', className)}
    >
      {options.map((o) => (
        <ToggleGroup.Item
          key={o.value}
          value={o.value}
          className="cursor-pointer rounded-full border border-line-strong bg-surface px-3 py-[5px] text-xs font-semibold text-ink-2 data-[state=on]:border-ink data-[state=on]:bg-ink data-[state=on]:text-surface"
        >
          {o.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  )
}

export const Tabs = TabsPrimitive.Root
export const TabsContent = TabsPrimitive.Content

export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cn('flex gap-1 overflow-x-auto overflow-y-hidden border-b border-line [scrollbar-width:none]', className)} {...props} />
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        '-mb-px cursor-pointer border-b-2 border-transparent px-3.5 py-2.5 text-body font-semibold whitespace-nowrap text-muted',
        'data-[state=active]:border-teal data-[state=active]:text-brand',
        className,
      )}
      {...props}
    />
  )
}
