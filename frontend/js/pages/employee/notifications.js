import { Auth, Notifications } from "../../lib/store.js";
import { emptyState, esc } from "../../lib/ui.js";
import { formatDistanceToNow } from "../../lib/date.js";
import { go } from "../../router.js";

export async function renderEmployeeNotificationsPage(container) {
  const user = Auth.currentUser();

  function draw() {
    const notifications = Notifications.list(user.id);
    const unreadCount = notifications.filter((n) => !n.read).length;

    container.innerHTML = `
      <div class="p-4">
        <div class="flex items-center justify-between" style="margin-bottom:1rem">
          <h1 class="text-lg font-bold text-primary">Notificações</h1>
          ${unreadCount > 0 ? `<button type="button" class="link" style="font-size:0.75rem" id="mark-all">Marcar todas como lidas</button>` : ""}
        </div>
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
                <p class="notif-time">${esc(formatDistanceToNow(n.createdAt))}</p>
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
        if (related) go(`/app/servicos/${related}`);
        else draw();
      })
    );
  }

  draw();
}
