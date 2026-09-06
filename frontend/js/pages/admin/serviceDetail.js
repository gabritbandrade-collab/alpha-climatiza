import { icon } from "../../lib/icons.js";
import { Services, Employees, Auth, getEmployeeSuggestions } from "../../lib/store.js";
import { backLink, fullPageSpinner, statusBadge, priorityBadge, emptyState, esc, errorMessage, showToast, openModal, confirmDialog } from "../../lib/ui.js";
import { formatDateTime } from "../../lib/date.js";
import { go } from "../../router.js";

const ACTION_LABELS = {
  CRIADO: "Serviço criado",
  STATUS_ALTERADO: "Status alterado",
  DATA_ALTERADA: "Data/horário alterado",
  SERVICO_INICIADO: "Serviço iniciado",
  SERVICO_CONCLUIDO: "Serviço concluído",
  TRANSFERIDO: "Transferido de funcionário",
  DISTRIBUIDO_POR_CIDADE: "Distribuído automaticamente pela região",
};

export async function renderAdminServiceDetailPage(container, params) {
  async function load() {
    let service;
    try {
      service = await Services.get(params.id);
    } catch (err) {
      showToast(errorMessage(err), "error");
      go("/admin/agenda");
      return;
    }
    draw(service);
  }

  function draw(service) {
    const beforePhotos = service.photos.filter((p) => p.type === "BEFORE");
    const afterPhotos = service.photos.filter((p) => p.type === "AFTER");
    const canTransfer = service.status !== "COMPLETED" && service.status !== "CANCELLED";

    container.innerHTML = `
      <div class="mx-auto max-w-3xl">
        ${backLink()}
        <div class="page-header">
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-xl font-bold text-primary">${esc(service.serviceType)}</h1>
              ${statusBadge(service.status)}
            </div>
            <p class="mt-1 text-sm text-secondary">${esc(formatDateTime(service.scheduledAt))}</p>
          </div>
          <div class="page-header-actions">
            ${canTransfer ? `<button class="btn btn-outline btn-sm" id="transfer-btn">${icon("repeat", { class: "h-4 w-4" })} Transferir serviço</button>` : ""}
            <button class="btn btn-outline btn-sm" id="edit-btn">${icon("pencil", { class: "h-4 w-4" })} Editar</button>
            <button class="btn btn-danger btn-sm" id="delete-btn">${icon("trash-2", { class: "h-4 w-4" })} Excluir</button>
          </div>
        </div>

        <div class="grid sm:grid-cols-2 gap-4">
          <div class="card p-4">
            <p class="mb-2 flex items-center gap-1-5 text-xs font-semibold uppercase text-muted">${icon("user", { class: "h-3.5 w-3.5" })} Cliente</p>
            ${
              service.clientId
                ? `<button class="link text-sm font-semibold" data-nav="/admin/clientes/${esc(service.clientId)}">${esc(service.client.name)}</button>`
                : `<p class="text-sm font-semibold text-primary">${esc(service.client.name)}</p>`
            }
            ${service.client.phone ? `<p class="mt-1 flex items-center gap-1-5 text-sm text-secondary">${icon("phone", { class: "h-3.5 w-3.5" })} ${esc(service.client.phone)}</p>` : ""}
            <p class="mt-1 flex items-start gap-1-5 text-sm text-secondary">${icon("map-pin", { class: "h-3.5 w-3.5" })} ${esc(service.address)}</p>
            ${service.city ? `<p class="mt-1 text-sm text-secondary">🏙️ ${esc(service.city)}${service.state ? "/" + esc(service.state) : ""}</p>` : ""}
          </div>
          <div class="card p-4">
            <div class="mb-2 flex items-center justify-between">
              <p class="flex items-center gap-1-5 text-xs font-semibold uppercase text-muted">${icon("wrench", { class: "h-3.5 w-3.5" })} Funcionário responsável</p>
              ${priorityBadge(service.priority)}
            </div>
            <button class="link text-sm font-semibold" data-nav="/admin/funcionarios/${esc(service.employeeId)}">${esc(service.employee.name)}</button>
            ${service.employee.cargo ? `<p class="mt-1 text-sm text-secondary">${esc(service.employee.cargo)}</p>` : ""}
            ${service.employee.phone ? `<p class="mt-1 flex items-center gap-1-5 text-sm text-secondary">${icon("phone", { class: "h-3.5 w-3.5" })} ${esc(service.employee.phone)}</p>` : ""}
          </div>
        </div>

        <div class="card mt-4 p-4">
          <div class="grid sm:grid-cols-3 gap-3" style="font-size:0.875rem">
            <div class="flex items-center gap-2 text-secondary">${icon("clock", { class: "h-4 w-4" })} Agendado: ${esc(formatDateTime(service.scheduledAt))}</div>
            <div class="flex items-center gap-2 text-secondary">${icon("clock", { class: "h-4 w-4" })} Início: ${service.startedAt ? esc(formatDateTime(service.startedAt)) : "—"}</div>
            <div class="flex items-center gap-2 text-secondary">${icon("clock", { class: "h-4 w-4" })} Conclusão: ${service.completedAt ? esc(formatDateTime(service.completedAt)) : "—"}</div>
          </div>
        </div>

        ${service.description ? infoCard("O que precisa ser feito", service.description) : ""}
        ${service.notes ? infoCard("Observações da empresa", service.notes) : ""}
        ${service.employeeObservations ? infoCard("Observações do funcionário", service.employeeObservations) : ""}
        ${service.problems ? infoCard("Problemas encontrados", service.problems, "warn-red") : ""}
        ${service.pendingNotes ? infoCard("Pendência registrada", service.pendingNotes, "warn-amber") : ""}

        ${
          service.materialsPlan || service.materials.length > 0
            ? `<div class="card mt-4 p-4">
                <p class="mb-2 flex items-center gap-1-5 text-xs font-semibold uppercase text-muted">${icon("package", { class: "h-3.5 w-3.5" })} Materiais</p>
                ${service.materialsPlan ? `<p class="mb-2 text-sm text-secondary"><span class="font-medium text-primary">Previsto:</span> ${esc(service.materialsPlan)}</p>` : ""}
                ${
                  service.materials.length > 0
                    ? `<ul class="border rounded-lg" style="border-color:var(--border-color)">
                        ${service.materials
                          .map(
                            (m) => `<li class="flex items-center justify-between px-3 py-2 border-b text-sm" style="border-color:var(--border-color)">
                          <div><p class="font-medium text-primary">${esc(m.name)}</p>${m.notes ? `<p class="text-xs text-muted">${esc(m.notes)}</p>` : ""}</div>
                          <span class="text-secondary">${esc(m.quantity)}</span>
                        </li>`
                          )
                          .join("")}
                      </ul>`
                    : ""
                }
              </div>`
            : ""
        }

        <div class="card mt-4 p-4">
          <p class="mb-3 flex items-center gap-1-5 text-xs font-semibold uppercase text-muted">${icon("image", { class: "h-3.5 w-3.5" })} Fotos do serviço</p>
          <div class="grid sm:grid-cols-2 gap-4">
            <div>
              <p class="mb-2 text-xs font-medium text-secondary">📸 Antes (${beforePhotos.length})</p>
              ${beforePhotos.length === 0 ? `<p class="text-xs text-muted">Nenhuma foto registrada.</p>` : `<div class="photo-grid">${beforePhotos.map((p) => `<a href="${esc(p.url)}" target="_blank" rel="noreferrer"><img src="${esc(p.url)}" class="photo-item" style="width:100%;height:100%;object-fit:cover;border-radius:0.5rem" /></a>`).join("")}</div>`}
            </div>
            <div>
              <p class="mb-2 text-xs font-medium text-secondary">📸 Depois (${afterPhotos.length})</p>
              ${afterPhotos.length === 0 ? `<p class="text-xs text-muted">Nenhuma foto registrada.</p>` : `<div class="photo-grid">${afterPhotos.map((p) => `<a href="${esc(p.url)}" target="_blank" rel="noreferrer"><img src="${esc(p.url)}" class="photo-item" style="width:100%;height:100%;object-fit:cover;border-radius:0.5rem" /></a>`).join("")}</div>`}
            </div>
          </div>
        </div>

        <div class="card mt-4 p-4">
          <p class="mb-3 flex items-center gap-1-5 text-xs font-semibold uppercase text-muted">${icon("history", { class: "h-3.5 w-3.5" })} Histórico de alterações</p>
          ${
            service.history.length === 0
              ? emptyState({ title: "Sem histórico" })
              : `<ul class="space-y-2">
                  ${service.history
                    .map(
                      (h) => `<li class="flex items-start justify-between gap-2" style="font-size:0.75rem">
                    <span class="text-secondary"><span class="font-medium text-primary">${esc(ACTION_LABELS[h.action] || h.action)}</span>${h.user ? " por " + esc(h.user.name) : ""}${h.fromValue && h.toValue ? ` (${esc(h.fromValue)} → ${esc(h.toValue)})` : ""}</span>
                    <span class="shrink-0 text-muted">${esc(formatDateTime(h.createdAt))}</span>
                  </li>`
                    )
                    .join("")}
                </ul>`
          }
        </div>
      </div>
    `;

    container.querySelectorAll("[data-nav]").forEach((el) => el.addEventListener("click", () => go(el.dataset.nav)));
    container.querySelector("#edit-btn").addEventListener("click", () => go(`/admin/servicos/${service.id}/editar`));
    container.querySelector("#delete-btn").addEventListener("click", () => {
      confirmDialog({
        title: "Excluir serviço",
        message: "Esta ação é permanente e removerá todos os dados, fotos e histórico deste serviço. Deseja continuar?",
        confirmLabel: "Excluir",
        danger: true,
        onConfirm: async () => {
          await Services.delete(service.id);
          showToast("Serviço excluído.");
          go("/admin/agenda");
        },
      });
    });
    container.querySelector("#transfer-btn")?.addEventListener("click", () => openTransferModal(service, load));
  }

  function infoCard(title, text, extraClass = "") {
    const border = extraClass === "warn-red" ? 'style="border-color:#fecaca"' : extraClass === "warn-amber" ? 'style="border-color:#fde68a"' : "";
    const labelColor = extraClass === "warn-red" ? "color:#dc2626" : extraClass === "warn-amber" ? "color:#d97706" : "";
    return `<div class="card mt-4 p-4" ${border}>
      <p class="mb-1 text-xs font-semibold uppercase text-muted" style="${labelColor}">${esc(title)}</p>
      <p class="text-sm text-primary" style="white-space:pre-wrap">${esc(text)}</p>
    </div>`;
  }

  load();
}

function openTransferModal(service, onDone) {
  let options = null;
  let selected = "";

  const modal = openModal({
    title: "Transferir serviço",
    size: "md",
    bodyHtml: `
      ${service.city ? `<p class="text-xs text-muted mb-3">Mostrando apenas funcionários que atendem ${esc(service.city)}.</p>` : ""}
      <div id="transfer-list">${fullPageSpinner()}</div>
      <div id="transfer-conflict"></div>
      <div class="flex justify-end gap-2 mt-4">
        <button type="button" class="btn btn-outline btn-md" data-act="cancel">Cancelar</button>
        <button type="button" class="btn btn-primary btn-md" data-act="confirm" disabled>Confirmar transferência</button>
      </div>
    `,
    onMount: async (api) => {
      const listEl = api.el.querySelector("#transfer-list");
      const conflictEl = api.el.querySelector("#transfer-conflict");
      const confirmBtn = api.el.querySelector('[data-act="confirm"]');
      api.el.querySelector('[data-act="cancel"]').addEventListener("click", api.close);

      if (service.city) {
        options = (await getEmployeeSuggestions({ city: service.city, targetAt: new Date(service.scheduledAt), excludeServiceId: service.id })).filter((o) => o.id !== service.employeeId);
      } else {
        options = (await Employees.list())
          .filter((e) => e.status === "ACTIVE" && e.id !== service.employeeId)
          .map((e) => ({ id: e.id, name: e.name, cargo: e.cargo, conflict: { hasConflict: false } }));
      }

      function renderList() {
        listEl.innerHTML = options.length
          ? options
              .map(
                (o) => `
              <button type="button" class="flex w-full items-center justify-between gap-2 rounded-xl border p-3 text-left mb-2" style="border-color:${selected === o.id ? "var(--brand-500)" : "var(--border-color)"};background:${selected === o.id ? "var(--brand-50)" : "transparent"}" data-opt="${esc(o.id)}">
                <div><p class="text-sm font-medium text-primary">${esc(o.name)}</p>${o.cargo ? `<p class="text-xs text-muted">${esc(o.cargo)}</p>` : ""}</div>
                ${o.conflict.hasConflict ? `<span class="badge badge-PENDING badge-sm">${icon("alert-triangle", { class: "h-3 w-3" })} Conflito</span>` : ""}
              </button>`
              )
              .join("")
          : emptyState({ title: "Nenhum outro funcionário disponível", description: "Cadastre mais funcionários para esta cidade em Funcionários." });

        listEl.querySelectorAll("[data-opt]").forEach((btn) =>
          btn.addEventListener("click", () => {
            selected = btn.dataset.opt;
            confirmBtn.disabled = false;
            renderList();
          })
        );
      }
      renderList();

      async function attemptTransfer(force) {
        if (!selected) return;
        conflictEl.innerHTML = "";
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = `${icon("loader", { class: "h-4 w-4" })} Aguarde...`;
        try {
          await Services.transfer(service.id, { employeeId: selected, force }, Auth.currentUser().id);
          showToast("Serviço transferido com sucesso.");
          api.close();
          onDone();
        } catch (err) {
          if (err.code === "TIME_CONFLICT") {
            conflictEl.innerHTML = `
              <div class="alert-error" style="margin-top:0.75rem">
                <p class="font-medium">${esc(err.message)}</p>
                <button type="button" class="btn btn-danger btn-sm" style="margin-top:0.5rem" id="force-transfer">Transferir mesmo assim</button>
              </div>`;
            conflictEl.querySelector("#force-transfer").addEventListener("click", () => attemptTransfer(true));
          } else {
            showToast(errorMessage(err), "error");
          }
          confirmBtn.disabled = false;
          confirmBtn.textContent = "Confirmar transferência";
        }
      }
      confirmBtn.addEventListener("click", () => attemptTransfer(false));
    },
  });
  return modal;
}
