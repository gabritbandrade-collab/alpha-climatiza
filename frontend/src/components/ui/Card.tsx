import type { HTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

export function Card({ className, children, onClick, onKeyDown, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] shadow-sm",
        className
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick(e as any);
        }
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  accent = "brand",
  onClick,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  accent?: "brand" | "amber" | "blue" | "green" | "red" | "slate";
  onClick?: () => void;
}) {
  const accentClasses: Record<string, string> = {
    brand: "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    green: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    red: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  };
  return (
    <Card
      onClick={onClick}
      className={clsx("p-4 flex items-center gap-3", onClick && "cursor-pointer hover:shadow-md transition-shadow")}
    >
      <div className={clsx("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", accentClasses[accent])}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-[var(--text-primary)] leading-tight">{value}</p>
        <p className="text-xs text-[var(--text-secondary)] truncate">{label}</p>
      </div>
    </Card>
  );
}
