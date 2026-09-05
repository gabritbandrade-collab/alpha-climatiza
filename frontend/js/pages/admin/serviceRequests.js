import { icon } from "../../lib/icons.js";
import { ServiceRequests } from "../../lib/store.js";
import { pageHeader, emptyState, esc, errorMessage, showToast, openModal, priorityBadge, requestStatusBadge, PRIORITY_LABELS_PT } from "../../lib/ui.js";
import { formatDateTime, combineDateTime } from "../../lib/date.js";
import { go } from "../../router.js";

const SERVICE_TYPES = [
  "Instalação de Ar Condicionado Split",
  "Instalação de Climatizador",
  "Manutenção Preventiva",
  "Manutenção Corretiva",
  "Limpeza de Filtros",
  "Troca de Gás Refrigerante",
  "Outro",
];

export async function renderServiceRequestsPage(container, params, query) {
  const filters = { status: query.status || "PENDING", city: "", priority: "", search: "" };

  function draw() {
    const requests = ServiceRequests.list({
      status: filters.status || undefined,
      city: filters.city || undefined,
      priority: filters.priority || undefined,
      search: filters.search || undefined,
    });

    container.innerHTML = `
      ${pageHeader({
        title: "Solicitações de Serviços",
        description: "Cadastre pedidos de clientes e distribua para o funcionário responsável pela região.",
        actionsHtml: `<button class="btn btn-primary btn-md" id="new-btn">${icon("plus", { class: "h-4 w-4" })} Nova Solicitação</button>`,
      })}

      <div class="filters-bar">
        <div class="input-icon-wrap filter-search">
          <span class="input-icon">${icon("search", { class: "h-4 w-4" })}</span>
          <input class="input" id="f-search" placeholder="Buscar cliente, cidade..." value="${esc(filters.search)}" />
        </div>
        <select class="select filter-select" id="f-status">
          <option value="">Todos os status</option>
          <option value="PENDING" ${filters.status === "PENDING" ? "selected" : ""}>Aguardando distribuição</option>
          <option value="ASSIGNED" ${filters.status === "ASSIGNED" ? "selected" : ""}>Atribuído</option>
          <option value="CANCELLED" ${filters.status === "CANCELLED" ? "selected" : ""}>Cancelado</option>
        </select>
        <select class="select filter-select" id="f-priority">
          <option value="">Todas as prioridades</option>
          ${Object.entries(PRIORITY_LABELS_PT).map(([k, v]) => `<option value="${k}" ${filters.priority === k ? "selected" : ""}>${esc(v)}</option>`).join("")}
        </select>
        <input class="input" style="width:12rem" id="f-city" placeholder="Filtrar por cidade" value="${esc(filters.city)}" />
      </div>

      <div id="requests-grid"></div>
    `;

    container.querySelector("#new-btn").addEventListener("click", openCreateModal);
    container.querySelector("#f-search").addEventListener("input", (e) => {
      filters.search = e.target.value;
      draw();
    });
    container.querySelector("#f-status").addEventListener("change", (e) => {
      filters.status = e.target.value;
      draw();
    });
    container.querySelector("#f-priority").addEventListener("change", (e) => {
      filters.priority = e.target.value;
      draw();
    });
    container.querySelector("#f-city").addEventListener("input", (e) => {
      filters.city = e.target.value;
      draw();
    });

    const grid = container.querySelector("#requests-grid");
    if (requests.length === 0) {
      grid.innerHTML = emptyState({
        title: "Nenhuma solicitação encontrada",
        description: "Ajuste os filtros ou cadastre um novo pedido de cliente.",
        actionHtml: `<button class="btn btn-primary btn-md" id="empty-new-btn">Nova Solicitação</button>`,
      });
      grid.querySelector("#empty-new-btn")?.addEventListener("click", openCreateModal);
      return;
    }

    grid.innerHTML = `<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      ${requests
        .map(
          (r) => `
        <div class="card card-clickable p-4" data-open="${esc(r.id)}">
          <div class="flex items-start justify-between gap-2">
            <p class="truncate text-sm font-semibold text-primary">${esc(r.clientName)}</p>
            ${priorityBadge(r.priority)}
          </div>
          <p class="mt-1 text-xs text-secondary">${esc(r.serviceType)}</p>
          <div class="mt-3 space-y-1-5">
            <p class="flex items-center gap-1-5 text-secondary" style="font-size:0.75rem">${icon("map-pin", { class: "h-3.5 w-3.5" })} ${esc(r.city)}${r.state ? "/" + esc(r.state) : ""}</p>
            <p class="flex items-center gap-1-5 text-secondary" style="font-size:0.75rem">${icon("clock", { class: "h-3.5 w-3.5" })} ${esc(formatDateTime(r.desiredAt))}</p>
          </div>
          <div class="mt-3 pt-3 border-t flex items-center justify-between">
            ${requestStatusBadge(r.status)}
            ${r.resultingService ? `<span class="text-xs text-muted">${esc(r.resultingService.employee.name)}</span>` : ""}
          </div>
        </div>
      `
        )
        .join("")}
    </div>`;

    grid.querySelectorAll("[data-open]").forEach((el) => el.addEventListener("click", () => go(`/admin/solicitacoes/${el.dataset.open}`)));
  }

  function openCreateModal() {
    openModal({
      title: "Nova Solicitação de Serviço",
      size: "lg",
      bodyHtml: `
        <form id="request-form" class="space-y-4">
          <label class="block"><span class="field-label">Nome do cliente/empresa <span class="field-required">*</span></span><input class="input" name="clientName" required /></label>
          <div class="form-grid-2">
            <label class="block"><span class="field-label">Telefone</span><input class="input" name="phone" /></label>
            <label class="block"><span class="field-label">Prioridade</span>
              <select class="select" name="priority">${Object.entries(PRIORITY_LABELS_PT).map(([k, v]) => `<option value="${k}" ${k === "NORMAL" ? "selected" : ""}>${esc(v)}</option>`).join("")}</select>
            </label>
          </div>
          <label class="block"><span class="field-label">Endereço <span class="field-required">*</span></span><input class="input" name="address" required /></label>
          <div class="form-grid-citystate">
            <label class="block"><span class="field-label">Cidade <span class="field-required">*</span></span><input class="input" name="city" required /></label>
            <label class="block"><span class="field-label">Estado (UF)</span><input class="input" name="state" maxlength="2" /></label>
          </div>
          <div class="form-grid-2">
            <label class="block"><span class="field-label">Tipo de serviço</span>
              <select class="select" name="serviceType" id="req-type">${SERVICE_TYPES.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join("")}</select>
            </label>
            <label class="block" id="req-custom-wrap" style="display:none"><span class="field-label">Especifique <span class="field-required">*</span></span><input class="input" name="customType" /></label>
          </div>
          <div class="form-grid-2">
            <label class="block"><span class="field-label">Data desejada <span class="field-required">*</span></span><input class="input" type="date" name="date" required /></label>
            <label class="block"><span class="field-label">Horário desejado <span class="field-required">*</span></span><input class="input" type="time" name="time" required value="09:00" /></label>
          </div>
          <label class="block"><span class="field-label">Descrição do serviço</span><textarea class="textarea" name="description"></textarea></label>
          <label class="block"><span class="field-label">Materiais necessários</span><textarea class="textarea" name="materialsPlan"></textarea></label>
          <label class="block"><span class="field-label">Observações</span><textarea class="textarea" name="notes"></textarea></label>
          <div id="request-form-error"></div>
        </form>
      `,
      footerHtml: `<button type="button" class="btn btn-outline btn-md" data-act="cancel">Cancelar</button><button type="submit" form="request-form" class="btn btn-primary btn-md">Cadastrar pedido</button>`,
      onMount: (api) => {
        api.el.querySelector('[data-act="cancel"]').addEventListener("click", api.close);
        api.el.querySelector("#req-type").addEventListener("change", (e) => {
          api.el.querySelector("#req-custom-wrap").style.display = e.target.value === "Outro" ? "" : "none";
        });
        api.el.querySelector("#request-form").addEventListener("submit", (e) => {
          e.preventDefault();
          const fd = new FormData(e.target);
          const data = Object.fromEntries(fd.entries());
          const errEl = api.el.querySelector("#request-form-error");
          errEl.innerHTML = "";
          if (!data.clientName || !data.address || !data.city || !data.date || !data.time) {
            errEl.innerHTML = `<p class="alert-error">Cliente, endereço, cidade e data/horário desejados são obrigatórios.</p>`;
            return;
          }
          try {
            const created = ServiceRequests.create({
              clientName: data.clientName,
              phone: data.phone,
              address: data.address,
              city: data.city,
              state: data.state,
              serviceType: data.serviceType === "Outro" ? data.customType : data.serviceType,
              description: data.description,
              desiredAt: combineDateTime(data.date, data.time),
              notes: data.notes,
              materialsPlan: data.materialsPlan,
              priority: data.priority,
            });
            showToast("Solicitação cadastrada. Distribua para um funcionário da região.");
            api.close();
            go(`/admin/solicitacoes/${created.id}`);
          } catch (err) {
            errEl.innerHTML = `<p class="alert-error">${esc(errorMessage(err))}</p>`;
          }
        });
      },
    });
  }

  draw();
}
