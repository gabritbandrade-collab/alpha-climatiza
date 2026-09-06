import { icon } from "../lib/icons.js";
import { esc, showToast, errorMessage, openModal } from "../lib/ui.js";
import { Auth } from "../lib/store.js";
import { getTheme, toggleTheme } from "../lib/theme.js";
import { go, homeFor, refresh } from "../router.js";

export function renderLoginPage() {
  const app = document.getElementById("app");
  const theme = getTheme();
  let showPassword = false;

  app.innerHTML = `
    <div class="login-page">
      <button type="button" class="login-theme-toggle" data-theme-toggle>
        ${icon(theme === "dark" ? "sun" : "moon", { class: "h-5 w-5" })}
      </button>
      <div class="login-box">
        <div class="login-logo-wrap">
          <img class="login-logo-img" src="/assets/logo.png" alt="ALPHA CLIMATIZAÇÃO" />
          <p class="login-subtitle">Gestão de Serviços Externos</p>
        </div>
        <div class="login-card">
          <form id="login-form" class="space-y-4">
            <label class="block">
              <span class="field-label">E-mail</span>
              <input class="input" type="email" name="email" required autocomplete="username" placeholder="seu@email.com" />
            </label>
            <div class="relative">
              <label class="block">
                <span class="field-label">Senha</span>
                <input class="input" id="login-password" type="password" name="password" required autocomplete="current-password" placeholder="••••••••" />
              </label>
              <button type="button" class="input-eye-toggle" id="toggle-password">${icon("eye", { class: "h-4 w-4" })}</button>
            </div>
            <div id="login-error"></div>
            <button type="submit" class="btn btn-primary btn-lg btn-full" id="login-submit">Entrar</button>
            <button type="button" class="login-forgot" id="forgot-link">Esqueci minha senha</button>
          </form>
        </div>
      </div>
    </div>
  `;

  app.querySelector("[data-theme-toggle]").addEventListener("click", () => {
    toggleTheme();
    refresh();
  });

  app.querySelector("#toggle-password").addEventListener("click", () => {
    showPassword = !showPassword;
    const input = app.querySelector("#login-password");
    input.type = showPassword ? "text" : "password";
    app.querySelector("#toggle-password").innerHTML = icon(showPassword ? "eye-off" : "eye", { class: "h-4 w-4" });
  });

  app.querySelector("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorEl = app.querySelector("#login-error");
    errorEl.innerHTML = "";
    const submitBtn = app.querySelector("#login-submit");
    const formData = new FormData(e.target);
    submitBtn.disabled = true;
    submitBtn.innerHTML = `${icon("loader", { class: "h-4 w-4" })} Entrando...`;
    try {
      const user = await Auth.login(formData.get("email"), formData.get("password"));
      go(homeFor(user));
    } catch (err) {
      errorEl.innerHTML = `<p class="alert-error">${esc(errorMessage(err, "Não foi possível entrar. Verifique suas credenciais."))}</p>`;
      submitBtn.disabled = false;
      submitBtn.textContent = "Entrar";
    }
  });

  app.querySelector("#forgot-link").addEventListener("click", () => {
    openModal({
      title: "Esqueci minha senha",
      bodyHtml: `
        <form id="forgot-form" class="space-y-4">
          <p class="text-sm text-secondary">Informe seu e-mail cadastrado. O administrador da empresa será notificado para redefinir sua senha.</p>
          <label class="block">
            <span class="field-label">E-mail</span>
            <input class="input" type="email" name="email" required placeholder="seu@email.com" />
          </label>
          <div id="forgot-result"></div>
          <button type="submit" class="btn btn-primary btn-md btn-full">Enviar solicitação</button>
        </form>
      `,
      onMount: (modal) => {
        modal.el.querySelector("#forgot-form").addEventListener("submit", async (e) => {
          e.preventDefault();
          const email = new FormData(e.target).get("email");
          const message = await Auth.forgotPassword(email);
          modal.el.querySelector("#forgot-form").innerHTML = `
            <p class="text-sm text-secondary">${esc(message)}</p>
            <button type="button" class="btn btn-primary btn-md btn-full" id="forgot-ok" style="margin-top:1rem">Entendi</button>
          `;
          modal.el.querySelector("#forgot-ok").addEventListener("click", () => {
            modal.close();
            showToast("Solicitação enviada.");
          });
        });
      },
    });
  });
}
