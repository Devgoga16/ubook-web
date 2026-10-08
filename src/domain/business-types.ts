import { Brain, Dumbbell, Ellipsis, Hand, Leaf, Scissors, Smile, Sparkles, type LucideIcon } from 'lucide-react'

/** Rubros del onboarding. Solo preconfiguran datos; el núcleo no depende del rubro. */
export const BUSINESS_TYPES: Array<{ key: string; label: string; description: string; icon: LucideIcon }> = [
  { key: 'barbershop', label: 'Barbería', description: 'Cortes, barba, afeitado', icon: Scissors },
  { key: 'beauty_salon', label: 'Salón de belleza', description: 'Color, peinados, tratamientos', icon: Sparkles },
  { key: 'nails', label: 'Estudio de uñas', description: 'Manicure, pedicure, gel', icon: Hand },
  { key: 'psychology', label: 'Psicología', description: 'Sesiones, ficha clínica', icon: Brain },
  { key: 'dentistry', label: 'Odontología', description: 'Consultas, tratamientos', icon: Smile },
  { key: 'spa', label: 'Spa', description: 'Masajes, salas, paquetes', icon: Leaf },
  { key: 'trainer', label: 'Entrenador', description: 'Clases, grupos, membresías', icon: Dumbbell },
  { key: 'other', label: 'Otro', description: 'Empieza en blanco', icon: Ellipsis },
]
