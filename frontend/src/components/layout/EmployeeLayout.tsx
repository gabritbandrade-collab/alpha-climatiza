import { NavLink, Outlet } from "react-router-dom";
import { Home, ListChecks, Bell, User, Snowflake } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { NotificationBell } from "../NotificationBell";
import { useTheme } from "../../context/ThemeContext";
import { Sun, Moon } from "lucide-react";

const tabs = [
  { to: "/app", label: "Início", icon: Home, end: true },
  { to: "/app/servicos", label: "Serviços", icon: ListChecks },
  { to: "/app/notificacoes", label: "Avisos", icon: Bell },
  { to: "/app/perfil", label: "Perfil", icon: User },
];

export function EmployeeLayout() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--surface-muted)]">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--border-color)] bg-[var(--surface-elevated)] px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Snowflake className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight text-[var(--text-primary)]">ALPHA CLIMATIZAÇÃO</p>
            <p className="text-[10px] leading-tight text-[var(--text-muted)]">Olá, {user?.name?.split(" ")[0]}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <NotificationBell basePath="/app" />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-2">
        <Outlet />
      </main>

      <nav className="safe-bottom grid shrink-0 grid-cols-4 border-t border-[var(--border-color)] bg-[var(--surface-elevated)]">
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                isActive ? "text-brand-600" : "text-[var(--text-muted)]"
              }`
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
