import { icon } from "../../lib/icons.js";
import { Dashboard } from "../../lib/store.js";
import { pageHeader, svgAreaChart, donutChart, horizontalBarChart } from "../../lib/ui.js";
import { formatDate } from "../../lib/date.js";
import { go } from "../../router.js";

const STATUS_LABELS = { SCHEDULED: "Agendado", IN_PROGRESS: "Em andamento", COMPLETED: "Concluído", PENDING: "Pendente", CANCELLED: "Cancelado" };
const COLORS = { SCHEDULED: "#f59e0b", IN_PROGRESS: "#3b82f6", COMPLETED: "#22c55e", PENDING: "#ef4444", CANCELLED: "#64748b" };

function statCard({ label, value, iconName, accent, onClick }) {
  return `
    <div class="card stat-card ${onClick ? "card-clickable" : ""}" ${onClick ? `data-stat="${onClick}"` : ""}>
      <div class="stat-card-icon accent-${accent}">${icon(iconName, { class: "h-5 w-5" })}</div>
      <div class="min-w-0">
        <p class="stat-card-value">${value}</p>
        <p class="stat-card-label truncate">${label}</p>
      </div>
    </div>
  `;
}

export async function renderDashboardPage(container) {
  container.innerHTML = `<div id="dash-root"></div>`;
  const root = container.querySelector("#dash-root");

  const stats = Dashboard.stats();

  const pieData = stats.byStatus.map((s) => ({ label: STATUS_LABELS[s.status] || s.status, value: s.count, color: COLORS[s.status] || "#94a3b8" }));
  const timelineData = stats.timeline.map((t) => ({ label: formatDate(t.date, "dd/MM"), value: t.count }));

  root.innerHTML = `
    ${pageHeader({ title: "Dashboard", description: "Visão geral dos serviços e da operação da empresa.", actionsHtml: `<button class="btn btn-primary btn-md" id="new-service-btn">Novo Serviço</button>` })}

    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      ${statCard({ label: "Total de Serviços", value: stats.total, iconName: "list", accent: "brand", onClick: "/admin/agenda" })}
      ${statCard({ label: "Serviços Hoje", value: stats.today, iconName: "calendar-clock", accent: "blue", onClick: "/admin/agenda" })}
      ${statCard({ label: "Em Andamento", value: stats.inProgress, iconName: "loader", accent: "blue" })}
      ${statCard({ label: "Concluídos", value: stats.completed, iconName: "check-circle-2", accent: "green" })}
      ${statCard({ label: "Pendentes", value: stats.pending, iconName: "alert-triangle", accent: "red" })}
      ${statCard({ label: "Agendados", value: stats.scheduled, iconName: "calendar-clock", accent: "amber" })}
      ${statCard({ label: "Cancelados", value: stats.cancelled, iconName: "x-circle", accent: "slate" })}
      ${statCard({ label: "Funcionários", value: stats.employees, iconName: "hard-hat", accent: "brand", onClick: "/admin/funcionarios" })}
      ${statCard({ label: "Clientes", value: stats.clients, iconName: "users", accent: "brand", onClick: "/admin/clientes" })}
    </div>

    <div class="dashboard-grid">
      <div class="chart-card">
        <p class="chart-card-title">Serviços agendados (últimos 30 dias)</p>
        ${svgAreaChart(timelineData)}
      </div>
      <div class="chart-card">
        <p class="chart-card-title">Serviços por status</p>
        ${donutChart(pieData)}
      </div>
    </div>

    <div class="chart-card mt-4">
      <p class="chart-card-title">Carga de serviços por funcionário</p>
      ${horizontalBarChart(stats.employeeLoad.map((e) => ({ label: e.name, value: e.count })))}
    </div>
  `;

  root.querySelector("#new-service-btn").addEventListener("click", () => go("/admin/servicos/novo"));
  root.querySelectorAll("[data-stat]").forEach((el) => el.addEventListener("click", () => go(el.dataset.stat)));
}
