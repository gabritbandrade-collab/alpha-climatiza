import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Phone, MapPin, Trash2 } from "lucide-react";
import { api, apiErrorMessage } from "../../lib/api";
import type { Client } from "../../types";
import { PageHeader, EmptyState, FullPageSpinner } from "../../components/ui/Misc";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Input, Textarea } from "../../components/ui/Field";
import { useToast } from "../../context/ToastContext";

const emptyForm = {
  name: "",
  document: "",
  phone: "",
  email: "",
  address: "",
  number: "",
  complement: "",
  city: "",
  state: "",
  notes: "",
};

export function ClientsPage() {
  const [clients, setClients] = useState<Client[] | null>(null);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    load();
  }, [search]);

  function load() {
    api.get<Client[]>("/clients", { params: search ? { search } : {} }).then((res) => setClients(res.data));
  }

  function openNew() {
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) {
      setError("O nome é obrigatório.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.post("/clients", form);
      showToast("Cliente cadastrado com sucesso.");
      setModalOpen(false);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/clients/${deleteTarget.id}`);
      showToast("Cliente excluído.");
      setDeleteTarget(null);
      load();
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Gerencie os clientes atendidos pela empresa."
        actions={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> Novo Cliente
          </Button>
        }
      />

      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          placeholder="Buscar por nome, CPF/CNPJ, telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--surface)] py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
        />
      </div>

      {!clients ? (
        <FullPageSpinner />
      ) : clients.length === 0 ? (
        <EmptyState title="Nenhum cliente cadastrado" description="Cadastre o primeiro cliente para começar." action={<Button onClick={openNew}>Novo Cliente</Button>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <button onClick={() => navigate(`/admin/clientes/${c.id}`)} className="min-w-0 text-left">
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)] hover:text-brand-600">{c.name}</p>
                  {c.document && <p className="text-xs text-[var(--text-muted)]">{c.document}</p>}
                </button>
                <button
                  onClick={() => setDeleteTarget(c)}
                  className="shrink-0 rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 space-y-1.5 text-xs text-[var(--text-secondary)]">
                {c.phone && (
                  <p className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" /> {c.phone}
                  </p>
                )}
                {c.city && (
                  <p className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> {c.city}
                    {c.state ? `/${c.state}` : ""}
                  </p>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-[var(--border-color)] pt-3">
                <span className="text-xs text-[var(--text-muted)]">{c._count?.services ?? 0} serviço(s)</span>
                <button onClick={() => navigate(`/admin/clientes/${c.id}`)} className="text-xs font-medium text-brand-600 hover:underline">
                  Ver detalhes
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo Cliente" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4" id="client-form">
          <Input label="Nome do cliente ou empresa" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="CPF/CNPJ" value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} />
            <Input label="Telefone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <Input label="E-mail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <div className="grid gap-4 sm:grid-cols-[1fr_120px_140px]">
            <Input label="Endereço" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <Input label="Número" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
            <Input label="Complemento" value={form.complement} onChange={(e) => setForm({ ...form, complement: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_100px]">
            <Input label="Cidade" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <Input label="Estado (UF)" maxLength={2} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })} />
          </div>
          <Textarea label="Observações" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">{error}</p>
          )}
        </form>
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setModalOpen(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="client-form" loading={saving}>
            Salvar cliente
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir cliente"
        message={`Tem certeza que deseja excluir "${deleteTarget?.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
