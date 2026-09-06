import { icon } from "../../lib/icons.js";
import { Employees } from "../../lib/store.js";
import { pageHeader, emptyState, esc, errorMessage, showToast, openModal, confirmDialog, avatarInitial } from "../../lib/ui.js";
import { cityTagInputHtml, mountCityTagInput } from "../../components/cityTagInput.js";
import { go } from "../../router.js";

const emptyForm = { name: "", email: "", phone: "", cargo: "", password: "", status: "ACTIVE" };

export async function renderEmployeesPage(container) {
  let search = "";

  async function draw() {
    const employees = await Employees.list({ search: search || undefined });
    container.innerHTML = `
      ${pageHeader({ title: "Funcionários", description: "Gerencie a equipe técnica responsável pelos serviços externos.", actionsHtml: `<button class="btn btn-primary btn-md" id="new-btn">${icon("plus", { class: "h-4 w-4" })} Novo Funcionário</button>` })}
      <div class="input-icon-wrap mb-4" style="max-width:24rem">
        <span class="input-icon">${icon("search", { class: "h-4 w-4" })}</span>
        <input class="input" id="search-input" placeholder="Buscar por nome, e-mail, cargo..." value="${esc(search)}" />
      </div>
      <div id="employees-grid"></div>
    `;
    container.querySelector("#new-btn").addEventListener("click", openCreateModal);
    container.querySelector("#search-input").addEventListener("input", (e) => {
      search = e.target.value;
      draw();
    });

    const grid = container.querySelector("#employees-grid");
    if (employees.length === 0) {
      grid.innerHTML = emptyState({ title: "Nenhum funcionário cadastrado", actionHtml: `<button class="btn btn-primary btn-md" id="empty-new-btn">Novo Funcionário</button>` });
      grid.querySelector("#empty-new-btn")?.addEventListener("click", openCreateModal);
      return;
    }
    grid.innerHTML = `<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      ${employees
        .map(
          (emp) => `
        <div class="card p-4">
          <div class="flex items-start justify-between gap-2">
            <button class="flex min-w-0 items-center gap-3 text-left" data-nav="/admin/funcionarios/${esc(emp.id)}">
              ${avatarInitial(emp.name, emp.photoUrl)}
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-primary">${esc(emp.name)}</p>
                <p class="truncate text-xs text-muted">${esc(emp.cargo || "Sem cargo definido")}</p>
              </div>
            </button>
            <button class="icon-btn" data-del="${esc(emp.id)}" data-name="${esc(emp.name)}">${icon("trash-2", { class: "h-4 w-4" })}</button>
          </div>
          <div class="mt-3 space-y-1-5">
            <p class="flex items-center gap-1-5 text-secondary truncate" style="font-size:0.75rem">${icon("mail", { class: "h-3.5 w-3.5" })} ${esc(emp.email)}</p>
            ${emp.phone ? `<p class="flex items-center gap-1-5 text-secondary" style="font-size:0.75rem">${icon("phone", { class: "h-3.5 w-3.5" })} ${esc(emp.phone)}</p>` : ""}
          </div>
          ${
            emp.serviceRegions && emp.serviceRegions.length > 0
              ? `<div class="flex flex-wrap gap-1 mt-2">${emp.serviceRegions.map((r) => `<span class="tag-plain flex items-center gap-1">${icon("map-pin", { class: "h-2.5 w-2.5" })} ${esc(r.city)}</span>`).join("")}</div>`
              : ""
          }
          <div class="mt-3 pt-3 border-t flex items-center justify-between">
            <span class="${emp.status === "ACTIVE" ? "badge-active" : "badge-inactive"}" style="border-radius:9999px;padding:0.125rem 0.5rem;font-size:0.6875rem;font-weight:500">${emp.status === "ACTIVE" ? "Ativo" : "Inativo"}</span>
            <span class="text-xs text-muted">${emp._count.servicesAsEmployee} serviço(s)</span>
          </div>
        </div>
      `
        )
        .join("")}
    </div>`;

    grid.querySelectorAll("[data-nav]").forEach((el) => el.addEventListener("click", () => go(el.dataset.nav)));
    grid.querySelectorAll("[data-del]").forEach((btn) =>
      btn.addEventListener("click", () => {
        confirmDialog({
          title: "Excluir funcionário",
          message: `Tem certeza que deseja excluir "${btn.dataset.name}"? Esta ação não pode ser desfeita.`,
          confirmLabel: "Excluir",
          danger: true,
          onConfirm: async () => {
            await Employees.delete(btn.dataset.del);
            showToast("Funcionário excluído.");
            draw();
          },
        });
      })
    );
  }

  function openCreateModal() {
    const f = { ...emptyForm };
    openModal({
      title: "Novo Funcionário",
      size: "lg",
      bodyHtml: `
        <form id="employee-form" class="space-y-4">
          <label class="block"><span class="field-label">Nome completo <span class="field-required">*</span></span><input class="input" name="name" required /></label>
          <div class="form-grid-2">
            <label class="block"><span class="field-label">E-mail <span class="field-required">*</span></span><input class="input" type="email" name="email" required /></label>
            <label class="block"><span class="field-label">Telefone</span><input class="input" name="phone" /></label>
          </div>
          <div class="form-grid-2">
            <label class="block"><span class="field-label">Cargo</span><input class="input" name="cargo" placeholder="Ex: Técnico de Instalação" /></label>
            <label class="block"><span class="field-label">Status</span>
              <select class="select" name="status"><option value="ACTIVE">Ativo</option><option value="INACTIVE">Inativo</option></select>
            </label>
          </div>
          <label class="block">
            <span class="field-label">Senha de acesso <span class="field-required">*</span></span>
            <input class="input" type="password" name="password" required />
            <span class="field-hint">O funcionário usará esta senha para acessar o aplicativo.</span>
          </label>
          ${cityTagInputHtml()}
          <div id="employee-form-error"></div>
        </form>
      `,
      footerHtml: `<button type="button" class="btn btn-outline btn-md" data-act="cancel">Cancelar</button><button type="submit" form="employee-form" class="btn btn-primary btn-md">Salvar funcionário</button>`,
      onMount: (api) => {
        const cityWidget = mountCityTagInput(api.el);
        api.el.querySelector('[data-act="cancel"]').addEventListener("click", api.close);
        api.el.querySelector("#employee-form").addEventListener("submit", async (e) => {
          e.preventDefault();
          const data = Object.fromEntries(new FormData(e.target).entries());
          const errEl = api.el.querySelector("#employee-form-error");
          errEl.innerHTML = "";
          if (!data.name || !data.email || !data.password) {
            errEl.innerHTML = `<p class="alert-error">Nome, e-mail e senha são obrigatórios.</p>`;
            return;
          }
          const submitBtn = api.el.querySelector('[type="submit"][form="employee-form"]');
          if (submitBtn) submitBtn.disabled = true;
          try {
            await Employees.create({ ...data, cities: cityWidget.getValue() });
            showToast("Funcionário cadastrado com sucesso.");
            api.close();
            draw();
          } catch (err) {
            errEl.innerHTML = `<p class="alert-error">${esc(errorMessage(err))}</p>`;
            if (submitBtn) submitBtn.disabled = false;
          }
        });
      },
    });
  }

  draw();
}
