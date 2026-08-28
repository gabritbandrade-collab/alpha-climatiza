import axios from "axios";

// In dev, Vite proxies /api and /uploads to the local backend (see vite.config.ts),
// so relative paths work out of the box. In production the frontend and backend
// are typically deployed as separate services on different domains, so VITE_API_URL
// (set at build time) points straight at the backend's public URL instead.
const API_ORIGIN = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export const api = axios.create({
  baseURL: `${API_ORIGIN}/api`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ns_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("ns_token");
      localStorage.removeItem("ns_user");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export function apiErrorMessage(err: unknown, fallback = "Ocorreu um erro. Tente novamente."): string {
  const anyErr = err as any;
  return anyErr?.response?.data?.error || anyErr?.message || fallback;
}

export function fileUrl(url?: string | null): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  // Relative paths like "/uploads/services/xyz.png" are served by the backend,
  // not the frontend's own origin, so route them through the same API origin.
  return `${API_ORIGIN}${url}`;
}
