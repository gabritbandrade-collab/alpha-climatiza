import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  Trash2,
  Plus,
  Package,
  AlertTriangle,
  Clock3,
  CheckCircle2,
  X,
} from "lucide-react";
import { api, apiErrorMessage, fileUrl } from "../../lib/api";
import type { Service, ServiceMaterial } from "../../types";
import { FullPageSpinner } from "../../components/ui/Misc";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Button } from "../../components/ui/Button";
import { Input, Textarea } from "../../components/ui/Field";
import { Modal } from "../../components/ui/Modal";
import { useToast } from "../../context/ToastContext";

export function EmployeeServiceExecutionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [service, setService] = useState<Service | null>(null);

  const [observations, setObservations] = useState("");
  const [problems, setProblems] = useState("");
  const [pending, setPending] = useState("");
  const [savingField, setSavingField] = useState<string | null>(null);

  const [materialForm, setMaterialForm] = useState({ name: "", quantity: "", notes: "" });
  const [addingMaterial, setAddingMaterial] = useState(false);

  const [uploadingType, setUploadingType] = useState<"BEFORE" | "AFTER" | null>(null);
  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);

  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [missingItems, setMissingItems] = useState<string[]>([]);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    load();
  }, [id]);

  function load() {
    api.get<Service>(`/services/${id}`).then((res) => {
      setService(res.data);
      setObservations(res.data.employeeObservations || "");
      setProblems(res.data.problems || "");
      setPending(res.data.pendingNotes || "");
    });
  }

  const editable = service?.status === "IN_PROGRESS";

  async function saveField(field: "observations" | "problems" | "pending", value: string) {
    if (!editable) return;
    setSavingField(field);
    try {
      await api.patch(`/services/${id}/${field}`, { text: value });
      showToast("Salvo com sucesso.");
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    } finally {
      setSavingField(null);
    }
  }

  async function handlePhotoSelected(type: "BEFORE" | "AFTER", file: File | undefined) {
    if (!file || !service) return;
    setUploadingType(type);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      formData.append("type", type);
      await api.post(`/services/${service.id}/photos`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      showToast("Foto adicionada.");
      load();
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    } finally {
      setUploadingType(null);
    }
  }

  async function handleDeletePhoto(photoId: string) {
    if (!service) return;
    try {
      await api.delete(`/services/${service.id}/photos/${photoId}`);
      load();
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    }
  }

  async function handleAddMaterial(e: React.FormEvent) {
    e.preventDefault();
    if (!service || !materialForm.name || !materialForm.quantity) return;
    setAddingMaterial(true);
    try {
      await api.post(`/services/${service.id}/materials`, materialForm);
      setMaterialForm({ name: "", quantity: "", notes: "" });
      load();
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    } finally {
      setAddingMaterial(false);
    }
  }

  async function handleDeleteMaterial(materialId: string) {
    if (!service) return;
    try {
      await api.delete(`/services/${service.id}/materials/${materialId}`);
      load();
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    }
  }

  async function attemptComplete(force = false) {
    if (!service) return;
    // Ensure latest text fields are saved before completing.
    if (editable) {
      await Promise.all([
        api.patch(`/services/${id}/observations`, { text: observations }),
        api.patch(`/services/${id}/problems`, { text: problems }),
        api.patch(`/services/${id}/pending`, { text: pending }),
      ]);
    }
    setCompleting(true);
    try {
      await api.patch(`/services/${service.id}/complete`, { force });
      showToast("Serviço concluído com sucesso!");
      setCompleteModalOpen(false);
      navigate(`/app/servicos/${service.id}`);
    } catch (err: any) {
      const missing = err?.response?.data?.missing as string[] | undefined;
      if (missing?.length) {
        setMissingItems(missing);
        setCompleteModalOpen(true);
      } else {
        showToast(apiErrorMessage(err), "error");
      }
    } finally {
      setCompleting(false);
    }
  }

  if (!service) return <FullPageSpinner />;

  const beforePhotos = service.photos.filter((p) => p.type === "BEFORE");
  const afterPhotos = service.photos.filter((p) => p.type === "AFTER");

  return (
    <div className="p-4 pb-28">
      <button onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1 text-sm text-[var(--text-secondary)]">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-[var(--text-primary)]">{service.serviceType}</h1>
        <StatusBadge status={service.status} />
      </div>
      <p className="mb-5 text-sm text-[var(--text-secondary)]">{service.client.name}</p>

      {/* Fotos */}
      <Section title="📸 Fotos Antes">
        <PhotoGrid
          photos={beforePhotos}
          editable={editable}
          uploading={uploadingType === "BEFORE"}
          onAdd={() => beforeInputRef.current?.click()}
          onDelete={handleDeletePhoto}
        />
        <input
          ref={beforeInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handlePhotoSelected("BEFORE", e.target.files?.[0])}
        />
      </Section>

      <Section title="📸 Fotos Depois">
        <PhotoGrid
          photos={afterPhotos}
          editable={editable}
          uploading={uploadingType === "AFTER"}
          onAdd={() => afterInputRef.current?.click()}
          onDelete={handleDeletePhoto}
        />
        <input
          ref={afterInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handlePhotoSelected("AFTER", e.target.files?.[0])}
        />
      </Section>

      {/* Materiais */}
      <Section title="📦 Materiais Utilizados" icon={<Package className="h-4 w-4" />}>
        {service.materials.length > 0 && (
          <ul className="mb-3 space-y-2">
            {service.materials.map((m: ServiceMaterial) => (
              <li key={m.id} className="flex items-center justify-between rounded-lg border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {m.name} <span className="text-[var(--text-secondary)]">— {m.quantity}</span>
                  </p>
                  {m.notes && <p className="text-xs text-[var(--text-muted)]">{m.notes}</p>}
                </div>
                {editable && (
                  <button onClick={() => handleDeleteMaterial(m.id)} className="shrink-0 text-[var(--text-muted)] hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {editable && (
          <form onSubmit={handleAddMaterial} className="space-y-2 rounded-lg border border-dashed border-[var(--border-color)] p-3">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Nome do material" value={materialForm.name} onChange={(e) => setMaterialForm({ ...materialForm, name: e.target.value })} />
              <Input placeholder="Quantidade" value={materialForm.quantity} onChange={(e) => setMaterialForm({ ...materialForm, quantity: e.target.value })} />
            </div>
            <Input placeholder="Observação (opcional)" value={materialForm.notes} onChange={(e) => setMaterialForm({ ...materialForm, notes: e.target.value })} />
            <Button type="submit" size="sm" variant="outline" fullWidth loading={addingMaterial} disabled={!materialForm.name || !materialForm.quantity}>
              <Plus className="h-4 w-4" /> Adicionar material
            </Button>
          </form>
        )}
      </Section>

      {/* Observações */}
      <Section title="📝 Observações">
        <Textarea
          placeholder="Ex: Foi necessário trocar uma peça que não estava prevista."
          value={observations}
          disabled={!editable}
          onChange={(e) => setObservations(e.target.value)}
          onBlur={() => editable && saveField("observations", observations)}
        />
        {savingField === "observations" && <p className="mt-1 text-xs text-[var(--text-muted)]">Salvando...</p>}
      </Section>

      {/* Problemas */}
      <Section title="⚠️ Problemas encontrados" icon={<AlertTriangle className="h-4 w-4 text-red-500" />}>
        <Textarea
          placeholder="Descreva algum problema encontrado durante o atendimento."
          value={problems}
          disabled={!editable}
          onChange={(e) => setProblems(e.target.value)}
          onBlur={() => editable && saveField("problems", problems)}
        />
      </Section>

      {/* Pendências */}
      <Section title="⏳ Serviço pendente" icon={<Clock3 className="h-4 w-4 text-amber-500" />}>
        <Textarea
          placeholder="Ex: Necessário retornar ao local para finalizar a instalação."
          value={pending}
          disabled={!editable}
          onChange={(e) => setPending(e.target.value)}
          onBlur={() => editable && saveField("pending", pending)}
        />
      </Section>

      {editable && (
        <div className="fixed inset-x-0 bottom-16 border-t border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
          <Button size="xl" fullWidth variant="success" onClick={() => attemptComplete(false)} loading={completing}>
            <CheckCircle2 className="h-5 w-5" /> SERVIÇO CONCLUÍDO
          </Button>
        </div>
      )}

      <Modal open={completeModalOpen} onClose={() => setCompleteModalOpen(false)} title="Faltam algumas informações">
        <p className="mb-3 text-sm text-[var(--text-secondary)]">
          Antes de concluir, recomendamos registrar:
        </p>
        <ul className="mb-4 space-y-1.5">
          {missingItems.map((m) => (
            <li key={m} className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
              <X className="h-4 w-4 text-red-500" /> {m}
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <Button variant="outline" fullWidth onClick={() => setCompleteModalOpen(false)}>
            Voltar e registrar
          </Button>
          <Button fullWidth loading={completing} onClick={() => attemptComplete(true)}>
            Concluir mesmo assim
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-[var(--text-primary)]">
        {icon} {title}
      </p>
      {children}
    </div>
  );
}

function PhotoGrid({
  photos,
  editable,
  uploading,
  onAdd,
  onDelete,
}: {
  photos: { id: string; url: string }[];
  editable: boolean;
  uploading: boolean;
  onAdd: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {photos.map((p) => (
        <div key={p.id} className="group relative aspect-square overflow-hidden rounded-lg">
          <img src={fileUrl(p.url)} className="h-full w-full object-cover" />
          {editable && (
            <button
              onClick={() => onDelete(p.id)}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}
      {editable && (
        <button
          onClick={onAdd}
          disabled={uploading}
          className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-[var(--border-color)] text-[var(--text-muted)] hover:border-brand-500 hover:text-brand-600"
        >
          <Camera className="h-5 w-5" />
          <span className="text-[11px]">{uploading ? "Enviando..." : "Adicionar"}</span>
        </button>
      )}
      {photos.length === 0 && !editable && <p className="col-span-3 text-xs text-[var(--text-muted)]">Nenhuma foto registrada.</p>}
    </div>
  );
}
