import {
  BellRing,
  Box,
  CalendarDays,
  ChartColumn,
  ClipboardList,
  Clock,
  Globe,
  ListTodo,
  ShieldCheck,
  Store,
  Tag,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import type { FeatureKey, FeatureValue, Plan } from '@/lib/api/types'

export interface Feature {
  icon: LucideIcon
  title: string
  text: string
  points: string[]
}

/** Todo lo que hace el sistema, agrupado como lo vive el negocio. */
export const FEATURES: Feature[] = [
  {
    icon: CalendarDays,
    title: 'Agenda que se ordena sola',
    text: 'Vista de día, semana y mes por profesional y por sede. Crea, mueve y confirma citas en segundos.',
    points: ['Estados: pendiente, confirmada, completada, no asistió', 'Filtro por profesional', 'Nada de cruces: respeta horarios y recursos'],
  },
  {
    icon: Globe,
    title: 'Tu página de reservas 24/7',
    text: 'Un enlace propio para Instagram, WhatsApp o Google. Tus clientes eligen servicio, profesional y hora sin escribirte.',
    points: ['Con tu logo y colores', 'Solo muestra horarios realmente libres', 'Reprogramar o cancelar desde su enlace'],
  },
  {
    icon: Wallet,
    title: 'Adelantos con Yape y Plin',
    text: 'Pide una seña al reservar. El cliente sube su comprobante y tú lo validas con un toque: la cita se confirma sola.',
    points: ['Yape, Plin o transferencia', 'Foto del comprobante y N.º de operación', 'Registro de cobros y métodos de pago'],
  },
  {
    icon: BellRing,
    title: 'Mensajes que trabajan por ti',
    text: 'Recordatorios, confirmaciones y campañas automáticas por correo y WhatsApp, con tus propias palabras.',
    points: ['Recordatorio antes de la cita', 'Pedir reseña después', 'Reactivar clientes y saludar por cumpleaños'],
  },
  {
    icon: ClipboardList,
    title: 'Fichas de cliente y clínicas',
    text: 'Historial completo de cada cliente y fichas por sesión con plantillas listas para tu rubro, o crea las tuyas.',
    points: ['Plantillas: belleza, psicología, odontología…', 'Responsables y beneficiarios', 'Campos personalizados'],
  },
  {
    icon: ListTodo,
    title: 'Lista de espera inteligente',
    text: '¿Agenda llena? Anota a quien espera y, cuando se libera un horario que le sirve, avísale al instante.',
    points: ['Preferencias de día y hora', 'Aviso por WhatsApp y correo', 'Agenda directo desde la lista'],
  },
  {
    icon: Tag,
    title: 'Promociones y cupones',
    text: 'Códigos de descuento con reglas finas para llenar las horas flojas sin regalar tu trabajo.',
    points: ['Porcentaje o monto fijo', 'Por días, horario y servicios', 'Solo clientes nuevos o un uso por persona'],
  },
  {
    icon: Clock,
    title: 'Disponibilidad a tu medida',
    text: 'Horario por sede y por profesional, vacaciones, feriados del Perú y reglas de reserva.',
    points: ['Feriados nacionales precargados', 'Anticipación mínima y máxima', 'Aprobación manual opcional'],
  },
  {
    icon: Box,
    title: 'Recursos: salas y equipos',
    text: 'Si tienes 2 cabinas y 4 masajistas, uBook nunca agenda 3 masajes a la vez.',
    points: ['Cabinas, sillones, equipos', 'Asignados por servicio', 'Sobreventa controlada'],
  },
  {
    icon: Store,
    title: 'Varias sedes, un solo sistema',
    text: 'Cada sucursal con su horario, equipo y agenda. Cambia de sede con un clic y compáralas.',
    points: ['Horarios y feriados por sede', 'Equipo por sucursal', 'Reportes comparativos'],
  },
  {
    icon: ShieldCheck,
    title: 'Equipo con permisos reales',
    text: 'Invita a tu equipo y decide qué ve cada uno: solo lo suyo, su sede o todo el negocio.',
    points: ['Roles por defecto y personalizados', 'Invitaciones por correo', 'Registro de auditoría'],
  },
  {
    icon: ChartColumn,
    title: 'Reportes que se entienden',
    text: 'Ventas, ocupación por día y hora, tasa de faltas y rendimiento por profesional. Comparado con el periodo anterior.',
    points: ['Mapa de calor de ocupación', 'Mejores clientes y servicios', 'Comparativa por sede'],
  },
]

export const AUTOMATIONS: Array<{ key: string; label: string; when: string; message: string }> = [
  {
    key: 'confirmation',
    label: 'Confirmación',
    when: 'Al reservar',
    message: '¡Hola Camila! Tu cita de Corte y barba quedó confirmada para el viernes 10 a las 4:00 p. m. con Luis. 💈',
  },
  {
    key: 'reminder',
    label: 'Recordatorio',
    when: '24 h antes',
    message: 'Camila, te esperamos mañana a las 4:00 p. m. ¿Necesitas cambiar la hora? Usa tu enlace de reserva 👉',
  },
  {
    key: 'review',
    label: 'Reseña',
    when: '2 h después',
    message: '¡Gracias por venir! ¿Nos regalas 30 segundos? Tu reseña nos ayuda muchísimo ⭐',
  },
  {
    key: 'reactivation',
    label: 'Reactivación',
    when: '45 días sin visita',
    message: 'Te extrañamos, Camila 👋 Vuelve esta semana con 15% de descuento: VUELVE15',
  },
  {
    key: 'birthday',
    label: 'Cumpleaños',
    when: 'En su día',
    message: '¡Feliz cumpleaños! 🎉 Tienes un regalo esperándote: 20% en tu próxima visita con el código CUMPLE20.',
  },
  {
    key: 'noShow',
    label: 'No asistió',
    when: 'Si falta',
    message: 'Te extrañamos hoy, Camila. ¿Reprogramamos? Elige otro horario desde tu enlace 👉',
  },
]

export interface Industry {
  key: string
  label: string
  services: Array<[name: string, minutes: number, price: number]>
  record: string
  fields: string[]
  extra: string
}

/** Los rubros solo preconfiguran datos: el núcleo es el mismo para todos. */
export const INDUSTRIES: Industry[] = [
  {
    key: 'barbershop',
    label: 'Barbería',
    services: [['Corte clásico', 30, 35], ['Corte y barba', 50, 55], ['Afeitado con toalla caliente', 30, 30]],
    record: 'Ficha de belleza',
    fields: ['Tipo de cabello', 'Alergias o sensibilidades', 'Productos usados'],
    extra: 'Reserva por barbero favorito y recordatorio por WhatsApp.',
  },
  {
    key: 'beauty_salon',
    label: 'Salón de belleza',
    services: [['Color completo', 120, 180], ['Brushing', 45, 50], ['Tratamiento de keratina', 150, 250]],
    record: 'Ficha de belleza',
    fields: ['Fórmula de color', 'Tratamientos químicos previos', 'Resultado y observaciones'],
    extra: 'Guarda la fórmula de color de cada clienta para repetirla igual.',
  },
  {
    key: 'nails',
    label: 'Estudio de uñas',
    services: [['Manicure gel', 60, 45], ['Pedicure spa', 60, 55], ['Uñas acrílicas', 90, 90]],
    record: 'Ficha de belleza',
    fields: ['Alergias o sensibilidades', 'Productos usados', 'Resultado y observaciones'],
    extra: 'Cupones para horas flojas: martes y miércoles por la mañana.',
  },
  {
    key: 'psychology',
    label: 'Psicología',
    services: [['Sesión individual', 50, 120], ['Terapia de pareja', 75, 180], ['Primera consulta', 60, 100]],
    record: 'Nota de sesión',
    fields: ['Tema de la sesión', 'Estado de ánimo', 'Nivel de riesgo'],
    extra: 'Fichas clínicas privadas: solo las ve quien atiende.',
  },
  {
    key: 'dentistry',
    label: 'Odontología',
    services: [['Consulta y diagnóstico', 30, 60], ['Limpieza dental', 45, 120], ['Curación', 40, 150]],
    record: 'Odontología',
    fields: ['Motivo de consulta', 'Piezas tratadas', 'Indicaciones'],
    extra: 'Responsables para pacientes menores de edad.',
  },
  {
    key: 'spa',
    label: 'Spa',
    services: [['Masaje relajante', 60, 140], ['Piedras calientes', 75, 180], ['Facial hidratante', 50, 120]],
    record: 'Ficha general',
    fields: ['Motivo de la visita', 'Observaciones', 'Recomendaciones'],
    extra: 'Cabinas como recursos: nunca más dos masajes en la misma sala.',
  },
  {
    key: 'trainer',
    label: 'Entrenador',
    services: [['Entrenamiento personal', 60, 80], ['Evaluación física', 45, 60], ['Clase funcional', 50, 40]],
    record: 'Ficha general',
    fields: ['Motivo de la visita', 'Observaciones', 'Próximo control'],
    extra: 'Reactivación automática para quien deja de venir.',
  },
]

export const FAQS: Array<[question: string, answer: string]> = [
  ['¿Necesito tarjeta para la prueba gratis?', 'No. Tienes 30 días gratis con todas las funciones del plan que elijas, sin tarjeta. Te avisamos antes de que termine.'],
  ['¿Mis clientes tienen que descargar algo o crear una cuenta?', 'No. Reservan desde tu enlace en el navegador del celular. Reciben un enlace para ver, reprogramar o cancelar su cita cuando quieran.'],
  ['¿Cómo funcionan los adelantos con Yape o Plin?', 'Configuras tus datos de Yape, Plin o cuenta bancaria y el monto del adelanto. El cliente paga, sube la foto del comprobante y tú lo validas: al validarlo se registra el cobro y la cita se confirma.'],
  ['¿Puedo enviar recordatorios por WhatsApp?', 'Sí, en todos los planes. Recordatorios, confirmaciones, reseñas, cumpleaños y más, por WhatsApp y por correo.'],
  ['¿Mi equipo puede ver toda la información del negocio?', 'Solo lo que tú decidas. Cada rol tiene permisos con alcance propio, por sede o de todo el negocio. Un profesional puede ver solo su agenda y sus clientes.'],
  ['¿Sirve si tengo varias sucursales?', 'Sí. Cada sede tiene su horario, feriados, equipo y agenda, y los reportes te permiten compararlas.'],
  ['¿Puedo cambiar de plan después?', 'Cuando quieras. Si pagas anual, obtienes 2 meses gratis.'],
  ['¿Mis datos están seguros?', 'Cada negocio vive aislado del resto, las sesiones se renuevan de forma segura y los planes superiores incluyen registro de auditoría de cada cambio.'],
]

/** Planes por defecto, por si la API no responde: la landing nunca se queda vacía. */
const base: Record<FeatureKey, FeatureValue> = {
  max_branches: 1,
  max_professionals: 2,
  max_bookings_per_month: 150,
  public_booking_page: true,
  email_notifications: true,
  manual_payments: true,
  client_records: true,
  client_portal: false,
  guardians: false,
  resources: false,
  custom_roles: false,
  custom_fields: false,
  advanced_reports: false,
  branch_reports: false,
  audit_log: false,
  branding: true,
  white_label: false,
  whatsapp: true,
}
const pro = { ...base, max_branches: 3, max_professionals: 10, max_bookings_per_month: null, client_portal: true, guardians: true, resources: true, custom_roles: true, custom_fields: true, advanced_reports: true }

export const FALLBACK_PLANS: Plan[] = [
  { id: 'starter', code: 'starter', name: 'Starter', description: 'Para profesionales independientes y negocios que empiezan.', sortOrder: 1, price: { monthly: 4900, yearly: 49000, currency: 'PEN' }, features: base },
  { id: 'pro', code: 'pro', name: 'Pro', description: 'Para negocios con equipo que quieren ofrecer una experiencia completa.', sortOrder: 2, price: { monthly: 7900, yearly: 79000, currency: 'PEN' }, features: pro },
  { id: 'business', code: 'business', name: 'Business', description: 'Para negocios con varias sucursales y equipos grandes.', sortOrder: 3, price: { monthly: 12900, yearly: 129000, currency: 'PEN' }, features: { ...pro, max_branches: 5, max_professionals: null, branch_reports: true, audit_log: true, white_label: true } },
]

/** Filas de la tabla comparativa de planes. */
export const COMPARE_ROWS: Array<[FeatureKey, string]> = [
  ['max_professionals', 'Profesionales'],
  ['max_branches', 'Sedes'],
  ['max_bookings_per_month', 'Reservas al mes'],
  ['public_booking_page', 'Página pública de reservas'],
  ['email_notifications', 'Notificaciones por correo'],
  ['manual_payments', 'Pagos y adelantos (Yape, Plin)'],
  ['client_records', 'Fichas de cliente y clínicas'],
  ['branding', 'Tu logo y colores'],
  ['client_portal', 'Portal del cliente'],
  ['guardians', 'Responsables y beneficiarios'],
  ['resources', 'Recursos (salas, equipos)'],
  ['custom_roles', 'Roles personalizados'],
  ['custom_fields', 'Campos personalizados'],
  ['advanced_reports', 'Reportes completos'],
  ['branch_reports', 'Reportes por sucursal'],
  ['audit_log', 'Registro de auditoría'],
  ['whatsapp', 'Notificaciones por WhatsApp'],
  ['white_label', 'Sin marca uBook'],
]
