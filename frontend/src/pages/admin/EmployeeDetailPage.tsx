import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { api, apiErrorMessage } from "../../lib/api";
import type { Employee } from "../../types";
import { FullPageSpinner, EmptyState, PageHeader } from "../../components/ui/Misc";
import { Card } from "../../components/ui/Card";
import { Input, Select } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { CityTagInput, citiesToValue, type CityValue } from "../../components/ui/CityTagInput";
import { useToast } from "../../context/ToastContext";
import { formatDateTime } from "../../lib/date";

export function EmployeeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [form, setForm] = useState<any>(null);
  const [cities, setCities] = useState<CityValue[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get<Employee>(`/employees/${id}`).then((res) => {
      setEmployee(res.data);
      setForm({ ...res.data, password: "" });
      setCities(citiesToValue(res.data.serviceRegions));
    });
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email) {
      setError("Nome e e-mail são obrigatórios.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = { ...form, cities };
      if (!payload.password) delete payload.password;
      await api.put(`/employees/${id}`, payload);
      showToast("Dados do funcionário atualizados.");
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (!employee || !form) return <FullPageSpinner />;

  return (
    <div className="mx-auto max-w-3xl">
      <button
        onClick={() => navigate("/admin/funcionarios")}
        className="mb-3 flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar para funcionários
      </button>
      <PageHeader title={employee.name} description="Dados cadastrais e serviços atribuídos." />

      <Card className="p-5">
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Nome completo" required value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="E-mail" type="email" required value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="Telefone" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Cargo" value={form.cargo || ""} onChange={(e) => setForm({ ...form, cargo: e.target.value })} />
            <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="ACTIVE">Ativo</option>
              <option value="INACTIVE">Inativo</option>
            </Select>
          </div>
          <Input
            label="Redefinir senha"
            type="password"
            hint="Deixe em branco para manter a senha atual."
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <CityTagInput value={cities} onChange={setCities} />
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">{error}</p>
          )}
          <div className="flex justify-end">
            <Button type="submit" loading={saving}>
              <Save className="h-4 w-4" /> Salvar alterações
            </Button>
          </div>
        </form>
      </Card>

      <div className="mt-6">
        <h2 className="mb-3 text-base font-semibold text-[var(--text-primary)]">Serviços atribuídos</h2>
        {!employee.servicesAsEmployee || employee.servicesAsEmployee.length === 0 ? (
          <EmptyState title="Nenhum serviço atribuído a este funcionário ainda." />
        ) : (
          <div className="space-y-2">
            {employee.servicesAsEmployee.map((s) => (
              <button
                key={s.id}
                onClick={() => navigate(`/admin/servicos/${s.id}`)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3 text-left hover:shadow-md"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{s.serviceType}</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {formatDateTime(s.scheduledAt)} · {(s as any).client?.name}
                  </p>
                </div>
                <StatusBadge status={s.status} size="sm" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
