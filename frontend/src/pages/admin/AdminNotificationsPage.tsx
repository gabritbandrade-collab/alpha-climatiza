import { useNavigate } from "react-router-dom";
import { useNotifications } from "../../hooks/useNotifications";
import { PageHeader, EmptyState } from "../../components/ui/Misc";
import { Button } from "../../components/ui/Button";
import { formatDateTime } from "../../lib/date";

export function AdminNotificationsPage() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Notificações"
        description="Acompanhe eventos importantes registrados pelos funcionários."
        actions={
          unreadCount > 0 ? (
            <Button variant="outline" size="sm" onClick={() => markAllRead()}>
              Marcar todas como lidas
            </Button>
          ) : undefined
        }
      />
      {notifications.length === 0 ? (
        <EmptyState title="Nenhuma notificação por aqui." />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => {
                if (!n.read) markRead(n.id);
                if (n.relatedServiceId) navigate(`/admin/servicos/${n.relatedServiceId}`);
              }}
              className={`flex w-full items-start gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 text-left hover:shadow-md ${
                !n.read ? "ring-1 ring-brand-500/30" : ""
              }`}
            >
              {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-600" />}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{n.title}</p>
                <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{n.message}</p>
                <p className="mt-1.5 text-xs text-[var(--text-muted)]">{formatDateTime(n.createdAt)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
