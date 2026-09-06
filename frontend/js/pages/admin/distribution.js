import { icon } from "../../lib/icons.js";
import { Distribution } from "../../lib/store.js";
import { pageHeader, statusBadge, esc } from "../../lib/ui.js";
import { formatTime } from "../../lib/date.js";
import { go } from "../../router.js";

function statCard({ label, value, iconName, accent, onClick }) {
  return `
    <div class="card stat-card ${onClick ? "card-clickable" : ""}" ${onClick ? `data-stat="${onClick}"` : ""}>
      <div class="stat-card-icon accent-${accent}">${icon(iconName, { class: "h-5 w-5" })}</div>
      <div class="min-w-0">
        <p class="stat-card-value">${value}</p>
        <p class="stat-card-label truncate">${label}</p>
      </div>
    </div>
  `;
}

export async function renderDistributionPage(container) {
  const stats = await Distribution.stats();
  let tab = "cities";
  let selectedCity = null;
  let agendas = null;

  async function draw() {
    const cityDetail = stats.byCity.find((c) => c.city === selectedCity);

    container.innerHTML = `
      ${pageHeader({
        title: "Distribuição de Serviços",
        description: "Acompanhe pedidos, distribuição por cidade e a agenda de cada funcionário.",
        actionsHtml: `<button class="link flex items-center gap-1" style="font-size:0.875rem" id="go-requests">Ver solicitações ${icon("external-link", { class: "h-3.5 w-3.5" })}</button>`,
      })}

      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        ${statCard({ label: "Novos pedidos", value: stats.newRequests, iconName: "inbox", accent: "amber", onClick: "/admin/solicitacoes?status=PENDING" })}
        ${statCard({ label: "Aguardando distribuição", value: stats.awaitingRequests, iconName: "clock3", accent: "blue", onClick: "/admin/solicitacoes?status=PENDING" })}
        ${statCard({ label: "Agendados", value: stats.scheduled, iconName: "calendar-clock", accent: "slate", onClick: "/admin/agenda" })}
        ${statCard({ label: "Em andamento", value: stats.inProgress, iconName: "loader", accent: "blue", onClick: "/admin/agenda" })}
        ${statCard({ label: "Concluídos", value: stats.completed, iconName: "check-circle-2", accent: "green", onClick: "/admin/agenda" })}
        ${statCard({ label: "Pendentes", value: stats.pending, iconName: "alert-triangle", accent: "red", onClick: "/admin/agenda" })}
      </div>

      <div class="segmented" style="margin-top:1.5rem;margin-bottom:1rem">
        <button type="button" class="segmented-btn ${tab === "cities" ? "active" : ""}" data-tab="cities">Por cidade</button>
        <button type="button" class="segmented-btn ${tab === "employees" ? "active" : ""}" data-tab="employees">Agenda por funcionário</button>
      </div>

      <div id="dist-body"></div>
    `;

    container.querySelector("#go-requests").addEventListener("click", () => go("/admin/solicitacoes"));
    container.querySelectorAll("[data-stat]").forEach((el) => el.addEventListener("click", () => go(el.dataset.stat)));
    container.querySelectorAll("[data-tab]").forEach((b) =>
      b.addEventListener("click", () => {
        tab = b.dataset.tab;
        draw();
      })
    );

    const body = container.querySelector("#dist-body");
    if (tab === "cities") {
      body.innerHTML = `
        <div class="grid gap-4" style="grid-template-columns:1fr" >
          <div class="card p-3">
            <p class="px-2 mb-2 text-xs font-semibold uppercase text-muted">Cidades atendidas</p>
            ${
              stats.byCity.length === 0
                ? `<p class="px-2 text-sm text-muted">Nenhum serviço com cidade cadastrada ainda.</p>`
                : `<div class="space-y-1">
                    ${stats.byCity
                      .map(
                        (c) => `
                      <button type="button" class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm" data-city="${esc(c.city)}"
                        style="background:${selectedCity === c.city ? "var(--brand-600)" : "transparent"};color:${selectedCity === c.city ? "#fff" : "var(--text-primary)"}">
                        <span class="flex items-center gap-1-5 truncate">${icon("map-pin", { class: "h-3.5 w-3.5" })} ${esc(c.city)}</span>
                        <span>${c.count}</span>
                      </button>`
                      )
                      .join("")}
                  </div>`
            }
          </div>
          <div class="card p-4">
            ${
              !cityDetail
                ? `<p class="text-sm text-secondary">Selecione uma cidade para ver os funcionários responsáveis e os serviços daquela região.</p>`
                : `
                <p class="text-base font-semibold text-primary mb-1">${esc(cityDetail.city)}</p>
                <p class="text-sm text-secondary mb-4">${cityDetail.count} serviço(s) nesta cidade.</p>
                <p class="text-xs font-semibold uppercase text-muted mb-2">Funcionários responsáveis</p>
                <div class="flex flex-wrap gap-2">
                  ${cityDetail.employees.map((e) => `<button type="button" class="tag" data-emp="${esc(e.id)}" style="border:none;cursor:pointer">${esc(e.name)}</button>`).join("")}
                </div>
                <div style="margin-top:1rem">
                  <button type="button" class="link" id="see-city-agenda">Ver todos os serviços em ${esc(cityDetail.city)} →</button>
                </div>
              `
            }
          </div>
        </div>
      `;
      body.querySelectorAll("[data-city]").forEach((btn) =>
        btn.addEventListener("click", () => {
          selectedCity = btn.dataset.city;
          draw();
        })
      );
      body.querySelectorAll("[data-emp]").forEach((btn) => btn.addEventListener("click", () => go(`/admin/funcionarios/${btn.dataset.emp}`)));
      body.querySelector("#see-city-agenda")?.addEventListener("click", () => go(`/admin/agenda?city=${encodeURIComponent(cityDetail.city)}`));
    } else {
      if (!agendas) agendas = await Distribution.byEmployee();
      body.innerHTML = `<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        ${agendas
          .map(
            (a) => `
          <div class="card p-4">
            <p class="text-sm font-semibold text-primary">${esc(a.name)}</p>
            <p class="text-xs text-muted mb-1">${esc(a.cargo || "")}</p>
            <p class="flex flex-wrap gap-1 mb-3">${a.cities.map((c) => `<span class="tag-plain">${esc(c)}</span>`).join("")}</p>
            ${
              a.services.length === 0
                ? `<p class="text-xs text-muted">Nenhum serviço futuro/ativo.</p>`
                : `<div class="space-y-1-5">
                    ${a.services
                      .slice(0, 6)
                      .map(
                        (s) => `
                      <button type="button" class="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1-5 text-left" style="font-size:0.75rem" data-svc="${esc(s.id)}">
                        <span class="min-w-0 truncate"><span class="font-medium text-primary">${esc(formatTime(s.scheduledAt))}</span> <span class="text-secondary">— ${esc(s.clientName)} (${esc(s.city || "—")})</span></span>
                        ${statusBadge(s.status, "sm")}
                      </button>`
                      )
                      .join("")}
                    ${a.services.length > 6 ? `<p class="px-2" style="font-size:10px;color:var(--text-muted)">+${a.services.length - 6} serviço(s)</p>` : ""}
                  </div>`
            }
          </div>
        `
          )
          .join("")}
      </div>`;
      body.querySelectorAll("[data-svc]").forEach((btn) => btn.addEventListener("click", () => go(`/admin/servicos/${btn.dataset.svc}`)));
    }
  }

  draw();
}
