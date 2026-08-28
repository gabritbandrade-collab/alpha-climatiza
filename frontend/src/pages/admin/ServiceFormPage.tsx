import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { api, apiErrorMessage } from "../../lib/api";
import type { Client, Employee, Service, ServiceStatus, Priority } from "../../types";
import { STATUS_LABELS, PRIORITY_LABELS } from "../../types";
import { PageHeader, FullPageSpinner } from "../../components/ui/Misc";
import { Card } from "../../components/ui/Card";
import { Input, Select, Textarea } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { useToast } from "../../context/ToastContext";
import { toDateInputValue, toTimeInputValue } from "../../lib/date";

const SERVICE_TYPES = [
  "Instalação de Ar Condicionado Split",
  "Instalação de Climatizador",
  "Manutenção Preventiva",
  "Manutenção Corretiva",
  "Limpeza de Filtros",
  "Troca de Gás Refrigerante",
  "Outro",
];

export function ServiceFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [clientId, setClientId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [serviceType, setServiceType] = useState(SERVICE_TYPES[0]);
  const [customType, setCustomType] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [priority, setPriority] = useState<Priority>("NORMAL");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [materialsPlan, setMaterialsPlan] = useState("");
  const [status, setStatus] = useState<ServiceStatus>("SCHEDULED");
  const [conflictWarning, setConflictWarning] = useState("");

  useEffect(() => {
    api.get<Client[]>("/clients").then((res) => setClients(res.data));
    api.get<Employee[]>("/employees").then((res) => setEmployees(res.data.filter((e) => e.status === "ACTIVE")));
  }, []);

  useEffect(() => {
    if (!id) return;
    api.get<Service>(`/services/${id}`).then((res) => {
      const s = res.data;
      setClientId(s.clientId);
      setEmployeeId(s.employeeId);
      if (SERVICE_TYPES.includes(s.serviceType)) {
        setServiceType(s.serviceType);
      } else {
        setServiceType("Outro");
        setCustomType(s.serviceType);
      }
      setDate(toDateInputValue(s.scheduledAt));
      setTime(toTimeInputValue(s.scheduledAt));
      setAddress(s.address);
      setCity(s.city || "");
      setState(s.state || "");
      setPriority(s.priority || "NORMAL");
      setDescription(s.description || "");
      setNotes(s.notes || "");
      setMaterialsPlan(s.materialsPlan || "");
      setStatus(s.status);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    if (!isEdit && clientId) {
      const c = clients.find((c) => c.id === clientId);
      if (c && !address) {
        setAddress([c.address, c.number, c.complement, c.city, c.state].filter(Boolean).join(", "));
      }
      if (c && !city) setCity(c.city || "");
      if (c && !state) setState(c.state || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  // Lightweight conflict check: warns the admin if the selected employee already
  // has another active service close to this date/time.
  useEffect(() => {
    setConflictWarning("");
    if (!employeeId || !city || !date || !time) return;
    const targetAt = new Date(`${date}T${time}:00`).toISOString();
    const controller = new AbortController();
    api
      .get("/scheduling/suggestions", {
        params: { city, at: targetAt, excludeServiceId: id },
        signal: controller.signal as any,
      })
      .then((res) => {
        const match = (res.data as any[]).find((s) => s.id === employeeId);
        if (match?.conflict?.hasConflict) {
          setConflictWarning(
            `⚠️ Este funcionário já possui "${match.conflict.conflictingService.serviceType}" agendado próximo deste horário.`
          );
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [employeeId, city, date, time, id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!clientId || !employeeId || !date || !time || !address) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }
    setSaving(true);
    const payload = {
      clientId,
      employeeId,
      serviceType: serviceType === "Outro" ? customType : serviceType,
      scheduledAt: new Date(`${date}T${time}:00`).toISOString(),
      address,
      city,
      state,
      priority,
      description,
      notes,
      materialsPlan,
      status,
    };
    try {
      if (isEdit) {
        await api.put(`/services/${id}`, payload);
        showToast("Serviço atualizado com sucesso.");
        navigate(`/admin/servicos/${id}`);
      } else {
        const res = await api.post("/services", payload);
        showToast("Serviço criado e atribuído ao funcionário.");
        navigate(`/admin/servicos/${res.data.id}`);
      }
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <FullPageSpinner />;

  return (
    <div className="mx-auto max-w-2xl">
      <button
        onClick={() => navigate(-1)}
        className="mb-3 flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>
      <PageHeader title={isEdit ? "Editar Serviço" : "Novo Serviço"} description="Preencha os dados do agendamento." />

      <Card className="p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Cliente" required value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">Selecione o cliente</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Select label="Funcionário responsável" required value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              <option value="">Selecione o funcionário</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} {e.cargo ? `— ${e.cargo}` : ""}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Tipo de serviço" required value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
              {SERVICE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
            {serviceType === "Outro" && (
              <Input label="Especifique o tipo" required value={customType} onChange={(e) => setCustomType(e.target.value)} />
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Data" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
            <Input label="Horário" type="time" required value={time} onChange={(e) => setTime(e.target.value)} />
          </div>

          <Input
            label="Endereço do serviço"
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Rua, número, bairro, cidade"
          />

          <div className="grid gap-4 sm:grid-cols-[1fr_90px_1fr]">
            <Input label="Cidade" value={city} onChange={(e) => setCity(e.target.value)} />
            <Input label="Estado (UF)" maxLength={2} value={state} onChange={(e) => setState(e.target.value.toUpperCase())} />
            <Select label="Prioridade" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </div>

          {conflictWarning && (
            <p className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {conflictWarning}
            </p>
          )}

          <Textarea
            label="Descrição / o que precisa ser feito"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Instalar 2 unidades split de 12.000 BTUs no salão..."
          />

          <Textarea
            label="Observações da empresa"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Instruções, restrições de acesso, contato no local..."
          />

          <Textarea
            label="Materiais previstos"
            value={materialsPlan}
            onChange={(e) => setMaterialsPlan(e.target.value)}
            placeholder="Ex: 2x unidade split 12.000 BTUs, suportes, tubulação..."
          />

          {isEdit && (
            <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as ServiceStatus)}>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              {isEdit ? "Salvar alterações" : "Criar serviço"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
