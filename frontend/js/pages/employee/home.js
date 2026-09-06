import { icon } from "../../lib/icons.js";
import { Services, Auth } from "../../lib/store.js";
import { emptyState, statusBadge, esc } from "../../lib/ui.js";
import { formatTime, friendlyDay, addDaysIso } from "../../lib/date.js";
import { go } from "../../router.js";

export async function renderEmployeeHomePage(container) {
  const user = Auth.currentUser();
  const dateFrom = new Date().toISOString();
  const dateTo = addDaysIso(new Date(), 7);
  const services = await Services.list({ employeeId: user.id, dateFrom, dateTo });

  const active = services.filter((s) => s.status !== "CANCELLED");
  const next = active.find((s) => s.status === "SCHEDULED" || s.status === "IN_PROGRESS") || active[0];
  const rest = active.filter((s) => s.id !== next?.id);

  const grouped = new Map();
  for (const s of rest) {
    const key = s.scheduledAt.slice(0, 10);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(s);
  }

  container.innerHTML = `
    <div class="p-4">
      <p class="text-sm text-secondary mb-1">Bem-vindo,</p>
      <h1 class="text-lg font-bold text-primary mb-4">${esc(user.name)}</h1>

      <p class="mb-2 flex items-center gap-1-5 text-xs font-semibold uppercase text-muted">${icon("calendar-clock", { class: "h-3.5 w-3.5" })} Próximo serviço</p>

      ${
        !next
          ? emptyState({ title: "Nenhum serviço agendado", description: "Você não tem serviços atribuídos nos próximos dias." })
          : `<button type="button" class="next-service-card" id="next-service">
              <div class="flex items-start justify-between">
                <span style="background:rgba(255,255,255,0.2);border-radius:9999px;padding:0.25rem 0.625rem;font-size:0.75rem;font-weight:500">${esc(friendlyDay(next.scheduledAt))}</span>
                ${icon("chevron-right", { class: "h-5 w-5" })}
              </div>
              <p class="text-lg font-bold" style="margin-top:0.75rem">${esc(next.serviceType)}</p>
              <div class="space-y-1-5" style="margin-top:0.75rem;color:rgba(255,255,255,0.9);font-size:0.875rem">
                <p class="flex items-center gap-2">${icon("clock", { class: "h-4 w-4" })} ${esc(formatTime(next.scheduledAt))}</p>
                <p class="flex items-center gap-2">${icon("wrench", { class: "h-4 w-4" })} ${esc(next.client.name)}</p>
                <p class="flex items-start gap-2">${icon("map-pin", { class: "h-4 w-4" })} ${esc(next.address)}</p>
              </div>
              <div style="margin-top:1rem">${statusBadge(next.status)}</div>
            </button>`
      }

      <p class="text-xs font-semibold uppercase text-muted mb-2" style="margin-top:1.5rem">Serviços da semana</p>
      ${
        grouped.size === 0
          ? `<p class="text-sm text-muted">Nenhum outro serviço nos próximos 7 dias.</p>`
          : `<div class="space-y-5">
              ${Array.from(grouped.entries())
                .sort(([a], [b]) => a.localeCompare(b))
                .map(
                  ([day, items]) => `
                <div>
                  <p class="text-xs font-semibold capitalize text-secondary mb-2">${esc(friendlyDay(day + "T00:00:00"))}</p>
                  <div class="space-y-2">
                    ${items
                      .slice()
                      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
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
            </div>`
      }

      <div style="margin-top:1.5rem">
        <button type="button" class="btn btn-outline btn-md btn-full" id="all-services">Ver todos os meus serviços</button>
      </div>
    </div>
  `;

  container.querySelector("#next-service")?.addEventListener("click", () => go(`/app/servicos/${next.id}`));
  container.querySelectorAll("[data-svc]").forEach((b) => b.addEventListener("click", () => go(`/app/servicos/${b.dataset.svc}`)));
  container.querySelector("#all-services").addEventListener("click", () => go("/app/servicos"));
}
