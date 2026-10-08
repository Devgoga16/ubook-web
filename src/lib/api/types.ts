/**
 * Tipos de las respuestas de uBook-api que usa el front.
 * Fuente: uBook-api/src (auth.service.ts, entitlements.service.ts, schemas).
 */

export type AuthContextType = 'account' | 'staff' | 'platform'
export type Scope = 'own' | 'branch' | 'organization'

export type PermissionKey =
  | 'organization.manage'
  | 'subscription.manage'
  | 'branch.manage'
  | 'audit.read'
  | 'member.read'
  | 'member.manage'
  | 'role.read'
  | 'role.manage'
  | 'professional.read'
  | 'professional.manage'
  | 'service.read'
  | 'service.manage'
  | 'resource.read'
  | 'resource.manage'
  | 'schedule.read'
  | 'schedule.manage'
  | 'booking.read'
  | 'booking.create'
  | 'booking.update'
  | 'booking.cancel'
  | 'client.read'
  | 'client.create'
  | 'client.update'
  | 'client.delete'
  | 'client_record.read'
  | 'client_record.write'
  | 'payment.read'
  | 'payment.create'
  | 'payment.void'
  | 'report.view'

export type FeatureKey =
  | 'max_branches'
  | 'max_professionals'
  | 'max_bookings_per_month'
  | 'public_booking_page'
  | 'email_notifications'
  | 'manual_payments'
  | 'client_records'
  | 'client_portal'
  | 'guardians'
  | 'resources'
  | 'custom_roles'
  | 'custom_fields'
  | 'advanced_reports'
  | 'branch_reports'
  | 'audit_log'
  | 'branding'
  | 'white_label'
  | 'whatsapp'

export type FeatureValue = boolean | number | null

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  platformRole: 'super_admin' | 'support' | null
}

export interface OrganizationSummary {
  organizationId: string
  membershipId: string
  name: string
  slug: string
  roles: string[]
}

export interface Organization {
  id: string
  name: string
  slug: string
  timezone: string
  currency: string
  country: string
  businessType?: string
  status: 'active' | 'suspended'
  /** Enlace firmado y temporal; `null` sin logo. */
  logoUrl?: string | null
}

export interface Entitlements {
  organizationId: string
  planCode: string
  planName: string
  status: SubscriptionStatus
  trialEndsAt: string | null
  currentPeriodEnd: string | null
  readOnly: boolean
  suspended: boolean
  features: Record<FeatureKey, FeatureValue>
}

export interface StaffAccess {
  membershipId: string
  isOwner: boolean
  branchIds: string[]
  permissions: Partial<Record<PermissionKey, Scope>>
}

export interface Me {
  user: User
  context: { ctx: AuthContextType; organizationId: string | null }
  organizations: OrganizationSummary[]
  organization?: Organization
  access?: StaffAccess
  subscription?: Entitlements
}

export interface Branch {
  id: string
  name: string
  timezone: string
  address?: string
  phone?: string
  reference?: string
  mapsUrl?: string
  isActive: boolean
}

export interface Plan {
  id: string
  code: string
  name: string
  description?: string
  price: { monthly: number; yearly: number; currency: string }
  features: Record<FeatureKey, FeatureValue>
  sortOrder: number
}

export interface PlatformOrganization extends Organization {
  createdAt: string
  subscription: {
    planCode: string
    status: SubscriptionStatus
    effectiveStatus: SubscriptionStatus
    trialEndsAt?: string
    currentPeriodEnd?: string
  } | null
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface ServiceCategory {
  id: string
  name: string
  sortOrder: number
}

export interface DepositRule {
  enabled: boolean
  type: 'percent' | 'fixed'
  /** Porcentaje (1–100) o céntimos. */
  value: number
}

export interface Service {
  id: string
  name: string
  description?: string
  categoryId: string | null
  durationMinutes: number
  /** Céntimos (S/ 50.00 → 5000). */
  price: number
  bufferBeforeMinutes: number
  bufferAfterMinutes: number
  deposit: DepositRule
  onlineBooking: boolean
  color: string
  isArchived: boolean
  sortOrder: number
}

export type ServiceInput = Omit<Service, 'id' | 'isArchived' | 'sortOrder'>

export interface TimeRange {
  /** Minutos desde la medianoche (9:30 → 570). */
  start: number
  end: number
}

export interface DaySchedule {
  /** 1 = lunes … 7 = domingo. */
  weekday: number
  intervals: TimeRange[]
}

export interface BranchSchedule {
  branchId: string
  days: DaySchedule[]
}

export interface ProfessionalService {
  serviceId: string
  price: number | null
  durationMinutes: number | null
}

export interface Professional {
  id: string
  displayName: string
  title?: string
  color: string
  email?: string
  phone?: string
  bio?: string
  membershipId: string | null
  branchIds: string[]
  services: ProfessionalService[]
  schedules: BranchSchedule[]
  commissionPercent: number | null
  isActive: boolean
}

export type TimeOffType = 'vacation' | 'training' | 'medical' | 'personal' | 'other'

export interface TimeOff {
  id: string
  professionalId: string
  type: TimeOffType
  title?: string
  startsAt: string
  endsAt: string
  status: 'pending' | 'approved' | 'rejected'
  note?: string
}

export interface Member {
  id: string
  userId: string
  roleIds: string[]
  /** Vacío = todas las sucursales. */
  branchIds: string[]
  status: 'active' | 'invited' | 'suspended'
  createdAt: string
  user: { id: string; firstName: string; lastName: string; email: string; phone?: string } | null
}

export interface Role {
  id: string
  name: string
  description?: string
  templateKey: string | null
  isLocked: boolean
}

export interface Invitation {
  id: string
  email: string
  firstName: string
  lastName: string
  roleIds: string[]
  branchIds: string[]
  professionalId: string | null
  status: 'pending' | 'accepted' | 'revoked'
  expiresAt: string
  createdAt: string
}

export interface InvitationSent extends Invitation {
  inviteUrl: string
  emailSent: boolean
}

export interface InvitationPreview {
  organizationName: string
  email: string
  firstName: string
  lastName: string
  roleNames: string[]
  expiresAt: string
  accountExists: boolean
}

export interface BranchWithHours extends Branch {
  openingHours: DaySchedule[]
}

export interface BranchException {
  id: string
  branchId: string
  /** Fecha local "YYYY-MM-DD". */
  date: string
  name: string
  type: 'closed' | 'custom_hours'
  intervals: TimeRange[]
}

export interface BookingRules {
  minNoticeMinutes: number | null
  maxAdvanceDays: number | null
  freeCancellationHours: number | null
  maxReschedules: number | null
  defaultBufferMinutes: number | null
  maxActiveBookingsPerClient: number | null
  allowOverbooking: boolean
  manualApproval: 'off' | 'new_clients' | 'all'
}

export type ContactChannel = 'whatsapp' | 'call' | 'sms' | 'email'

export interface Client {
  id: string
  firstName: string
  lastName: string
  phone?: string
  email?: string
  birthDate?: string
  documentId?: string
  address?: string
  source?: string
  preferredChannel?: ContactChannel
  preferredProfessionalId?: string | null
  marketingConsent?: boolean
  dataConsentAt?: string | null
  notes?: string
  tags: string[]
  createdAt?: string
}

export interface ClientInput {
  firstName?: string
  lastName?: string
  phone?: string | null
  email?: string | null
  birthDate?: string | null
  documentId?: string
  address?: string
  source?: string
  preferredChannel?: ContactChannel
  preferredProfessionalId?: string | null
  marketingConsent?: boolean
  dataConsent?: boolean
  notes?: string
  tags?: string[]
  /** Confirmar que es otra persona con el mismo celular. */
  allowSharedPhone?: boolean
}

export type ClientSegment = 'all' | 'new' | 'upcoming' | 'at_risk' | 'vip'

export interface ClientStats {
  visits: number
  spent: number
  noShows: number
  lastVisit: string | null
  nextAppointment: string | null
}

export interface ClientDirectory {
  items: Array<Client & { stats: ClientStats }>
  total: number
  page: number
  pageSize: number
}

export interface ClientSummary {
  total: number
  new: number
  upcoming: number
  atRisk: number
  vip: number
}

/* ---------- Fichas clínicas ---------- */

export type RecordFieldType = 'text' | 'textarea' | 'number' | 'select' | 'multiselect' | 'checkbox' | 'date'

export interface RecordField {
  key: string
  label: string
  type: RecordFieldType
  required: boolean
  options: string[]
  helpText?: string
}

export type RecordValue = string | number | boolean | string[] | null
export type RecordValues = Record<string, RecordValue>

export interface RecordTemplate {
  id: string
  name: string
  description?: string
  fields: RecordField[]
  isActive: boolean
}

export interface RecordPreset {
  key: string
  name: string
  description: string
  fieldCount: number
}

export interface ClientRecord {
  id: string
  clientId: string
  templateId: string
  templateName: string
  fields: RecordField[]
  values: RecordValues
  appointmentId: string | null
  professionalId: string | null
  authorUserId: string
  status: 'draft' | 'signed'
  signedAt: string | null
  createdAt: string
  updatedAt: string
  addenda: Array<{ text: string; at: string; byUserId: string }>
  canEdit: boolean
}

export type AppointmentStatusValue =
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'

export interface Appointment {
  id: string
  number: number
  branchId: string
  professionalId: string
  serviceId: string
  serviceName: string
  status: AppointmentStatusValue
  startsAt: string
  endsAt: string
  price: number
  durationMinutes: number
  channel: 'backoffice' | 'online'
  notes?: string
  rescheduleCount: number
  listPrice: number | null
  promotionCode: string | null
  resourceId: string | null
  /** Adelanto de una reserva online. */
  deposit: {
    amount: number
    status: DepositStatus
    method: DepositMethod
    reference?: string
    submittedAt: string
    rejectReason?: string
  } | null
  history: Array<{ status: AppointmentStatusValue; at: string; note?: string }>
  client: { id: string; firstName: string; lastName: string; phone?: string } | null
}

export interface Slot {
  start: string
  end: string
  available: boolean
}

export interface ProfessionalSlots {
  professionalId: string
  displayName: string
  color: string
  price: number
  durationMinutes: number
  slots: Slot[]
}

/* ---------- Página pública de reservas ---------- */

export interface DepositInfo {
  yape: string
  plin: string
  bank: string
  notes: string
}

export type DepositMethod = 'yape' | 'plin' | 'transfer' | 'other'
export type DepositStatus = 'pending_review' | 'approved' | 'rejected'

export interface PublicBusiness {
  name: string
  slug: string
  logoUrl: string | null
  businessType: string | null
  rules: {
    minNoticeMinutes: number | null
    maxAdvanceDays: number | null
    freeCancellationHours: number | null
    maxReschedules: number | null
    manualApproval: 'off' | 'new_clients' | 'all'
  }
  branches: Array<{ id: string; name: string; address: string; reference: string; mapsUrl: string; phone: string; timezone: string }>
  categories: Array<{ id: string; name: string }>
  services: Array<{
    id: string
    name: string
    description: string
    categoryId: string | null
    durationMinutes: number
    price: number
    color: string
    /** Adelanto que pide el servicio para reservar online. */
    deposit: { type: 'percent' | 'fixed'; value: number } | null
  }>
  /** A dónde pagar el adelanto. */
  depositInfo: DepositInfo
  professionals: Array<{
    id: string
    displayName: string
    title: string
    color: string
    branchIds: string[]
    services: Array<{ serviceId: string; price: number | null; durationMinutes: number | null }>
  }>
}

export interface PublicSlots {
  timezone: string
  professionals: Array<{ professionalId: string; displayName: string; color: string; price: number; durationMinutes: number; slots: string[] }>
}

export interface PublicDays {
  days: Array<{ date: string; free: number }>
}

export interface PublicBookingView {
  number: number
  status: AppointmentStatusValue
  startsAt: string
  endsAt: string
  serviceName: string
  price: number
  listPrice: number | null
  promotionCode: string | null
  durationMinutes: number
  professional: { id: string; displayName: string; color: string | null }
  branch: { id: string; name: string; address: string; reference: string; mapsUrl: string; phone: string; timezone: string }
  organization: { name: string; slug: string; logoUrl: string | null }
  clientFirstName: string
  rescheduleCount: number
  canCancel: boolean
  canReschedule: boolean
  lateCancellation: boolean
  freeCancellationHours: number | null
  deposit: { amount: number; status: DepositStatus; rejectReason: string | null } | null
}

/* ---------- Cobros ---------- */

export type PaymentMethod = 'cash' | 'yape' | 'plin' | 'card' | 'transfer' | 'other'

export interface PaymentView {
  id: string
  number: number
  appointmentId: string
  branchId: string
  professionalId: string
  professionalName: string
  clientId: string
  clientName: string
  serviceName: string
  amount: number
  discount: number
  tip: number
  total: number
  methods: Array<{ method: PaymentMethod; amount: number; reference?: string }>
  commissionAmount: number
  localDate: string
  status: 'paid' | 'voided'
  note?: string
  voidReason?: string
  createdAt: string
}

export interface AppointmentPayments {
  appointmentId: string
  price: number
  discount: number
  paid: number
  tips: number
  balance: number
  status: 'paid' | 'partial' | 'unpaid'
  payments: PaymentView[]
}

export interface PaymentTotals {
  count: number
  sales: number
  tips: number
  discount: number
  collected: number
  byMethod: Record<PaymentMethod, number>
}

export interface CashDay {
  branchId: string
  date: string
  totals: PaymentTotals
  cashIn: number
  cashOut: number
  cashFromDay: number
  expectedCash: number
  payments: PaymentView[]
  movements: Array<{ id: string; type: 'in' | 'out'; amount: number; concept: string; createdAt: string }>
  close: { openingCash: number; expectedCash: number; countedCash: number; difference: number; notes: string; closedAt: string } | null
}

export interface CommissionRow {
  professionalId: string
  displayName: string
  color: string | null
  commissionPercent: number | null
  appointments: number
  sales: number
  commission: number
  tips: number
  toPay: number
}
