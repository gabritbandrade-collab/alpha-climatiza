import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Inbox, Clock4, CalendarClock, Loader2, CheckCircle2, AlertTriangle, MapPin, ExternalLink } from "lucide-react";
import { api } from "../../lib/api";
import { PageHeader, EmptyState, FullPageSpinner } from "../../components/ui/Misc";
import { StatCard, Card } from "../../components/ui/Card";
import { StatusBadge } from "../../components/ui/StatusBadge";
import type { ServiceStatus } from "../../types";
import { formatTime, friendlyDay } from "../../lib/date";

interface DistributionStats {
  newRequests: number;
  awaitingRequests: number;
  scheduled: number;
  inProgress: number;
  completed: number;
  pending: number;
  byCity: { city: string; count: number; employees: { id: string; name: string }[] }[];
}

interface EmployeeAgenda {
  id: string;
  name: string;
  cargo: string | null;
  cities: string[];
  services: {
    id: string;
    serviceType: string;
    clientName: string;
    city: string | null;
    address: string;
    scheduledAt: string;
    status: ServiceStatus;
  }[];
}

export function DistributionPage() {
  const [stats, setStats] = useState<DistributionStats | null>(null);
  const [tab, setTab] = useState<"cities" | "employees">("cities");
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [agendas, setAgendas] = useState<EmployeeAgenda[] | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get<DistributionStats>("/distribution/stats").then((res) => setStats(res.data));
  }, []);

  useEffect(() => {
    if (tab === "employees" && !agendas) {
      api.get<EmployeeAgenda[]>("/distribution/by-employee").then((res) => setAgendas(res.data));
    }
  }, [tab, agendas]);

  if (!stats) return <FullPageSpinner />;

  const cityDetail = stats.byCity.find((c) => c.city === selectedCity);

  return (
    <div>
      <PageHeader
        title="Distribuição de Serviços"
        description="Acompanhe pedidos, distribuição por cidade e a agenda de cada funcionário."
        actions={
          <button
            onClick={() => navigate("/admin/solicitacoes")}
            className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
          >
            Ver solicitações <ExternalLink className="h-3.5 w-3.5" />
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Novos pedidos"
          value={stats.newRequests}
          icon={<Inbox className="h-5 w-5" />}
          accent="amber"
          onClick={() => navigate("/admin/solicitacoes?status=PENDING")}
        />
        <StatCard
          label="Aguardando distribuição"
          value={stats.awaitingRequests}
          icon={<Clock4 className="h-5 w-5" />}
          accent="blue"
          onClick={() => navigate("/admin/solicitacoes?status=PENDING")}
        />
        <StatCard
          label="Agendados"
          value={stats.scheduled}
          icon={<CalendarClock className="h-5 w-5" />}
          accent="slate"
          onClick={() => navigate("/admin/agenda")}
        />
        <StatCard
          label="Em andamento"
          value={stats.inProgress}
          icon={<Loader2 className="h-5 w-5" />}
          accent="blue"
          onClick={() => navigate("/admin/agenda")}
        />
        <StatCard
          label="Concluídos"
          value={stats.completed}
          icon={<CheckCircle2 className="h-5 w-5" />}
          accent="green"
          onClick={() => navigate("/admin/agenda")}
        />
        <StatCard
          label="Pendentes"
          value={stats.pending}
          icon={<AlertTriangle className="h-5 w-5" />}
          accent="red"
          onClick={() => navigate("/admin/agenda")}
        />
      </div>

      <div className="mt-6 mb-4 flex rounded-lg border border-[var(--border-color)] bg-[var(--surface-elevated)] p-1 w-fit">
        <button
          onClick={() => setTab("cities")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === "cities" ? "bg-brand-600 text-white" : "text-[var(--text-secondary)]"}`}
        >
          Por cidade
        </button>
        <button
          onClick={() => setTab("employees")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === "employees" ? "bg-brand-600 text-white" : "text-[var(--text-secondary)]"}`}
        >
          Agenda por funcionário
        </button>
      </div>

      {tab === "cities" ? (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <Card className="p-3">
            <p className="mb-2 px-2 text-xs font-semibold uppercase text-[var(--text-muted)]">Cidades atendidas</p>
            {stats.byCity.length === 0 ? (
              <p className="px-2 text-sm text-[var(--text-muted)]">Nenhum serviço com cidade cadastrada ainda.</p>
            ) : (
              <div className="space-y-1">
                {stats.byCity.map((c) => (
                  <button
                    key={c.city}
                    onClick={() => setSelectedCity(c.city)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
                      selectedCity === c.city ? "bg-brand-600 text-white" : "hover:bg-[var(--surface-muted)] text-[var(--text-primary)]"
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <MapPin className="h-3.5 w-3.5 shrink-0" /> {c.city}
                    </span>
                    <span className={selectedCity === c.city ? "text-white/80" : "text-[var(--text-muted)]"}>{c.count}</span>
                  </button>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-4">
            {!cityDetail ? (
              <EmptyState title="Selecione uma cidade" description="Veja os funcionários responsáveis e os serviços daquela região." />
            ) : (
              <>
                <p className="mb-1 text-base font-semibold text-[var(--text-primary)]">{cityDetail.city}</p>
                <p className="mb-4 text-sm text-[var(--text-secondary)]">{cityDetail.count} serviço(s) nesta cidade.</p>
                <p className="mb-2 text-xs font-semibold uppercase text-[var(--text-muted)]">Funcionários responsáveis</p>
                <div className="flex flex-wrap gap-2">
                  {cityDetail.employees.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => navigate(`/admin/funcionarios/${e.id}`)}
                      className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100 dark:bg-brand-900/30 dark:text-brand-300"
                    >
                      {e.name}
                    </button>
                  ))}
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => navigate(`/admin/agenda?city=${encodeURIComponent(cityDetail.city)}`)}
                    className="text-sm font-medium text-brand-600 hover:underline"
                  >
                    Ver todos os serviços em {cityDetail.city} →
                  </button>
                </div>
              </>
            )}
          </Card>
        </div>
      ) : !agendas ? (
        <FullPageSpinner />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agendas.map((agenda) => (
            <Card key={agenda.id} className="p-4">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{agenda.name}</p>
              <p className="mb-1 text-xs text-[var(--text-muted)]">{agenda.cargo}</p>
              <p className="mb-3 flex flex-wrap gap-1">
                {agenda.cities.map((c) => (
                  <span key={c} className="rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] text-[var(--text-secondary)]">
                    {c}
                  </span>
                ))}
              </p>
              {agenda.services.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">Nenhum serviço futuro/ativo.</p>
              ) : (
                <div className="space-y-1.5">
                  {agenda.services.slice(0, 6).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => navigate(`/admin/servicos/${s.id}`)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-[var(--surface-muted)]"
                    >
                      <span className="min-w-0 truncate">
                        <span className="font-medium text-[var(--text-primary)]">{formatTime(s.scheduledAt)}</span>{" "}
                        <span className="text-[var(--text-secondary)]">
                          — {s.clientName} ({s.city || "—"})
                        </span>
                      </span>
                      <StatusBadge status={s.status} size="sm" />
                    </button>
                  ))}
                  {agenda.services.length > 6 && (
                    <p className="px-2 text-[10px] text-[var(--text-muted)]">+{agenda.services.length - 6} serviço(s)</p>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
