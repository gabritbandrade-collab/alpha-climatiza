import { Clients } from "../../lib/store.js";
import { backLink, pageHeader, emptyState, statusBadge, esc, errorMessage, showToast } from "../../lib/ui.js";
import { formatDateTime } from "../../lib/date.js";
import { go } from "../../router.js";

export async function renderClientDetailPage(container, params) {
  let client;
  try {
    client = Clients.get(params.id);
  } catch (err) {
    showToast(errorMessage(err), "error");
    go("/admin/clientes");
    return;
  }

  container.innerHTML = `
    <div class="mx-auto max-w-3xl">
      <button type="button" class="back-link" id="back-to-clients">← Voltar para clientes</button>
      ${pageHeader({ title: client.name, description: "Dados cadastrais e histórico de serviços." })}
      <div class="card p-5">
        <form id="client-form" class="space-y-4">
          <label class="block"><span class="field-label">Nome do cliente ou empresa <span class="field-required">*</span></span><input class="input" name="name" required value="${esc(client.name)}" /></label>
          <div class="form-grid-2">
            <label class="block"><span class="field-label">CPF/CNPJ</span><input class="input" name="document" value="${esc(client.document || "")}" /></label>
            <label class="block"><span class="field-label">Telefone</span><input class="input" name="phone" value="${esc(client.phone || "")}" /></label>
          </div>
          <label class="block"><span class="field-label">E-mail</span><input class="input" type="email" name="email" value="${esc(client.email || "")}" /></label>
          <div class="form-grid-address">
            <label class="block"><span class="field-label">Endereço</span><input class="input" name="address" value="${esc(client.address || "")}" /></label>
            <label class="block"><span class="field-label">Número</span><input class="input" name="number" value="${esc(client.number || "")}" /></label>
            <label class="block"><span class="field-label">Complemento</span><input class="input" name="complement" value="${esc(client.complement || "")}" /></label>
          </div>
          <div class="form-grid-citystate">
            <label class="block"><span class="field-label">Cidade</span><input class="input" name="city" value="${esc(client.city || "")}" /></label>
            <label class="block"><span class="field-label">Estado (UF)</span><input class="input" name="state" maxlength="2" value="${esc(client.state || "")}" /></label>
          </div>
          <label class="block"><span class="field-label">Observações</span><textarea class="textarea" name="notes">${esc(client.notes || "")}</textarea></label>
          <div id="form-error"></div>
          <div class="flex justify-end"><button type="submit" class="btn btn-primary btn-md">Salvar alterações</button></div>
        </form>
      </div>

      <div class="mt-6">
        <h2 class="text-base font-semibold text-primary mb-3">Histórico de serviços</h2>
        <div id="services-list"></div>
      </div>
    </div>
  `;

  container.querySelector("#back-to-clients").addEventListener("click", () => go("/admin/clientes"));

  const listEl = container.querySelector("#services-list");
  if (!client.services || client.services.length === 0) {
    listEl.innerHTML = emptyState({ title: "Nenhum serviço realizado para este cliente ainda." });
  } else {
    listEl.innerHTML = `<div class="space-y-2">
      ${client.services
        .map(
          (s) => `
        <button type="button" class="flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left" style="border-color:var(--border-color);background:var(--surface-elevated)" data-svc="${esc(s.id)}">
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold text-primary">${esc(s.serviceType)}</p>
            <p class="text-xs text-secondary">${esc(formatDateTime(s.scheduledAt))} · ${esc(s.employee?.name || "")}</p>
          </div>
          ${statusBadge(s.status, "sm")}
        </button>
      `
        )
        .join("")}
    </div>`;
    listEl.querySelectorAll("[data-svc]").forEach((b) => b.addEventListener("click", () => go(`/admin/servicos/${b.dataset.svc}`)));
  }

  container.querySelector("#client-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const errEl = container.querySelector("#form-error");
    errEl.innerHTML = "";
    const data = Object.fromEntries(new FormData(e.target).entries());
    if (!data.name) {
      errEl.innerHTML = `<p class="alert-error">O nome é obrigatório.</p>`;
      return;
    }
    try {
      Clients.update(params.id, data);
      showToast("Dados do cliente atualizados.");
    } catch (err) {
      errEl.innerHTML = `<p class="alert-error">${esc(errorMessage(err))}</p>`;
    }
  });
}
