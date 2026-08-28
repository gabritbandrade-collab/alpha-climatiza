import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Snowflake, Eye, EyeOff, Sun, Moon } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Field";
import { Modal } from "../components/ui/Modal";
import { api, apiErrorMessage } from "../lib/api";
import { useToast } from "../context/ToastContext";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);

  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { showToast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(user.role === "ADMIN" ? "/admin" : "/app", { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, "Não foi possível entrar. Verifique suas credenciais."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--surface-muted)] px-4 py-10">
      <button
        onClick={toggleTheme}
        className="fixed right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-elevated)] text-[var(--text-secondary)] shadow-sm border border-[var(--border-color)]"
      >
        {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/20">
            <Snowflake className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">ALPHA CLIMATIZAÇÃO</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Gestão de Serviços Externos</p>
        </div>

        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="E-mail"
              type="email"
              required
              autoComplete="username"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <div className="relative">
              <Input
                label="Senha"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-[34px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
                {error}
              </p>
            )}

            <Button type="submit" fullWidth size="lg" loading={loading}>
              Entrar
            </Button>

            <button
              type="button"
              onClick={() => setForgotOpen(true)}
              className="block w-full text-center text-sm text-brand-600 hover:underline"
            >
              Esqueci minha senha
            </button>
          </form>
        </div>
      </div>

      <ForgotPasswordModal open={forgotOpen} onClose={() => setForgotOpen(false)} onSent={() => showToast("Solicitação enviada.")} />
    </div>
  );
}

function ForgotPasswordModal({ open, onClose, onSent }: { open: boolean; onClose: () => void; onSent: () => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentMessage, setSentMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/auth/forgot-password", { email });
      setSentMessage(res.data.message);
      onSent();
    } catch {
      setSentMessage("Não foi possível processar sua solicitação no momento.");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setSentMessage("");
    setEmail("");
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Esqueci minha senha">
      {sentMessage ? (
        <div className="py-2">
          <p className="text-sm text-[var(--text-secondary)]">{sentMessage}</p>
          <Button className="mt-4" fullWidth onClick={handleClose}>
            Entendi
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Informe seu e-mail cadastrado. O administrador da empresa será notificado para redefinir sua senha.
          </p>
          <Input
            label="E-mail"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
          />
          <Button type="submit" fullWidth loading={loading}>
            Enviar solicitação
          </Button>
        </form>
      )}
    </Modal>
  );
}
