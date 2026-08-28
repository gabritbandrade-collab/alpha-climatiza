import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import type { AuthUser } from "../types";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("ns_token");
    const cached = localStorage.getItem("ns_user");
    if (token && cached) {
      setUser(JSON.parse(cached));
      api
        .get("/auth/me")
        .then((res) => {
          const u: AuthUser = {
            id: res.data.id,
            role: res.data.role,
            name: res.data.name,
            email: res.data.email,
            phone: res.data.phone,
            cargo: res.data.cargo,
            photoUrl: res.data.photoUrl,
          };
          setUser(u);
          localStorage.setItem("ns_user", JSON.stringify(u));
        })
        .catch(() => {
          localStorage.removeItem("ns_token");
          localStorage.removeItem("ns_user");
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function login(email: string, password: string) {
    const res = await api.post("/auth/login", { email, password });
    localStorage.setItem("ns_token", res.data.token);
    localStorage.setItem("ns_user", JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user as AuthUser;
  }

  function logout() {
    localStorage.removeItem("ns_token");
    localStorage.removeItem("ns_user");
    setUser(null);
  }

  async function refreshUser() {
    const res = await api.get("/auth/me");
    const u: AuthUser = {
      id: res.data.id,
      role: res.data.role,
      name: res.data.name,
      email: res.data.email,
      phone: res.data.phone,
      cargo: res.data.cargo,
      photoUrl: res.data.photoUrl,
    };
    setUser(u);
    localStorage.setItem("ns_user", JSON.stringify(u));
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
