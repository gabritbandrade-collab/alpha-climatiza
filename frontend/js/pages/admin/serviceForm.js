import { Services, Employees, Auth, getEmployeeSuggestions, STATUS_LABELS_PT } from "../../lib/store.js";
import { backLink, pageHeader, fullPageSpinner, esc, errorMessage, showToast, confirmDialog, PRIORITY_LABELS_PT } from "../../lib/ui.js";
import { toDateInputValue, toTimeInputValue, combineDateTime } from "../../lib/date.js";
import { go } from "../../router.js";

const SERVICE_TYPES = [
  "Instalação de Ar Condicionado Split",
  "Instalação de Climatizador",
  "Manutenção Preventiva",
  "Manutenção Corretiva",
  "Limpeza de Filtros",
  "Troca de Gás Refrigerante",
  "Outro",
];

export async function renderServiceFormPage(container, params) {
  const isEdit = Boolean(params.id);
  const employees = (await Employees.list()).filter((e) => e.status === "ACTIVE");

  let service = null;
  if (isEdit) {
    container.innerHTML = fullPageSpinner();
    try {
      service = await Services.get(params.id);
    } catch (err) {
      showToast(errorMessage(err), "error");
      go("/admin/agenda");
      return;
    }
  }

  const initial = service
    ? {
        clientName: service.client.name,
        employeeId: service.employeeId,
        serviceType: SERVICE_TYPES.includes(service.serviceType) ? service.serviceType : "Outro",
        customType: SERVICE_TYPES.includes(service.serviceType) ? "" : service.serviceType,
        date: toDateInputValue(service.scheduledAt),
        time: toTimeInputValue(service.scheduledAt),
        address: service.address,
        city: service.city || "",
        state: service.state || "",
        priority: service.priority || "NORMAL",
        description: service.description || "",
        notes: service.notes || "",
        materialsPlan: service.materialsPlan || "",
        status: service.status,
      }
    : {
        clientName: "",
        employeeId: "",
        serviceType: SERVICE_TYPES[0],
        customType: "",
        date: "",
        time: "09:00",
        address: "",
        city: "",
        state: "",
        priority: "NORMAL",
        description: "",
        notes: "",
        materialsPlan: "",
        status: "SCHEDULED",
      };

  container.innerHTML = `
    <div class="mx-auto max-w-2xl">
      ${backLink()}
      ${pageHeader({ title: isEdit ? "Editar Serviço" : "Novo Serviço", description: "Preencha os dados do agendamento." })}
      <div class="card p-5">
        <form id="service-form" class="space-y-4">
          <div class="form-grid-2">
            <label class="block">
              <span class="field-label">Cliente <span class="field-required">*</span></span>
              <input class="input" name="clientName" required value="${esc(initial.clientName)}" placeholder="Nome do cliente ou empresa" />
            </label>
            <label class="block">
              <span class="field-label">Funcionário responsável <span class="field-required">*</span></span>
              <select class="select" name="employeeId" required>
                <option value="">Selecione o funcionário</option>
                ${employees.map((e) => `<option value="${esc(e.id)}" ${initial.employeeId === e.id ? "selected" : ""}>${esc(e.name)}${e.cargo ? " — " + esc(e.cargo) : ""}</option>`).join("")}
              </select>
            </label>
          </div>

          <div class="form-grid-2">
            <label class="block">
              <span class="field-label">Tipo de serviço <span class="field-required">*</span></span>
              <select class="select" name="serviceType" required>
                ${SERVICE_TYPES.map((t) => `<option value="${esc(t)}" ${initial.serviceType === t ? "selected" : ""}>${esc(t)}</option>`).join("")}
              </select>
            </label>
            <label class="block" id="custom-type-wrap" style="${initial.serviceType === "Outro" ? "" : "display:none"}">
              <span class="field-label">Especifique o tipo <span class="field-required">*</span></span>
              <input class="input" name="customType" value="${esc(initial.customType)}" />
            </label>
          </div>

          <div class="form-grid-2">
            <label class="block">
              <span class="field-label">Data <span class="field-required">*</span></span>
              <input class="input" type="date" name="date" required value="${esc(initial.date)}" />
            </label>
            <label class="block">
              <span class="field-label">Horário <span class="field-required">*</span></span>
              <input class="input" type="time" name="time" required value="${esc(initial.time)}" />
            </label>
          </div>

          <label class="block">
            <span class="field-label">Endereço do serviço <span class="field-required">*</span></span>
            <input class="input" name="address" required value="${esc(initial.address)}" placeholder="Rua, número, bairro, cidade" />
          </label>

          <div class="form-grid-address">
            <label class="block">
              <span class="field-label">Cidade</span>
              <input class="input" name="city" value="${esc(initial.city)}" />
            </label>
            <label class="block">
              <span class="field-label">Estado (UF)</span>
              <input class="input" name="state" maxlength="2" value="${esc(initial.state)}" style="text-transform:uppercase" />
            </label>
            <label class="block">
              <span class="field-label">Prioridade</span>
              <select class="select" name="priority">
                ${Object.entries(PRIORITY_LABELS_PT).map(([k, v]) => `<option value="${k}" ${initial.priority === k ? "selected" : ""}>${esc(v)}</option>`).join("")}
              </select>
            </label>
          </div>

          <div id="conflict-warning"></div>

          <label class="block">
            <span class="field-label">Descrição / o que precisa ser feito</span>
            <textarea class="textarea" name="description" placeholder="Ex: Instalar 2 unidades split de 12.000 BTUs no salão...">${esc(initial.description)}</textarea>
          </label>

          <label class="block">
            <span class="field-label">Observações da empresa</span>
            <textarea class="textarea" name="notes" placeholder="Instruções, restrições de acesso, contato no local...">${esc(initial.notes)}</textarea>
          </label>

          <label class="block">
            <span class="field-label">Materiais previstos</span>
            <textarea class="textarea" name="materialsPlan" placeholder="Ex: 2x unidade split 12.000 BTUs, suportes, tubulação...">${esc(initial.materialsPlan)}</textarea>
          </label>

          ${
            isEdit
              ? `<label class="block">
                  <span class="field-label">Status</span>
                  <select class="select" name="status">
                    ${Object.entries(STATUS_LABELS_PT).map(([k, v]) => `<option value="${k}" ${initial.status === k ? "selected" : ""}>${esc(v)}</option>`).join("")}
                  </select>
                </label>`
              : ""
          }

          <div id="form-error"></div>

          <div class="flex justify-end gap-2 pt-2">
            ${isEdit ? `<button type="button" class="btn btn-danger btn-md" id="delete-btn" style="margin-right:auto">Excluir serviço</button>` : ""}
            <button type="button" class="btn btn-outline btn-md" id="cancel-btn">Cancelar</button>
            <button type="submit" class="btn btn-primary btn-md" id="submit-btn">${isEdit ? "Salvar alterações" : "Criar serviço"}</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const form = container.querySelector("#service-form");
  const employeeSelect = form.elements.employeeId;
  const cityInput = form.elements.city;
  const stateInput = form.elements.state;

  form.elements.serviceType.addEventListener("change", (e) => {
    container.querySelector("#custom-type-wrap").style.display = e.target.value === "Outro" ? "" : "none";
  });
  stateInput.addEventListener("input", () => (stateInput.value = stateInput.value.toUpperCase()));

  async function checkConflict() {
    const warnEl = container.querySelector("#conflict-warning");
    warnEl.innerHTML = "";
    const employeeId = employeeSelect.value;
    const city = cityInput.value;
    const date = form.elements.date.value;
    const time = form.elements.time.value;
    if (!employeeId || !city || !date || !time) return;
    const targetAt = new Date(`${date}T${time}:00`);
    const suggestions = await getEmployeeSuggestions({ city, targetAt, excludeServiceId: params.id });
    const match = suggestions.find((s) => s.id === employeeId);
    if (match?.conflict?.hasConflict) {
      warnEl.innerHTML = `<p class="alert-warning">⚠️ Este funcionário já possui "${esc(match.conflict.conflictingService.serviceType)}" agendado próximo deste horário.</p>`;
    }
  }
  [employeeSelect, cityInput, form.elements.date, form.elements.time].forEach((el) => el.addEventListener("input", checkConflict));
  checkConflict();

  container.querySelector("#cancel-btn").addEventListener("click", () => history.back());

  container.querySelector("#delete-btn")?.addEventListener("click", () => {
    confirmDialog({
      title: "Excluir serviço",
      message: "Esta ação é permanente e removerá todos os dados, fotos e histórico deste serviço. Deseja continuar?",
      confirmLabel: "Excluir",
      danger: true,
      onConfirm: async () => {
        await Services.delete(params.id);
        showToast("Serviço excluído.");
        go("/admin/agenda");
      },
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorEl = container.querySelector("#form-error");
    errorEl.innerHTML = "";
    const fd = new FormData(form);
    const clientName = (fd.get("clientName") || "").trim();
    const employeeId = fd.get("employeeId");
    const date = fd.get("date");
    const time = fd.get("time");
    const address = fd.get("address");
    if (!clientName || !employeeId || !date || !time || !address) {
      errorEl.innerHTML = `<p class="alert-error">Preencha todos os campos obrigatórios.</p>`;
      return;
    }
    const submitBtn = container.querySelector("#submit-btn");
    submitBtn.disabled = true;

    const payload = {
      clientName,
      employeeId,
      serviceType: fd.get("serviceType") === "Outro" ? fd.get("customType") : fd.get("serviceType"),
      scheduledAt: combineDateTime(date, time),
      address,
      city: fd.get("city"),
      state: fd.get("state"),
      priority: fd.get("priority"),
      description: fd.get("description"),
      notes: fd.get("notes"),
      materialsPlan: fd.get("materialsPlan"),
      status: fd.get("status") || undefined,
    };

    try {
      const user = Auth.currentUser();
      if (isEdit) {
        await Services.update(params.id, payload, user.id);
        showToast("Serviço atualizado com sucesso.");
        go(`/admin/servicos/${params.id}`);
      } else {
        const created = await Services.create(payload, user.id);
        showToast("Serviço criado e atribuído ao funcionário.");
        go(`/admin/servicos/${created.id}`);
      }
    } catch (err) {
      errorEl.innerHTML = `<p class="alert-error">${esc(errorMessage(err))}</p>`;
      submitBtn.disabled = false;
    }
  });
}
