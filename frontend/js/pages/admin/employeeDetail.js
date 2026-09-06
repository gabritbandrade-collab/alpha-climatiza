import { Employees } from "../../lib/store.js";
import { pageHeader, emptyState, statusBadge, esc, errorMessage, showToast } from "../../lib/ui.js";
import { cityTagInputHtml, mountCityTagInput } from "../../components/cityTagInput.js";
import { formatDateTime } from "../../lib/date.js";
import { go } from "../../router.js";

export async function renderEmployeeDetailPage(container, params) {
  let employee;
  try {
    employee = await Employees.get(params.id);
  } catch (err) {
    showToast(errorMessage(err), "error");
    go("/admin/funcionarios");
    return;
  }

  container.innerHTML = `
    <div class="mx-auto max-w-3xl">
      <button type="button" class="back-link" id="back-to-employees">← Voltar para funcionários</button>
      ${pageHeader({ title: employee.name, description: "Dados cadastrais e serviços atribuídos." })}
      <div class="card p-5">
        <form id="employee-form" class="space-y-4">
          <label class="block"><span class="field-label">Nome completo <span class="field-required">*</span></span><input class="input" name="name" required value="${esc(employee.name)}" /></label>
          <div class="form-grid-2">
            <label class="block"><span class="field-label">E-mail <span class="field-required">*</span></span><input class="input" type="email" name="email" required value="${esc(employee.email)}" /></label>
            <label class="block"><span class="field-label">Telefone</span><input class="input" name="phone" value="${esc(employee.phone || "")}" /></label>
          </div>
          <div class="form-grid-2">
            <label class="block"><span class="field-label">Cargo</span><input class="input" name="cargo" value="${esc(employee.cargo || "")}" /></label>
            <label class="block"><span class="field-label">Status</span>
              <select class="select" name="status">
                <option value="ACTIVE" ${employee.status === "ACTIVE" ? "selected" : ""}>Ativo</option>
                <option value="INACTIVE" ${employee.status === "INACTIVE" ? "selected" : ""}>Inativo</option>
              </select>
            </label>
          </div>
          <label class="block">
            <span class="field-label">Redefinir senha</span>
            <input class="input" type="password" name="password" />
            <span class="field-hint">Deixe em branco para manter a senha atual.</span>
          </label>
          ${cityTagInputHtml()}
          <div id="form-error"></div>
          <div class="flex justify-end"><button type="submit" class="btn btn-primary btn-md">Salvar alterações</button></div>
        </form>
      </div>

      <div class="mt-6">
        <h2 class="text-base font-semibold text-primary mb-3">Serviços atribuídos</h2>
        <div id="services-list"></div>
      </div>
    </div>
  `;

  container.querySelector("#back-to-employees").addEventListener("click", () => go("/admin/funcionarios"));

  const cityWidget = mountCityTagInput(container, employee.serviceRegions || []);

  const listEl = container.querySelector("#services-list");
  if (!employee.servicesAsEmployee || employee.servicesAsEmployee.length === 0) {
    listEl.innerHTML = emptyState({ title: "Nenhum serviço atribuído a este funcionário ainda." });
  } else {
    listEl.innerHTML = `<div class="space-y-2">
      ${employee.servicesAsEmployee
        .map(
          (s) => `
        <button type="button" class="flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left" style="border-color:var(--border-color);background:var(--surface-elevated)" data-svc="${esc(s.id)}">
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold text-primary">${esc(s.serviceType)}</p>
            <p class="text-xs text-secondary">${esc(formatDateTime(s.scheduledAt))} · ${esc(s.client?.name || "")}</p>
          </div>
          ${statusBadge(s.status, "sm")}
        </button>
      `
        )
        .join("")}
    </div>`;
    listEl.querySelectorAll("[data-svc]").forEach((b) => b.addEventListener("click", () => go(`/admin/servicos/${b.dataset.svc}`)));
  }

  container.querySelector("#employee-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = container.querySelector("#form-error");
    errEl.innerHTML = "";
    const data = Object.fromEntries(new FormData(e.target).entries());
    if (!data.name || !data.email) {
      errEl.innerHTML = `<p class="alert-error">Nome e e-mail são obrigatórios.</p>`;
      return;
    }
    if (!data.password) delete data.password;
    try {
      await Employees.update(params.id, { ...data, cities: cityWidget.getValue() });
      showToast("Dados do funcionário atualizados.");
    } catch (err) {
      errEl.innerHTML = `<p class="alert-error">${esc(errorMessage(err))}</p>`;
    }
  });
}
