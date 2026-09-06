import { icon } from "../../lib/icons.js";
import { Services, Auth } from "../../lib/store.js";
import { esc, errorMessage, showToast, openModal, statusBadge } from "../../lib/ui.js";
import { go } from "../../router.js";

function section(title, iconHtml, bodyHtml) {
  return `<div style="margin-bottom:1.5rem">
    <p class="flex items-center gap-1-5 text-sm font-semibold text-primary" style="margin-bottom:0.5rem">${iconHtml || ""} ${esc(title)}</p>
    ${bodyHtml}
  </div>`;
}

function photoGridHtml(photos, editable, type) {
  return `
    <div class="photo-grid" data-photo-grid="${type}">
      ${photos
        .map(
          (p) => `
        <div class="photo-item">
          <img src="${esc(p.url)}" />
          ${editable ? `<button type="button" class="photo-delete-btn" data-del-photo="${esc(p.id)}">${icon("x", { class: "h-3.5 w-3.5" })}</button>` : ""}
        </div>`
        )
        .join("")}
      ${
        editable
          ? `<button type="button" class="photo-add-btn" data-add-photo="${type}">${icon("camera", { class: "h-5 w-5" })}<span style="font-size:11px">Adicionar</span></button>
             <input type="file" accept="image/*" capture="environment" hidden data-photo-input="${type}" />`
          : ""
      }
      ${photos.length === 0 && !editable ? `<p class="text-xs text-muted" style="grid-column:span 3">Nenhuma foto registrada.</p>` : ""}
    </div>
  `;
}

export async function renderEmployeeServiceExecutionPage(container, params) {
  async function load() {
    let service;
    try {
      service = await Services.get(params.id);
    } catch (err) {
      showToast(errorMessage(err), "error");
      go("/app/servicos");
      return;
    }
    draw(service);
  }

  function draw(service) {
    const editable = service.status === "IN_PROGRESS";
    const beforePhotos = service.photos.filter((p) => p.type === "BEFORE");
    const afterPhotos = service.photos.filter((p) => p.type === "AFTER");

    container.innerHTML = `
      <div class="p-4 pb-28">
        <button type="button" class="back-link" id="back-btn">← Voltar</button>
        <div class="flex items-center justify-between" style="margin-bottom:1rem">
          <h1 class="text-lg font-bold text-primary">${esc(service.serviceType)}</h1>
          ${statusBadge(service.status)}
        </div>
        <p class="text-sm text-secondary" style="margin-bottom:1.25rem">${esc(service.client.name)}</p>

        ${section("📸 Fotos Antes", "", photoGridHtml(beforePhotos, editable, "BEFORE"))}
        ${section("📸 Fotos Depois", "", photoGridHtml(afterPhotos, editable, "AFTER"))}

        ${section(
          "📦 Materiais Utilizados",
          icon("package", { class: "h-4 w-4" }),
          `
          ${
            service.materials.length > 0
              ? `<ul class="space-y-2" style="margin-bottom:0.75rem">
                  ${service.materials
                    .map(
                      (m) => `
                    <li class="material-item">
                      <div class="min-w-0">
                        <p class="text-sm font-medium text-primary">${esc(m.name)} <span class="text-secondary">— ${esc(m.quantity)}</span></p>
                        ${m.notes ? `<p class="text-xs text-muted">${esc(m.notes)}</p>` : ""}
                      </div>
                      ${editable ? `<button type="button" class="icon-btn" data-del-material="${esc(m.id)}">${icon("trash-2", { class: "h-4 w-4" })}</button>` : ""}
                    </li>`
                    )
                    .join("")}
                </ul>`
              : ""
          }
          ${
            editable
              ? `<form id="material-form" class="material-add-form">
                  <div class="material-add-grid">
                    <input class="input" name="name" placeholder="Nome do material" />
                    <input class="input" name="quantity" placeholder="Quantidade" />
                  </div>
                  <input class="input" name="notes" placeholder="Observação (opcional)" />
                  <button type="submit" class="btn btn-outline btn-sm btn-full">${icon("plus", { class: "h-4 w-4" })} Adicionar material</button>
                </form>`
              : ""
          }
        `
        )}

        ${section(
          "📝 Observações",
          "",
          `<textarea class="textarea" id="obs-input" placeholder="Ex: Foi necessário trocar uma peça que não estava prevista." ${editable ? "" : "disabled"}>${esc(service.employeeObservations || "")}</textarea>`
        )}
        ${section(
          "⚠️ Problemas encontrados",
          icon("alert-triangle", { class: "h-4 w-4", }),
          `<textarea class="textarea" id="problems-input" placeholder="Descreva algum problema encontrado durante o atendimento." ${editable ? "" : "disabled"}>${esc(service.problems || "")}</textarea>`
        )}
        ${section(
          "⏳ Serviço pendente",
          icon("clock3", { class: "h-4 w-4" }),
          `<textarea class="textarea" id="pending-input" placeholder="Ex: Necessário retornar ao local para finalizar a instalação." ${editable ? "" : "disabled"}>${esc(service.pendingNotes || "")}</textarea>`
        )}

        ${editable ? `<div class="sticky-action-bar"><button class="btn btn-success btn-xl btn-full" id="complete-btn">${icon("check-circle-2", { class: "h-5 w-5" })} SERVIÇO CONCLUÍDO</button></div>` : ""}
      </div>
    `;

    container.querySelector("#back-btn").addEventListener("click", () => history.back());

    if (editable) {
      container.querySelector("#obs-input").addEventListener("blur", async (e) => {
        await Services.setObservations(service.id, e.target.value);
        showToast("Salvo com sucesso.");
      });
      container.querySelector("#problems-input").addEventListener("blur", (e) => Services.setProblems(service.id, e.target.value));
      container.querySelector("#pending-input").addEventListener("blur", (e) => Services.setPending(service.id, e.target.value));

      container.querySelector("#material-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const name = fd.get("name");
        const quantity = fd.get("quantity");
        if (!name || !quantity) return;
        try {
          await Services.addMaterial(service.id, { name, quantity, notes: fd.get("notes") });
          load();
        } catch (err) {
          showToast(errorMessage(err), "error");
        }
      });

      container.querySelectorAll("[data-del-material]").forEach((btn) =>
        btn.addEventListener("click", async () => {
          await Services.deleteMaterial(service.id, btn.dataset.delMaterial);
          load();
        })
      );

      container.querySelectorAll("[data-add-photo]").forEach((btn) => {
        const type = btn.dataset.addPhoto;
        btn.addEventListener("click", () => container.querySelector(`[data-photo-input="${type}"]`).click());
      });
      container.querySelectorAll("[data-photo-input]").forEach((input) => {
        input.addEventListener("change", async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const grid = container.querySelector(`[data-photo-grid="${input.dataset.photoInput}"]`);
          const addBtn = grid.querySelector("[data-add-photo]");
          addBtn.disabled = true;
          addBtn.innerHTML = `${icon("loader", { class: "h-5 w-5" })}<span style="font-size:11px">Enviando...</span>`;
          try {
            await Services.addPhoto(service.id, { type: input.dataset.photoInput, file });
            showToast("Foto adicionada.");
            load();
          } catch (err) {
            showToast(errorMessage(err), "error");
            addBtn.disabled = false;
            addBtn.innerHTML = `${icon("camera", { class: "h-5 w-5" })}<span style="font-size:11px">Adicionar</span>`;
          }
        });
      });
      container.querySelectorAll("[data-del-photo]").forEach((btn) =>
        btn.addEventListener("click", async () => {
          await Services.deletePhoto(service.id, btn.dataset.delPhoto);
          load();
        })
      );

      container.querySelector("#complete-btn").addEventListener("click", () => attemptComplete(service, false));
    }
  }

  async function attemptComplete(service, force) {
    // garante que os campos de texto mais recentes estejam salvos antes de concluir
    const obs = container.querySelector("#obs-input")?.value;
    const problems = container.querySelector("#problems-input")?.value;
    const pending = container.querySelector("#pending-input")?.value;
    if (obs !== undefined) await Services.setObservations(service.id, obs);
    if (problems !== undefined) await Services.setProblems(service.id, problems);
    if (pending !== undefined) await Services.setPending(service.id, pending);

    try {
      await Services.complete(service.id, { force }, Auth.currentUser().id);
      showToast("Serviço concluído com sucesso!");
      go(`/app/servicos/${service.id}`);
    } catch (err) {
      if (err.missing?.length) {
        openModal({
          title: "Faltam algumas informações",
          bodyHtml: `
            <p class="text-sm text-secondary" style="margin-bottom:0.75rem">Antes de concluir, recomendamos registrar:</p>
            <ul class="space-y-1-5" style="margin-bottom:1rem">
              ${err.missing.map((m) => `<li class="flex items-center gap-2 text-sm text-primary">${icon("x", { class: "h-4 w-4" })} ${esc(m)}</li>`).join("")}
            </ul>
            <div class="flex gap-2">
              <button type="button" class="btn btn-outline btn-md btn-full" data-act="back">Voltar e registrar</button>
              <button type="button" class="btn btn-primary btn-md btn-full" data-act="force">Concluir mesmo assim</button>
            </div>
          `,
          onMount: (modal) => {
            modal.el.querySelector('[data-act="back"]').addEventListener("click", modal.close);
            modal.el.querySelector('[data-act="force"]').addEventListener("click", () => {
              modal.close();
              attemptComplete(service, true);
            });
          },
        });
      } else {
        showToast(errorMessage(err), "error");
      }
    }
  }

  load();
}
