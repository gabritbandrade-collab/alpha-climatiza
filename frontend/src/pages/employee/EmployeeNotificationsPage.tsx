import { useNavigate } from "react-router-dom";
import { useNotifications } from "../../hooks/useNotifications";
import { EmptyState } from "../../components/ui/Misc";
import { formatDistanceToNow } from "../../lib/date";

export function EmployeeNotificationsPage() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const navigate = useNavigate();

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-[var(--text-primary)]">Notificações</h1>
        {unreadCount > 0 && (
          <button onClick={() => markAllRead()} className="text-xs font-medium text-brand-600">
            Marcar todas como lidas
          </button>
        )}
      </div>
      {notifications.length === 0 ? (
        <EmptyState title="Nenhuma notificação por aqui." />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => {
                if (!n.read) markRead(n.id);
                if (n.relatedServiceId) navigate(`/app/servicos/${n.relatedServiceId}`);
              }}
              className={`flex w-full items-start gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3 text-left ${
                !n.read ? "ring-1 ring-brand-500/30" : ""
              }`}
            >
              {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-600" />}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{n.title}</p>
                <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{n.message}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{formatDistanceToNow(n.createdAt)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
