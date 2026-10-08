import type { ReactNode } from 'react'
import { createBrowserRouter } from 'react-router'
import { AppShell } from '@/components/layout/app-shell'
import { AgendaPage } from '@/features/agenda/agenda-page'
import { AppointmentPage } from '@/features/agenda/appointment-page'
import { NewAppointmentPage } from '@/features/agenda/new-appointment-page'
import { AvailabilityPage } from '@/features/availability/availability-page'
import { NAV_ITEMS } from '@/components/layout/nav'
import { LoginPage } from '@/features/auth/login-page'
import { NewOrganizationPage, OrganizationsPage } from '@/features/auth/organizations-page'
import { ForgotPasswordPage, ResetPasswordPage } from '@/features/auth/password-reset-pages'
import { RegisterPage } from '@/features/auth/register-page'
import { DesignPage } from '@/features/design/design-page'
import { LandingPage } from '@/features/landing/landing-page'
import { ClientDetailPage } from '@/features/clients/client-detail-page'
import { ClientsPage } from '@/features/clients/clients-page'
import { NewClientPage } from '@/features/clients/new-client-page'
import { BookingPage } from '@/features/booking/booking-page'
import { BookingSettingsPage } from '@/features/booking/booking-settings-page'
import { ManageBookingPage } from '@/features/booking/manage-booking-page'
import { PaymentsPage } from '@/features/payments/payments-page'
import { DashboardPage } from '@/features/dashboard/dashboard-page'
import { ReportsPage } from '@/features/reports/reports-page'
import { BranchFormPage } from '@/features/branches/branch-form-page'
import { BranchesPage } from '@/features/branches/branches-page'
import { NewWaitlistPage } from '@/features/waitlist/new-waitlist-page'
import { WaitlistPage } from '@/features/waitlist/waitlist-page'
import { PromotionFormPage } from '@/features/promotions/promotion-form-page'
import { PromotionsPage } from '@/features/promotions/promotions-page'
import { ResourceFormPage } from '@/features/resources/resource-form-page'
import { ResourcesPage } from '@/features/resources/resources-page'
import { AutomationsPage } from '@/features/automations/automations-page'
import { OrganizationDetailPage } from '@/features/platform/organization-detail-page'
import { ComingSoon } from '@/features/placeholder/coming-soon'
import { PlansPage } from '@/features/platform/plans-page'
import { SuperadminPage } from '@/features/platform/superadmin-page'
import { NewProfessionalPage } from '@/features/professionals/new-professional-page'
import { ProfessionalDetailPage } from '@/features/professionals/professional-detail-page'
import { ProfessionalsPage } from '@/features/professionals/professionals-page'
import { TemplateEditorPage } from '@/features/records/template-editor-page'
import { SettingsPage } from '@/features/settings/settings-page'
import { AcceptInvitationPage } from '@/features/team/accept-invitation-page'
import { InvitePage } from '@/features/team/invite-page'
import { MemberPage } from '@/features/team/member-page'
import { TeamPage } from '@/features/team/team-page'
import { ServiceFormPage } from '@/features/services/service-form-page'
import { ServicesPage } from '@/features/services/services-page'
import { AppGate, PublicOnly, RequireSession, ScreenGate } from './guards'

const SCREENS: Record<string, () => ReactNode> = {
  '/': () => <DashboardPage />,
  '/design': () => <DesignPage />,
  '/superadmin': () => <SuperadminPage />,
  '/superadmin/planes': () => <PlansPage />,
  '/servicios': () => <ServicesPage />,
  '/profesionales': () => <ProfessionalsPage />,
  '/disponibilidad': () => <AvailabilityPage />,
  '/agenda': () => <AgendaPage />,
  '/agenda/nueva': () => <NewAppointmentPage />,
  '/clientes': () => <ClientsPage />,
  '/configuracion': () => <SettingsPage />,
  '/equipo': () => <TeamPage />,
  '/pagina-reservas': () => <BookingSettingsPage />,
  '/pagos': () => <PaymentsPage />,
  '/reportes': () => <ReportsPage />,
  '/sucursales': () => <BranchesPage />,
  '/lista-espera': () => <WaitlistPage />,
  '/promociones': () => <PromotionsPage />,
  '/recursos': () => <ResourcesPage />,
  '/automatizaciones': () => <AutomationsPage />,
}

/** Páginas hijas: heredan el permiso del ítem del menú padre. */
const DETAIL_ROUTES: Array<[path: string, parent: string, element: ReactNode]> = [
  ['/profesionales/nuevo', '/profesionales', <NewProfessionalPage />],
  ['/profesionales/:id', '/profesionales', <ProfessionalDetailPage />],
  ['/agenda/citas/:id', '/agenda', <AppointmentPage />],
  ['/servicios/nuevo', '/servicios', <ServiceFormPage />],
  ['/servicios/:id', '/servicios', <ServiceFormPage />],
  ['/clientes/nuevo', '/clientes', <NewClientPage />],
  ['/clientes/:id', '/clientes', <ClientDetailPage />],
  ['/configuracion/fichas/:id', '/configuracion', <TemplateEditorPage />],
  ['/equipo/invitar', '/equipo', <InvitePage />],
  ['/sucursales/:id', '/sucursales', <BranchFormPage />],
  ['/lista-espera/nueva', '/lista-espera', <NewWaitlistPage />],
  ['/promociones/:id', '/promociones', <PromotionFormPage />],
  ['/recursos/:id', '/recursos', <ResourceFormPage />],
  ['/superadmin/negocios/:id', '/superadmin', <OrganizationDetailPage />],
  ['/equipo/:id', '/equipo', <MemberPage />],
]

export const router = createBrowserRouter([
  {
    element: <PublicOnly />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/olvide-contrasena', element: <ForgotPasswordPage /> },
    ],
  },
  // El registro maneja su propia redirección para poder mostrar el paso "Listo".
  { path: '/registro', element: <RegisterPage /> },
  // Pública: funciona con o sin sesión iniciada.
  { path: '/invitacion/:token', element: <AcceptInvitationPage /> },
  // Funciona con o sin sesión: el enlace llega por correo.
  { path: '/restablecer/:token', element: <ResetPasswordPage /> },
  // Landing siempre visible, también con sesión (en "/" solo se ve sin sesión).
  { path: '/inicio', element: <LandingPage /> },
  // Páginas del cliente final (sin cuenta).
  { path: '/reservar/:slug', element: <BookingPage /> },
  { path: '/reserva/:token', element: <ManageBookingPage /> },
  {
    element: <RequireSession />,
    children: [
      { path: '/negocios', element: <OrganizationsPage /> },
      { path: '/negocios/nuevo', element: <NewOrganizationPage /> },
      {
        element: (
          <AppGate>
            <AppShell />
          </AppGate>
        ),
        children: [
          ...NAV_ITEMS.map((item) => ({
            path: item.path,
            element: <ScreenGate path={item.path}>{SCREENS[item.path]?.() ?? <ComingSoon />}</ScreenGate>,
          })),
          ...DETAIL_ROUTES.map(([path, parent, element]) => ({
            path,
            element: <ScreenGate path={parent}>{element}</ScreenGate>,
          })),
          { path: '*', element: <ComingSoon /> },
        ],
      },
    ],
  },
])
