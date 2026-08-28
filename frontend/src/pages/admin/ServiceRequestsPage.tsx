import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, MapPin, Clock } from "lucide-react";
import { api, apiErrorMessage } from "../../lib/api";
import type { ServiceRequest } from "../../types";
import { PRIORITY_LABELS, PRIORITY_COLORS, REQUEST_STATUS_LABELS } from "../../types";
import { PageHeader, EmptyState, FullPageSpinner } from "../../components/ui/Misc";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Input, Select, Textarea } from "../../components/ui/Field";
import { useToast } from "../../context/ToastContext";
import { formatDateTime } from "../../lib/date";
import clsx from "clsx";

const SERVICE_TYPES = [
  "Instalação de Ar Condicionado Split",
  "Instalação de Climatizador",
  "Manutenção Preventiva",
  "Manutenção Corretiva",
  "Limpeza de Filtros",
  "Troca de Gás Refrigerante",
  "Outro",
];

const emptyForm = {
  clientName: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  serviceType: SERVICE_TYPES[0],
  customType: "",
  description: "",
  date: "",
  time: "09:00",
  notes: "",
  materialsPlan: "",
  priority: "NORMAL",
};

const statusBg: Record<string, string> = {
  PENDING: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  ASSIGNED: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  CANCELLED: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

export function ServiceRequestsPage() {
  const [requests, setRequests] = useState<ServiceRequest[] | null>(null);
  const [status, setStatus] = useState("PENDING");
  const [city, setCity] = useState("");
  const [priority, setPriority] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    load();
  }, [status, city, priority, search]);

  function load() {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    if (city) params.city = city;
    if (priority) params.priority = priority;
    if (search) params.search = search;
    api.get<ServiceRequest[]>("/service-requests", { params }).then((res) => setRequests(res.data));
  }

  function openNew() {
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientName || !form.address || !form.city || !form.date || !form.time) {
      setError("Cliente, endereço, cidade e data/horário desejados são obrigatórios.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await api.post("/service-requests", {
        clientName: form.clientName,
        phone: form.phone,
        address: form.address,
        city: form.city,
        state: form.state,
        serviceType: form.serviceType === "Outro" ? form.customType : form.serviceType,
        description: form.description,
        desiredAt: new Date(`${form.date}T${form.time}:00`).toISOString(),
        notes: form.notes,
        materialsPlan: form.materialsPlan,
        priority: form.priority,
      });
      showToast("Solicitação cadastrada. Distribua para um funcionário da região.");
      setModalOpen(false);
      navigate(`/admin/solicitacoes/${res.data.id}`);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Solicitações de Serviços"
        description="Cadastre pedidos de clientes e distribua para o funcionário responsável pela região."
        actions={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> Nova Solicitação
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            placeholder="Buscar cliente, cidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 max-w-full rounded-lg border border-[var(--border-color)] bg-[var(--surface)] py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
          />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto">
          <option value="">Todos os status</option>
          <option value="PENDING">Aguardando distribuição</option>
          <option value="ASSIGNED">Atribuído</option>
          <option value="CANCELLED">Cancelado</option>
        </Select>
        <Select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-auto">
          <option value="">Todas as prioridades</option>
          {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
        <Input placeholder="Filtrar por cidade" value={city} onChange={(e) => setCity(e.target.value)} className="w-48" />
      </div>

      {!requests ? (
        <FullPageSpinner />
      ) : requests.length === 0 ? (
        <EmptyState
          title="Nenhuma solicitação encontrada"
          description="Ajuste os filtros ou cadastre um novo pedido de cliente."
          action={<Button onClick={openNew}>Nova Solicitação</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {requests.map((r) => (
            <Card
              key={r.id}
              className="cursor-pointer p-4 hover:shadow-md"
              onClick={() => navigate(`/admin/solicitacoes/${r.id}`)}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{r.clientName}</p>
                <span className={clsx("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium", PRIORITY_COLORS[r.priority])}>
                  {PRIORITY_LABELS[r.priority]}
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">{r.serviceType}</p>
              <div className="mt-3 space-y-1.5 text-xs text-[var(--text-secondary)]">
                <p className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> {r.city}
                  {r.state ? `/${r.state}` : ""}
                </p>
                <p className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> {formatDateTime(r.desiredAt)}
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-[var(--border-color)] pt-3">
                <span className={clsx("rounded-full px-2 py-0.5 text-[11px] font-medium", statusBg[r.status])}>
                  {REQUEST_STATUS_LABELS[r.status]}
                </span>
                {r.resultingService && (
                  <span className="text-xs text-[var(--text-muted)]">{r.resultingService.employee.name}</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova Solicitação de Serviço" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4" id="request-form">
          <Input
            label="Nome do cliente/empresa"
            required
            value={form.clientName}
            onChange={(e) => setForm({ ...form, clientName: e.target.value })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Telefone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Select label="Prioridade" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </div>
          <Input label="Endereço" required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <div className="grid gap-4 sm:grid-cols-[1fr_100px]">
            <Input label="Cidade" required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <Input
              label="Estado (UF)"
              maxLength={2}
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Tipo de serviço" value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })}>
              {SERVICE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
            {form.serviceType === "Outro" && (
              <Input label="Especifique" required value={form.customType} onChange={(e) => setForm({ ...form, customType: e.target.value })} />
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Data desejada" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <Input label="Horário desejado" type="time" required value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          </div>
          <Textarea label="Descrição do serviço" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Textarea label="Materiais necessários" value={form.materialsPlan} onChange={(e) => setForm({ ...form, materialsPlan: e.target.value })} />
          <Textarea label="Observações" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">{error}</p>
          )}
        </form>
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setModalOpen(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="request-form" loading={saving}>
            Cadastrar pedido
          </Button>
        </div>
      </Modal>
    </div>
  );
}
