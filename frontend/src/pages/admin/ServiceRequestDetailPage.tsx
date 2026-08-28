import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Clock,
  Wrench,
  Package,
  Star,
  AlertTriangle,
  CheckCircle2,
  Ban,
  Users,
} from "lucide-react";
import { api, apiErrorMessage } from "../../lib/api";
import type { ServiceRequest, EmployeeSuggestion } from "../../types";
import { PRIORITY_LABELS, PRIORITY_COLORS, REQUEST_STATUS_LABELS } from "../../types";
import { FullPageSpinner, EmptyState } from "../../components/ui/Misc";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Field";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { useToast } from "../../context/ToastContext";
import { formatDateTime, toDateInputValue, toTimeInputValue } from "../../lib/date";
import clsx from "clsx";

export function ServiceRequestDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [suggestions, setSuggestions] = useState<EmployeeSuggestion[] | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<{
    message: string;
    conflictingService?: EmployeeSuggestion["conflict"]["conflictingService"];
  } | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    load();
  }, [id]);

  function load() {
    api.get<ServiceRequest>(`/service-requests/${id}`).then((res) => {
      setRequest(res.data);
      setDate(toDateInputValue(res.data.desiredAt));
      setTime(toTimeInputValue(res.data.desiredAt));
      if (res.data.status === "PENDING") {
        loadSuggestions();
      }
    });
  }

  function loadSuggestions() {
    api.get<EmployeeSuggestion[]>(`/service-requests/${id}/suggestions`).then((res) => {
      setSuggestions(res.data);
      const recommended = res.data.find((s) => s.recommended);
      if (recommended) setSelectedEmployee(recommended.id);
      else if (res.data.length > 0) setSelectedEmployee(res.data[0].id);
    });
  }

  async function handleAssign(force = false) {
    if (!selectedEmployee) {
      showToast("Selecione um funcionário responsável.", "error");
      return;
    }
    setAssigning(true);
    setConflictWarning(null);
    try {
      await api.post(`/service-requests/${id}/assign`, {
        employeeId: selectedEmployee,
        scheduledAt: new Date(`${date}T${time}:00`).toISOString(),
        force,
      });
      showToast("Serviço atribuído e enviado ao funcionário!");
      load();
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.code === "TIME_CONFLICT") {
        setConflictWarning({ message: data.error, conflictingService: data.conflict?.conflictingService });
      } else {
        showToast(apiErrorMessage(err), "error");
      }
    } finally {
      setAssigning(false);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    try {
      await api.patch(`/service-requests/${id}/cancel`);
      showToast("Solicitação cancelada.");
      setCancelOpen(false);
      load();
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    } finally {
      setCancelling(false);
    }
  }

  if (!request) return <FullPageSpinner />;

  return (
    <div className="mx-auto max-w-3xl">
      <button
        onClick={() => navigate("/admin/solicitacoes")}
        className="mb-3 flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar para solicitações
      </button>

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[var(--text-primary)]">{request.clientName}</h1>
            <span className={clsx("rounded-full px-2.5 py-1 text-xs font-medium", PRIORITY_COLORS[request.priority])}>
              {PRIORITY_LABELS[request.priority]}
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {request.serviceType} · {REQUEST_STATUS_LABELS[request.status]}
          </p>
        </div>
        {request.status === "PENDING" && (
          <Button variant="outline" size="sm" onClick={() => setCancelOpen(true)}>
            <Ban className="h-4 w-4" /> Cancelar solicitação
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-4 space-y-2 text-sm">
          {request.phone && (
            <p className="flex items-center gap-1.5 text-[var(--text-secondary)]">
              <Phone className="h-3.5 w-3.5" /> {request.phone}
            </p>
          )}
          <p className="flex items-start gap-1.5 text-[var(--text-secondary)]">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {request.address}
          </p>
          <p className="flex items-center gap-1.5 font-medium text-[var(--text-primary)]">
            🏙️ {request.city}
            {request.state ? `/${request.state}` : ""}
          </p>
          <p className="flex items-center gap-1.5 text-[var(--text-secondary)]">
            <Clock className="h-3.5 w-3.5" /> Desejado: {formatDateTime(request.desiredAt)}
          </p>
        </Card>
        <Card className="p-4 space-y-2 text-sm">
          {request.description && (
            <p className="text-[var(--text-secondary)]">
              <span className="font-medium text-[var(--text-primary)]">Descrição: </span>
              {request.description}
            </p>
          )}
          {request.materialsPlan && (
            <p className="flex items-start gap-1.5 text-[var(--text-secondary)]">
              <Package className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {request.materialsPlan}
            </p>
          )}
          {request.notes && (
            <p className="text-[var(--text-secondary)]">
              <span className="font-medium text-[var(--text-primary)]">Observações: </span>
              {request.notes}
            </p>
          )}
        </Card>
      </div>

      {request.status === "ASSIGNED" && request.resultingService && (
        <Card className="mt-4 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" /> Serviço distribuído
          </p>
          <p className="text-sm text-[var(--text-secondary)]">
            Atribuído para <span className="font-medium text-[var(--text-primary)]">{request.resultingService.employee.name}</span>.
          </p>
          <Button className="mt-3" size="sm" onClick={() => navigate(`/admin/servicos/${request.resultingServiceId}`)}>
            Ver serviço
          </Button>
        </Card>
      )}

      {request.status === "CANCELLED" && (
        <Card className="mt-4 p-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-[var(--text-muted)]">
            <Ban className="h-4 w-4" /> Esta solicitação foi cancelada.
          </p>
        </Card>
      )}

      {request.status === "PENDING" && (
        <Card className="mt-4 p-4">
          <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-[var(--text-primary)]">
            <Users className="h-4 w-4" /> Funcionários disponíveis para {request.city}
          </p>
          <p className="mb-4 text-xs text-[var(--text-muted)]">
            Apenas funcionários cadastrados para atender esta cidade aparecem na lista.
          </p>

          {!suggestions ? (
            <FullPageSpinner />
          ) : suggestions.length === 0 ? (
            <EmptyState
              title="Nenhum funcionário atende essa cidade"
              description={`Cadastre a região "${request.city}" em Funcionários para poder distribuir este serviço.`}
              icon={<Wrench className="h-6 w-6" />}
              action={
                <Button variant="outline" onClick={() => navigate("/admin/funcionarios")}>
                  Ir para Funcionários
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedEmployee(s.id)}
                  className={clsx(
                    "flex w-full flex-col gap-2 rounded-xl border p-3 text-left transition-colors",
                    selectedEmployee === s.id
                      ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
                      : "border-[var(--border-color)] hover:bg-[var(--surface-muted)]"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{s.name}</p>
                      {s.cargo && <span className="text-xs text-[var(--text-muted)]">{s.cargo}</span>}
                    </div>
                    {s.recommended && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                        <Star className="h-3 w-3 fill-current" /> Recomendado
                      </span>
                    )}
                    {s.conflict.hasConflict && (
                      <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-300">
                        <AlertTriangle className="h-3 w-3" /> Conflito de horário
                      </span>
                    )}
                  </div>
                  {s.conflict.hasConflict && s.conflict.conflictingService && (
                    <p className="text-xs text-red-600 dark:text-red-400">
                      ⚠️ Já possui "{s.conflict.conflictingService.serviceType}" às{" "}
                      {new Date(s.conflict.conflictingService.scheduledAt).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      .
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {s.reasons.map((r) => (
                      <span
                        key={r}
                        className="rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] text-[var(--text-secondary)]"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}

          {suggestions && suggestions.length > 0 && (
            <div className="mt-4 border-t border-[var(--border-color)] pt-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Data do atendimento" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                <Input label="Horário do atendimento" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>

              {conflictWarning && (
                <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
                  <p className="font-medium">{conflictWarning.message}</p>
                  {conflictWarning.conflictingService && (
                    <p className="mt-1 text-xs">
                      Serviço existente: {conflictWarning.conflictingService.serviceType} às{" "}
                      {new Date(conflictWarning.conflictingService.scheduledAt).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setConflictWarning(null)}>
                      Escolher outro horário/funcionário
                    </Button>
                    <Button size="sm" variant="danger" loading={assigning} onClick={() => handleAssign(true)}>
                      Atribuir mesmo assim
                    </Button>
                  </div>
                </div>
              )}

              <Button className="mt-4" size="xl" fullWidth loading={assigning} onClick={() => handleAssign(false)}>
                ATRIBUIR SERVIÇO
              </Button>
            </div>
          )}
        </Card>
      )}

      <ConfirmDialog
        open={cancelOpen}
        title="Cancelar solicitação"
        message="Tem certeza que deseja cancelar este pedido de serviço?"
        confirmLabel="Cancelar solicitação"
        danger
        loading={cancelling}
        onConfirm={handleCancel}
        onCancel={() => setCancelOpen(false)}
      />
    </div>
  );
}
