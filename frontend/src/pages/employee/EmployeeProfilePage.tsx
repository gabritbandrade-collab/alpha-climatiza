import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, LogOut, Lock, Phone, Mail, HardHat, Sun, Moon } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { api, apiErrorMessage, fileUrl } from "../../lib/api";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Field";
import { Modal } from "../../components/ui/Modal";
import { useToast } from "../../context/ToastContext";

export function EmployeeProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const [phone, setPhone] = useState(user?.phone || "");
  const [savingPhone, setSavingPhone] = useState(false);

  const [pwOpen, setPwOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  async function handlePhotoChange(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await api.post("/upload/employee-photo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await api.put("/auth/me", { photoUrl: res.data.url });
      await refreshUser();
      showToast("Foto atualizada.");
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    } finally {
      setUploading(false);
    }
  }

  async function handleSavePhone() {
    setSavingPhone(true);
    try {
      await api.put("/auth/me", { phone });
      await refreshUser();
      showToast("Telefone atualizado.");
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    } finally {
      setSavingPhone(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    if (newPassword.length < 6) {
      setPwError("A nova senha deve ter ao menos 6 caracteres.");
      return;
    }
    setPwLoading(true);
    try {
      await api.post("/auth/change-password", { currentPassword, newPassword });
      showToast("Senha alterada com sucesso.");
      setPwOpen(false);
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setPwError(apiErrorMessage(err));
    } finally {
      setPwLoading(false);
    }
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="p-4">
      <h1 className="mb-4 text-lg font-bold text-[var(--text-primary)]">Meu Perfil</h1>

      <div className="mb-5 flex flex-col items-center">
        <div className="relative">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-3xl font-bold text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
            {user?.photoUrl ? (
              <img src={fileUrl(user.photoUrl)} className="h-full w-full object-cover" />
            ) : (
              user?.name?.charAt(0).toUpperCase()
            )}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-white shadow-md"
          >
            <Camera className="h-4 w-4" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={(e) => handlePhotoChange(e.target.files?.[0])}
          />
        </div>
        <p className="mt-3 text-base font-bold text-[var(--text-primary)]">{user?.name}</p>
        <p className="text-sm text-[var(--text-muted)]">{user?.cargo}</p>
      </div>

      <Card className="mb-4 divide-y divide-[var(--border-color)] p-0">
        <div className="flex items-center gap-3 p-4">
          <Mail className="h-4 w-4 text-[var(--text-muted)]" />
          <div className="min-w-0">
            <p className="text-xs text-[var(--text-muted)]">E-mail</p>
            <p className="truncate text-sm text-[var(--text-primary)]">{user?.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4">
          <HardHat className="h-4 w-4 text-[var(--text-muted)]" />
          <div className="min-w-0">
            <p className="text-xs text-[var(--text-muted)]">Cargo</p>
            <p className="truncate text-sm text-[var(--text-primary)]">{user?.cargo || "—"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4">
          <Phone className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-xs text-[var(--text-muted)]">Telefone</p>
            <div className="flex gap-2">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
              <Button size="sm" loading={savingPhone} onClick={handleSavePhone}>
                Salvar
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <div className="space-y-2">
        <button
          onClick={() => setPwOpen(true)}
          className="flex w-full items-center gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 text-left text-sm font-medium text-[var(--text-primary)]"
        >
          <Lock className="h-4 w-4 text-[var(--text-muted)]" /> Alterar senha
        </button>
        <button
          onClick={toggleTheme}
          className="flex w-full items-center gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 text-left text-sm font-medium text-[var(--text-primary)]"
        >
          {theme === "dark" ? <Sun className="h-4 w-4 text-[var(--text-muted)]" /> : <Moon className="h-4 w-4 text-[var(--text-muted)]" />}
          {theme === "dark" ? "Modo claro" : "Modo escuro"}
        </button>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-left text-sm font-medium text-red-600 dark:border-red-900/50 dark:bg-red-900/20"
        >
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </div>

      <Modal open={pwOpen} onClose={() => setPwOpen(false)} title="Alterar senha">
        <form onSubmit={handleChangePassword} className="space-y-4">
          <Input
            label="Senha atual"
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <Input
            label="Nova senha"
            type="password"
            required
            hint="Mínimo de 6 caracteres."
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          {pwError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">{pwError}</p>
          )}
          <Button type="submit" fullWidth loading={pwLoading}>
            Alterar senha
          </Button>
        </form>
      </Modal>
    </div>
  );
}
