import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { addDays } from "date-fns";
import { MapPin, Clock, Wrench, ChevronRight, CalendarClock } from "lucide-react";
import { api } from "../../lib/api";
import type { Service } from "../../types";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { EmptyState, FullPageSpinner } from "../../components/ui/Misc";
import { Button } from "../../components/ui/Button";
import { formatDateTime, formatTime, friendlyDay } from "../../lib/date";
import { useAuth } from "../../context/AuthContext";

export function EmployeeHomePage() {
  const [services, setServices] = useState<Service[] | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const dateFrom = new Date().toISOString();
    const dateTo = addDays(new Date(), 7).toISOString();
    api.get<Service[]>("/services", { params: { dateFrom, dateTo } }).then((res) => setServices(res.data));
  }, []);

  if (!services) return <FullPageSpinner />;

  const active = services.filter((s) => s.status !== "CANCELLED");
  const next = active.find((s) => s.status === "SCHEDULED" || s.status === "IN_PROGRESS") || active[0];
  const rest = active.filter((s) => s.id !== next?.id);

  const grouped = new Map<string, Service[]>();
  for (const s of rest) {
    const key = s.scheduledAt.slice(0, 10);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(s);
  }

  return (
    <div className="p-4">
      <p className="mb-1 text-sm text-[var(--text-secondary)]">Bem-vindo,</p>
      <h1 className="mb-4 text-lg font-bold text-[var(--text-primary)]">{user?.name}</h1>

      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-[var(--text-muted)]">
        <CalendarClock className="h-3.5 w-3.5" /> Próximo serviço
      </p>

      {!next ? (
        <EmptyState title="Nenhum serviço agendado" description="Você não tem serviços atribuídos nos próximos dias." />
      ) : (
        <button
          onClick={() => navigate(`/app/servicos/${next.id}`)}
          className="mb-6 block w-full rounded-2xl bg-brand-600 p-5 text-left text-white shadow-lg shadow-brand-600/20 active:scale-[0.99] transition-transform"
        >
          <div className="flex items-start justify-between">
            <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium">{friendlyDay(next.scheduledAt)}</span>
            <ChevronRight className="h-5 w-5" />
          </div>
          <p className="mt-3 text-lg font-bold">{next.serviceType}</p>
          <div className="mt-3 space-y-1.5 text-sm text-white/90">
            <p className="flex items-center gap-2">
              <Clock className="h-4 w-4" /> {formatTime(next.scheduledAt)}
            </p>
            <p className="flex items-center gap-2">
              <Wrench className="h-4 w-4" /> {next.client.name}
            </p>
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" /> {next.address}
            </p>
          </div>
          <div className="mt-4">
            <StatusBadge status={next.status} />
          </div>
        </button>
      )}

      <p className="mb-2 text-xs font-semibold uppercase text-[var(--text-muted)]">Serviços da semana</p>
      {grouped.size === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">Nenhum outro serviço nos próximos 7 dias.</p>
      ) : (
        <div className="space-y-5">
          {Array.from(grouped.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([day, items]) => (
              <div key={day}>
                <p className="mb-2 text-xs font-semibold capitalize text-[var(--text-secondary)]">{friendlyDay(day + "T00:00:00")}</p>
                <div className="space-y-2">
                  {items
                    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
                    .map((s) => (
                      <button
                        key={s.id}
                        onClick={() => navigate(`/app/servicos/${s.id}`)}
                        className="flex w-full items-center gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3 text-left"
                      >
                        <div className="flex h-11 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-[var(--surface-muted)]">
                          <span className="text-xs font-bold text-[var(--text-primary)]">{formatTime(s.scheduledAt)}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{s.serviceType}</p>
                          <p className="truncate text-xs text-[var(--text-secondary)]">{s.client.name}</p>
                        </div>
                        <StatusBadge status={s.status} size="sm" />
                      </button>
                    ))}
                </div>
              </div>
            ))}
        </div>
      )}

      <div className="mt-6">
        <Button variant="outline" fullWidth onClick={() => navigate("/app/servicos")}>
          Ver todos os meus serviços
        </Button>
      </div>
    </div>
  );
}
