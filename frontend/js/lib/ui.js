// Pequenos helpers de interface: escape de HTML, toasts, modais, confirmação,
// badges e exportação de relatórios (CSV / Excel / PDF) — tudo sem dependências.
import { icon } from "./icons.js";
import { STATUS_LABELS_PT } from "./store.js";

export function esc(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function errorMessage(err, fallback = "Ocorreu um erro. Tente novamente.") {
  return err?.message || fallback;
}

// ---------------------------------------------------------------------------
// Toasts
// ---------------------------------------------------------------------------
let toastRoot = null;
let toastSeq = 0;

export function showToast(message, type = "success") {
  if (!toastRoot) toastRoot = document.getElementById("toast-root");
  const id = ++toastSeq;
  const iconName = type === "success" ? "check-circle-2" : type === "error" ? "x-circle" : "info";
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.dataset.id = String(id);
  el.innerHTML = `
    <span class="toast-icon">${icon(iconName, { class: "h-5 w-5" })}</span>
    <p class="toast-message">${esc(message)}</p>
    <button class="toast-close" type="button">${icon("x", { class: "h-4 w-4" })}</button>
  `;
  el.querySelector(".toast-close").addEventListener("click", () => el.remove());
  toastRoot.appendChild(el);
  setTimeout(() => el.remove(), 4500);
}

// ---------------------------------------------------------------------------
// Modal genérico
// ---------------------------------------------------------------------------
let modalRoot = null;

export function openModal({ title, bodyHtml, footerHtml, size = "md", onMount, onClose }) {
  if (!modalRoot) modalRoot = document.getElementById("modal-root");
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal modal-${size}">
      ${
        title
          ? `<div class="modal-header"><h3 class="modal-title">${esc(title)}</h3><button class="icon-btn modal-close-btn" type="button">${icon("x", { class: "h-5 w-5" })}</button></div>`
          : ""
      }
      <div class="modal-body">${bodyHtml}</div>
      ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ""}
    </div>
  `;
  modalRoot.appendChild(overlay);

  function close() {
    overlay.remove();
    onClose?.();
  }
  overlay.querySelector(".modal-backdrop").addEventListener("click", close);
  overlay.querySelector(".modal-close-btn")?.addEventListener("click", close);

  const api = { el: overlay, close };
  onMount?.(api);
  return api;
}

export function confirmDialog({ title, message, confirmLabel = "Confirmar", danger = false, onConfirm }) {
  const modal = openModal({
    size: "sm",
    bodyHtml: `
      <div class="flex flex-col items-center text-center gap-3">
        <div class="confirm-icon-wrap ${danger ? "confirm-icon-danger" : "confirm-icon-warning"}">
          ${icon("alert-triangle", { class: "h-6 w-6" })}
        </div>
        <h3 class="font-semibold text-primary">${esc(title)}</h3>
        <p class="text-sm text-secondary">${esc(message)}</p>
        <div class="flex w-full gap-2" style="margin-top:0.75rem">
          <button type="button" class="btn btn-outline btn-md btn-full" data-act="cancel">Cancelar</button>
          <button type="button" class="btn ${danger ? "btn-danger" : "btn-primary"} btn-md btn-full" data-act="confirm">
            ${esc(confirmLabel)}
          </button>
        </div>
      </div>
    `,
    onMount: (api) => {
      api.el.querySelector('[data-act="cancel"]').addEventListener("click", api.close);
      api.el.querySelector('[data-act="confirm"]').addEventListener("click", async () => {
        const btn = api.el.querySelector('[data-act="confirm"]');
        btn.disabled = true;
        btn.innerHTML = `${icon("loader", { class: "h-4 w-4" })} Aguarde...`;
        try {
          await onConfirm();
          api.close();
        } catch (err) {
          showToast(errorMessage(err), "error");
          btn.disabled = false;
          btn.textContent = confirmLabel;
        }
      });
    },
  });
  return modal;
}

// ---------------------------------------------------------------------------
// Badges / pequenos componentes visuais reutilizáveis
// ---------------------------------------------------------------------------
const STATUS_DOT = { SCHEDULED: "🟡", IN_PROGRESS: "🔵", COMPLETED: "🟢", PENDING: "🔴", CANCELLED: "⚫" };

export function statusBadge(status, size = "md") {
  return `<span class="badge badge-${status} ${size === "sm" ? "badge-sm" : ""}">
    <span>${STATUS_DOT[status] || ""}</span>${esc(STATUS_LABELS_PT[status] || status)}
  </span>`;
}

export const PRIORITY_LABELS_PT = { LOW: "Baixa", NORMAL: "Normal", HIGH: "Alta", URGENT: "Urgente" };
export const REQUEST_STATUS_LABELS_PT = { PENDING: "Aguardando distribuição", ASSIGNED: "Atribuído", CANCELLED: "Cancelado" };

export function priorityBadge(priority) {
  return `<span class="tag-plain badge-priority-${priority}" style="border-radius:9999px;padding:0.125rem 0.625rem;font-size:0.6875rem;font-weight:500">${esc(PRIORITY_LABELS_PT[priority] || priority)}</span>`;
}

export function requestStatusBadge(status) {
  return `<span class="tag-plain badge-req-${status}" style="border-radius:9999px;padding:0.25rem 0.625rem;font-size:0.6875rem;font-weight:500">${esc(REQUEST_STATUS_LABELS_PT[status] || status)}</span>`;
}

export function avatarInitial(name, photoUrl, sizeClass = "avatar-circle") {
  if (photoUrl) return `<div class="${sizeClass}"><img src="${esc(photoUrl)}" alt="${esc(name)}" /></div>`;
  const initial = (name || "?").charAt(0).toUpperCase();
  return `<div class="${sizeClass}">${esc(initial)}</div>`;
}

export function emptyState({ title, description, iconName = "inbox", actionHtml = "" }) {
  return `
    <div class="empty-state">
      <div class="empty-state-icon">${icon(iconName, { class: "h-6 w-6" })}</div>
      <p class="empty-state-title">${esc(title)}</p>
      ${description ? `<p class="empty-state-desc">${esc(description)}</p>` : ""}
      ${actionHtml ? `<div class="empty-state-action">${actionHtml}</div>` : ""}
    </div>
  `;
}

export function pageHeader({ title, description, actionsHtml = "" }) {
  return `
    <div class="page-header">
      <div>
        <h1 class="page-header-title">${esc(title)}</h1>
        ${description ? `<p class="page-header-desc">${esc(description)}</p>` : ""}
      </div>
      ${actionsHtml ? `<div class="page-header-actions">${actionsHtml}</div>` : ""}
    </div>
  `;
}

export function fullPageSpinner() {
  return `<div class="full-page-spinner"><span class="spinner spinner-lg"></span></div>`;
}

export function backLink(label = "Voltar") {
  return `<button type="button" class="back-link" data-nav-back>${icon("arrow-left", { class: "h-4 w-4" })} ${esc(label)}</button>`;
}

// ---------------------------------------------------------------------------
// Gráficos simples (SVG / CSS), sem dependências externas
// ---------------------------------------------------------------------------
export function svgAreaChart(data, { height = 220 } = {}) {
  if (!data.length) return `<p class="text-sm text-muted" style="padding:2rem 0;text-align:center">Sem dados suficientes.</p>`;
  const width = 600;
  const padTop = 10,
    padBottom = 22,
    padX = 6;
  const max = Math.max(1, ...data.map((d) => d.value));
  const stepX = data.length > 1 ? (width - padX * 2) / (data.length - 1) : 0;
  const points = data.map((d, i) => [padX + i * stepX, padTop + (1 - d.value / max) * (height - padTop - padBottom)]);
  const linePath = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const baseY = height - padBottom;
  const areaPath = `${linePath} L${points[points.length - 1][0].toFixed(1)},${baseY} L${points[0][0].toFixed(1)},${baseY} Z`;
  const showEvery = Math.max(1, Math.ceil(data.length / 8));
  const labels = data
    .map((d, i) =>
      i % showEvery === 0 || i === data.length - 1
        ? `<text x="${points[i][0].toFixed(1)}" y="${height - 4}" font-size="10" fill="var(--text-muted)" text-anchor="middle">${esc(d.label)}</text>`
        : ""
    )
    .join("");
  return `
    <svg viewBox="0 0 ${width} ${height}" class="chart-svg-wrap" preserveAspectRatio="none" style="height:${height}px;width:100%">
      <defs><linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stop-color="var(--brand-500)" stop-opacity="0.35"/>
        <stop offset="95%" stop-color="var(--brand-500)" stop-opacity="0"/>
      </linearGradient></defs>
      ${[0.25, 0.5, 0.75].map((f) => `<line x1="0" x2="${width}" y1="${padTop + f * (height - padTop - padBottom)}" y2="${padTop + f * (height - padTop - padBottom)}" stroke="var(--border-color)" stroke-width="1"/>`).join("")}
      <path d="${areaPath}" fill="url(#areaGrad)" stroke="none"/>
      <path d="${linePath}" fill="none" stroke="var(--brand-600)" stroke-width="2"/>
      ${labels}
    </svg>
  `;
}

export function donutChart(segments, { size = 170 } = {}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  let acc = 0;
  const stops = total
    ? segments
        .map((s) => {
          const start = (acc / total) * 360;
          acc += s.value;
          const end = (acc / total) * 360;
          return `${s.color} ${start.toFixed(2)}deg ${end.toFixed(2)}deg`;
        })
        .join(", ")
    : "var(--border-color) 0deg 360deg";
  const legend = segments
    .map((s) => `<div class="chart-legend-item"><span class="chart-legend-dot" style="background:${s.color}"></span>${esc(s.label)} (${s.value})</div>`)
    .join("");
  return `
    <div style="display:flex;flex-direction:column;align-items:center;gap:0.75rem">
      <div style="width:${size}px;height:${size}px;border-radius:9999px;background:conic-gradient(${stops});display:flex;align-items:center;justify-content:center">
        <div style="width:${Math.round(size * 0.6)}px;height:${Math.round(size * 0.6)}px;border-radius:9999px;background:var(--surface-elevated);display:flex;align-items:center;justify-content:center;flex-direction:column">
          <span style="font-size:1.25rem;font-weight:700;color:var(--text-primary)">${total}</span>
          <span style="font-size:0.6875rem;color:var(--text-muted)">total</span>
        </div>
      </div>
      <div class="chart-legend">${legend}</div>
    </div>
  `;
}

export function horizontalBarChart(items) {
  if (!items.length) return `<p class="text-sm text-muted">Sem dados.</p>`;
  const max = Math.max(1, ...items.map((i) => i.value));
  return `<div style="display:flex;flex-direction:column;gap:0.625rem">
    ${items
      .map(
        (i) => `
      <div>
        <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--text-secondary);margin-bottom:0.25rem">
          <span>${esc(i.label)}</span><span>${i.value}</span>
        </div>
        <div style="background:var(--surface-muted);border-radius:9999px;height:0.5rem;overflow:hidden">
          <div style="width:${((i.value / max) * 100).toFixed(1)}%;background:var(--brand-500);height:100%;border-radius:9999px"></div>
        </div>
      </div>`
      )
      .join("")}
  </div>`;
}

export function verticalBarChart(items, { height = 180 } = {}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return `<div style="display:flex;align-items:flex-end;gap:0.75rem;height:${height}px">
    ${items
      .map(
        (i) => `
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:0.375rem;height:100%;justify-content:flex-end">
        <span style="font-size:0.75rem;color:var(--text-secondary)">${i.value}</span>
        <div style="width:100%;max-width:2.5rem;background:var(--brand-500);border-radius:6px 6px 0 0;height:${Math.max(4, (i.value / max) * 100)}%"></div>
        <span style="font-size:0.6875rem;color:var(--text-muted);text-align:center">${esc(i.label)}</span>
      </div>`
      )
      .join("")}
  </div>`;
}

// ---------------------------------------------------------------------------
// Exportação de relatórios (sem dependências externas)
// ---------------------------------------------------------------------------
function downloadBlob(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function csvCell(v) {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

const REPORT_HEADERS = ["Tipo de Serviço", "Cliente", "Funcionário", "Status", "Agendado em", "Iniciado em", "Concluído em", "Endereço"];

function reportRowsAsArrays(rows) {
  return rows.map((s) => [
    s.serviceType,
    s.client,
    s.employee,
    s.statusLabel,
    new Date(s.scheduledAt).toLocaleString("pt-BR"),
    s.startedAt ? new Date(s.startedAt).toLocaleString("pt-BR") : "",
    s.completedAt ? new Date(s.completedAt).toLocaleString("pt-BR") : "",
    s.address,
  ]);
}

export function exportReportCsv(rows) {
  const lines = [REPORT_HEADERS.join(";"), ...reportRowsAsArrays(rows).map((r) => r.map(csvCell).join(";"))];
  downloadBlob("﻿" + lines.join("\r\n"), "relatorio-servicos.csv", "text/csv;charset=utf-8");
}

export function exportReportXlsx(rows) {
  const headerHtml = REPORT_HEADERS.map((h) => `<th>${esc(h)}</th>`).join("");
  const bodyHtml = reportRowsAsArrays(rows)
    .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
    .join("");
  const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8">
    <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
    <x:Name>Serviços</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
    </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
    </head><body><table border="1">${`<tr>${headerHtml}</tr>`}${bodyHtml}</table></body></html>`;
  downloadBlob(html, "relatorio-servicos.xls", "application/vnd.ms-excel;charset=utf-8");
}

export function exportReportPdf(rows) {
  const headerHtml = REPORT_HEADERS.map((h) => `<th>${esc(h)}</th>`).join("");
  const bodyHtml = reportRowsAsArrays(rows)
    .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
    .join("");
  const win = window.open("", "_blank");
  if (!win) {
    showToast("Permita pop-ups para exportar o PDF.", "error");
    return;
  }
  win.document.write(`
    <html><head><meta charset="UTF-8"><title>Relatório de Serviços</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
      h1 { font-size: 18px; margin: 0 0 4px; }
      p.meta { font-size: 11px; color: #555; margin: 0 0 16px; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
      th { background: #f1f5f9; }
    </style>
    </head><body>
      <h1>Relatório de Serviços - ALPHA CLIMATIZAÇÃO</h1>
      <p class="meta">Gerado em ${new Date().toLocaleString("pt-BR")}</p>
      <table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>
      <script>window.onload = () => setTimeout(() => window.print(), 200);<\/script>
    </body></html>
  `);
  win.document.close();
}
