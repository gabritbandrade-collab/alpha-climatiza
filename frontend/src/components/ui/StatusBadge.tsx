import { STATUS_DOT, STATUS_LABELS, type ServiceStatus } from "../../types";
import clsx from "clsx";

const bg: Record<ServiceStatus, string> = {
  SCHEDULED: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  IN_PROGRESS: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  COMPLETED: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  PENDING: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  CANCELLED: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

export function StatusBadge({ status, size = "md" }: { status: ServiceStatus; size?: "sm" | "md" }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap",
        bg[status],
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
      )}
    >
      <span>{STATUS_DOT[status]}</span>
      {STATUS_LABELS[status]}
    </span>
  );
}
