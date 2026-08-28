import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../hooks/useNotifications";
import { formatDistanceToNow } from "../lib/date";

export function NotificationBell({ basePath }: { basePath: string }) {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 max-w-[90vw] rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] shadow-xl">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] px-4 py-3">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Notificações</p>
            {unreadCount > 0 && (
              <button onClick={() => markAllRead()} className="text-xs text-brand-600 hover:underline">
                Marcar todas como lidas
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">Nenhuma notificação por aqui.</p>
            )}
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  if (!n.read) markRead(n.id);
                  setOpen(false);
                  if (n.relatedServiceId) navigate(`${basePath}/servicos/${n.relatedServiceId}`);
                }}
                className={`block w-full border-b border-[var(--border-color)] px-4 py-3 text-left last:border-0 hover:bg-[var(--surface-muted)] ${
                  !n.read ? "bg-brand-50/60 dark:bg-brand-900/10" : ""
                }`}
              >
                <div className="flex items-start gap-2">
                  {!n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" />}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{n.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-[var(--text-secondary)]">{n.message}</p>
                    <p className="mt-1 text-[11px] text-[var(--text-muted)]">{formatDistanceToNow(n.createdAt)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
