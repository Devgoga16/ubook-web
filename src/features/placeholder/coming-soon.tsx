import { Hammer } from 'lucide-react'
import { useLocation } from 'react-router'
import { findNavItem } from '@/components/layout/nav'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/display'

export function ComingSoon() {
  const item = findNavItem(useLocation().pathname)
  return (
    <Card>
      <EmptyState
        icon={Hammer}
        title={`${item?.label ?? 'Esta pantalla'} está en construcción`}
        description="La referencia visual está en docs/ubook-prototipo.html."
      />
    </Card>
  )
}
