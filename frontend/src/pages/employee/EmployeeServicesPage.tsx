import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { api } from "../../lib/api";
import type { Service } from "../../types";
import { STATUS_LABELS } from "../../types";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { EmptyState, FullPageSpinner } from "../../components/ui/Misc";
import { formatTime, friendlyDay, formatDate } from "../../lib/date";

export function EmployeeServicesPage() {
  const [services, setServices] = useState<Service[] | null>(null);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    api.get<Service[]>("/services").then((res) => setServices(res.data));
  }, []);

  const filtered = useMemo(() => {
    if (!services) return [];
    return services.filter((s) => {
      if (status && s.status !== status) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          s.serviceType.toLowerCase().includes(q) ||
          s.client.name.toLowerCase().includes(q) ||
          s.address.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [services, status, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, Service[]>();
    for (const s of filtered) {
      const key = s.scheduledAt.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  if (!services) return <FullPageSpinner />;

  return (
    <div className="p-4">
      <h1 className="mb-3 text-lg font-bold text-[var(--text-primary)]">Meus Serviços</h1>

      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          placeholder="Buscar serviço ou cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--surface)] py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
        />
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        <FilterChip label="Todos" active={status === ""} onClick={() => setStatus("")} />
        {Object.entries(STATUS_LABELS).map(([k, v]) => (
          <FilterChip key={k} label={v} active={status === k} onClick={() => setStatus(k)} />
        ))}
      </div>

      {grouped.length === 0 ? (
        <EmptyState title="Nenhum serviço encontrado" description="Ajuste os filtros para ver mais resultados." />
      ) : (
        <div className="space-y-5">
          {grouped.map(([day, items]) => (
            <div key={day}>
              <p className="mb-2 text-xs font-semibold capitalize text-[var(--text-secondary)]">
                {friendlyDay(day + "T00:00:00")} · {formatDate(day + "T00:00:00")}
              </p>
              <div className="space-y-2">
                {items.map((s) => (
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
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active ? "bg-brand-600 text-white" : "bg-[var(--surface-muted)] text-[var(--text-secondary)]"
      }`}
    >
      {label}
    </button>
  );
}
