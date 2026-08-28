import type { ReactNode } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  if (!open) return null;

  const sizeClasses = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" }[size];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" onClick={onClose} />
      <div
        className={`relative w-full ${sizeClasses} max-h-[90vh] flex flex-col rounded-2xl bg-[var(--surface-elevated)] shadow-2xl border border-[var(--border-color)]`}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-[var(--border-color)] px-5 py-4 shrink-0">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="overflow-y-auto px-5 py-4 grow">{children}</div>
        {footer && <div className="border-t border-[var(--border-color)] px-5 py-3 shrink-0 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
