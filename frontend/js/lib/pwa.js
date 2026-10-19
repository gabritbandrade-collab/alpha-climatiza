// Suporte a PWA: registro do service worker e botão "Instalar aplicativo".
// Não mexe em login, dados nem rotas.
import { openModal } from "./ui.js";
import { icon } from "./icons.js";

let deferredPrompt = null;

export function isInstalled() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function isIOS() {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

export function initPwa() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    document.querySelectorAll("[data-pwa-install]").forEach((b) => (b.hidden = true));
  });
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch((err) => console.warn("Service worker não registrado", err));
    });
  }
}

// HTML do botão. `className` permite reaproveitar o estilo do menu onde ele entra.
export function installButtonHtml(className) {
  if (isInstalled()) return "";
  return `<button type="button" class="${className}" data-pwa-install>${icon("download", { class: "h-[18px] w-[18px]" })} Instalar aplicativo</button>`;
}

function instructionsHtml() {
  if (isIOS()) {
    return `
      <p class="text-sm">No iPhone ou iPad, a instalação é feita pelo <strong>Safari</strong>:</p>
      <ol class="text-sm" style="margin:0.75rem 0 0 1.25rem;list-style:decimal;display:grid;gap:0.375rem">
        <li>Abra este endereço no Safari (não funciona dentro de outros navegadores ou apps).</li>
        <li>Toque no botão <strong>Compartilhar</strong> (o quadrado com uma seta para cima).</li>
        <li>Role a lista e toque em <strong>Adicionar à Tela de Início</strong>.</li>
        <li>Toque em <strong>Adicionar</strong>. O ícone da Alpha vai aparecer na sua tela.</li>
      </ol>`;
  }
  if (isAndroid()) {
    return `
      <p class="text-sm">No Android, pelo <strong>Chrome</strong>:</p>
      <ol class="text-sm" style="margin:0.75rem 0 0 1.25rem;list-style:decimal;display:grid;gap:0.375rem">
        <li>Toque no menu <strong>⋮</strong> (três pontinhos) no canto do navegador.</li>
        <li>Toque em <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.</li>
        <li>Confirme em <strong>Instalar</strong>.</li>
      </ol>`;
  }
  return `
    <p class="text-sm">No computador, use o <strong>Chrome</strong> ou o <strong>Edge</strong>:</p>
    <ol class="text-sm" style="margin:0.75rem 0 0 1.25rem;list-style:decimal;display:grid;gap:0.375rem">
      <li>Procure o ícone de instalação (uma telinha com uma seta) no lado direito da barra de endereço.</li>
      <li>Ou abra o menu <strong>⋮</strong> e escolha <strong>Instalar ALPHA CLIMATIZAÇÃO</strong> (no Edge: <strong>Aplicativos → Instalar este site como um aplicativo</strong>).</li>
      <li>Confirme em <strong>Instalar</strong>.</li>
    </ol>
    <p class="text-xs text-muted" style="margin-top:0.75rem">Se a opção não aparecer, o seu navegador pode não ter suporte à instalação.</p>`;
}

function showInstructions() {
  openModal({ title: "Instalar aplicativo", bodyHtml: instructionsHtml(), size: "sm" });
}

async function handleInstallClick(btn) {
  if (!deferredPrompt) {
    showInstructions();
    return;
  }
  const promptEvent = deferredPrompt;
  deferredPrompt = null;
  promptEvent.prompt();
  const { outcome } = await promptEvent.userChoice;
  // Só some se o navegador confirmar a instalação (evento "appinstalled").
  // Se a pessoa recusar, o botão continua e mostra as instruções na próxima vez.
  if (outcome === "accepted") btn.hidden = true;
}

// Liga os botões que existem dentro de `root`.
export function wireInstallButtons(root) {
  root.querySelectorAll("[data-pwa-install]").forEach((btn) => {
    btn.addEventListener("click", () => handleInstallClick(btn));
  });
}
