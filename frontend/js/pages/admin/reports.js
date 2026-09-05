import { icon } from "../../lib/icons.js";
import { Reports, Employees, Clients, STATUS_LABELS_PT } from "../../lib/store.js";
import { pageHeader, emptyState, esc, statusBadge, verticalBarChart, exportReportCsv, exportReportXlsx, exportReportPdf } from "../../lib/ui.js";
import { formatDateTime } from "../../lib/date.js";

export async function renderReportsPage(container) {
  const employees = Employees.list();
  const clients = Clients.list();
  const filters = { dateFrom: "", dateTo: "", employeeId: "", clientId: "", status: "" };
  let tab = "services";

  function currentRows() {
    return Reports.services({
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      employeeId: filters.employeeId || undefined,
      clientId: filters.clientId || undefined,
      status: filters.status || undefined,
    });
  }
  function currentMaterials() {
    return Reports.materials({
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      employeeId: filters.employeeId || undefined,
      clientId: filters.clientId || undefined,
      status: filters.status || undefined,
    });
  }

  function draw() {
    const rows = currentRows();
    const materials = currentMaterials();

    container.innerHTML = `
      ${pageHeader({ title: "Relatórios", description: "Analise os serviços realizados com filtros detalhados." })}

      <div class="card p-4 mb-4">
        <div class="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <label class="block"><span class="field-label">De</span><input class="input" type="date" id="f-from" value="${esc(filters.dateFrom)}" /></label>
          <label class="block"><span class="field-label">Até</span><input class="input" type="date" id="f-to" value="${esc(filters.dateTo)}" /></label>
          <label class="block"><span class="field-label">Funcionário</span>
            <select class="select" id="f-emp"><option value="">Todos</option>${employees.map((e) => `<option value="${esc(e.id)}" ${filters.employeeId === e.id ? "selected" : ""}>${esc(e.name)}</option>`).join("")}</select>
          </label>
          <label class="block"><span class="field-label">Cliente</span>
            <select class="select" id="f-client"><option value="">Todos</option>${clients.map((c) => `<option value="${esc(c.id)}" ${filters.clientId === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select>
          </label>
          <label class="block"><span class="field-label">Status</span>
            <select class="select" id="f-status"><option value="">Todos</option>${Object.entries(STATUS_LABELS_PT).map(([k, v]) => `<option value="${k}" ${filters.status === k ? "selected" : ""}>${esc(v)}</option>`).join("")}</select>
          </label>
        </div>
        <div class="flex flex-wrap gap-2 mt-4 pt-4 border-t">
          <button class="btn btn-outline btn-sm" id="export-csv">${icon("file-down", { class: "h-4 w-4" })} Exportar CSV</button>
          <button class="btn btn-outline btn-sm" id="export-xlsx">${icon("file-spreadsheet", { class: "h-4 w-4" })} Exportar Excel</button>
          <button class="btn btn-outline btn-sm" id="export-pdf">${icon("file-text", { class: "h-4 w-4" })} Exportar PDF</button>
        </div>
      </div>

      <div class="segmented mb-4">
        <button type="button" class="segmented-btn ${tab === "services" ? "active" : ""}" data-tab="services">Serviços</button>
        <button type="button" class="segmented-btn ${tab === "materials" ? "active" : ""}" data-tab="materials">Materiais utilizados</button>
      </div>

      <div id="reports-body"></div>
    `;

    container.querySelector("#f-from").addEventListener("change", (e) => {
      filters.dateFrom = e.target.value;
      draw();
    });
    container.querySelector("#f-to").addEventListener("change", (e) => {
      filters.dateTo = e.target.value;
      draw();
    });
    container.querySelector("#f-emp").addEventListener("change", (e) => {
      filters.employeeId = e.target.value;
      draw();
    });
    container.querySelector("#f-client").addEventListener("change", (e) => {
      filters.clientId = e.target.value;
      draw();
    });
    container.querySelector("#f-status").addEventListener("change", (e) => {
      filters.status = e.target.value;
      draw();
    });
    container.querySelectorAll("[data-tab]").forEach((b) =>
      b.addEventListener("click", () => {
        tab = b.dataset.tab;
        draw();
      })
    );
    container.querySelector("#export-csv").addEventListener("click", () => exportReportCsv(rows));
    container.querySelector("#export-xlsx").addEventListener("click", () => exportReportXlsx(rows));
    container.querySelector("#export-pdf").addEventListener("click", () => exportReportPdf(rows));

    const body = container.querySelector("#reports-body");
    if (tab === "services") {
      const byStatusChart = Object.entries(STATUS_LABELS_PT).map(([key, label]) => ({ label, value: rows.filter((r) => r.status === key).length }));
      body.innerHTML = `
        <div class="chart-card mb-4">
          <p class="chart-card-title">Serviços por status (${rows.length} no total)</p>
          ${verticalBarChart(byStatusChart)}
        </div>
        ${
          rows.length === 0
            ? emptyState({ title: "Nenhum serviço encontrado para os filtros selecionados." })
            : `<div class="card scroll-x">
                <table class="data-table min-table-720">
                  <thead><tr><th>Serviço</th><th>Cliente</th><th>Funcionário</th><th>Status</th><th>Agendado</th><th>Concluído</th></tr></thead>
                  <tbody>
                    ${rows
                      .map(
                        (r) => `<tr>
                      <td class="font-medium text-primary">${esc(r.serviceType)}</td>
                      <td class="text-secondary">${esc(r.client)}</td>
                      <td class="text-secondary">${esc(r.employee)}</td>
                      <td>${statusBadge(r.status, "sm")}</td>
                      <td class="text-secondary">${esc(formatDateTime(r.scheduledAt))}</td>
                      <td class="text-secondary">${r.completedAt ? esc(formatDateTime(r.completedAt)) : "—"}</td>
                    </tr>`
                      )
                      .join("")}
                  </tbody>
                </table>
              </div>`
        }
      `;
    } else {
      body.innerHTML =
        materials.length === 0
          ? emptyState({ title: "Nenhum material registrado para os filtros selecionados.", iconName: "package" })
          : `<div class="card scroll-x">
              <table class="data-table min-table-480">
                <thead><tr><th>Material</th><th>Quantidade total</th><th>Utilizações</th></tr></thead>
                <tbody>
                  ${materials
                    .map(
                      (m) => `<tr>
                    <td class="font-medium text-primary">${esc(m.name)}</td>
                    <td class="text-secondary">${m.quantity}</td>
                    <td class="text-secondary">${m.uses}</td>
                  </tr>`
                    )
                    .join("")}
                </tbody>
              </table>
            </div>`;
    }
  }

  draw();
}
