import * as Dialog from '@radix-ui/react-dialog'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { X } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { IconButton } from './button'

/** Panel lateral derecho (detalle de cita, edición rápida). */
export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  headerExtra,
  footer,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  headerExtra?: ReactNode
  footer?: ReactNode
  children: ReactNode
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay" />
        <Dialog.Content
          className="fixed inset-y-0 right-0 z-50 flex w-[min(440px,100%)] flex-col gap-[18px] overflow-y-auto bg-surface p-[22px] pt-[calc(22px+env(safe-area-inset-top,0px))] shadow-[-10px_0_40px_rgb(0_0_0/.18)] focus:outline-none"
        >
          <div className="flex items-center gap-2.5">
            <Dialog.Title className="m-0 text-xs font-normal text-muted">{title}</Dialog.Title>
            {headerExtra}
            <Dialog.Close asChild>
              <IconButton aria-label="Cerrar" className="ml-auto">
                <X size={18} />
              </IconButton>
            </Dialog.Close>
          </div>
          {description ? (
            <Dialog.Description asChild>
              <div>{description}</div>
            </Dialog.Description>
          ) : (
            <Dialog.Description className="sr-only">Detalle</Dialog.Description>
          )}
          {children}
          {footer && <div className="mt-auto flex items-center gap-2.5 border-t border-line pt-3.5">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/** Diálogo centrado genérico. */
export function Modal({
  open,
  onOpenChange,
  title,
  children,
  className,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay" />
        <Dialog.Content
          className={cn(
            'fixed top-[12vh] left-1/2 z-50 w-[min(560px,calc(100%-32px))] -translate-x-1/2 rounded-panel bg-surface p-5 shadow-pop focus:outline-none',
            className,
          )}
        >
          <Dialog.Title className="m-0 mb-3 text-md font-bold">{title}</Dialog.Title>
          <Dialog.Description className="sr-only">{title}</Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export const Popover = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger

export function PopoverContent({ className, ...props }: ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        sideOffset={10}
        align="end"
        className={cn(
          'z-50 max-h-[76vh] w-[min(380px,calc(100vw-32px))] overflow-y-auto rounded-panel bg-surface p-4 shadow-pop focus:outline-none',
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}
