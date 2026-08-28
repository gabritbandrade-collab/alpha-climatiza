import {
  format,
  formatDistanceToNow as fnsFormatDistanceToNow,
  isToday,
  isTomorrow,
  isYesterday,
  parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";

export function formatDate(iso: string, pattern = "dd/MM/yyyy"): string {
  return format(parseISO(iso), pattern, { locale: ptBR });
}

export function formatDateTime(iso: string): string {
  return format(parseISO(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

export function formatTime(iso: string): string {
  return format(parseISO(iso), "HH:mm", { locale: ptBR });
}

export function formatDistanceToNow(iso: string): string {
  return fnsFormatDistanceToNow(parseISO(iso), { locale: ptBR, addSuffix: true });
}

export function friendlyDay(iso: string): string {
  const date = parseISO(iso);
  if (isToday(date)) return "Hoje";
  if (isTomorrow(date)) return "Amanhã";
  if (isYesterday(date)) return "Ontem";
  return format(date, "EEEE, dd 'de' MMMM", { locale: ptBR });
}

export function toDateInputValue(iso: string): string {
  return format(parseISO(iso), "yyyy-MM-dd");
}

export function toTimeInputValue(iso: string): string {
  return format(parseISO(iso), "HH:mm");
}
