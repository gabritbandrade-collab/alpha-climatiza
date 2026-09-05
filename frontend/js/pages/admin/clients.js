import { icon } from "../../lib/icons.js";
import { Clients } from "../../lib/store.js";
import { pageHeader, emptyState, fullPageSpinner, esc, errorMessage, showToast, openModal, confirmDialog } from "../../lib/ui.js";
import { go } from "../../router.js";

const emptyForm = { name: "", document: "", phone: "", email: "", address: "", number: "", complement: "", city: "", state: "", notes: "" };

export async function renderClientsPage(container) {
  let search = "";

  function draw() {
    const clients = Clients.list({ search: search || undefined });
    container.innerHTML = `
      ${pageHeader({ title: "Clientes", description: "Gerencie os clientes atendidos pela empresa.", actionsHtml: `<button class="btn btn-primary btn-md" id="new-btn">${icon("plus", { class: "h-4 w-4" })} Novo Cliente</button>` })}
      <div class="input-icon-wrap mb-4" style="max-width:24rem">
        <span class="input-icon">${icon("search", { class: "h-4 w-4" })}</span>
        <input class="input" id="search-input" placeholder="Buscar por nome, CPF/CNPJ, telefone..." value="${esc(search)}" />
      </div>
      <div id="clients-grid"></div>
    `;
    container.querySelector("#new-btn").addEventListener("click", openCreateModal);
    container.querySelector("#search-input").addEventListener("input", (e) => {
      search = e.target.value;
      draw();
    });

    const grid = container.querySelector("#clients-grid");
    if (clients.length === 0) {
      grid.innerHTML = emptyState({ title: "Nenhum cliente cadastrado", description: "Cadastre o primeiro cliente para começar.", actionHtml: `<button class="btn btn-primary btn-md" id="empty-new-btn">Novo Cliente</button>` });
      grid.querySelector("#empty-new-btn")?.addEventListener("click", openCreateModal);
      return;
    }
    grid.innerHTML = `<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      ${clients
        .map(
          (c) => `
        <div class="card p-4">
          <div class="flex items-start justify-between gap-2">
            <button class="min-w-0 text-left" data-nav="/admin/clientes/${esc(c.id)}">
              <p class="truncate text-sm font-semibold text-primary">${esc(c.name)}</p>
              ${c.document ? `<p class="text-xs text-muted">${esc(c.document)}</p>` : ""}
            </button>
            <button class="icon-btn" data-del="${esc(c.id)}" data-name="${esc(c.name)}">${icon("trash-2", { class: "h-4 w-4" })}</button>
          </div>
          <div class="mt-3 space-y-1-5" style="font-size:0.75rem" class="text-secondary">
            ${c.phone ? `<p class="flex items-center gap-1-5 text-secondary">${icon("phone", { class: "h-3.5 w-3.5" })} ${esc(c.phone)}</p>` : ""}
            ${c.city ? `<p class="flex items-center gap-1-5 text-secondary">${icon("map-pin", { class: "h-3.5 w-3.5" })} ${esc(c.city)}${c.state ? "/" + esc(c.state) : ""}</p>` : ""}
          </div>
          <div class="mt-3 pt-3 border-t flex items-center justify-between">
            <span class="text-xs text-muted">${c._count.services} serviço(s)</span>
            <button class="link" style="font-size:0.75rem" data-nav="/admin/clientes/${esc(c.id)}">Ver detalhes</button>
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
          title: "Excluir cliente",
          message: `Tem certeza que deseja excluir "${btn.dataset.name}"? Esta ação não pode ser desfeita.`,
          confirmLabel: "Excluir",
          danger: true,
          onConfirm: async () => {
            Clients.delete(btn.dataset.del);
            showToast("Cliente excluído.");
            draw();
          },
        });
      })
    );
  }

  function openCreateModal() {
    const form = { ...emptyForm };
    openModal({
      title: "Novo Cliente",
      size: "lg",
      bodyHtml: clientFormHtml(form),
      footerHtml: `<button type="button" class="btn btn-outline btn-md" data-act="cancel">Cancelar</button><button type="submit" form="client-form" class="btn btn-primary btn-md">Salvar cliente</button>`,
      onMount: (api) => {
        api.el.querySelector('[data-act="cancel"]').addEventListener("click", api.close);
        api.el.querySelector("#client-form").addEventListener("submit", (e) => {
          e.preventDefault();
          const fd = new FormData(e.target);
          const data = Object.fromEntries(fd.entries());
          const errEl = api.el.querySelector("#client-form-error");
          errEl.innerHTML = "";
          if (!data.name) {
            errEl.innerHTML = `<p class="alert-error">O nome é obrigatório.</p>`;
            return;
          }
          try {
            Clients.create(data);
            showToast("Cliente cadastrado com sucesso.");
            api.close();
            draw();
          } catch (err) {
            errEl.innerHTML = `<p class="alert-error">${esc(errorMessage(err))}</p>`;
          }
        });
      },
    });
  }

  draw();
}

function clientFormHtml(f) {
  return `
    <form id="client-form" class="space-y-4">
      <label class="block"><span class="field-label">Nome do cliente ou empresa <span class="field-required">*</span></span><input class="input" name="name" required value="${esc(f.name)}" /></label>
      <div class="form-grid-2">
        <label class="block"><span class="field-label">CPF/CNPJ</span><input class="input" name="document" value="${esc(f.document)}" /></label>
        <label class="block"><span class="field-label">Telefone</span><input class="input" name="phone" value="${esc(f.phone)}" /></label>
      </div>
      <label class="block"><span class="field-label">E-mail</span><input class="input" type="email" name="email" value="${esc(f.email)}" /></label>
      <div class="form-grid-address">
        <label class="block"><span class="field-label">Endereço</span><input class="input" name="address" value="${esc(f.address)}" /></label>
        <label class="block"><span class="field-label">Número</span><input class="input" name="number" value="${esc(f.number)}" /></label>
        <label class="block"><span class="field-label">Complemento</span><input class="input" name="complement" value="${esc(f.complement)}" /></label>
      </div>
      <div class="form-grid-citystate">
        <label class="block"><span class="field-label">Cidade</span><input class="input" name="city" value="${esc(f.city)}" /></label>
        <label class="block"><span class="field-label">Estado (UF)</span><input class="input" name="state" maxlength="2" value="${esc(f.state)}" /></label>
      </div>
      <label class="block"><span class="field-label">Observações</span><textarea class="textarea" name="notes">${esc(f.notes)}</textarea></label>
      <div id="client-form-error"></div>
    </form>
  `;
}
