import {
  Banknote,
  Calendar,
  CalendarCheck,
  ChartColumn,
  Clock,
  Download,
  Inbox,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Scissors,
  Sparkles,
  User,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Avatar, AvatarGroup } from '@/components/ui/avatar'
import { Kbd, Pill, StatusChip, Tag } from '@/components/ui/badges'
import { Button, IconButton } from '@/components/ui/button'
import { AddCard, Card, CardHeader } from '@/components/ui/card'
import {
  Checkbox,
  FilterChips,
  Segmented,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/controls'
import {
  Banner,
  DefinitionList,
  EmptyState,
  ProgressBar,
  RuleCard,
  Skeleton,
  SlotPicker,
  Stepper,
  Table,
  Td,
  Th,
  Timeline,
  Tr,
} from '@/components/ui/display'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { Kpi, KpiFlat } from '@/components/ui/kpi'
import { MiniCalendar } from '@/components/ui/mini-calendar'
import { Drawer } from '@/components/ui/overlays'
import { APPOINTMENT_STATUSES } from '@/domain/appointment-status'
import { formatMoney } from '@/lib/format'

const SWATCHES = [
  ['bg', 'surface', 'surface-2', 'line', 'line-strong'],
  ['ink', 'ink-2', 'muted', 'brand', 'brand-soft'],
  ['teal', 'teal-ink', 'teal-soft', 'teal-line'],
  ['ok', 'warn', 'bad', 'info', 'off', 'done'],
]

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} />
      <div className="flex flex-col gap-4">{children}</div>
    </Card>
  )
}

const CLIENTS = [
  { name: 'Mateo Huamán', phone: '987 654 321', tags: [['VIP', 'brand']], visits: 24, spent: 1180, next: 'Hoy 15:00' },
  { name: 'Valeria Ríos', phone: '956 112 450', tags: [['VIP', 'brand'], ['Color', 'warn']], visits: 18, spent: 2340, next: 'Hoy 15:30' },
  { name: 'Lucía Mendoza', phone: '944 208 115', tags: [['Nuevo', 'teal']], visits: 2, spent: 190, next: 'Hoy 14:30' },
  { name: 'Renato Chávez', phone: '923 615 902', tags: [['En riesgo', 'bad']], visits: 6, spent: 300, next: '—' },
] as const

/** Catálogo visual de los componentes base (solo en desarrollo). */
export function DesignPage() {
  const [segment, setSegment] = useState<'day' | 'week' | 'month'>('day')
  const [filter, setFilter] = useState<'all' | 'vip' | 'new'>('all')
  const [enabled, setEnabled] = useState(true)
  const [checked, setChecked] = useState(true)
  const [date, setDate] = useState(new Date())
  const [slot, setSlot] = useState('14:45')
  const [drawer, setDrawer] = useState(false)
  const [selected, setSelected] = useState(0)

  return (
    <>
      <p className="m-0 max-w-[70ch] text-muted">
        Componentes base de uBook según el prototipo. Cambia el tema con el ícono de sol/luna del encabezado para
        revisar el modo oscuro.
      </p>

      <Section title="Colores">
        <div className="grid gap-3">
          {SWATCHES.map((row, i) => (
            <div key={i} className="flex flex-wrap gap-3">
              {row.map((name) => (
                <div key={name} className="flex w-[118px] flex-col gap-1.5">
                  <span className="h-12 rounded-tile border border-line" style={{ background: `var(--${name})` }} />
                  <code className="text-2xs text-muted">--{name}</code>
                </div>
              ))}
            </div>
          ))}
          <div className="flex w-[260px] flex-col gap-1.5">
            <span className="bg-grad h-12 rounded-tile" />
            <code className="text-2xs text-muted">--grad</code>
          </div>
        </div>
      </Section>

      <Section title="Tipografía · Montserrat">
        <div className="flex flex-col gap-1">
          <span className="text-3xl font-semibold tracking-[-.01em]">Buen día, Luis</span>
          <span className="text-2xl font-semibold">¿Qué tipo de negocio tienes?</span>
          <span className="text-xl font-semibold">Mateo Huamán</span>
          <span className="text-md font-bold">Título de tarjeta · 14px</span>
          <span className="text-base">Texto base · 13px. Hoy tienes 38 citas y 4 espacios libres por la tarde.</span>
          <span className="text-xs text-muted">Texto secundario · 11.5px</span>
          <span className="text-2xs font-bold tracking-[.1em] text-muted uppercase">Etiqueta de grupo · 11px</span>
        </div>
      </Section>

      <Section title="Botones">
        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="primary">
            <Plus size={14} /> Nueva cita
          </Button>
          <Button>Reprogramar</Button>
          <Button variant="danger">Cancelar</Button>
          <Button variant="ghost">Ver todo</Button>
          <Button disabled>Deshabilitado</Button>
          <Button size="sm" variant="primary">
            Confirmar
          </Button>
          <Button size="sm">
            <Download size={13} /> Exportar
          </Button>
          <IconButton aria-label="Cerrar">
            <X size={18} />
          </IconButton>
        </div>
      </Section>

      <Section title="Estados de cita, etiquetas y píldoras">
        <div className="flex flex-wrap gap-1.5">
          {APPOINTMENT_STATUSES.map((s) => (
            <StatusChip key={s} status={s} />
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Tag>VIP</Tag>
          <Tag tone="teal">Prefiere WhatsApp</Tag>
          <Tag tone="ok">Activo</Tag>
          <Tag tone="warn">Requerido</Tag>
          <Tag tone="bad">En riesgo</Tag>
          <Tag tone="off">Fade bajo</Tag>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Pill>
            <Clock size={12} /> 45 min
          </Pill>
          <Pill>{formatMoney(50)}</Pill>
          <Pill>
            <MapPin size={11} /> Miraflores
          </Pill>
          <Kbd>Ctrl K</Kbd>
        </div>
      </Section>

      <Section title="Avatares">
        <div className="flex flex-wrap items-center gap-3">
          <Avatar name="Mateo Huamán" size="lg" round />
          <Avatar name="Valeria Ríos" />
          <Avatar name="Luis Paredes" round />
          <Avatar name="Andrea Quispe" size="xs" round />
          <AvatarGroup people={[{ name: 'Luis Paredes' }, { name: 'Diego Rojas' }, { name: 'Camila Torres' }]} />
        </div>
      </Section>

      <Section title="KPIs">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3.5">
          <Kpi icon={Calendar} label="Citas hoy" value="38" detail="+5 vs. martes pasado" featured onClick={() => {}} />
          <Kpi icon={Banknote} label="Ingresos del día" value={formatMoney(1840)} detail={`Meta: ${formatMoney(2200)}`} />
          <Kpi icon={ChartColumn} label="Ocupación" value="82%" detail="Tarde: 64%" />
          <Kpi icon={X} label="No-shows" value="2" detail="5.2% del día" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiFlat icon={Users} label="Clientes activos" value="1,284" />
          <KpiFlat icon={User} label="Nuevos este mes" value="46" />
          <KpiFlat icon={RefreshCw} label="Tasa de retorno" value="68%" />
          <KpiFlat icon={X} label="En riesgo" value="23" />
        </div>
      </Section>

      <Section title="Formularios y controles">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nombre del servicio">{(p) => <Input {...p} defaultValue="Corte + barba" />}</Field>
          <Field label="Sucursal">
            {(p) => (
              <Select {...p}>
                <option>Sede Miraflores</option>
                <option>Sede San Isidro</option>
              </Select>
            )}
          </Field>
          <Field label="Duración" hint="En minutos">
            {(p) => <Input {...p} inputMode="numeric" defaultValue="45" />}
          </Field>
          <Field label="Celular" error="Ingresa un celular de 9 dígitos">
            {(p) => <Input {...p} defaultValue="98765" />}
          </Field>
          <Field label="Nota interna" className="sm:col-span-2">
            {(p) => <Textarea {...p} defaultValue="Le gusta conversar de fútbol. Llega 5 min antes." />}
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-5">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={enabled} onCheckedChange={setEnabled} /> Reserva online
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={checked} onCheckedChange={(v) => setChecked(v === true)} /> Luis Paredes
          </label>
          <Segmented
            aria-label="Vista de agenda"
            value={segment}
            onValueChange={setSegment}
            options={[
              { value: 'day', label: 'Día' },
              { value: 'week', label: 'Semana' },
              { value: 'month', label: 'Mes' },
            ]}
          />
          <FilterChips
            aria-label="Filtrar clientes"
            value={filter}
            onValueChange={setFilter}
            options={[
              { value: 'all', label: 'Todos' },
              { value: 'vip', label: 'VIP' },
              { value: 'new', label: 'Nuevos' },
            ]}
          />
        </div>
        <Tabs defaultValue="history">
          <TabsList>
            <TabsTrigger value="history">Historial</TabsTrigger>
            <TabsTrigger value="upcoming">Próximas (2)</TabsTrigger>
            <TabsTrigger value="payments">Pagos</TabsTrigger>
          </TabsList>
          <TabsContent value="history" className="pt-4 text-sm text-muted">
            Contenido de la pestaña Historial.
          </TabsContent>
          <TabsContent value="upcoming" className="pt-4 text-sm text-muted">
            Contenido de Próximas.
          </TabsContent>
          <TabsContent value="payments" className="pt-4 text-sm text-muted">
            Contenido de Pagos.
          </TabsContent>
        </Tabs>
      </Section>

      <Section title="Tabla">
        <Table>
          <thead>
            <tr>
              <Th>Nombre</Th>
              <Th>Celular</Th>
              <Th>Etiquetas</Th>
              <Th>Visitas</Th>
              <Th>Gasto total</Th>
              <Th>Próxima cita</Th>
            </tr>
          </thead>
          <tbody>
            {CLIENTS.map((c, i) => (
              <Tr key={c.name} selected={i === selected} onClick={() => setSelected(i)}>
                <Td>
                  <div className="flex items-center gap-2.5 font-semibold">
                    <Avatar name={c.name} />
                    {c.name}
                  </div>
                </Td>
                <Td>+51 {c.phone}</Td>
                <Td>
                  <div className="flex gap-1">
                    {c.tags.map(([t, tone]) => (
                      <Tag key={t} tone={tone}>
                        {t}
                      </Tag>
                    ))}
                  </div>
                </Td>
                <Td>{c.visits}</Td>
                <Td>{formatMoney(c.spent)}</Td>
                <Td>{c.next === '—' ? <span className="text-muted">—</span> : <b>{c.next}</b>}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Section>

      <Section title="Calendario, horarios y pasos">
        <Stepper steps={['Servicio', 'Profesional', 'Fecha y hora', 'Cliente', 'Confirmar']} current={2} />
        <div className="grid gap-7 md:grid-cols-2">
          <MiniCalendar
            value={date}
            onChange={setDate}
            size="lg"
            hasEvents={(d) => d.getDay() !== 0 && d.getDate() % 3 !== 0}
            isFull={(d) => d.getDate() === 10 || d.getDate() === 17}
          />
          <div className="flex flex-col gap-4">
            <div className="text-2xs font-semibold text-muted">Tarde</div>
            <SlotPicker
              value={slot}
              onChange={setSlot}
              slots={[
                { time: '14:00' },
                { time: '14:45', popular: true },
                { time: '15:30', disabled: true },
                { time: '16:15', popular: true },
                { time: '17:00' },
              ]}
            />
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <Clock size={14} aria-hidden /> Duración 45 min + 10 min de limpieza.
            </div>
          </div>
        </div>
      </Section>

      <div className="grid gap-[18px] lg:grid-cols-2">
        <Section title="Línea de tiempo">
          <Timeline
            items={[
              { title: 'Agendada', detail: 'Lun 5 oct · 18:22 · desde la web', state: 'done' },
              { title: 'Confirmada', detail: 'Mar 6 oct · 08:00 · respondió por WhatsApp', state: 'done' },
              { title: 'Llegó', detail: '10:25 · marcado por recepción', state: 'current' },
              { title: 'En curso', detail: '—', state: 'pending' },
              { title: 'Cancelada por el cliente', detail: 'Depósito devuelto (más de 12 h)', state: 'bad' },
            ]}
          />
        </Section>
        <Section title="Datos y progreso">
          <DefinitionList
            items={[
              { icon: Phone, label: 'Celular', value: '+51 987 654 321' },
              { icon: Mail, label: 'Email', value: 'mateo.huaman@correo.pe' },
              { icon: Scissors, label: 'Servicio', value: 'Corte + barba' },
            ]}
          />
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-sm">
              <b>Luis Paredes</b>
              <span className="text-muted">92%</span>
            </div>
            <ProgressBar value={92} label="Ocupación de Luis Paredes" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
        </Section>
      </div>

      <Banner
        icon={Sparkles}
        title="Se liberó jueves 8 · 15:00 con Diego Rojas"
        description="Hugo Silva canceló. 3 personas de la lista coinciden con ese horario y servicio."
        action={<Button className="border-0 bg-white text-[#243352] hover:bg-white">Avisar a las 3</Button>}
      />

      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
        <RuleCard
          icon={Clock}
          title="Anticipación mínima"
          description="No se puede reservar con menos de este tiempo."
          control={<Switch defaultChecked aria-label="Activar anticipación mínima" />}
          value="2 horas"
        />
        <RuleCard
          icon={Zap}
          title="Avisar automáticamente"
          description="Cuando se libera un horario se avisa al primero que coincide."
          control={<Switch aria-label="Activar aviso automático" />}
        />
        <AddCard label="Agregar servicio" className="min-h-[140px]" />
      </div>

      <Section title="Panel lateral y estado vacío">
        <div>
          <Button variant="primary" onClick={() => setDrawer(true)}>
            <CalendarCheck size={14} /> Abrir detalle de cita
          </Button>
        </div>
        <EmptyState
          icon={Inbox}
          title="Todavía no tienes clientes"
          description="Se agregan solos cuando reservan, o puedes registrarlos tú."
          action={
            <Button variant="primary" size="sm">
              <Plus size={13} /> Nuevo cliente
            </Button>
          }
        />
      </Section>

      <Drawer
        open={drawer}
        onOpenChange={setDrawer}
        title="Cita #UB-2475"
        headerExtra={<StatusChip status="confirmed" />}
        footer={
          <>
            <Button>Reprogramar</Button>
            <Button variant="danger">Cancelar</Button>
            <Button variant="primary" className="ml-auto">
              Marcar llegada
            </Button>
          </>
        }
      >
        <div className="flex items-center gap-2.5">
          <Avatar name="Mateo Huamán" size="lg" round />
          <div>
            <div className="text-lg font-semibold">Mateo Huamán</div>
            <div className="text-xs text-muted">+51 987 654 321 · 14 visitas</div>
          </div>
        </div>
        <DefinitionList
          className="border-t border-line pt-3.5"
          items={[
            { icon: Scissors, label: 'Servicio', value: 'Corte + barba + cejas' },
            { icon: User, label: 'Profesional', value: 'Luis Paredes' },
            { icon: Calendar, label: 'Fecha', value: 'Martes 6 oct · 15:00 – 16:00' },
          ]}
        />
      </Drawer>
    </>
  )
}
