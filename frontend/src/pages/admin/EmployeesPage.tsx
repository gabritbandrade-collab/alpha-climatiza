import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Phone, Mail, Trash2, MapPin } from "lucide-react";
import { api, apiErrorMessage } from "../../lib/api";
import type { Employee } from "../../types";
import { PageHeader, EmptyState, FullPageSpinner } from "../../components/ui/Misc";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Input, Select } from "../../components/ui/Field";
import { CityTagInput, type CityValue } from "../../components/ui/CityTagInput";
import { useToast } from "../../context/ToastContext";
import clsx from "clsx";

const emptyForm = { name: "", email: "", phone: "", cargo: "", password: "", status: "ACTIVE" };

export function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [cities, setCities] = useState<CityValue[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    load();
  }, [search]);

  function load() {
    api.get<Employee[]>("/employees", { params: search ? { search } : {} }).then((res) => setEmployees(res.data));
  }

  function openNew() {
    setForm(emptyForm);
    setCities([]);
    setError("");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      setError("Nome, e-mail e senha são obrigatórios.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.post("/employees", { ...form, cities });
      showToast("Funcionário cadastrado com sucesso.");
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
      await api.delete(`/employees/${deleteTarget.id}`);
      showToast("Funcionário excluído.");
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
        title="Funcionários"
        description="Gerencie a equipe técnica responsável pelos serviços externos."
        actions={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> Novo Funcionário
          </Button>
        }
      />

      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          placeholder="Buscar por nome, e-mail, cargo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--surface)] py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
        />
      </div>

      {!employees ? (
        <FullPageSpinner />
      ) : employees.length === 0 ? (
        <EmptyState title="Nenhum funcionário cadastrado" action={<Button onClick={openNew}>Novo Funcionário</Button>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {employees.map((emp) => (
            <Card key={emp.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <button onClick={() => navigate(`/admin/funcionarios/${emp.id}`)} className="flex min-w-0 items-center gap-3 text-left">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
                    {emp.photoUrl ? (
                      <img src={emp.photoUrl} className="h-full w-full object-cover" />
                    ) : (
                      emp.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--text-primary)] hover:text-brand-600">{emp.name}</p>
                    <p className="truncate text-xs text-[var(--text-muted)]">{emp.cargo || "Sem cargo definido"}</p>
                  </div>
                </button>
                <button
                  onClick={() => setDeleteTarget(emp)}
                  className="shrink-0 rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 space-y-1.5 text-xs text-[var(--text-secondary)]">
                <p className="flex items-center gap-1.5 truncate">
                  <Mail className="h-3.5 w-3.5 shrink-0" /> {emp.email}
                </p>
                {emp.phone && (
                  <p className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" /> {emp.phone}
                  </p>
                )}
              </div>
              {emp.serviceRegions && emp.serviceRegions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {emp.serviceRegions.map((r) => (
                    <span
                      key={r.id}
                      className="flex items-center gap-1 rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]"
                    >
                      <MapPin className="h-2.5 w-2.5" /> {r.city}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-3 flex items-center justify-between border-t border-[var(--border-color)] pt-3">
                <span
                  className={clsx(
                    "rounded-full px-2 py-0.5 text-[11px] font-medium",
                    emp.status === "ACTIVE"
                      ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  )}
                >
                  {emp.status === "ACTIVE" ? "Ativo" : "Inativo"}
                </span>
                <span className="text-xs text-[var(--text-muted)]">{emp._count?.servicesAsEmployee ?? 0} serviço(s)</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo Funcionário" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4" id="employee-form">
          <Input label="Nome completo" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="E-mail" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="Telefone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Cargo" value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} placeholder="Ex: Técnico de Instalação" />
            <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="ACTIVE">Ativo</option>
              <option value="INACTIVE">Inativo</option>
            </Select>
          </div>
          <Input
            label="Senha de acesso"
            type="password"
            required
            hint="O funcionário usará esta senha para acessar o aplicativo."
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <CityTagInput value={cities} onChange={setCities} />
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">{error}</p>
          )}
        </form>
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setModalOpen(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="employee-form" loading={saving}>
            Salvar funcionário
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir funcionário"
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
