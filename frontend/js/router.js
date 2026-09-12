// Roteador simples baseado em hash (#/admin/agenda?city=...), sem dependências.
import { Auth } from "./lib/store.js";

let routes = [];
let notFoundPath = "/login";

function compile(path) {
  return { segments: path.split("/") };
}

// Casa `pathname` contra os segmentos de uma rota sem usar regex: mais
// simples de auditar e sem nenhuma superfície de ReDoS.
function matchRoute(route, pathname) {
  const parts = pathname.split("/");
  if (parts.length !== route.segments.length) return null;
  const params = {};
  for (let i = 0; i < route.segments.length; i++) {
    const seg = route.segments[i];
    if (seg.startsWith(":")) {
      if (!parts[i]) return null;
      params[seg.slice(1)] = decodeURIComponent(parts[i]);
    } else if (seg !== parts[i]) {
      return null;
    }
  }
  return params;
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
    const params = matchRoute(route, pathname);
    if (!params) continue;

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
