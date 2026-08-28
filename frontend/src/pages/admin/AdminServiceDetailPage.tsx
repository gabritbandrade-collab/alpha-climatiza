import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Phone,
  User,
  Wrench,
  Pencil,
  Trash2,
  Package,
  AlertTriangle,
  Clock,
  Image as ImageIcon,
  History,
  Repeat,
} from "lucide-react";
import { api, apiErrorMessage, fileUrl } from "../../lib/api";
import type { EmployeeSuggestion, Service } from "../../types";
import { PRIORITY_LABELS, PRIORITY_COLORS } from "../../types";
import { FullPageSpinner, EmptyState } from "../../components/ui/Misc";
import { Card } from "../../components/ui/Card";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { useToast } from "../../context/ToastContext";
import { formatDateTime } from "../../lib/date";
import clsx from "clsx";

export function AdminServiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [service, setService] = useState<Service | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  useEffect(() => {
    load();
  }, [id]);

  function load() {
    api.get<Service>(`/services/${id}`).then((res) => setService(res.data));
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/services/${id}`);
      showToast("Serviço excluído.");
      navigate("/admin/agenda");
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    } finally {
      setDeleting(false);
    }
  }

  if (!service) return <FullPageSpinner />;

  const beforePhotos = service.photos.filter((p) => p.type === "BEFORE");
  const afterPhotos = service.photos.filter((p) => p.type === "AFTER");

  return (
    <div className="mx-auto max-w-3xl">
      <button
        onClick={() => navigate(-1)}
        className="mb-3 flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[var(--text-primary)]">{service.serviceType}</h1>
            <StatusBadge status={service.status} />
          </div>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{formatDateTime(service.scheduledAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {service.status !== "COMPLETED" && service.status !== "CANCELLED" && (
            <Button variant="outline" size="sm" onClick={() => setTransferOpen(true)}>
              <Repeat className="h-4 w-4" /> Transferir serviço
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate(`/admin/servicos/${id}/editar`)}>
            <Pencil className="h-4 w-4" /> Editar
          </Button>
          <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-4 w-4" /> Excluir
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-[var(--text-muted)]">
            <User className="h-3.5 w-3.5" /> Cliente
          </p>
          <button
            onClick={() => navigate(`/admin/clientes/${service.clientId}`)}
            className="text-sm font-semibold text-brand-600 hover:underline"
          >
            {service.client.name}
          </button>
          {service.client.phone && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
              <Phone className="h-3.5 w-3.5" /> {service.client.phone}
            </p>
          )}
          <p className="mt-1 flex items-start gap-1.5 text-sm text-[var(--text-secondary)]">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {service.address}
          </p>
          {service.city && (
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              🏙️ {service.city}
              {service.state ? `/${service.state}` : ""}
            </p>
          )}
        </Card>

        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase text-[var(--text-muted)]">
              <Wrench className="h-3.5 w-3.5" /> Funcionário responsável
            </p>
            <span className={clsx("rounded-full px-2 py-0.5 text-[10px] font-medium", PRIORITY_COLORS[service.priority])}>
              {PRIORITY_LABELS[service.priority]}
            </span>
          </div>
          <button
            onClick={() => navigate(`/admin/funcionarios/${service.employeeId}`)}
            className="text-sm font-semibold text-brand-600 hover:underline"
          >
            {service.employee.name}
          </button>
          {service.employee.cargo && <p className="mt-1 text-sm text-[var(--text-secondary)]">{service.employee.cargo}</p>}
          {service.employee.phone && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
              <Phone className="h-3.5 w-3.5" /> {service.employee.phone}
            </p>
          )}
        </Card>
      </div>

      <Card className="mt-4 p-4">
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
            <Clock className="h-4 w-4 text-[var(--text-muted)]" />
            Agendado: {formatDateTime(service.scheduledAt)}
          </div>
          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
            <Clock className="h-4 w-4 text-blue-500" />
            Início: {service.startedAt ? formatDateTime(service.startedAt) : "—"}
          </div>
          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
            <Clock className="h-4 w-4 text-green-500" />
            Conclusão: {service.completedAt ? formatDateTime(service.completedAt) : "—"}
          </div>
        </div>
      </Card>

      {service.description && (
        <Card className="mt-4 p-4">
          <p className="mb-1 text-xs font-semibold uppercase text-[var(--text-muted)]">O que precisa ser feito</p>
          <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{service.description}</p>
        </Card>
      )}

      {service.notes && (
        <Card className="mt-4 p-4">
          <p className="mb-1 text-xs font-semibold uppercase text-[var(--text-muted)]">Observações da empresa</p>
          <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{service.notes}</p>
        </Card>
      )}

      {service.employeeObservations && (
        <Card className="mt-4 p-4">
          <p className="mb-1 text-xs font-semibold uppercase text-[var(--text-muted)]">Observações do funcionário</p>
          <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{service.employeeObservations}</p>
        </Card>
      )}

      {service.problems && (
        <Card className="mt-4 p-4 border-red-200 dark:border-red-900/50">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase text-red-600">
            <AlertTriangle className="h-3.5 w-3.5" /> Problemas encontrados
          </p>
          <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{service.problems}</p>
        </Card>
      )}

      {service.pendingNotes && (
        <Card className="mt-4 p-4 border-amber-200 dark:border-amber-900/50">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase text-amber-600">
            <AlertTriangle className="h-3.5 w-3.5" /> Pendência registrada
          </p>
          <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{service.pendingNotes}</p>
        </Card>
      )}

      {(service.materialsPlan || service.materials.length > 0) && (
        <Card className="mt-4 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-[var(--text-muted)]">
            <Package className="h-3.5 w-3.5" /> Materiais
          </p>
          {service.materialsPlan && (
            <p className="mb-2 text-sm text-[var(--text-secondary)]">
              <span className="font-medium text-[var(--text-primary)]">Previsto:</span> {service.materialsPlan}
            </p>
          )}
          {service.materials.length > 0 && (
            <ul className="divide-y divide-[var(--border-color)] rounded-lg border border-[var(--border-color)]">
              {service.materials.map((m) => (
                <li key={m.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">{m.name}</p>
                    {m.notes && <p className="text-xs text-[var(--text-muted)]">{m.notes}</p>}
                  </div>
                  <span className="text-[var(--text-secondary)]">{m.quantity}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <Card className="mt-4 p-4">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase text-[var(--text-muted)]">
          <ImageIcon className="h-3.5 w-3.5" /> Fotos do serviço
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-medium text-[var(--text-secondary)]">📸 Antes ({beforePhotos.length})</p>
            {beforePhotos.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">Nenhuma foto registrada.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {beforePhotos.map((p) => (
                  <a key={p.id} href={fileUrl(p.url)} target="_blank" rel="noreferrer">
                    <img src={fileUrl(p.url)} className="aspect-square w-full rounded-lg object-cover" />
                  </a>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-[var(--text-secondary)]">📸 Depois ({afterPhotos.length})</p>
            {afterPhotos.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">Nenhuma foto registrada.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {afterPhotos.map((p) => (
                  <a key={p.id} href={fileUrl(p.url)} target="_blank" rel="noreferrer">
                    <img src={fileUrl(p.url)} className="aspect-square w-full rounded-lg object-cover" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card className="mt-4 p-4">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase text-[var(--text-muted)]">
          <History className="h-3.5 w-3.5" /> Histórico de alterações
        </p>
        {service.history.length === 0 ? (
          <EmptyState title="Sem histórico" />
        ) : (
          <ul className="space-y-2">
            {service.history.map((h) => (
              <li key={h.id} className="flex items-start justify-between gap-2 text-xs">
                <span className="text-[var(--text-secondary)]">
                  <span className="font-medium text-[var(--text-primary)]">{actionLabel(h.action)}</span>
                  {h.user ? ` por ${h.user.name}` : ""}
                  {h.fromValue && h.toValue ? ` (${h.fromValue} → ${h.toValue})` : ""}
                </span>
                <span className="shrink-0 text-[var(--text-muted)]">{formatDateTime(h.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ConfirmDialog
        open={confirmDelete}
        title="Excluir serviço"
        message="Esta ação é permanente e removerá todos os dados, fotos e histórico deste serviço. Deseja continuar?"
        confirmLabel="Excluir"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      <TransferModal
        open={transferOpen}
        service={service}
        onClose={() => setTransferOpen(false)}
        onTransferred={() => {
          setTransferOpen(false);
          load();
        }}
      />
    </div>
  );
}

function TransferModal({
  open,
  service,
  onClose,
  onTransferred,
}: {
  open: boolean;
  service: Service;
  onClose: () => void;
  onTransferred: () => void;
}) {
  const { showToast } = useToast();
  const [options, setOptions] = useState<EmployeeSuggestion[] | null>(null);
  const [selected, setSelected] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [conflict, setConflict] = useState("");

  useEffect(() => {
    if (!open) return;
    setOptions(null);
    setSelected("");
    setConflict("");
    if (service.city) {
      api
        .get<EmployeeSuggestion[]>("/scheduling/suggestions", {
          params: { city: service.city, at: service.scheduledAt, excludeServiceId: service.id },
        })
        .then((res) => setOptions(res.data.filter((o) => o.id !== service.employeeId)));
    } else {
      api.get("/employees").then((res) =>
        setOptions(
          (res.data as any[])
            .filter((e) => e.status === "ACTIVE" && e.id !== service.employeeId)
            .map(
              (e): EmployeeSuggestion => ({
                id: e.id,
                name: e.name,
                cargo: e.cargo,
                cities: [],
                serviceCountOnDate: 0,
                sameCityServiceCountOnDate: 0,
                reasons: [],
                recommended: false,
                conflict: { hasConflict: false },
              })
            )
        )
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleTransfer(force = false) {
    if (!selected) return;
    setTransferring(true);
    setConflict("");
    try {
      await api.patch(`/services/${service.id}/transfer`, { employeeId: selected, force });
      showToast("Serviço transferido com sucesso.");
      onTransferred();
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.code === "TIME_CONFLICT") {
        setConflict(data.error);
      } else {
        showToast(apiErrorMessage(err), "error");
      }
    } finally {
      setTransferring(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Transferir serviço" size="md">
      {service.city && (
        <p className="mb-3 text-xs text-[var(--text-muted)]">
          Mostrando apenas funcionários que atendem {service.city}.
        </p>
      )}
      {!options ? (
        <FullPageSpinner />
      ) : options.length === 0 ? (
        <EmptyState title="Nenhum outro funcionário disponível" description="Cadastre mais funcionários para esta cidade em Funcionários." />
      ) : (
        <div className="space-y-2">
          {options.map((o) => (
            <button
              key={o.id}
              onClick={() => setSelected(o.id)}
              className={clsx(
                "flex w-full items-center justify-between gap-2 rounded-xl border p-3 text-left",
                selected === o.id ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20" : "border-[var(--border-color)] hover:bg-[var(--surface-muted)]"
              )}
            >
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{o.name}</p>
                {o.cargo && <p className="text-xs text-[var(--text-muted)]">{o.cargo}</p>}
              </div>
              {o.conflict.hasConflict && (
                <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-300">
                  <AlertTriangle className="h-3 w-3" /> Conflito
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {conflict && (
        <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
          <p className="font-medium">{conflict}</p>
          <Button className="mt-2" size="sm" variant="danger" loading={transferring} onClick={() => handleTransfer(true)}>
            Transferir mesmo assim
          </Button>
        </div>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button disabled={!selected} loading={transferring} onClick={() => handleTransfer(false)}>
          Confirmar transferência
        </Button>
      </div>
    </Modal>
  );
}

function actionLabel(action: string) {
  const labels: Record<string, string> = {
    CRIADO: "Serviço criado",
    STATUS_ALTERADO: "Status alterado",
    DATA_ALTERADA: "Data/horário alterado",
    SERVICO_INICIADO: "Serviço iniciado",
    SERVICO_CONCLUIDO: "Serviço concluído",
    TRANSFERIDO: "Transferido de funcionário",
    DISTRIBUIDO_POR_CIDADE: "Distribuído automaticamente pela região",
  };
  return labels[action] || action;
}
