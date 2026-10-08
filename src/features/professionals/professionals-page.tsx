import { useQuery } from "@tanstack/react-query";
import {
  CalendarClock,
  ChevronRight,
  CircleAlert,
  Plus,
  User,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Avatar } from "@/components/ui/avatar";
import { Tag } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FilterChips } from "@/components/ui/controls";
import { EmptyState, Skeleton } from "@/components/ui/display";
import { api } from "@/lib/api/client";
import type { Branch } from "@/lib/api/types";
import { useAccess } from "@/lib/auth/access";
import { useAuth } from "@/lib/auth/auth-context";
import { branchesQueryKey, useBranch } from "@/lib/auth/branch-context";
import { cn } from "@/lib/cn";
import { useProfessionals, useSaveProfessional } from "./api";
import { summarizeSchedule } from "./schedule-summary";

/** Catálogo / Profesionales: lista. Cada tarjeta abre la ficha del profesional. */
export function ProfessionalsPage() {
  const { me } = useAuth();
  const { can, readOnly } = useAccess();
  const navigate = useNavigate();
  const canManage = can("professional.manage") && !readOnly;
  const professionals = useProfessionals();
  const branches = useQuery({
    queryKey: branchesQueryKey,
    queryFn: () => api<Branch[]>("/branches"),
  });
  const [filter, setFilter] = useState<"active" | "inactive" | "all">("active");

  const list = professionals.data ?? [];
  const limit = me?.subscription?.features.max_professionals;
  const activeCount = list.filter((p) => p.isActive).length;
  const atLimit = typeof limit === "number" && activeCount >= limit;
  const visible = list.filter(
    (p) => filter === "all" || p.isActive === (filter === "active"),
  );
  const save = useSaveProfessional();
  const myMembership = me?.access?.membershipId;
  const iAttend = list.some((p) => p.membershipId === myMembership);
  const { current } = useBranch();
  const addMe = async () => {
    if (!me || !myMembership) return;
    const created = await save.mutateAsync({
      displayName: `${me.user.firstName} ${me.user.lastName}`.trim(),
      branchIds: current ? [current.id] : [],
      membershipId: myMembership,
    });
    navigate(`/profesionales/${created.id}?tab=servicios`);
  };

  if (professionals.isError) {
    return (
      <Card>
        <p className="m-0 text-sm text-bad">
          No se pudieron cargar los profesionales. Recarga la página.
        </p>
      </Card>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <FilterChips
            aria-label="Filtrar profesionales"
            value={filter}
            onValueChange={setFilter}
            options={[
              { value: "active", label: `Activos · ${activeCount}` },
              {
                value: "inactive",
                label: `Inactivos · ${list.length - activeCount}`,
              },
              { value: "all", label: "Todos" },
            ]}
          />
          {typeof limit === "number" && (
            <span className="text-xs text-muted">
              {activeCount} de {limit} en tu plan
            </span>
          )}
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2.5">
            {!iAttend && myMembership && (
              <Button
                onClick={() => void addMe()}
                disabled={atLimit || save.isPending}
                title="Crea tu propio perfil para tener agenda y recibir reservas"
              >
                <UserRound size={14} aria-hidden /> Yo también atiendo
              </Button>
            )}
            <Button
              variant="primary"
              onClick={() => navigate("/profesionales/nuevo")}
              disabled={atLimit}
              title={
                atLimit
                  ? "Alcanzaste el límite de profesionales de tu plan"
                  : undefined
              }
            >
              <Plus size={14} aria-hidden /> Nuevo profesional
            </Button>
          </div>
        )}
      </div>

      {professionals.isLoading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[170px] rounded-card" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <Card>
          <EmptyState
            icon={User}
            title="Aún no tienes profesionales"
            description="Agrega a quienes atienden. Sus servicios, sedes y horario definen qué horarios se ofrecen al reservar."
            action={
              canManage && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate("/profesionales/nuevo")}
                >
                  <Plus size={13} aria-hidden /> Agregar profesional
                </Button>
              )
            }
          />
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <p className="m-0 py-6 text-center text-sm text-muted">
            No hay profesionales en este filtro.
          </p>
        </Card>
      ) : (
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4 p-0">
          {visible.map((p) => {
            const summary = summarizeSchedule(p.schedules);
            const branchNames = (branches.data ?? [])
              .filter((b) => p.branchIds.includes(b.id))
              .map((b) => b.name);
            const pending = [
              p.services.length === 0 && "servicios",
              summary.days === 0 && "horario",
            ].filter(Boolean);
            return (
              <li key={p.id}>
                <Link
                  to={`/profesionales/${p.id}`}
                  className={cn(
                    "group flex h-full flex-col gap-3 rounded-card bg-surface px-5 py-[18px] text-ink shadow-card transition-shadow hover:shadow-[0_0_0_1.5px_var(--teal-line),var(--shadow)]",
                    !p.isActive && "opacity-70",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={p.displayName}
                      color={p.color}
                      size="lg"
                      round
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">
                        {p.displayName}
                      </div>
                      <div className="truncate text-xs text-muted">
                        {p.title || "Profesional"}
                      </div>
                    </div>
                    <ChevronRight
                      size={18}
                      className="text-muted transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {!p.isActive && <Tag tone="off">Inactivo</Tag>}
                    {p.membershipId && <Tag tone="teal">Con acceso</Tag>}
                    {branchNames.map((b) => (
                      <Tag key={b} tone="brand">
                        {b}
                      </Tag>
                    ))}
                  </div>

                  <div className="mt-auto flex flex-col gap-1 border-t border-line pt-3 text-xs">
                    {summary.days > 0 ? (
                      <span className="flex items-center gap-1.5 text-ink-2">
                        <CalendarClock
                          size={14}
                          aria-hidden
                          className="text-teal-ink"
                        />
                        {summary.label} · {summary.hours} h/sem
                      </span>
                    ) : null}
                    <span className="text-muted">
                      {p.services.length}{" "}
                      {p.services.length === 1 ? "servicio" : "servicios"}
                      {p.commissionPercent != null &&
                        ` · Comisión ${p.commissionPercent}%`}
                    </span>
                    {pending.length > 0 && (
                      <span className="flex items-center gap-1.5 font-semibold text-warn">
                        <CircleAlert size={14} aria-hidden /> Falta{" "}
                        {pending.join(" y ")}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
