// Substitui o antigo lib/date.ts baseado em date-fns por helpers nativos (Intl),
// usando sempre o fuso horário local do navegador (mesmo comportamento do date-fns).

const WEEKDAYS_LONG = [
  "domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado",
];
const MONTHS_LONG = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function pad2(n) {
  return String(n).padStart(2, "0");
}

export function formatDate(iso, pattern = "dd/MM/yyyy") {
  const d = new Date(iso);
  const dd = pad2(d.getDate());
  const mm = pad2(d.getMonth() + 1);
  const yyyy = d.getFullYear();
  if (pattern === "dd/MM") return `${dd}/${mm}`;
  return `${dd}/${mm}/${yyyy}`;
}

export function formatDateTime(iso) {
  const d = new Date(iso);
  return `${formatDate(iso)} às ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function formatTime(iso) {
  const d = new Date(iso);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function formatDistanceToNow(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffSec = Math.round(diffMs / 1000);
  const abs = Math.abs(diffSec);
  const suffix = diffSec >= 0 ? "há " : "em ";

  const units = [
    ["ano", 31536000],
    ["mês", 2592000],
    ["semana", 604800],
    ["dia", 86400],
    ["hora", 3600],
    ["minuto", 60],
  ];
  for (const [label, secs] of units) {
    if (abs >= secs) {
      const value = Math.floor(abs / secs);
      const plural = label === "mês" ? "meses" : `${label}s`;
      return `${suffix}${value} ${value === 1 ? label : plural}`;
    }
  }
  return "agora mesmo";
}

export function friendlyDay(iso) {
  const d = new Date(iso);
  const today = new Date();
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((dd - t) / 86400000);
  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Amanhã";
  if (diffDays === -1) return "Ontem";
  return `${WEEKDAYS_LONG[d.getDay()]}, ${pad2(d.getDate())} de ${MONTHS_LONG[d.getMonth()]}`;
}

export function monthYearLabel(date) {
  return `${MONTHS_LONG[date.getMonth()]} ${date.getFullYear()}`;
}

export function toDateInputValue(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function toTimeInputValue(iso) {
  const d = new Date(iso);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function combineDateTime(dateStr, timeStr) {
  // dateStr: yyyy-MM-dd, timeStr: HH:mm -> ISO string in local time
  return new Date(`${dateStr}T${timeStr}:00`).toISOString();
}

export function addDaysIso(baseDate, days) {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function dateKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}
