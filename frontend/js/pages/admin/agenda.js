import { icon } from "../../lib/icons.js";
import { Services, Employees, STATUS_LABELS_PT } from "../../lib/store.js";
import { pageHeader, emptyState, fullPageSpinner, statusBadge, esc, PRIORITY_LABELS_PT } from "../../lib/ui.js";
import { formatDate, formatTime, friendlyDay, dateKey, monthYearLabel } from "../../lib/date.js";
import { go } from "../../router.js";

const DOT_COLORS = { SCHEDULED: "#f59e0b", IN_PROGRESS: "#3b82f6", COMPLETED: "#22c55e", PENDING: "#ef4444", CANCELLED: "#94a3b8" };
const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function serviceRowHtml(s, compact) {
  return `
    <button type="button" class="service-row" data-service-id="${esc(s.id)}">
      <div class="service-row-time">${esc(formatTime(s.scheduledAt))}</div>
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-semibold text-primary">${esc(s.serviceType)}</p>
        <p class="truncate text-xs text-secondary">${esc(s.client.name)}${compact ? "" : " · " + esc(s.employee.name)}</p>
      </div>
      ${statusBadge(s.status, "sm")}
    </button>
  `;
}

function buildCalendarGrid(month) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const gridStart = new Date(start);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const gridEnd = new Date(end);
  gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay()));
  const days = [];
  const cur = new Date(gridStart);
  while (cur <= gridEnd) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

export async function renderAgendaPage(container, query) {
  const state = {
    view: "list",
    status: "",
    employeeId: "",
    city: query.city || "",
    priority: "",
    search: "",
    month: new Date(),
    selectedDay: null,
  };

  const employees = await Employees.list();

  function servicesByDayMap(services) {
    const map = new Map();
    for (const s of services) {
      const key = s.scheduledAt.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(s);
    }
    return map;
  }

  async function draw() {
    const services = await Services.list({
      status: state.status || undefined,
      employeeId: state.employeeId || undefined,
      city: state.city || undefined,
      priority: state.priority || undefined,
      search: state.search || undefined,
    });

    const grouped = Array.from(servicesByDayMap(services).entries()).sort(([a], [b]) => a.localeCompare(b));

    container.innerHTML = `
      ${pageHeader({
        title: "Agenda de Serviços",
        description: "Organize, acompanhe e atribua os serviços da empresa.",
        actionsHtml: `<button class="btn btn-primary btn-md" id="new-service-btn">${icon("plus", { class: "h-4 w-4" })} Novo Serviço</button>`,
      })}

      <div class="filters-bar">
        <div class="segmented">
          <button type="button" class="segmented-btn ${state.view === "list" ? "active" : ""}" data-view="list">${icon("list", { class: "h-4 w-4" })} Lista</button>
          <button type="button" class="segmented-btn ${state.view === "calendar" ? "active" : ""}" data-view="calendar">${icon("calendar-days", { class: "h-4 w-4" })} Calendário</button>
        </div>
        <div class="input-icon-wrap filter-search">
          <span class="input-icon">${icon("search", { class: "h-4 w-4" })}</span>
          <input class="input" id="f-search" placeholder="Buscar serviço, cliente ou endereço..." value="${esc(state.search)}" />
        </div>
        <select class="select filter-select" id="f-status">
          <option value="">Todos os status</option>
          ${Object.entries(STATUS_LABELS_PT).map(([k, v]) => `<option value="${k}" ${state.status === k ? "selected" : ""}>${esc(v)}</option>`).join("")}
        </select>
        <select class="select filter-select" id="f-employee">
          <option value="">Todos os funcionários</option>
          ${employees.map((e) => `<option value="${e.id}" ${state.employeeId === e.id ? "selected" : ""}>${esc(e.name)}</option>`).join("")}
        </select>
        <select class="select filter-select" id="f-priority">
          <option value="">Todas as prioridades</option>
          ${Object.entries(PRIORITY_LABELS_PT).map(([k, v]) => `<option value="${k}" ${state.priority === k ? "selected" : ""}>${esc(v)}</option>`).join("")}
        </select>
        <input class="input" style="width:11rem" id="f-city" placeholder="Filtrar por cidade" value="${esc(state.city)}" />
      </div>

      <div id="agenda-body"></div>
    `;

    container.querySelector("#new-service-btn").addEventListener("click", () => go("/admin/servicos/novo"));
    container.querySelectorAll("[data-view]").forEach((b) =>
      b.addEventListener("click", () => {
        state.view = b.dataset.view;
        draw();
      })
    );
    container.querySelector("#f-search").addEventListener("input", (e) => {
      state.search = e.target.value;
      draw();
    });
    container.querySelector("#f-status").addEventListener("change", (e) => {
      state.status = e.target.value;
      draw();
    });
    container.querySelector("#f-employee").addEventListener("change", (e) => {
      state.employeeId = e.target.value;
      draw();
    });
    container.querySelector("#f-priority").addEventListener("change", (e) => {
      state.priority = e.target.value;
      draw();
    });
    container.querySelector("#f-city").addEventListener("input", (e) => {
      state.city = e.target.value;
      draw();
    });

    const body = container.querySelector("#agenda-body");

    if (state.view === "list") {
      if (grouped.length === 0) {
        body.innerHTML = emptyState({ title: "Nenhum serviço encontrado", description: "Ajuste os filtros ou cadastre um novo serviço." });
      } else {
        body.innerHTML = `
          <div class="space-y-6">
            ${grouped
              .map(
                ([day, items]) => `
              <div>
                <p class="mb-2 text-sm font-semibold capitalize text-secondary">${esc(friendlyDay(day + "T00:00:00"))} · ${esc(formatDate(day + "T00:00:00"))}</p>
                <div class="space-y-2">
                  ${items
                    .slice()
                    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
                    .map((s) => serviceRowHtml(s, false))
                    .join("")}
                </div>
              </div>
            `
              )
              .join("")}
          </div>
        `;
        wireServiceRows(body);
      }
    } else {
      const days = buildCalendarGrid(state.month);
      const byDay = servicesByDayMap(services);
      const today = new Date();
      const selectedKey = state.selectedDay ? dateKey(state.selectedDay) : null;
      const selectedServices = selectedKey ? byDay.get(selectedKey) || [] : [];

      body.innerHTML = `
        <div class="calendar-wrap">
          <div class="chart-card">
            <div class="calendar-header">
              <p class="text-sm font-semibold capitalize text-primary">${esc(monthYearLabel(state.month))}</p>
              <div class="flex gap-1">
                <button type="button" class="icon-btn" id="cal-prev">${icon("chevron-left", { class: "h-4 w-4" })}</button>
                <button type="button" class="btn btn-ghost btn-sm" id="cal-today">Hoje</button>
                <button type="button" class="icon-btn" id="cal-next">${icon("chevron-right", { class: "h-4 w-4" })}</button>
              </div>
            </div>
            <div class="calendar-weekdays">${WEEKDAYS.map((d) => `<div>${d}</div>`).join("")}</div>
            <div class="calendar-days">
              ${days
                .map((day) => {
                  const key = dateKey(day);
                  const dayServices = byDay.get(key) || [];
                  const inMonth = day.getMonth() === state.month.getMonth();
                  const selected = selectedKey === key;
                  const isToday = dateKey(today) === key;
                  return `
                  <button type="button" class="calendar-day ${selected ? "selected" : ""} ${!inMonth ? "out-month" : ""}" data-day="${key}">
                    <span class="calendar-day-num ${isToday ? "is-today" : ""}">${day.getDate()}</span>
                    <div class="calendar-day-dots">
                      ${dayServices
                        .slice(0, 4)
                        .map((s) => `<span class="calendar-dot" style="background:${DOT_COLORS[s.status]}"></span>`)
                        .join("")}
                    </div>
                  </button>
                `;
                })
                .join("")}
            </div>
          </div>
          <div class="chart-card">
            <p class="mb-3 text-sm font-semibold text-primary">${state.selectedDay ? esc(friendlyDay(state.selectedDay.toISOString())) + " · " + esc(formatDate(state.selectedDay.toISOString())) : "Selecione um dia"}</p>
            ${state.selectedDay && selectedServices.length === 0 ? `<p class="text-sm text-muted">Nenhum serviço agendado para este dia.</p>` : ""}
            <div class="space-y-2">${selectedServices.map((s) => serviceRowHtml(s, true)).join("")}</div>
          </div>
        </div>
      `;

      container.querySelector("#cal-prev").addEventListener("click", () => {
        state.month = new Date(state.month.getFullYear(), state.month.getMonth() - 1, 1);
        draw();
      });
      container.querySelector("#cal-next").addEventListener("click", () => {
        state.month = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 1);
        draw();
      });
      container.querySelector("#cal-today").addEventListener("click", () => {
        state.month = new Date();
        draw();
      });
      container.querySelectorAll("[data-day]").forEach((btn) =>
        btn.addEventListener("click", () => {
          const [y, m, d] = btn.dataset.day.split("-").map(Number);
          state.selectedDay = new Date(y, m - 1, d);
          draw();
        })
      );
      wireServiceRows(body);
    }
  }

  function wireServiceRows(scope) {
    scope.querySelectorAll("[data-service-id]").forEach((btn) => btn.addEventListener("click", () => go(`/admin/servicos/${btn.dataset.serviceId}`)));
  }

  draw();
}
