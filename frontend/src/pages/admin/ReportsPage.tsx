import { useEffect, useState } from "react";
import { FileSpreadsheet, FileText, FileDown, Package } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { api } from "../../lib/api";
import { STATUS_LABELS } from "../../types";
import type { Client, Employee } from "../../types";
import { PageHeader, EmptyState, FullPageSpinner } from "../../components/ui/Misc";
import { Card } from "../../components/ui/Card";
import { Select, Input } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { formatDateTime } from "../../lib/date";

interface ReportRow {
  id: string;
  serviceType: string;
  client: string;
  employee: string;
  status: string;
  statusLabel: string;
  scheduledAt: string;
  completedAt: string | null;
  address: string;
  materialsCount: number;
}
interface MaterialRow {
  name: string;
  quantity: number;
  uses: number;
}

export function ReportsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [clientId, setClientId] = useState("");
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<ReportRow[] | null>(null);
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [tab, setTab] = useState<"services" | "materials">("services");

  useEffect(() => {
    api.get<Employee[]>("/employees").then((res) => setEmployees(res.data));
    api.get<Client[]>("/clients").then((res) => setClients(res.data));
  }, []);

  const params = () => {
    const p: Record<string, string> = {};
    if (dateFrom) p.dateFrom = dateFrom;
    if (dateTo) p.dateTo = dateTo;
    if (employeeId) p.employeeId = employeeId;
    if (clientId) p.clientId = clientId;
    if (status) p.status = status;
    return p;
  };

  useEffect(() => {
    setRows(null);
    api.get<ReportRow[]>("/reports/services", { params: params() }).then((res) => setRows(res.data));
    api.get<MaterialRow[]>("/reports/materials", { params: params() }).then((res) => setMaterials(res.data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, employeeId, clientId, status]);

  function exportFile(kind: "csv" | "xlsx" | "pdf") {
    const search = new URLSearchParams(params()).toString();
    window.open(`/api/reports/export/${kind}?${search}`, "_blank");
  }

  const byStatusChart = Object.entries(STATUS_LABELS).map(([key, label]) => ({
    status: label,
    count: rows?.filter((r) => r.status === key).length || 0,
  }));

  return (
    <div>
      <PageHeader title="Relatórios" description="Analise os serviços realizados com filtros detalhados." />

      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Input label="De" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input label="Até" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <Select label="Funcionário" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">Todos</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </Select>
          <Select label="Cliente" value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">Todos</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--border-color)] pt-4">
          <Button variant="outline" size="sm" onClick={() => exportFile("csv")}>
            <FileDown className="h-4 w-4" /> Exportar CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportFile("xlsx")}>
            <FileSpreadsheet className="h-4 w-4" /> Exportar Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportFile("pdf")}>
            <FileText className="h-4 w-4" /> Exportar PDF
          </Button>
        </div>
      </Card>

      <div className="mb-4 flex rounded-lg border border-[var(--border-color)] bg-[var(--surface-elevated)] p-1 w-fit">
        <button
          onClick={() => setTab("services")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === "services" ? "bg-brand-600 text-white" : "text-[var(--text-secondary)]"}`}
        >
          Serviços
        </button>
        <button
          onClick={() => setTab("materials")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === "materials" ? "bg-brand-600 text-white" : "text-[var(--text-secondary)]"}`}
        >
          Materiais utilizados
        </button>
      </div>

      {!rows ? (
        <FullPageSpinner />
      ) : tab === "services" ? (
        <>
          <Card className="mb-4 p-4">
            <p className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Serviços por status ({rows.length} no total)</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byStatusChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="status" fontSize={11} stroke="var(--text-muted)" />
                <YAxis fontSize={12} stroke="var(--text-muted)" allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "var(--surface-elevated)", border: "1px solid var(--border-color)", borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="count" fill="var(--brand-500)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {rows.length === 0 ? (
            <EmptyState title="Nenhum serviço encontrado para os filtros selecionados." />
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-color)] text-left text-xs uppercase text-[var(--text-muted)]">
                    <th className="px-4 py-3">Serviço</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Funcionário</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Agendado</th>
                    <th className="px-4 py-3">Concluído</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--surface-muted)]">
                      <td className="px-4 py-2.5 font-medium text-[var(--text-primary)]">{r.serviceType}</td>
                      <td className="px-4 py-2.5 text-[var(--text-secondary)]">{r.client}</td>
                      <td className="px-4 py-2.5 text-[var(--text-secondary)]">{r.employee}</td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={r.status as any} size="sm" />
                      </td>
                      <td className="px-4 py-2.5 text-[var(--text-secondary)]">{formatDateTime(r.scheduledAt)}</td>
                      <td className="px-4 py-2.5 text-[var(--text-secondary)]">{r.completedAt ? formatDateTime(r.completedAt) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      ) : materials.length === 0 ? (
        <EmptyState title="Nenhum material registrado para os filtros selecionados." icon={<Package className="h-6 w-6" />} />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-[var(--border-color)] text-left text-xs uppercase text-[var(--text-muted)]">
                <th className="px-4 py-3">Material</th>
                <th className="px-4 py-3">Quantidade total</th>
                <th className="px-4 py-3">Utilizações</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((m) => (
                <tr key={m.name} className="border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--surface-muted)]">
                  <td className="px-4 py-2.5 font-medium text-[var(--text-primary)]">{m.name}</td>
                  <td className="px-4 py-2.5 text-[var(--text-secondary)]">{m.quantity}</td>
                  <td className="px-4 py-2.5 text-[var(--text-secondary)]">{m.uses}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
