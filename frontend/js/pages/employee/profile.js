import { icon } from "../../lib/icons.js";
import { Auth, fileToDataUrl } from "../../lib/store.js";
import { esc, errorMessage, showToast, openModal, avatarInitial } from "../../lib/ui.js";
import { getTheme, toggleTheme } from "../../lib/theme.js";
import { go, refresh } from "../../router.js";

export async function renderEmployeeProfilePage(container) {
  const user = Auth.currentUser();
  const theme = getTheme();

  container.innerHTML = `
    <div class="p-4">
      <h1 class="text-lg font-bold text-primary" style="margin-bottom:1rem">Meu Perfil</h1>

      <div class="flex flex-col items-center" style="margin-bottom:1.25rem">
        <div class="relative">
          ${avatarInitial(user.name, user.photoUrl, "avatar-circle")}
          <button type="button" id="photo-btn" style="position:absolute;bottom:0;right:0;display:flex;height:2rem;width:2rem;align-items:center;justify-content:center;border-radius:9999px;background:var(--brand-600);color:#fff;box-shadow:var(--shadow-md)">
            ${icon("camera", { class: "h-4 w-4" })}
          </button>
          <input type="file" accept="image/*" capture="user" hidden id="photo-input" />
        </div>
        <p class="text-base font-bold text-primary" style="margin-top:0.75rem">${esc(user.name)}</p>
        <p class="text-sm text-muted">${esc(user.cargo || "")}</p>
      </div>

      <div class="card p-0" style="margin-bottom:1rem">
        <div class="flex items-center gap-3 p-4" style="border-bottom:1px solid var(--border-color)">
          ${icon("mail", { class: "h-4 w-4 text-muted" })}
          <div class="min-w-0"><p class="text-xs text-muted">E-mail</p><p class="truncate text-sm text-primary">${esc(user.email)}</p></div>
        </div>
        <div class="flex items-center gap-3 p-4" style="border-bottom:1px solid var(--border-color)">
          ${icon("hard-hat", { class: "h-4 w-4 text-muted" })}
          <div class="min-w-0"><p class="text-xs text-muted">Cargo</p><p class="truncate text-sm text-primary">${esc(user.cargo || "—")}</p></div>
        </div>
        <div class="flex items-center gap-3 p-4">
          ${icon("phone", { class: "h-4 w-4 text-muted" })}
          <div class="min-w-0 flex-1">
            <p class="text-xs text-muted" style="margin-bottom:0.25rem">Telefone</p>
            <div class="flex gap-2">
              <input class="input" id="phone-input" value="${esc(user.phone || "")}" placeholder="(00) 00000-0000" />
              <button class="btn btn-primary btn-sm" id="save-phone-btn">Salvar</button>
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-2">
        <button type="button" class="flex w-full items-center gap-3 rounded-xl border p-4 text-left text-sm font-medium text-primary" style="border-color:var(--border-color);background:var(--surface-elevated)" id="change-pw-btn">
          ${icon("lock", { class: "h-4 w-4 text-muted" })} Alterar senha
        </button>
        <button type="button" class="flex w-full items-center gap-3 rounded-xl border p-4 text-left text-sm font-medium text-primary" style="border-color:var(--border-color);background:var(--surface-elevated)" id="theme-btn">
          ${icon(theme === "dark" ? "sun" : "moon", { class: "h-4 w-4 text-muted" })} ${theme === "dark" ? "Modo claro" : "Modo escuro"}
        </button>
        <button type="button" class="flex w-full items-center gap-3 rounded-xl border p-4 text-left text-sm font-medium" style="border-color:#fecaca;background:#fef2f2;color:#dc2626" id="logout-btn">
          ${icon("log-out", { class: "h-4 w-4" })} Sair
        </button>
      </div>
    </div>
  `;

  container.querySelector("#theme-btn").addEventListener("click", () => {
    toggleTheme();
    refresh();
  });
  container.querySelector("#logout-btn").addEventListener("click", () => {
    Auth.logout();
    go("/login");
  });

  container.querySelector("#photo-btn").addEventListener("click", () => container.querySelector("#photo-input").click());
  container.querySelector("#photo-input").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file, 400, 0.8);
      Auth.updateMe(user.id, { photoUrl: dataUrl });
      showToast("Foto atualizada.");
      refresh();
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  });

  container.querySelector("#save-phone-btn").addEventListener("click", () => {
    const phone = container.querySelector("#phone-input").value;
    try {
      Auth.updateMe(user.id, { phone });
      showToast("Telefone atualizado.");
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  });

  container.querySelector("#change-pw-btn").addEventListener("click", () => {
    openModal({
      title: "Alterar senha",
      bodyHtml: `
        <form id="pw-form" class="space-y-4">
          <label class="block"><span class="field-label">Senha atual <span class="field-required">*</span></span><input class="input" type="password" name="currentPassword" required /></label>
          <label class="block">
            <span class="field-label">Nova senha <span class="field-required">*</span></span>
            <input class="input" type="password" name="newPassword" required />
            <span class="field-hint">Mínimo de 6 caracteres.</span>
          </label>
          <div id="pw-error"></div>
          <button type="submit" class="btn btn-primary btn-md btn-full">Alterar senha</button>
        </form>
      `,
      onMount: (modal) => {
        modal.el.querySelector("#pw-form").addEventListener("submit", (e) => {
          e.preventDefault();
          const fd = new FormData(e.target);
          const errEl = modal.el.querySelector("#pw-error");
          errEl.innerHTML = "";
          try {
            Auth.changePassword(user.id, fd.get("currentPassword"), fd.get("newPassword"));
            showToast("Senha alterada com sucesso.");
            modal.close();
          } catch (err) {
            errEl.innerHTML = `<p class="alert-error">${esc(errorMessage(err))}</p>`;
          }
        });
      },
    });
  });
}
