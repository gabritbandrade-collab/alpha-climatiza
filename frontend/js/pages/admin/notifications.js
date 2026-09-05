import { Auth, Notifications } from "../../lib/store.js";
import { pageHeader, emptyState, esc } from "../../lib/ui.js";
import { formatDateTime } from "../../lib/date.js";
import { go } from "../../router.js";

export async function renderAdminNotificationsPage(container) {
  const user = Auth.currentUser();

  function draw() {
    const notifications = Notifications.list(user.id);
    const unreadCount = notifications.filter((n) => !n.read).length;

    container.innerHTML = `
      <div class="mx-auto max-w-2xl">
        ${pageHeader({
          title: "Notificações",
          description: "Acompanhe eventos importantes registrados pelos funcionários.",
          actionsHtml: unreadCount > 0 ? `<button class="btn btn-outline btn-sm" id="mark-all">Marcar todas como lidas</button>` : "",
        })}
        <div id="list"></div>
      </div>
    `;

    container.querySelector("#mark-all")?.addEventListener("click", () => {
      Notifications.markAllRead(user.id);
      draw();
    });

    const list = container.querySelector("#list");
    list.innerHTML = notifications.length
      ? `<div class="space-y-2">
          ${notifications
            .map(
              (n) => `
            <button type="button" class="notif-card ${!n.read ? "unread" : ""}" data-id="${esc(n.id)}" data-related="${esc(n.relatedServiceId || "")}">
              ${!n.read ? '<span class="notif-unread-dot" style="margin-top:0.375rem"></span>' : ""}
              <div class="min-w-0">
                <p class="notif-title">${esc(n.title)}</p>
                <p class="text-sm text-secondary" style="margin-top:0.125rem">${esc(n.message)}</p>
                <p class="notif-time" style="margin-top:0.375rem">${esc(formatDateTime(n.createdAt))}</p>
              </div>
            </button>
          `
            )
            .join("")}
        </div>`
      : emptyState({ title: "Nenhuma notificação por aqui." });

    list.querySelectorAll("[data-id]").forEach((btn) =>
      btn.addEventListener("click", () => {
        Notifications.markRead(user.id, btn.dataset.id);
        const related = btn.dataset.related;
        if (related) go(`/admin/servicos/${related}`);
        else draw();
      })
    );
  }

  draw();
}
