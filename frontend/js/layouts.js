// Estruturas visuais compartilhadas: shell do admin (sidebar + topbar), shell
// do funcionário (header + tabs inferiores) e o sino de notificações.
import { icon } from "./lib/icons.js";
import { Auth, Notifications } from "./lib/store.js";
import { esc } from "./lib/ui.js";
import { formatDistanceToNow } from "./lib/date.js";
import { getTheme, toggleTheme } from "./lib/theme.js";
import { go, currentPathname, refresh } from "./router.js";

let shellAbort = null;
function freshSignal() {
  shellAbort?.abort();
  shellAbort = new AbortController();
  return shellAbort.signal;
}

async function handleLogout() {
  await Auth.logout();
  go("/login");
}

function notifBellHtml() {
  return `
    <div class="relative" data-notif-root>
      <button type="button" class="icon-btn relative" data-notif-toggle>
        ${icon("bell", { class: "h-5 w-5" })}
        <span class="notif-badge" data-notif-badge hidden></span>
      </button>
      <div class="notif-dropdown" data-notif-dropdown hidden>
        <div class="notif-dropdown-header">
          <p class="text-sm font-semibold text-primary">Notificações</p>
          <button type="button" class="link" style="font-size:0.75rem" data-notif-mark-all>Marcar todas como lidas</button>
        </div>
        <div class="notif-dropdown-list" data-notif-list></div>
      </div>
    </div>
  `;
}

function notifItemHtml(n) {
  return `
    <button type="button" class="notif-item ${!n.read ? "unread" : ""}" data-notif-id="${esc(n.id)}" data-related="${esc(n.relatedServiceId || "")}">
      <div class="notif-row">
        ${!n.read ? '<span class="notif-unread-dot"></span>' : ""}
        <div class="min-w-0">
          <p class="notif-title">${esc(n.title)}</p>
          <p class="notif-message">${esc(n.message)}</p>
          <p class="notif-time">${esc(formatDistanceToNow(n.createdAt))}</p>
        </div>
      </div>
    </button>
  `;
}

function wireNotifBell(root, basePath, signal) {
  const user = Auth.currentUser();
  const toggleBtn = root.querySelector("[data-notif-toggle]");
  const dropdown = root.querySelector("[data-notif-dropdown]");
  const list = root.querySelector("[data-notif-list]");
  const badge = root.querySelector("[data-notif-badge]");
  const markAllBtn = root.querySelector("[data-notif-mark-all]");

  async function refreshList() {
    const notifications = await Notifications.list(user.id);
    const unread = notifications.filter((n) => !n.read).length;
    badge.hidden = unread === 0;
    badge.textContent = unread > 9 ? "9+" : String(unread);
    markAllBtn.style.display = unread > 0 ? "" : "none";
    list.innerHTML = notifications.length
      ? notifications.map(notifItemHtml).join("")
      : `<p class="text-sm text-muted text-center" style="padding:2rem 1rem">Nenhuma notificação por aqui.</p>`;
    list.querySelectorAll("[data-notif-id]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.notifId;
        await Notifications.markRead(user.id, id);
        dropdown.hidden = true;
        const related = btn.dataset.related;
        if (related) go(`${basePath}/servicos/${related}`);
        refreshList();
      });
    });
  }
  refreshList();

  toggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.hidden = !dropdown.hidden;
    if (!dropdown.hidden) refreshList();
  });
  markAllBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    await Notifications.markAllRead(user.id);
    refreshList();
  });
  document.addEventListener(
    "click",
    (e) => {
      if (!root.contains(e.target)) dropdown.hidden = true;
    },
    { signal }
  );
}

// ---------------------------------------------------------------------------
// Admin shell
// ---------------------------------------------------------------------------
const ADMIN_LINKS = [
  { to: "/admin", label: "Dashboard", iconName: "layout-dashboard", exact: true },
  { to: "/admin/agenda", label: "Agenda de Serviços", iconName: "calendar-days" },
  { to: "/admin/solicitacoes", label: "Solicitações", iconName: "inbox" },
  { to: "/admin/distribuicao", label: "Distribuição", iconName: "map" },
  { to: "/admin/clientes", label: "Clientes", iconName: "users" },
  { to: "/admin/funcionarios", label: "Funcionários", iconName: "hard-hat" },
  { to: "/admin/relatorios", label: "Relatórios", iconName: "bar-chart-3" },
];

function isActiveLink(link, pathname) {
  return link.exact ? pathname === link.to : pathname === link.to || pathname.startsWith(link.to + "/");
}

function sidebarNavHtml(pathname) {
  return ADMIN_LINKS.map(
    (l) => `
    <a href="#${l.to}" class="sidebar-link ${isActiveLink(l, pathname) ? "active" : ""}">
      ${icon(l.iconName, { class: "h-[18px] w-[18px]" })} ${esc(l.label)}
    </a>`
  ).join("");
}

function sidebarInnerHtml(pathname, theme) {
  return `
    <div class="sidebar-inner">
      <div class="sidebar-brand">
        <div class="sidebar-brand-icon">${icon("snowflake", { class: "h-5 w-5" })}</div>
        <div class="min-w-0">
          <p class="sidebar-brand-name truncate">ALPHA CLIMATIZAÇÃO</p>
          <p class="sidebar-brand-sub">Painel Administrativo</p>
        </div>
      </div>
      <nav class="sidebar-nav">${sidebarNavHtml(pathname)}</nav>
      <div class="sidebar-footer">
        <button type="button" class="sidebar-footer-btn" data-theme-toggle>
          ${icon(theme === "dark" ? "sun" : "moon", { class: "h-[18px] w-[18px]" })}
          ${theme === "dark" ? "Modo claro" : "Modo escuro"}
        </button>
        <button type="button" class="sidebar-footer-btn danger" data-logout>
          ${icon("log-out", { class: "h-[18px] w-[18px]" })} Sair
        </button>
      </div>
    </div>
  `;
}

export function renderAdminShell(pathnameOverride) {
  const pathname = pathnameOverride || currentPathname();
  const user = Auth.currentUser();
  const theme = getTheme();
  const signal = freshSignal();

  document.getElementById("app").innerHTML = `
    <div class="admin-shell">
      <aside class="admin-sidebar">${sidebarInnerHtml(pathname, theme)}</aside>

      <div class="mobile-drawer-overlay" data-mobile-drawer hidden>
        <div class="mobile-drawer-backdrop" data-drawer-close></div>
        <aside class="mobile-drawer">
          <button type="button" class="mobile-drawer-close" data-drawer-close>${icon("x", { class: "h-5 w-5" })}</button>
          ${sidebarInnerHtml(pathname, theme)}
        </aside>
      </div>

      <div class="admin-main">
        <header class="admin-topbar">
          <button type="button" class="topbar-menu-btn" data-drawer-open>${icon("menu", { class: "h-5 w-5" })}</button>
          <div class="flex items-center gap-3 topbar-actions">
            ${notifBellHtml()}
            <div class="relative" data-user-menu-root>
              <button type="button" class="user-menu-trigger" data-user-menu-toggle>
                ${avatarInline(user)}
                <span class="user-menu-name">${esc(user.name)}</span>
                ${icon("chevron-down", { class: "h-4 w-4 text-muted hidden sm:block" })}
              </button>
              <div class="user-menu-dropdown" data-user-menu-dropdown hidden>
                <div class="user-menu-header">
                  <p class="text-sm font-medium text-primary truncate">${esc(user.name)}</p>
                  <p class="text-xs text-muted truncate">${esc(user.email)}</p>
                </div>
                <button type="button" class="user-menu-item" data-logout>${icon("log-out", { class: "h-4 w-4" })} Sair</button>
              </div>
            </div>
          </div>
        </header>
        <main class="admin-content" id="page-content"></main>
      </div>
    </div>
  `;

  const root = document.getElementById("app");
  root.querySelectorAll("[data-logout]").forEach((b) => b.addEventListener("click", handleLogout));
  root.querySelectorAll("[data-theme-toggle]").forEach((b) =>
    b.addEventListener("click", () => {
      toggleTheme();
      refresh();
    })
  );

  const drawer = root.querySelector("[data-mobile-drawer]");
  root.querySelector("[data-drawer-open]").addEventListener("click", () => (drawer.hidden = false));
  root.querySelectorAll("[data-drawer-close]").forEach((b) => b.addEventListener("click", () => (drawer.hidden = true)));

  const userMenuDropdown = root.querySelector("[data-user-menu-dropdown]");
  root.querySelector("[data-user-menu-toggle]").addEventListener("click", (e) => {
    e.stopPropagation();
    userMenuDropdown.hidden = !userMenuDropdown.hidden;
  });
  document.addEventListener(
    "click",
    (e) => {
      if (!root.querySelector("[data-user-menu-root]")?.contains(e.target)) userMenuDropdown.hidden = true;
    },
    { signal }
  );

  wireNotifBell(root.querySelector("[data-notif-root]"), "/admin", signal);

  return document.getElementById("page-content");
}

function avatarInline(user) {
  if (user.photoUrl) return `<div class="avatar-circle"><img src="${esc(user.photoUrl)}" alt="${esc(user.name)}"></div>`;
  return `<div class="avatar-circle">${esc((user.name || "?").charAt(0).toUpperCase())}</div>`;
}

// ---------------------------------------------------------------------------
// Employee shell
// ---------------------------------------------------------------------------
const EMPLOYEE_TABS = [
  { to: "/app", label: "Início", iconName: "layout-dashboard", exact: true },
  { to: "/app/servicos", label: "Serviços", iconName: "list" },
  { to: "/app/notificacoes", label: "Avisos", iconName: "bell" },
  { to: "/app/perfil", label: "Perfil", iconName: "user" },
];

export function renderEmployeeShell(pathnameOverride) {
  const pathname = pathnameOverride || currentPathname();
  const user = Auth.currentUser();
  const theme = getTheme();
  const signal = freshSignal();

  document.getElementById("app").innerHTML = `
    <div class="employee-shell">
      <header class="employee-header">
        <div class="employee-brand">
          <div class="employee-brand-icon">${icon("snowflake", { class: "h-4 w-4" })}</div>
          <div>
            <p class="employee-brand-name">ALPHA CLIMATIZAÇÃO</p>
            <p class="employee-brand-sub">Olá, ${esc((user.name || "").split(" ")[0])}</p>
          </div>
        </div>
        <div class="flex items-center gap-1">
          <button type="button" class="icon-btn" data-theme-toggle>${icon(theme === "dark" ? "sun" : "moon", { class: "h-5 w-5" })}</button>
          ${notifBellHtml()}
        </div>
      </header>

      <main class="employee-content" id="page-content"></main>

      <nav class="bottom-nav safe-bottom">
        ${EMPLOYEE_TABS.map(
          (t) => `
          <a href="#${t.to}" class="bottom-nav-link ${isActiveLink(t, pathname) ? "active" : ""}">
            ${icon(t.iconName, { class: "h-5 w-5" })}
            ${esc(t.label)}
          </a>`
        ).join("")}
      </nav>
    </div>
  `;

  const root = document.getElementById("app");
  root.querySelectorAll("[data-theme-toggle]").forEach((b) =>
    b.addEventListener("click", () => {
      toggleTheme();
      refresh();
    })
  );
  wireNotifBell(root.querySelector("[data-notif-root]"), "/app", signal);

  return document.getElementById("page-content");
}

export function renderBareLayout() {
  shellAbort?.abort();
  shellAbort = null;
  document.getElementById("app").innerHTML = "";
  return document.getElementById("app");
}
