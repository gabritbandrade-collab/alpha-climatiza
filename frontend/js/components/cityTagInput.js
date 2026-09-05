// Campo de "cidades atendidas" (tags), usado no cadastro/edição de funcionários.
import { icon } from "../lib/icons.js";
import { esc } from "../lib/ui.js";

export function cityTagInputHtml(label = "Região de atendimento") {
  return `
    <div>
      <span class="field-label">${esc(label)}</span>
      <div class="city-input-row">
        <input class="input city-input-city" data-city-name placeholder="Nome da cidade" />
        <input class="input city-input-state" data-city-state placeholder="UF" maxlength="2" />
        <button type="button" class="btn btn-primary btn-md" data-city-add style="flex-shrink:0">${icon("plus", { class: "h-4 w-4" })} Adicionar</button>
      </div>
      <p class="field-hint">Cidades que este funcionário atende. Serviços dessas cidades poderão ser distribuídos automaticamente para ele.</p>
      <div data-city-tags class="mt-3"></div>
    </div>
  `;
}

export function mountCityTagInput(root, initialCities = []) {
  let cities = initialCities.map((c) => ({ city: c.city, state: c.state || undefined }));
  const nameInput = root.querySelector("[data-city-name]");
  const stateInput = root.querySelector("[data-city-state]");
  const tagsEl = root.querySelector("[data-city-tags]");
  const addBtn = root.querySelector("[data-city-add]");

  function renderTags() {
    tagsEl.innerHTML = cities.length
      ? `<div class="flex flex-wrap gap-2">${cities
          .map(
            (c) => `
        <span class="tag">
          ${icon("map-pin", { class: "h-3 w-3" })} ${esc(c.city)}${c.state ? "/" + esc(c.state) : ""}
          <button type="button" class="tag-remove" data-remove="${esc(c.city)}" style="display:inline-flex;border-radius:9999px">${icon("x", { class: "h-3 w-3" })}</button>
        </span>
      `
          )
          .join("")}</div>`
      : `<p class="text-xs text-muted">Nenhuma cidade cadastrada ainda.</p>`;
    tagsEl.querySelectorAll("[data-remove]").forEach((btn) =>
      btn.addEventListener("click", () => {
        cities = cities.filter((c) => c.city !== btn.dataset.remove);
        renderTags();
      })
    );
  }

  function addCity() {
    const trimmed = nameInput.value.trim();
    if (!trimmed) return;
    if (cities.some((c) => c.city.toLowerCase() === trimmed.toLowerCase())) {
      nameInput.value = "";
      return;
    }
    cities.push({ city: trimmed, state: stateInput.value.trim().toUpperCase() || undefined });
    nameInput.value = "";
    stateInput.value = "";
    renderTags();
  }

  addBtn.addEventListener("click", addCity);
  [nameInput, stateInput].forEach((el) =>
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addCity();
      }
    })
  );
  stateInput.addEventListener("input", () => (stateInput.value = stateInput.value.toUpperCase()));

  renderTags();
  return { getValue: () => cities };
}
