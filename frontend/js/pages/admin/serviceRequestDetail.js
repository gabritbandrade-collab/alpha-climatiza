import { icon } from "../../lib/icons.js";
import { ServiceRequests, Auth } from "../../lib/store.js";
import { emptyState, esc, errorMessage, showToast, confirmDialog, priorityBadge, requestStatusBadge, fullPageSpinner } from "../../lib/ui.js";
import { formatDateTime, toDateInputValue, toTimeInputValue, combineDateTime } from "../../lib/date.js";
import { go } from "../../router.js";

export async function renderServiceRequestDetailPage(container, params) {
  let selectedEmployee = "";
  let date = "";
  let time = "";
  let assigning = false;
  let conflictWarning = null;

  async function load() {
    let request;
    try {
      request = await ServiceRequests.get(params.id);
    } catch (err) {
      showToast(errorMessage(err), "error");
      go("/admin/solicitacoes");
      return;
    }
    date = toDateInputValue(request.desiredAt);
    time = toTimeInputValue(request.desiredAt);
    draw(request);
  }

  async function draw(request) {
    const suggestions = request.status === "PENDING" ? await ServiceRequests.suggestions(request.id) : null;
    if (suggestions && !selectedEmployee) {
      const recommended = suggestions.find((s) => s.recommended);
      selectedEmployee = recommended ? recommended.id : suggestions[0]?.id || "";
    }

    container.innerHTML = `
      <div class="mx-auto max-w-3xl">
        <button type="button" class="back-link" id="back-btn">← Voltar para solicitações</button>
        <div class="page-header">
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-xl font-bold text-primary">${esc(request.clientName)}</h1>
              ${priorityBadge(request.priority)}
            </div>
            <p class="mt-1 text-sm text-secondary">${esc(request.serviceType)} · ${esc({ PENDING: "Aguardando distribuição", ASSIGNED: "Atribuído", CANCELLED: "Cancelado" }[request.status])}</p>
          </div>
          ${request.status === "PENDING" ? `<button class="btn btn-outline btn-sm" id="cancel-btn">${icon("ban", { class: "h-4 w-4" })} Cancelar solicitação</button>` : ""}
        </div>

        <div class="grid sm:grid-cols-2 gap-4">
          <div class="card p-4 space-y-2" style="font-size:0.875rem">
            ${request.phone ? `<p class="flex items-center gap-1-5 text-secondary">${icon("phone", { class: "h-3.5 w-3.5" })} ${esc(request.phone)}</p>` : ""}
            <p class="flex items-start gap-1-5 text-secondary">${icon("map-pin", { class: "h-3.5 w-3.5" })} ${esc(request.address)}</p>
            <p class="flex items-center gap-1-5 font-medium text-primary">🏙️ ${esc(request.city)}${request.state ? "/" + esc(request.state) : ""}</p>
            <p class="flex items-center gap-1-5 text-secondary">${icon("clock", { class: "h-3.5 w-3.5" })} Desejado: ${esc(formatDateTime(request.desiredAt))}</p>
          </div>
          <div class="card p-4 space-y-2" style="font-size:0.875rem">
            ${request.description ? `<p class="text-secondary"><span class="font-medium text-primary">Descrição: </span>${esc(request.description)}</p>` : ""}
            ${request.materialsPlan ? `<p class="flex items-start gap-1-5 text-secondary">${icon("package", { class: "h-3.5 w-3.5" })} ${esc(request.materialsPlan)}</p>` : ""}
            ${request.notes ? `<p class="text-secondary"><span class="font-medium text-primary">Observações: </span>${esc(request.notes)}</p>` : ""}
          </div>
        </div>

        ${
          request.status === "ASSIGNED" && request.resultingService
            ? `<div class="card mt-4 p-4">
                <p class="mb-2 flex items-center gap-1-5 text-sm font-semibold" style="color:#15803d">${icon("check-circle-2", { class: "h-4 w-4" })} Serviço distribuído</p>
                <p class="text-sm text-secondary">Atribuído para <span class="font-medium text-primary">${esc(request.resultingService.employee.name)}</span>.</p>
                <button class="btn btn-primary btn-sm" id="view-service-btn" style="margin-top:0.75rem">Ver serviço</button>
              </div>`
            : ""
        }

        ${
          request.status === "CANCELLED"
            ? `<div class="card mt-4 p-4"><p class="flex items-center gap-1-5 text-sm font-semibold text-muted">${icon("ban", { class: "h-4 w-4" })} Esta solicitação foi cancelada.</p></div>`
            : ""
        }

        ${request.status === "PENDING" ? pendingSectionHtml(request, suggestions) : ""}
      </div>
    `;

    container.querySelector("#back-btn").addEventListener("click", () => go("/admin/solicitacoes"));
    container.querySelector("#view-service-btn")?.addEventListener("click", () => go(`/admin/servicos/${request.resultingServiceId}`));
    container.querySelector("#cancel-btn")?.addEventListener("click", () => {
      confirmDialog({
        title: "Cancelar solicitação",
        message: "Tem certeza que deseja cancelar este pedido de serviço?",
        confirmLabel: "Cancelar solicitação",
        danger: true,
        onConfirm: async () => {
          await ServiceRequests.cancel(request.id);
          showToast("Solicitação cancelada.");
          load();
        },
      });
    });

    if (request.status === "PENDING") wirePendingSection(request, suggestions);
  }

  function pendingSectionHtml(request, suggestions) {
    return `
      <div class="card mt-4 p-4">
        <p class="mb-1 flex items-center gap-1-5 text-sm font-semibold text-primary">${icon("users", { class: "h-4 w-4" })} Funcionários disponíveis para ${esc(request.city)}</p>
        <p class="mb-4 text-xs text-muted">Apenas funcionários cadastrados para atender esta cidade aparecem na lista.</p>
        <div id="suggestions-list">
          ${
            suggestions.length === 0
              ? emptyState({
                  title: "Nenhum funcionário atende essa cidade",
                  description: `Cadastre a região "${request.city}" em Funcionários para poder distribuir este serviço.`,
                  iconName: "wrench",
                  actionHtml: `<button class="btn btn-outline btn-md" id="go-employees">Ir para Funcionários</button>`,
                })
              : suggestions.map((s) => suggestionCardHtml(s)).join("")
          }
        </div>
        ${
          suggestions.length > 0
            ? `<div class="mt-4 pt-4 border-t">
                <div class="grid sm:grid-cols-2 gap-3">
                  <label class="block"><span class="field-label">Data do atendimento</span><input class="input" type="date" id="assign-date" value="${esc(date)}" /></label>
                  <label class="block"><span class="field-label">Horário do atendimento</span><input class="input" type="time" id="assign-time" value="${esc(time)}" /></label>
                </div>
                <div id="conflict-box"></div>
                <button class="btn btn-primary btn-xl btn-full" id="assign-btn" style="margin-top:1rem">ATRIBUIR SERVIÇO</button>
              </div>`
            : ""
        }
      </div>
    `;
  }

  function suggestionCardHtml(s) {
    return `
      <button type="button" class="flex w-full flex-col gap-2 rounded-xl border p-3 text-left mb-2" data-emp="${esc(s.id)}"
        style="border-color:${selectedEmployee === s.id ? "var(--brand-500)" : "var(--border-color)"};background:${selectedEmployee === s.id ? "var(--brand-50)" : "transparent"}">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <p class="text-sm font-semibold text-primary">${esc(s.name)}</p>
            ${s.cargo ? `<span class="text-xs text-muted">${esc(s.cargo)}</span>` : ""}
          </div>
          ${s.recommended ? `<span class="badge badge-priority-HIGH badge-sm">${icon("star", { class: "h-3 w-3" })} Recomendado</span>` : ""}
          ${s.conflict.hasConflict ? `<span class="badge badge-PENDING badge-sm">${icon("alert-triangle", { class: "h-3 w-3" })} Conflito de horário</span>` : ""}
        </div>
        ${
          s.conflict.hasConflict && s.conflict.conflictingService
            ? `<p style="font-size:0.75rem;color:#dc2626">⚠️ Já possui "${esc(s.conflict.conflictingService.serviceType)}" às ${esc(new Date(s.conflict.conflictingService.scheduledAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }))}.</p>`
            : ""
        }
        <div class="flex flex-wrap gap-1">${s.reasons.map((r) => `<span class="tag-plain">${esc(r)}</span>`).join("")}</div>
      </button>
    `;
  }

  function wirePendingSection(request, suggestions) {
    container.querySelector("#go-employees")?.addEventListener("click", () => go("/admin/funcionarios"));
    container.querySelectorAll("[data-emp]").forEach((btn) =>
      btn.addEventListener("click", () => {
        selectedEmployee = btn.dataset.emp;
        draw(request);
      })
    );
    const dateInput = container.querySelector("#assign-date");
    const timeInput = container.querySelector("#assign-time");
    dateInput?.addEventListener("change", (e) => (date = e.target.value));
    timeInput?.addEventListener("change", (e) => (time = e.target.value));

    async function attemptAssign(force) {
      if (!selectedEmployee) {
        showToast("Selecione um funcionário responsável.", "error");
        return;
      }
      const btn = container.querySelector("#assign-btn");
      btn.disabled = true;
      btn.innerHTML = `${icon("loader", { class: "h-4 w-4" })} Aguarde...`;
      const conflictBox = container.querySelector("#conflict-box");
      conflictBox.innerHTML = "";
      try {
        await ServiceRequests.assign(request.id, { employeeId: selectedEmployee, scheduledAt: combineDateTime(date, time), force }, Auth.currentUser().id);
        showToast("Serviço atribuído e enviado ao funcionário!");
        load();
      } catch (err) {
        if (err.code === "TIME_CONFLICT") {
          conflictBox.innerHTML = `
            <div class="alert-error" style="margin-top:0.75rem">
              <p class="font-medium">${esc(err.message)}</p>
              ${
                err.conflict?.conflictingService
                  ? `<p style="font-size:0.75rem;margin-top:0.25rem">Serviço existente: ${esc(err.conflict.conflictingService.serviceType)} às ${esc(new Date(err.conflict.conflictingService.scheduledAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }))}</p>`
                  : ""
              }
              <div class="flex gap-2" style="margin-top:0.5rem">
                <button type="button" class="btn btn-outline btn-sm" id="pick-other">Escolher outro horário/funcionário</button>
                <button type="button" class="btn btn-danger btn-sm" id="force-assign">Atribuir mesmo assim</button>
              </div>
            </div>`;
          conflictBox.querySelector("#pick-other").addEventListener("click", () => {
            conflictBox.innerHTML = "";
            btn.disabled = false;
            btn.textContent = "ATRIBUIR SERVIÇO";
          });
          conflictBox.querySelector("#force-assign").addEventListener("click", () => attemptAssign(true));
        } else {
          showToast(errorMessage(err), "error");
        }
        btn.disabled = false;
        btn.textContent = "ATRIBUIR SERVIÇO";
      }
    }
    container.querySelector("#assign-btn")?.addEventListener("click", () => attemptAssign(false));
  }

  load();
}
