import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { api, apiErrorMessage } from "../../lib/api";
import type { Client } from "../../types";
import { FullPageSpinner, EmptyState, PageHeader } from "../../components/ui/Misc";
import { Card } from "../../components/ui/Card";
import { Input, Textarea } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useToast } from "../../context/ToastContext";
import { formatDateTime } from "../../lib/date";

export function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [client, setClient] = useState<Client | null>(null);
  const [form, setForm] = useState<Partial<Client> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get<Client>(`/clients/${id}`).then((res) => {
      setClient(res.data);
      setForm(res.data);
    });
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form?.name) {
      setError("O nome é obrigatório.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.put(`/clients/${id}`, form);
      showToast("Dados do cliente atualizados.");
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (!client || !form) return <FullPageSpinner />;

  return (
    <div className="mx-auto max-w-3xl">
      <button
        onClick={() => navigate("/admin/clientes")}
        className="mb-3 flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar para clientes
      </button>
      <PageHeader title={client.name} description="Dados cadastrais e histórico de serviços." />

      <Card className="p-5">
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Nome do cliente ou empresa" required value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="CPF/CNPJ" value={form.document || ""} onChange={(e) => setForm({ ...form, document: e.target.value })} />
            <Input label="Telefone" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <Input label="E-mail" type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <div className="grid gap-4 sm:grid-cols-[1fr_120px_140px]">
            <Input label="Endereço" value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <Input label="Número" value={form.number || ""} onChange={(e) => setForm({ ...form, number: e.target.value })} />
            <Input label="Complemento" value={form.complement || ""} onChange={(e) => setForm({ ...form, complement: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_100px]">
            <Input label="Cidade" value={form.city || ""} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <Input label="Estado (UF)" maxLength={2} value={form.state || ""} onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })} />
          </div>
          <Textarea label="Observações" value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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
        <h2 className="mb-3 text-base font-semibold text-[var(--text-primary)]">Histórico de serviços</h2>
        {!client.services || client.services.length === 0 ? (
          <EmptyState title="Nenhum serviço realizado para este cliente ainda." />
        ) : (
          <div className="space-y-2">
            {client.services.map((s) => (
              <button
                key={s.id}
                onClick={() => navigate(`/admin/servicos/${s.id}`)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3 text-left hover:shadow-md"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{s.serviceType}</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {formatDateTime(s.scheduledAt)} · {(s as any).employee?.name}
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
