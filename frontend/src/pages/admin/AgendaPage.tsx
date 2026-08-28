import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, List, ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import clsx from "clsx";
import { api } from "../../lib/api";
import type { Employee, Service, ServiceStatus } from "../../types";
import { STATUS_LABELS } from "../../types";
import { PageHeader, EmptyState, FullPageSpinner } from "../../components/ui/Misc";
import { Button } from "../../components/ui/Button";
import { Select, Input } from "../../components/ui/Field";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { PRIORITY_LABELS } from "../../types";
import { formatDate, formatTime, friendlyDay } from "../../lib/date";

export function AgendaPage() {
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<"list" | "calendar">("list");
  const [services, setServices] = useState<Service[] | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [status, setStatus] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [city, setCity] = useState(searchParams.get("city") || "");
  const [priority, setPriority] = useState("");
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get<Employee[]>("/employees").then((res) => setEmployees(res.data));
  }, []);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    if (employeeId) params.employeeId = employeeId;
    if (city) params.city = city;
    if (priority) params.priority = priority;
    if (search) params.search = search;
    setServices(null);
    api.get<Service[]>("/services", { params }).then((res) => setServices(res.data));
  }, [status, employeeId, city, priority, search]);

  const grouped = useMemo(() => {
    if (!services) return [];
    const map = new Map<string, Service[]>();
    for (const s of services) {
      const key = s.scheduledAt.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [services]);

  const daysInGrid = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const servicesByDay = useMemo(() => {
    const map = new Map<string, Service[]>();
    (services || []).forEach((s) => {
      const key = s.scheduledAt.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });
    return map;
  }, [services]);

  const selectedDayServices = selectedDay
    ? servicesByDay.get(format(selectedDay, "yyyy-MM-dd")) || []
    : [];

  return (
    <div>
      <PageHeader
        title="Agenda de Serviços"
        description="Organize, acompanhe e atribua os serviços da empresa."
        actions={
          <Button onClick={() => navigate("/admin/servicos/novo")}>
            <Plus className="h-4 w-4" /> Novo Serviço
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-[var(--border-color)] bg-[var(--surface-elevated)] p-1">
          <button
            onClick={() => setView("list")}
            className={clsx(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium",
              view === "list" ? "bg-brand-600 text-white" : "text-[var(--text-secondary)]"
            )}
          >
            <List className="h-4 w-4" /> Lista
          </button>
          <button
            onClick={() => setView("calendar")}
            className={clsx(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium",
              view === "calendar" ? "bg-brand-600 text-white" : "text-[var(--text-secondary)]"
            )}
          >
            <CalendarDays className="h-4 w-4" /> Calendário
          </button>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            placeholder="Buscar serviço, cliente ou endereço..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 max-w-full rounded-lg border border-[var(--border-color)] bg-[var(--surface)] py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
          />
        </div>

        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto">
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>

        <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="w-auto">
          <option value="">Todos os funcionários</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </Select>

        <Select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-auto">
          <option value="">Todas as prioridades</option>
          {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>

        <Input placeholder="Filtrar por cidade" value={city} onChange={(e) => setCity(e.target.value)} className="w-44" />
      </div>

      {!services ? (
        <FullPageSpinner />
      ) : view === "list" ? (
        grouped.length === 0 ? (
          <EmptyState title="Nenhum serviço encontrado" description="Ajuste os filtros ou cadastre um novo serviço." />
        ) : (
          <div className="space-y-6">
            {grouped.map(([day, items]) => (
              <div key={day}>
                <p className="mb-2 text-sm font-semibold capitalize text-[var(--text-secondary)]">
                  {friendlyDay(day + "T00:00:00")} · {formatDate(day + "T00:00:00")}
                </p>
                <div className="space-y-2">
                  {items
                    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
                    .map((s) => (
                      <ServiceRow key={s.id} service={s} onClick={() => navigate(`/admin/servicos/${s.id}`)} />
                    ))}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold capitalize text-[var(--text-primary)]">
                {format(month, "MMMM yyyy", { locale: ptBR })}
              </p>
              <div className="flex gap-1">
                <button onClick={() => setMonth((m) => subMonths(m, 1))} className="rounded-lg p-1.5 hover:bg-[var(--surface-muted)]">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => setMonth(new Date())} className="rounded-lg px-2 text-xs font-medium hover:bg-[var(--surface-muted)]">
                  Hoje
                </button>
                <button onClick={() => setMonth((m) => addMonths(m, 1))} className="rounded-lg p-1.5 hover:bg-[var(--surface-muted)]">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-[var(--text-muted)]">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {daysInGrid.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const dayServices = servicesByDay.get(key) || [];
                const inMonth = isSameMonth(day, month);
                const selected = selectedDay && isSameDay(day, selectedDay);
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDay(day)}
                    className={clsx(
                      "flex min-h-[64px] flex-col items-start rounded-lg border p-1.5 text-left transition-colors",
                      selected
                        ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
                        : "border-transparent hover:bg-[var(--surface-muted)]",
                      !inMonth && "opacity-40"
                    )}
                  >
                    <span
                      className={clsx(
                        "text-xs font-medium",
                        isSameDay(day, new Date()) ? "flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white" : "text-[var(--text-primary)]"
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    <div className="mt-1 flex flex-wrap gap-0.5">
                      {dayServices.slice(0, 4).map((s) => (
                        <span
                          key={s.id}
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: statusDotColor(s.status) }}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
            <p className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
              {selectedDay ? format(selectedDay, "dd 'de' MMMM", { locale: ptBR }) : "Selecione um dia"}
            </p>
            {selectedDay && selectedDayServices.length === 0 && (
              <p className="text-sm text-[var(--text-muted)]">Nenhum serviço agendado para este dia.</p>
            )}
            <div className="space-y-2">
              {selectedDayServices.map((s) => (
                <ServiceRow key={s.id} service={s} compact onClick={() => navigate(`/admin/servicos/${s.id}`)} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function statusDotColor(status: ServiceStatus) {
  return (
    {
      SCHEDULED: "#f59e0b",
      IN_PROGRESS: "#3b82f6",
      COMPLETED: "#22c55e",
      PENDING: "#ef4444",
      CANCELLED: "#94a3b8",
    } as Record<ServiceStatus, string>
  )[status];
}

function ServiceRow({ service, onClick, compact }: { service: Service; onClick: () => void; compact?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3 text-left transition-shadow hover:shadow-md"
    >
      <div className="flex h-10 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-[var(--surface-muted)] text-[var(--text-primary)]">
        <span className="text-xs font-bold">{formatTime(service.scheduledAt)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{service.serviceType}</p>
        <p className="truncate text-xs text-[var(--text-secondary)]">
          {service.client.name} {!compact && `· ${service.employee.name}`}
        </p>
      </div>
      <StatusBadge status={service.status} size="sm" />
    </button>
  );
}
