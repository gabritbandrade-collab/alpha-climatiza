import { icon } from "../../lib/icons.js";
import { Services, Auth } from "../../lib/store.js";
import { statusBadge, esc, errorMessage, showToast } from "../../lib/ui.js";
import { formatDateTime } from "../../lib/date.js";
import { go } from "../../router.js";

function infoRow(iconName, label, value) {
  return `
    <div class="info-row">
      <p class="info-row-label">${icon(iconName, { class: "h-4 w-4" })} ${esc(label)}</p>
      <p class="info-row-value">${value}</p>
    </div>
  `;
}

export async function renderEmployeeServiceDetailPage(container, params) {
  let service;
  try {
    service = Services.get(params.id);
  } catch (err) {
    showToast(errorMessage(err), "error");
    go("/app/servicos");
    return;
  }

  const canStart = service.status === "SCHEDULED" || service.status === "PENDING";
  const inProgress = service.status === "IN_PROGRESS";

  container.innerHTML = `
    <div class="p-4 pb-24">
      <button type="button" class="back-link" id="back-btn">← Voltar</button>
      <div style="margin-bottom:1rem">
        <h1 class="text-lg font-bold text-primary" style="margin-bottom:0.25rem">${esc(service.serviceType)}</h1>
        ${statusBadge(service.status)}
      </div>
      <div class="space-y-3">
        ${infoRow("user", "Cliente", esc(service.client.name))}
        ${service.client.phone ? infoRow("phone", "Telefone", `<a href="tel:${esc(service.client.phone)}" class="link">${esc(service.client.phone)}</a>`) : ""}
        ${infoRow("map-pin", "Endereço", esc(service.address))}
        ${service.city ? infoRow("map-pin", "Cidade", `${esc(service.city)}${service.state ? "/" + esc(service.state) : ""}`) : ""}
        ${infoRow("clock", "Data e horário", esc(formatDateTime(service.scheduledAt)))}
        ${service.description ? infoRow("wrench", "O que precisa ser feito", esc(service.description)) : ""}
        ${service.notes ? infoRow("wrench", "Observações da empresa", esc(service.notes)) : ""}
        ${service.materialsPlan ? infoRow("package", "Materiais previstos", esc(service.materialsPlan)) : ""}
      </div>
      <div class="sticky-action-bar">
        ${canStart ? `<button class="btn btn-primary btn-xl btn-full" id="start-btn">${icon("play-circle", { class: "h-5 w-5" })} INICIAR SERVIÇO</button>` : ""}
        ${inProgress ? `<button class="btn btn-primary btn-xl btn-full" id="continue-btn">Continuar execução do serviço</button>` : ""}
        ${service.status === "COMPLETED" || service.status === "CANCELLED" ? `<button class="btn btn-outline btn-xl btn-full" id="view-exec-btn">Ver detalhes da execução</button>` : ""}
      </div>
    </div>
  `;

  container.querySelector("#back-btn").addEventListener("click", () => go("/app/servicos"));
  container.querySelector("#continue-btn")?.addEventListener("click", () => go(`/app/servicos/${service.id}/execucao`));
  container.querySelector("#view-exec-btn")?.addEventListener("click", () => go(`/app/servicos/${service.id}/execucao`));
  container.querySelector("#start-btn")?.addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.innerHTML = `${icon("loader", { class: "h-4 w-4" })} Aguarde...`;
    try {
      Services.start(service.id, Auth.currentUser().id);
      showToast("Serviço iniciado!");
      go(`/app/servicos/${service.id}/execucao`);
    } catch (err) {
      showToast(errorMessage(err), "error");
      btn.disabled = false;
      btn.innerHTML = `${icon("play-circle", { class: "h-5 w-5" })} INICIAR SERVIÇO`;
    }
  });
}
