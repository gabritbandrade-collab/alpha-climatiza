import { Services, Auth, STATUS_LABELS_PT } from "../../lib/store.js";
import { icon } from "../../lib/icons.js";
import { emptyState, statusBadge, esc } from "../../lib/ui.js";
import { formatTime, friendlyDay, formatDate } from "../../lib/date.js";
import { go } from "../../router.js";

export async function renderEmployeeServicesPage(container) {
  const user = Auth.currentUser();
  let status = "";
  let search = "";

  async function draw() {
    const all = await Services.list({ employeeId: user.id });
    const filtered = all.filter((s) => {
      if (status && s.status !== status) return false;
      if (search) {
        const q = search.toLowerCase();
        return s.serviceType.toLowerCase().includes(q) || s.client.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q);
      }
      return true;
    });

    const grouped = new Map();
    for (const s of filtered) {
      const key = s.scheduledAt.slice(0, 10);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(s);
    }
    const groupedArr = Array.from(grouped.entries()).sort(([a], [b]) => b.localeCompare(a));

    container.innerHTML = `
      <div class="p-4">
        <h1 class="text-lg font-bold text-primary mb-3">Meus Serviços</h1>
        <div class="input-icon-wrap mb-3">
          <span class="input-icon">${icon("search", { class: "h-4 w-4" })}</span>
          <input class="input" id="search-input" placeholder="Buscar serviço ou cliente..." value="${esc(search)}" />
        </div>
        <div class="mb-4" style="display:flex;gap:0.5rem;overflow-x:auto;padding-bottom:0.25rem">
          <button type="button" class="chip ${status === "" ? "active" : ""}" data-status="">Todos</button>
          ${Object.entries(STATUS_LABELS_PT).map(([k, v]) => `<button type="button" class="chip ${status === k ? "active" : ""}" data-status="${k}">${esc(v)}</button>`).join("")}
        </div>
        <div id="list"></div>
      </div>
    `;

    container.querySelector("#search-input").addEventListener("input", (e) => {
      search = e.target.value;
      draw();
    });
    container.querySelectorAll("[data-status]").forEach((b) =>
      b.addEventListener("click", () => {
        status = b.dataset.status;
        draw();
      })
    );

    const list = container.querySelector("#list");
    list.innerHTML =
      groupedArr.length === 0
        ? emptyState({ title: "Nenhum serviço encontrado", description: "Ajuste os filtros para ver mais resultados." })
        : `<div class="space-y-5">
            ${groupedArr
              .map(
                ([day, items]) => `
              <div>
                <p class="text-xs font-semibold capitalize text-secondary mb-2">${esc(friendlyDay(day + "T00:00:00"))} · ${esc(formatDate(day + "T00:00:00"))}</p>
                <div class="space-y-2">
                  ${items
                    .map(
                      (s) => `
                    <button type="button" class="flex w-full items-center gap-3 rounded-xl border p-3 text-left" style="border-color:var(--border-color);background:var(--surface-elevated)" data-svc="${esc(s.id)}">
                      <div class="flex h-11 w-14 shrink-0 flex-col items-center justify-center rounded-lg" style="background:var(--surface-muted)">
                        <span class="text-xs font-bold text-primary">${esc(formatTime(s.scheduledAt))}</span>
                      </div>
                      <div class="min-w-0 flex-1">
                        <p class="truncate text-sm font-semibold text-primary">${esc(s.serviceType)}</p>
                        <p class="truncate text-xs text-secondary">${esc(s.client.name)}</p>
                      </div>
                      ${statusBadge(s.status, "sm")}
                    </button>`
                    )
                    .join("")}
                </div>
              </div>`
              )
              .join("")}
          </div>`;
    list.querySelectorAll("[data-svc]").forEach((b) => b.addEventListener("click", () => go(`/app/servicos/${b.dataset.svc}`)));
  }

  draw();
}
