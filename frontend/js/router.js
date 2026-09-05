// Roteador simples baseado em hash (#/admin/agenda?city=...), sem dependências.
import { Auth } from "./lib/store.js";

let routes = [];
let notFoundPath = "/login";

function compile(path) {
  const keys = [];
  const source = path
    .split("/")
    .map((seg) => {
      if (seg.startsWith(":")) {
        keys.push(seg.slice(1));
        return "([^/]+)";
      }
      return seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");
  return { regex: new RegExp(`^${source}$`), keys };
}

export function registerRoutes(routeDefs) {
  routes = routeDefs.map((r) => ({ ...r, ...compile(r.path) }));
}

function parseHash() {
  let hash = location.hash.slice(1) || "/";
  if (!hash.startsWith("/")) hash = "/" + hash;
  const [pathname, queryString] = hash.split("?");
  const query = Object.fromEntries(new URLSearchParams(queryString || ""));
  return { pathname, query };
}

export function currentPathname() {
  return parseHash().pathname;
}

export function go(path) {
  if (location.hash.slice(1) === path) {
    render();
  } else {
    location.hash = path;
  }
}

export function homeFor(user) {
  if (!user) return "/login";
  return user.role === "ADMIN" ? "/admin" : "/app";
}

async function render() {
  const { pathname, query } = parseHash();
  const user = Auth.currentUser();

  if (pathname === "/") {
    go(homeFor(user));
    return;
  }
  if (pathname === "/login" && user) {
    go(homeFor(user));
    return;
  }

  for (const route of routes) {
    const m = route.regex.exec(pathname);
    if (!m) continue;
    const params = {};
    route.keys.forEach((key, i) => (params[key] = decodeURIComponent(m[i + 1])));

    if (route.role && !user) {
      go("/login");
      return;
    }
    if (route.role && user && route.role !== user.role) {
      go(homeFor(user));
      return;
    }
    try {
      await route.handler(params, query);
    } catch (err) {
      console.error("Erro ao renderizar rota", pathname, err);
    }
    return;
  }

  go(notFoundPath);
}

export function refresh() {
  render();
}

export function startRouter() {
  window.addEventListener("hashchange", render);
  render();
}
