import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList,
  CalendarClock,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Users,
  HardHat,
  XCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { api } from "../../lib/api";
import type { DashboardStats } from "../../types";
import { STATUS_COLORS, STATUS_LABELS } from "../../types";
import { StatCard } from "../../components/ui/Card";
import { PageHeader } from "../../components/ui/Misc";
import { FullPageSpinner } from "../../components/ui/Misc";
import { Button } from "../../components/ui/Button";
import { formatDate } from "../../lib/date";

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get<DashboardStats>("/dashboard/stats").then((res) => setStats(res.data));
  }, []);

  if (!stats) return <FullPageSpinner />;

  const pieData = stats.byStatus.map((s) => ({
    name: STATUS_LABELS[s.status],
    value: s.count,
    color: STATUS_COLORS[s.status],
  }));

  const timelineData = stats.timeline.map((t) => ({
    date: formatDate(t.date, "dd/MM"),
    Serviços: t.count,
  }));

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Visão geral dos serviços e da operação da empresa."
        actions={
          <Button onClick={() => navigate("/admin/servicos/novo")}>Novo Serviço</Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Total de Serviços" value={stats.total} icon={<ClipboardList className="h-5 w-5" />} accent="brand" onClick={() => navigate("/admin/agenda")} />
        <StatCard label="Serviços Hoje" value={stats.today} icon={<CalendarClock className="h-5 w-5" />} accent="blue" onClick={() => navigate("/admin/agenda")} />
        <StatCard label="Em Andamento" value={stats.inProgress} icon={<Loader2 className="h-5 w-5" />} accent="blue" />
        <StatCard label="Concluídos" value={stats.completed} icon={<CheckCircle2 className="h-5 w-5" />} accent="green" />
        <StatCard label="Pendentes" value={stats.pending} icon={<AlertTriangle className="h-5 w-5" />} accent="red" />
        <StatCard label="Agendados" value={stats.scheduled} icon={<CalendarClock className="h-5 w-5" />} accent="amber" />
        <StatCard label="Cancelados" value={stats.cancelled} icon={<XCircle className="h-5 w-5" />} accent="slate" />
        <StatCard label="Funcionários" value={stats.employees} icon={<HardHat className="h-5 w-5" />} accent="brand" onClick={() => navigate("/admin/funcionarios")} />
        <StatCard label="Clientes" value={stats.clients} icon={<Users className="h-5 w-5" />} accent="brand" onClick={() => navigate("/admin/clientes")} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 lg:col-span-2">
          <p className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Serviços agendados (últimos 30 dias)</p>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={timelineData}>
              <defs>
                <linearGradient id="colorServ" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--brand-500)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--brand-500)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="date" fontSize={12} stroke="var(--text-muted)" />
              <YAxis fontSize={12} stroke="var(--text-muted)" allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "var(--surface-elevated)",
                  border: "1px solid var(--border-color)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Area type="monotone" dataKey="Serviços" stroke="var(--brand-600)" fill="url(#colorServ)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
          <p className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Serviços por status</p>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: "var(--surface-elevated)",
                  border: "1px solid var(--border-color)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
        <p className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Carga de serviços por funcionário</p>
        <ResponsiveContainer width="100%" height={Math.max(180, stats.employeeLoad.length * 44)}>
          <BarChart data={stats.employeeLoad} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
            <XAxis type="number" fontSize={12} stroke="var(--text-muted)" allowDecimals={false} />
            <YAxis type="category" dataKey="name" fontSize={12} stroke="var(--text-muted)" width={110} />
            <Tooltip
              contentStyle={{
                background: "var(--surface-elevated)",
                border: "1px solid var(--border-color)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Bar dataKey="count" name="Serviços" fill="var(--brand-500)" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
