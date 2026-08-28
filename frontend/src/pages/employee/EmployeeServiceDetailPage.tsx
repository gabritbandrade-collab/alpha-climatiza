import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Phone, User, Clock, Package, PlayCircle, Wrench } from "lucide-react";
import { api, apiErrorMessage } from "../../lib/api";
import type { Service } from "../../types";
import { FullPageSpinner } from "../../components/ui/Misc";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Button } from "../../components/ui/Button";
import { useToast } from "../../context/ToastContext";
import { formatDateTime } from "../../lib/date";

export function EmployeeServiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [service, setService] = useState<Service | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    load();
  }, [id]);

  function load() {
    api.get<Service>(`/services/${id}`).then((res) => setService(res.data));
  }

  async function handleStart() {
    setStarting(true);
    try {
      await api.patch(`/services/${id}/start`);
      showToast("Serviço iniciado!");
      navigate(`/app/servicos/${id}/execucao`);
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    } finally {
      setStarting(false);
    }
  }

  if (!service) return <FullPageSpinner />;

  const canStart = service.status === "SCHEDULED" || service.status === "PENDING";
  const inProgress = service.status === "IN_PROGRESS";

  return (
    <div className="p-4 pb-24">
      <button
        onClick={() => navigate(-1)}
        className="mb-3 flex items-center gap-1 text-sm text-[var(--text-secondary)]"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <div className="mb-4">
        <div className="mb-1 flex items-center gap-2">
          <h1 className="text-lg font-bold text-[var(--text-primary)]">{service.serviceType}</h1>
        </div>
        <StatusBadge status={service.status} />
      </div>

      <div className="space-y-3">
        <InfoRow icon={<User className="h-4 w-4" />} label="Cliente">
          {service.client.name}
        </InfoRow>
        {service.client.phone && (
          <InfoRow icon={<Phone className="h-4 w-4" />} label="Telefone">
            <a href={`tel:${service.client.phone}`} className="text-brand-600">
              {service.client.phone}
            </a>
          </InfoRow>
        )}
        <InfoRow icon={<MapPin className="h-4 w-4" />} label="Endereço">
          {service.address}
        </InfoRow>
        {service.city && (
          <InfoRow icon={<span>🏙️</span>} label="Cidade">
            {service.city}
            {service.state ? `/${service.state}` : ""}
          </InfoRow>
        )}
        <InfoRow icon={<Clock className="h-4 w-4" />} label="Data e horário">
          {formatDateTime(service.scheduledAt)}
        </InfoRow>
        {service.description && (
          <InfoRow icon={<Wrench className="h-4 w-4" />} label="O que precisa ser feito">
            {service.description}
          </InfoRow>
        )}
        {service.notes && (
          <InfoRow icon={<Wrench className="h-4 w-4" />} label="Observações da empresa">
            {service.notes}
          </InfoRow>
        )}
        {service.materialsPlan && (
          <InfoRow icon={<Package className="h-4 w-4" />} label="Materiais previstos">
            {service.materialsPlan}
          </InfoRow>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-16 border-t border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
        {canStart && (
          <Button size="xl" fullWidth loading={starting} onClick={handleStart}>
            <PlayCircle className="h-5 w-5" /> INICIAR SERVIÇO
          </Button>
        )}
        {inProgress && (
          <Button size="xl" fullWidth onClick={() => navigate(`/app/servicos/${id}/execucao`)}>
            Continuar execução do serviço
          </Button>
        )}
        {(service.status === "COMPLETED" || service.status === "CANCELLED") && (
          <Button size="xl" fullWidth variant="outline" onClick={() => navigate(`/app/servicos/${id}/execucao`)}>
            Ver detalhes da execução
          </Button>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3">
      <p className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase text-[var(--text-muted)]">
        {icon} {label}
      </p>
      <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{children}</p>
    </div>
  );
}
