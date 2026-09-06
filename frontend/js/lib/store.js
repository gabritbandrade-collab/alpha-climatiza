// Camada de dados: fala com o banco Postgres real (Supabase) em vez de
// localStorage, para que todos os usuários compartilhem os mesmos dados.
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://lmvlrnsrzvazvjqfvxcm.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtdmxybnNyenZhenZqcWZ2eGNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MjQ5NjQsImV4cCI6MjEwNDIwMDk2NH0.-az0DBlChzi22aTONzTl5W-ZlrrCZ_WAGWilZ2psCCc";
const EDGE_URL = `${SUPABASE_URL}/functions/v1/admin-users`;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export class StoreError extends Error {}

function norm(s) {
  return (s || "").toString().trim().toLowerCase();
}
function includesCI(haystack, needle) {
  return norm(haystack).includes(norm(needle));
}
function fail(error, fallback = "Ocorreu um erro. Tente novamente.") {
  if (error) throw new StoreError(error.message || fallback);
}

// ---------------------------------------------------------------------------
// Redimensiona uma foto antes de enviar (evita uploads gigantes) e envia para
// o Supabase Storage, retornando a URL pública.
// ---------------------------------------------------------------------------
function resizeImageToBlob(file, maxDim = 1400, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new StoreError("Não foi possível ler o arquivo."));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
      };
      img.onerror = () => reject(new StoreError("Arquivo de imagem inválido."));
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function uploadPublicImage(bucket, file, { maxDim, quality } = {}) {
  const blob = await resizeImageToBlob(file, maxDim, quality);
  const path = `${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(bucket).upload(path, blob, { contentType: "image/jpeg" });
  fail(error, "Não foi possível enviar a imagem.");
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export function uploadServicePhoto(file) {
  return uploadPublicImage("service-photos", file, { maxDim: 1400, quality: 0.78 });
}
export function uploadEmployeePhoto(file) {
  return uploadPublicImage("employee-photos", file, { maxDim: 500, quality: 0.85 });
}

// ---------------------------------------------------------------------------
// Sessão / chamadas à função privilegiada (criação de funcionários)
// ---------------------------------------------------------------------------
async function accessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || SUPABASE_ANON_KEY;
}

async function callAdminUsers(payload) {
  const token = await accessToken();
  const res = await fetch(EDGE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 403 && currentProfile?.role === "ADMIN") {
      // A conta local está marcada como admin, mas o servidor recusou o
      // pedido — isso acontece quando a sessão (token de renovação) foi
      // revogada no servidor mesmo com o token de acesso ainda não expirado
      // (ex.: login feito em outro lugar). Em vez de travar num erro
      // confuso, força um novo login.
      await Auth.logout();
      window.location.hash = "#/login";
      window.location.reload();
      throw new StoreError("Sua sessão expirou. Faça login novamente.");
    }
    throw new StoreError(json.error || "Não foi possível completar a operação.");
  }
  return json;
}

// ---------------------------------------------------------------------------
// Notificações internas (usadas por várias operações abaixo)
// ---------------------------------------------------------------------------
async function notify(userId, title, message, relatedServiceId = null) {
  const { error } = await supabase
    .from("notifications")
    .insert({ user_id: userId, title, message, related_service_id: relatedServiceId });
  if (error) console.error("Falha ao criar notificação:", error);
}

// ---------------------------------------------------------------------------
// Mapeamento snake_case (banco) -> camelCase (app)
// ---------------------------------------------------------------------------
function mapProfile(p) {
  return {
    id: p.id,
    name: p.name,
    email: p.email,
    role: p.role,
    phone: p.phone,
    cargo: p.cargo,
    photoUrl: p.photo_url,
    status: p.status,
    createdAt: p.created_at,
    serviceRegions: (p.employee_cities || []).map(mapCity),
  };
}
function mapCity(c) {
  return { id: c.id, city: c.city, state: c.state };
}
function mapClient(c) {
  if (!c) return null;
  return {
    id: c.id,
    name: c.name,
    document: c.document,
    phone: c.phone,
    email: c.email,
    address: c.address,
    number: c.number,
    complement: c.complement,
    city: c.city,
    state: c.state,
    notes: c.notes,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}
function mapEmployeeRef(e) {
  if (!e) return null;
  return { id: e.id, name: e.name, phone: e.phone, cargo: e.cargo, photoUrl: e.photo_url };
}
function mapPhoto(p) {
  return { id: p.id, type: p.type, url: p.url, createdAt: p.created_at };
}
function mapMaterial(m) {
  return { id: m.id, name: m.name, quantity: m.quantity, notes: m.notes, createdAt: m.created_at };
}
function mapHistory(h) {
  return {
    id: h.id,
    action: h.action,
    fromValue: h.from_value,
    toValue: h.to_value,
    createdAt: h.created_at,
    user: h.user ? { id: h.user.id, name: h.user.name } : null,
  };
}
function mapService(s) {
  const client = mapClient(s.client) || { id: s.client_id, name: s.client_name || "(cliente não informado)" };
  const employee = mapEmployeeRef(s.employee) || { id: s.employee_id, name: "(funcionário removido)" };
  return {
    id: s.id,
    serviceType: s.service_type,
    description: s.description,
    notes: s.notes,
    materialsPlan: s.materials_plan,
    address: s.address,
    city: s.city,
    state: s.state,
    priority: s.priority,
    scheduledAt: s.scheduled_at,
    status: s.status,
    startedAt: s.started_at,
    completedAt: s.completed_at,
    employeeObservations: s.employee_observations,
    problems: s.problems,
    pendingNotes: s.pending_notes,
    clientId: s.client_id,
    clientName: s.client_name,
    employeeId: s.employee_id,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
    client,
    employee,
    photos: (s.service_photos || []).map(mapPhoto),
    materials: (s.service_materials || []).map(mapMaterial),
    history: (s.service_history || [])
      .map(mapHistory)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}
function mapRequest(r) {
  let resultingService = null;
  if (r.resultingService) {
    resultingService = {
      id: r.resultingService.id,
      status: r.resultingService.status,
      employee: mapEmployeeRef(r.resultingService.employee),
    };
  }
  return {
    id: r.id,
    clientName: r.client_name,
    phone: r.phone,
    address: r.address,
    city: r.city,
    state: r.state,
    serviceType: r.service_type,
    description: r.description,
    desiredAt: r.desired_at,
    notes: r.notes,
    materialsPlan: r.materials_plan,
    priority: r.priority,
    status: r.status,
    clientId: r.client_id,
    resultingServiceId: r.resulting_service_id,
    resultingService,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

const SERVICE_SELECT = `*,
  client:clients(*),
  employee:profiles!services_employee_id_fkey(id,name,phone,cargo,photo_url),
  service_photos(*),
  service_materials(*),
  service_history(*, user:profiles(id,name))`;

const REQUEST_SELECT = `*,
  resultingService:services!service_requests_resulting_service_id_fkey(id,status,employee:profiles!services_employee_id_fkey(id,name,phone,cargo))`;

// ---------------------------------------------------------------------------
// Sessão / Autenticação
// ---------------------------------------------------------------------------
let currentProfile = null;
let resolveAuthReady;
const authReadyPromise = new Promise((res) => (resolveAuthReady = res));
let authReadySettled = false;

async function refreshCurrentProfile(session) {
  if (!session) {
    currentProfile = null;
    return;
  }
  const { data, error } = await supabase
    .from("profiles")
    .select("*, employee_cities(*)")
    .eq("id", session.user.id)
    .maybeSingle();
  currentProfile = error || !data ? null : mapProfile(data);
}

supabase.auth.onAuthStateChange(async (_event, session) => {
  await refreshCurrentProfile(session);
  if (!authReadySettled) {
    authReadySettled = true;
    resolveAuthReady();
  }
});

export function waitForAuthReady() {
  return authReadyPromise;
}

function loginErrorMessage(error) {
  if (error?.message?.includes("Invalid login credentials")) return "E-mail ou senha inválidos.";
  return error?.message || "Não foi possível entrar. Verifique suas credenciais.";
}

export const Auth = {
  currentUser() {
    return currentProfile;
  },
  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email: norm(email), password });
    if (error) throw new StoreError(loginErrorMessage(error));
    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("*, employee_cities(*)")
      .eq("id", data.user.id)
      .maybeSingle();
    if (pErr || !profile) {
      await supabase.auth.signOut();
      throw new StoreError("Usuário não encontrado.");
    }
    if (profile.status === "INACTIVE") {
      await supabase.auth.signOut();
      throw new StoreError("Usuário inativo. Contate o administrador.");
    }
    currentProfile = mapProfile(profile);
    return currentProfile;
  },
  async logout() {
    await supabase.auth.signOut();
    currentProfile = null;
  },
  async forgotPassword(email) {
    const { data: profile } = await supabase.from("profiles").select("id,name,email").eq("email", norm(email)).maybeSingle();
    if (profile) {
      const { data: admins } = await supabase.from("profiles").select("id").eq("role", "ADMIN");
      for (const a of admins || []) {
        await notify(a.id, "Solicitação de redefinição de senha", `${profile.name} (${profile.email}) solicitou a redefinição de senha.`);
      }
    }
    return "Se este e-mail estiver cadastrado, o administrador do sistema foi notificado para redefinir sua senha. Entre em contato com a empresa para receber uma nova senha temporária.";
  },
  async updateMe(userId, data) {
    const patch = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.phone !== undefined) patch.phone = data.phone || null;
    if (data.photoUrl !== undefined) patch.photo_url = data.photoUrl || null;
    const { data: updated, error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", userId)
      .select("*, employee_cities(*)")
      .single();
    fail(error, "Não foi possível atualizar o perfil.");
    currentProfile = mapProfile(updated);
    return currentProfile;
  },
  async changePassword(userId, currentPassword, newPassword) {
    if (!currentPassword || !newPassword) throw new StoreError("Informe a senha atual e a nova senha.");
    if (newPassword.length < 6) throw new StoreError("A nova senha deve ter ao menos 6 caracteres.");
    const email = currentProfile?.email;
    const { error: reauthErr } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (reauthErr) throw new StoreError("Senha atual incorreta.");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    fail(error, "Não foi possível alterar a senha.");
  },
};

// ---------------------------------------------------------------------------
// Notificações
// ---------------------------------------------------------------------------
export const Notifications = {
  async list(userId) {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    fail(error);
    return (data || []).map((n) => ({
      id: n.id,
      userId: n.user_id,
      title: n.title,
      message: n.message,
      read: n.read,
      relatedServiceId: n.related_service_id,
      createdAt: n.created_at,
    }));
  },
  async unreadCount(userId) {
    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("read", false);
    fail(error);
    return count || 0;
  },
  async markRead(userId, id) {
    await supabase.from("notifications").update({ read: true }).eq("id", id).eq("user_id", userId);
  },
  async markAllRead(userId) {
    await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
  },
};

// ---------------------------------------------------------------------------
// Funcionários
// ---------------------------------------------------------------------------
function normalizeCities(input) {
  if (!Array.isArray(input)) return [];
  const seen = new Set();
  const out = [];
  for (const item of input) {
    const city = typeof item?.city === "string" ? item.city.trim() : "";
    if (!city) continue;
    const key = norm(city);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ city, state: (item.state || "").toString().trim().toUpperCase() || null });
  }
  return out;
}

export const Employees = {
  async list({ search, city } = {}) {
    let query = supabase.from("profiles").select("*, employee_cities(*)").eq("role", "EMPLOYEE");
    if (search) {
      const q = search.replace(/[%,]/g, "");
      query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,cargo.ilike.%${q}%`);
    }
    const { data, error } = await query.order("name");
    fail(error);

    const { data: svcRows } = await supabase.from("services").select("employee_id");
    const counts = new Map();
    for (const s of svcRows || []) counts.set(s.employee_id, (counts.get(s.employee_id) || 0) + 1);

    let items = (data || []).map((e) => ({ ...mapProfile(e), _count: { servicesAsEmployee: counts.get(e.id) || 0 } }));
    if (city) items = items.filter((e) => e.serviceRegions.some((r) => norm(r.city) === norm(city)));
    return items;
  },
  async get(id) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*, employee_cities(*)")
      .eq("id", id)
      .eq("role", "EMPLOYEE")
      .maybeSingle();
    fail(error);
    if (!data) throw new StoreError("Funcionário não encontrado.");

    const { data: services } = await supabase
      .from("services")
      .select("*, client:clients(id,name)")
      .eq("employee_id", id)
      .order("scheduled_at", { ascending: false });

    return {
      ...mapProfile(data),
      servicesAsEmployee: (services || []).map((s) => ({
        id: s.id,
        serviceType: s.service_type,
        scheduledAt: s.scheduled_at,
        status: s.status,
        client: s.client ? { id: s.client.id, name: s.client.name } : { id: s.client_id, name: s.client_name || "(cliente não informado)" },
      })),
    };
  },
  async create(data) {
    if (!data.name || !data.email || !data.password) {
      throw new StoreError("Nome, e-mail e senha são obrigatórios.");
    }
    const result = await callAdminUsers({
      action: "create",
      email: norm(data.email),
      password: data.password,
      name: data.name,
      role: "EMPLOYEE",
      phone: data.phone || null,
      cargo: data.cargo || null,
      status: data.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
      cities: normalizeCities(data.cities),
    });
    return this.get(result.id);
  },
  async update(id, data) {
    const patch = {
      name: data.name,
      phone: data.phone || null,
      cargo: data.cargo || null,
      status: data.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    };
    if (data.photoUrl !== undefined) patch.photo_url = data.photoUrl || null;
    const { error } = await supabase.from("profiles").update(patch).eq("id", id);
    fail(error, "Funcionário não encontrado.");

    if (data.email || data.password) {
      await callAdminUsers({ action: "update-credentials", id, email: data.email ? norm(data.email) : undefined, password: data.password || undefined });
    }

    if (Array.isArray(data.cities)) {
      await supabase.from("employee_cities").delete().eq("employee_id", id);
      const normalized = normalizeCities(data.cities);
      if (normalized.length) {
        await supabase.from("employee_cities").insert(normalized.map((c) => ({ employee_id: id, city: c.city, state: c.state })));
      }
    }
    return this.get(id);
  },
  async delete(id) {
    const { count } = await supabase.from("services").select("*", { count: "exact", head: true }).eq("employee_id", id);
    if (count && count > 0) {
      throw new StoreError("Não é possível excluir um funcionário com serviços vinculados. Desative-o em vez disso.");
    }
    await callAdminUsers({ action: "delete", id });
  },
};

function countServicesForClient(clientId, allServices) {
  return allServices.filter((s) => s.client_id === clientId).length;
}

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------
export const Clients = {
  async list({ search } = {}) {
    let query = supabase.from("clients").select("*");
    if (search) {
      const q = search.replace(/[%,]/g, "");
      query = query.or(`name.ilike.%${q}%,document.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%,city.ilike.%${q}%`);
    }
    const { data, error } = await query.order("name");
    fail(error);

    const { data: svcRows } = await supabase.from("services").select("client_id");
    const counts = new Map();
    for (const s of svcRows || []) if (s.client_id) counts.set(s.client_id, (counts.get(s.client_id) || 0) + 1);

    return (data || []).map((c) => ({ ...mapClient(c), _count: { services: counts.get(c.id) || 0 } }));
  },
  async get(id) {
    const { data, error } = await supabase.from("clients").select("*").eq("id", id).maybeSingle();
    fail(error);
    if (!data) throw new StoreError("Cliente não encontrado.");

    const { data: services } = await supabase
      .from("services")
      .select("*, employee:profiles!services_employee_id_fkey(id,name)")
      .eq("client_id", id)
      .order("scheduled_at", { ascending: false });

    return {
      ...mapClient(data),
      services: (services || []).map((s) => ({
        id: s.id,
        serviceType: s.service_type,
        scheduledAt: s.scheduled_at,
        status: s.status,
        employee: mapEmployeeRef(s.employee),
      })),
    };
  },
  async create(data) {
    if (!data.name) throw new StoreError("Nome é obrigatório.");
    const { data: created, error } = await supabase
      .from("clients")
      .insert({
        name: data.name,
        document: data.document || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        number: data.number || null,
        complement: data.complement || null,
        city: data.city || null,
        state: data.state || null,
        notes: data.notes || null,
      })
      .select()
      .single();
    fail(error);
    return mapClient(created);
  },
  async update(id, data) {
    const { data: updated, error } = await supabase
      .from("clients")
      .update({
        name: data.name,
        document: data.document || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        number: data.number || null,
        complement: data.complement || null,
        city: data.city || null,
        state: data.state || null,
        notes: data.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();
    fail(error, "Cliente não encontrado.");
    return mapClient(updated);
  },
  async delete(id) {
    const { count } = await supabase.from("services").select("*", { count: "exact", head: true }).eq("client_id", id);
    if (count && count > 0) {
      throw new StoreError("Não é possível excluir um cliente com serviços vinculados.");
    }
    const { error } = await supabase.from("clients").delete().eq("id", id);
    fail(error, "Cliente não encontrado.");
  },
};

// ---------------------------------------------------------------------------
// Serviços
// ---------------------------------------------------------------------------
const STATUSES = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "PENDING", "CANCELLED"];
const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"];

function clientDisplayName(s) {
  if (s.client?.name) return s.client.name;
  if (s.clientId || s.client_id) return "";
  return s.clientName || s.client_name || "";
}

async function fetchServiceRow(id) {
  const { data, error } = await supabase.from("services").select(SERVICE_SELECT).eq("id", id).maybeSingle();
  fail(error);
  if (!data) throw new StoreError("Serviço não encontrado.");
  return data;
}

async function addHistory(serviceId, action, fromValue, toValue, userId) {
  await supabase.from("service_history").insert({ service_id: serviceId, action, from_value: fromValue ?? null, to_value: toValue ?? null, user_id: userId || null });
}

export const Services = {
  async list(filters = {}) {
    let query = supabase.from("services").select(SERVICE_SELECT);
    if (filters.employeeId) query = query.eq("employee_id", filters.employeeId);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.clientId) query = query.eq("client_id", filters.clientId);
    if (filters.city) query = query.ilike("city", filters.city);
    if (filters.priority) query = query.eq("priority", filters.priority);
    if (filters.dateFrom) query = query.gte("scheduled_at", new Date(filters.dateFrom).toISOString());
    if (filters.dateTo) query = query.lte("scheduled_at", new Date(filters.dateTo).toISOString());
    if (filters.search) {
      const q = filters.search.replace(/[%,]/g, "");
      query = query.or(`service_type.ilike.%${q}%,address.ilike.%${q}%,client_name.ilike.%${q}%`);
    }
    const { data, error } = await query.order("scheduled_at", { ascending: true });
    fail(error);
    let items = (data || []).map(mapService);
    if (filters.search) {
      // Também casa pelo nome do cliente vinculado (busca acima já cobre client_name em texto livre).
      const q = filters.search;
      items = items.filter(
        (s) =>
          includesCI(s.serviceType, q) ||
          includesCI(s.address, q) ||
          includesCI(s.client.name, q)
      );
    }
    return items;
  },
  async get(id) {
    return mapService(await fetchServiceRow(id));
  },
  async create(data, actingUserId) {
    const typedClientName = (data.clientName || "").trim();
    if ((!data.clientId && !typedClientName) || !data.employeeId || !data.serviceType || !data.scheduledAt || !data.address) {
      throw new StoreError("Cliente, funcionário, tipo de serviço, endereço e data/horário são obrigatórios.");
    }
    const { data: created, error } = await supabase
      .from("services")
      .insert({
        client_id: data.clientId || null,
        client_name: data.clientId ? null : typedClientName,
        employee_id: data.employeeId,
        service_type: data.serviceType,
        description: data.description || null,
        notes: data.notes || null,
        materials_plan: data.materialsPlan || null,
        address: data.address,
        city: data.city || null,
        state: data.state || null,
        priority: PRIORITIES.includes(data.priority) ? data.priority : "NORMAL",
        scheduled_at: new Date(data.scheduledAt).toISOString(),
        status: "SCHEDULED",
      })
      .select(SERVICE_SELECT)
      .single();
    fail(error);

    await addHistory(created.id, "CRIADO", null, "SCHEDULED", actingUserId);

    const service = mapService(created);
    await notify(
      data.employeeId,
      "Novo serviço atribuído",
      `Você recebeu um novo serviço: ${data.serviceType} para ${clientDisplayName(service)} em ${new Date(data.scheduledAt).toLocaleString("pt-BR")}.`,
      service.id
    );
    return service;
  },
  async update(id, data, actingUserId) {
    if (data.status && !STATUSES.includes(data.status)) throw new StoreError("Status inválido.");
    const prevRow = await fetchServiceRow(id);
    const prev = mapService(prevRow);

    const patch = {
      employee_id: data.employeeId ?? prev.employeeId,
      service_type: data.serviceType ?? prev.serviceType,
      description: data.description ?? prev.description,
      notes: data.notes ?? prev.notes,
      materials_plan: data.materialsPlan ?? prev.materialsPlan,
      address: data.address ?? prev.address,
      city: data.city ?? prev.city,
      state: data.state ?? prev.state,
      priority: PRIORITIES.includes(data.priority) ? data.priority : prev.priority,
      scheduled_at: data.scheduledAt ? new Date(data.scheduledAt).toISOString() : prev.scheduledAt,
      status: data.status ?? prev.status,
      updated_at: new Date().toISOString(),
    };
    if (data.clientName !== undefined) {
      // O formulário de serviço sempre envia o nome do cliente como texto
      // livre — editar um serviço não depende (nem grava) do cadastro em
      // Clientes.
      patch.client_id = null;
      patch.client_name = data.clientName;
    }

    const { data: updatedRow, error } = await supabase.from("services").update(patch).eq("id", id).select(SERVICE_SELECT).single();
    fail(error);
    const updated = mapService(updatedRow);

    const changedEmployee = data.employeeId && data.employeeId !== prev.employeeId;
    const changedDate = data.scheduledAt && new Date(data.scheduledAt).toISOString() !== prev.scheduledAt;
    const changedStatus = data.status && data.status !== prev.status;
    const changedInfo =
      (data.description !== undefined && data.description !== prev.description) ||
      (data.address !== undefined && data.address !== prev.address) ||
      (data.notes !== undefined && data.notes !== prev.notes) ||
      (data.materialsPlan !== undefined && data.materialsPlan !== prev.materialsPlan);

    if (changedStatus) await addHistory(id, "STATUS_ALTERADO", prev.status, data.status, actingUserId);
    if (changedDate) await addHistory(id, "DATA_ALTERADA", prev.scheduledAt, updated.scheduledAt, actingUserId);

    if (changedStatus && data.status === "CANCELLED") {
      await notify(updated.employeeId, "Serviço cancelado", `O serviço ${updated.serviceType} para ${clientDisplayName(updated)} foi cancelado.`, updated.id);
    } else if (changedEmployee) {
      await notify(updated.employeeId, "Novo serviço atribuído", `Você recebeu o serviço: ${updated.serviceType} para ${clientDisplayName(updated)}.`, updated.id);
    } else if (changedDate) {
      await notify(
        updated.employeeId,
        "Horário do serviço alterado",
        `O horário do serviço ${updated.serviceType} para ${clientDisplayName(updated)} foi alterado para ${new Date(updated.scheduledAt).toLocaleString("pt-BR")}.`,
        updated.id
      );
    } else if (changedInfo) {
      await notify(updated.employeeId, "Serviço atualizado", `As informações do serviço ${updated.serviceType} para ${clientDisplayName(updated)} foram atualizadas. Confira os detalhes.`, updated.id);
    }

    return this.get(id);
  },
  async transfer(id, { employeeId, force }, actingUserId) {
    const existing = mapService(await fetchServiceRow(id));
    if (existing.status === "COMPLETED" || existing.status === "CANCELLED") {
      throw new StoreError("Não é possível transferir um serviço concluído ou cancelado.");
    }
    if (!employeeId) throw new StoreError("Selecione o novo funcionário responsável.");
    if (employeeId === existing.employeeId) throw new StoreError("Este já é o funcionário responsável pelo serviço.");

    const { data: newEmployee } = await supabase.from("profiles").select("*, employee_cities(*)").eq("id", employeeId).eq("role", "EMPLOYEE").maybeSingle();
    if (!newEmployee) throw new StoreError("Funcionário não encontrado.");
    const newEmployeeCities = (newEmployee.employee_cities || []).map(mapCity);

    if (existing.city) {
      const servesCity = newEmployeeCities.some((r) => norm(r.city) === norm(existing.city));
      if (!servesCity && !force) {
        const err = new StoreError(`${newEmployee.name} não está cadastrado para atender ${existing.city}.`);
        err.code = "OUT_OF_REGION";
        throw err;
      }
    }

    if (!force) {
      const suggestions = await getEmployeeSuggestions({ city: existing.city || "", targetAt: new Date(existing.scheduledAt), excludeServiceId: existing.id });
      const target = suggestions.find((s) => s.id === employeeId);
      if (target?.conflict.hasConflict) {
        const err = new StoreError("⚠️ Este funcionário já possui um serviço agendado neste horário.");
        err.code = "TIME_CONFLICT";
        err.conflict = target.conflict;
        throw err;
      }
    }

    const oldEmployeeName = existing.employee.name;
    const oldEmployeeId = existing.employeeId;

    const { error } = await supabase.from("services").update({ employee_id: employeeId, updated_at: new Date().toISOString() }).eq("id", id);
    fail(error);
    await addHistory(id, "TRANSFERIDO", oldEmployeeName, newEmployee.name, actingUserId);

    const dt = new Date(existing.scheduledAt);
    await notify(
      employeeId,
      "📋 Novo serviço para você!",
      `Cliente: ${clientDisplayName(existing)}\nCidade: ${existing.city || "—"}\nServiço: ${existing.serviceType}\nData: ${dt.toLocaleDateString("pt-BR")}\nHorário: ${dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
      existing.id
    );
    await notify(oldEmployeeId, "Serviço transferido", `O serviço ${existing.serviceType} para ${clientDisplayName(existing)} foi transferido para ${newEmployee.name}.`, existing.id);

    return this.get(id);
  },
  async delete(id) {
    const { error } = await supabase.from("services").delete().eq("id", id);
    fail(error, "Serviço não encontrado.");
  },
  async start(id, actingUserId) {
    const existing = mapService(await fetchServiceRow(id));
    if (existing.status !== "SCHEDULED" && existing.status !== "PENDING") {
      throw new StoreError("Este serviço não pode ser iniciado no status atual.");
    }
    const { error } = await supabase.from("services").update({ status: "IN_PROGRESS", started_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", id);
    fail(error);
    await addHistory(id, "SERVICO_INICIADO", existing.status, "IN_PROGRESS", actingUserId);

    const updated = await this.get(id);
    const { data: admins } = await supabase.from("profiles").select("id").eq("role", "ADMIN");
    for (const a of admins || []) {
      await notify(a.id, "Serviço iniciado", `${updated.employee.name} iniciou o serviço ${updated.serviceType} para ${clientDisplayName(updated)}.`, id);
    }
    return updated;
  },
  async setObservations(id, text) {
    await supabase.from("services").update({ employee_observations: text ?? "", updated_at: new Date().toISOString() }).eq("id", id);
    return this.get(id);
  },
  async setProblems(id, text) {
    const existing = mapService(await fetchServiceRow(id));
    const changed = text && text !== existing.problems;
    await supabase.from("services").update({ problems: text ?? "", updated_at: new Date().toISOString() }).eq("id", id);
    if (changed) {
      const { data: admins } = await supabase.from("profiles").select("id").eq("role", "ADMIN");
      for (const a of admins || []) {
        await notify(a.id, "Problema registrado em serviço", `${existing.employee.name} registrou um problema no serviço ${existing.serviceType} (${clientDisplayName(existing)}): ${text}`, id);
      }
    }
    return this.get(id);
  },
  async setPending(id, text) {
    const existing = mapService(await fetchServiceRow(id));
    const changed = text && text !== existing.pendingNotes;
    await supabase.from("services").update({ pending_notes: text ?? "", updated_at: new Date().toISOString() }).eq("id", id);
    if (changed) {
      const { data: admins } = await supabase.from("profiles").select("id").eq("role", "ADMIN");
      for (const a of admins || []) {
        await notify(a.id, "Pendência registrada em serviço", `${existing.employee.name} registrou uma pendência no serviço ${existing.serviceType} (${clientDisplayName(existing)}): ${text}`, id);
      }
    }
    return this.get(id);
  },
  async complete(id, { force } = {}, actingUserId) {
    const existing = mapService(await fetchServiceRow(id));
    if (existing.status !== "IN_PROGRESS") throw new StoreError("O serviço precisa estar em andamento para ser concluído.");
    const missing = [];
    if (!existing.photos.some((p) => p.type === "BEFORE")) missing.push("ao menos 1 foto do tipo ANTES");
    if (!existing.photos.some((p) => p.type === "AFTER")) missing.push("ao menos 1 foto do tipo DEPOIS");
    if (missing.length && !force) {
      const err = new StoreError(`Antes de concluir, registre: ${missing.join(", ")}.`);
      err.missing = missing;
      throw err;
    }
    const newStatus = existing.pendingNotes ? "PENDING" : "COMPLETED";
    await supabase.from("services").update({ status: newStatus, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", id);
    await addHistory(id, "SERVICO_CONCLUIDO", "IN_PROGRESS", newStatus, actingUserId);

    const updated = await this.get(id);
    const { data: admins } = await supabase.from("profiles").select("id").eq("role", "ADMIN");
    for (const a of admins || []) {
      await notify(a.id, "Serviço concluído", `${updated.employee.name} concluiu o serviço ${updated.serviceType} para ${clientDisplayName(updated)}.`, id);
    }
    return updated;
  },
  async addPhoto(id, { type, file }) {
    const url = await uploadServicePhoto(file);
    const { data, error } = await supabase
      .from("service_photos")
      .insert({ service_id: id, type: type === "AFTER" ? "AFTER" : "BEFORE", url })
      .select()
      .single();
    fail(error);
    return mapPhoto(data);
  },
  async deletePhoto(id, photoId) {
    await supabase.from("service_photos").delete().eq("id", photoId).eq("service_id", id);
  },
  async addMaterial(id, { name, quantity, notes }) {
    if (!name || !quantity) throw new StoreError("Nome e quantidade são obrigatórios.");
    const { data, error } = await supabase
      .from("service_materials")
      .insert({ service_id: id, name, quantity: String(quantity), notes: notes || null })
      .select()
      .single();
    fail(error);
    return mapMaterial(data);
  },
  async deleteMaterial(id, materialId) {
    await supabase.from("service_materials").delete().eq("id", materialId).eq("service_id", id);
  },
};

// ---------------------------------------------------------------------------
// Agendamento / sugestões de funcionário
// ---------------------------------------------------------------------------
const CONFLICT_WINDOW_MINUTES = 60;

export async function getEmployeeSuggestions({ city, targetAt, excludeServiceId }) {
  const cityKey = norm(city);

  const { data: employees, error } = await supabase
    .from("profiles")
    .select("*, employee_cities(*)")
    .eq("role", "EMPLOYEE")
    .eq("status", "ACTIVE")
    .order("name");
  fail(error);

  const eligible = (employees || []).filter((e) => (e.employee_cities || []).some((r) => norm(r.city) === cityKey));
  if (eligible.length === 0) return [];

  const dayStart = new Date(targetAt);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(targetAt);
  dayEnd.setHours(23, 59, 59, 999);

  const ids = eligible.map((e) => e.id);
  let dayQuery = supabase
    .from("services")
    .select("*, client:clients(id,name)")
    .in("employee_id", ids)
    .neq("status", "CANCELLED")
    .gte("scheduled_at", dayStart.toISOString())
    .lte("scheduled_at", dayEnd.toISOString());
  if (excludeServiceId) dayQuery = dayQuery.neq("id", excludeServiceId);
  const { data: dayServicesAll } = await dayQuery;

  const results = [];
  for (const emp of eligible) {
    const dayServices = (dayServicesAll || [])
      .filter((s) => s.employee_id === emp.id)
      .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));

    let conflictingService;
    for (const s of dayServices) {
      const diffMinutes = Math.abs(new Date(s.scheduled_at).getTime() - targetAt.getTime()) / 60000;
      if (diffMinutes < CONFLICT_WINDOW_MINUTES) {
        conflictingService = s;
        break;
      }
    }

    const sameCityCount = dayServices.filter((s) => norm(s.city) === cityKey).length;

    const reasons = [`Atende ${city}`];
    if (!conflictingService) reasons.push("Sem conflito de horário nesse dia");
    reasons.push(dayServices.length === 0 ? "Nenhum outro serviço nesse dia" : `Possui ${dayServices.length} serviço(s) nesse dia`);
    if (sameCityCount > 0) reasons.push(`Já atende ${sameCityCount} serviço(s) em ${city} no mesmo dia (menor deslocamento)`);

    results.push({
      id: emp.id,
      name: emp.name,
      cargo: emp.cargo,
      photoUrl: emp.photo_url,
      phone: emp.phone,
      cities: (emp.employee_cities || []).map((r) => ({ city: r.city, state: r.state })),
      serviceCountOnDate: dayServices.length,
      sameCityServiceCountOnDate: sameCityCount,
      conflict: {
        hasConflict: Boolean(conflictingService),
        conflictingService: conflictingService
          ? {
              id: conflictingService.id,
              serviceType: conflictingService.service_type,
              scheduledAt: conflictingService.scheduled_at,
              clientName: conflictingService.client?.name || conflictingService.client_name || "",
            }
          : undefined,
      },
      recommended: false,
      reasons,
    });
  }

  results.sort((a, b) => {
    if (a.conflict.hasConflict !== b.conflict.hasConflict) return a.conflict.hasConflict ? 1 : -1;
    if (a.sameCityServiceCountOnDate !== b.sameCityServiceCountOnDate) return b.sameCityServiceCountOnDate - a.sameCityServiceCountOnDate;
    return a.serviceCountOnDate - b.serviceCountOnDate;
  });
  if (results.length > 0 && !results[0].conflict.hasConflict) results[0].recommended = true;
  return results;
}

// ---------------------------------------------------------------------------
// Solicitações de serviço (distribuição por cidade)
// ---------------------------------------------------------------------------
const PRIORITY_RANK = { URGENT: 3, HIGH: 2, NORMAL: 1, LOW: 0 };

export const ServiceRequests = {
  async list({ status, city, priority, search } = {}) {
    let query = supabase.from("service_requests").select(REQUEST_SELECT);
    if (status) query = query.eq("status", status);
    if (city) query = query.ilike("city", city);
    if (priority) query = query.eq("priority", priority);
    if (search) {
      const q = search.replace(/[%,]/g, "");
      query = query.or(`client_name.ilike.%${q}%,address.ilike.%${q}%,city.ilike.%${q}%,service_type.ilike.%${q}%`);
    }
    const { data, error } = await query;
    fail(error);
    const items = (data || []).map(mapRequest);
    items.sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] || b.createdAt.localeCompare(a.createdAt));
    return items;
  },
  async get(id) {
    const { data, error } = await supabase.from("service_requests").select(REQUEST_SELECT).eq("id", id).maybeSingle();
    fail(error);
    if (!data) throw new StoreError("Solicitação não encontrada.");
    return mapRequest(data);
  },
  async create(data) {
    if (!data.clientName || !data.address || !data.city || !data.serviceType || !data.desiredAt) {
      throw new StoreError("Cliente, endereço, cidade, tipo de serviço e data desejada são obrigatórios.");
    }
    const { data: created, error } = await supabase
      .from("service_requests")
      .insert({
        client_name: data.clientName,
        phone: data.phone || null,
        address: data.address,
        city: data.city,
        state: data.state || null,
        service_type: data.serviceType,
        description: data.description || null,
        desired_at: new Date(data.desiredAt).toISOString(),
        notes: data.notes || null,
        materials_plan: data.materialsPlan || null,
        priority: PRIORITIES.includes(data.priority) ? data.priority : "NORMAL",
        client_id: data.clientId || null,
        status: "PENDING",
      })
      .select(REQUEST_SELECT)
      .single();
    fail(error);
    return mapRequest(created);
  },
  async update(id, data) {
    const existing = await this.get(id);
    if (existing.status !== "PENDING") throw new StoreError("Somente solicitações pendentes podem ser editadas.");
    const { data: updated, error } = await supabase
      .from("service_requests")
      .update({
        client_name: data.clientName ?? existing.clientName,
        phone: data.phone ?? existing.phone,
        address: data.address ?? existing.address,
        city: data.city ?? existing.city,
        state: data.state ?? existing.state,
        service_type: data.serviceType ?? existing.serviceType,
        description: data.description ?? existing.description,
        desired_at: data.desiredAt ? new Date(data.desiredAt).toISOString() : existing.desiredAt,
        notes: data.notes ?? existing.notes,
        materials_plan: data.materialsPlan ?? existing.materialsPlan,
        priority: data.priority && PRIORITIES.includes(data.priority) ? data.priority : existing.priority,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(REQUEST_SELECT)
      .single();
    fail(error);
    return mapRequest(updated);
  },
  async cancel(id) {
    const existing = await this.get(id);
    if (existing.status !== "PENDING") throw new StoreError("Somente solicitações pendentes podem ser canceladas.");
    const { data: updated, error } = await supabase
      .from("service_requests")
      .update({ status: "CANCELLED", updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(REQUEST_SELECT)
      .single();
    fail(error);
    return mapRequest(updated);
  },
  async suggestions(id) {
    const request = await this.get(id);
    return getEmployeeSuggestions({ city: request.city, targetAt: new Date(request.desiredAt) });
  },
  async assign(id, { employeeId, scheduledAt, force }, actingUserId) {
    const request = await this.get(id);
    if (request.status !== "PENDING") throw new StoreError("Esta solicitação já foi distribuída ou cancelada.");
    if (!employeeId) throw new StoreError("Selecione um funcionário responsável.");

    const { data: employee } = await supabase.from("profiles").select("*, employee_cities(*)").eq("id", employeeId).eq("role", "EMPLOYEE").maybeSingle();
    if (!employee) throw new StoreError("Funcionário não encontrado.");

    const servesCity = (employee.employee_cities || []).some((r) => norm(r.city) === norm(request.city));
    if (!servesCity && !force) {
      const err = new StoreError(`${employee.name} não está cadastrado para atender ${request.city}.`);
      err.code = "OUT_OF_REGION";
      throw err;
    }

    const targetAt = scheduledAt ? new Date(scheduledAt) : new Date(request.desiredAt);

    if (!force) {
      const suggestion = (await getEmployeeSuggestions({ city: request.city, targetAt })).find((s) => s.id === employeeId);
      if (suggestion?.conflict.hasConflict) {
        const err = new StoreError("⚠️ Este funcionário já possui um serviço agendado neste horário.");
        err.code = "TIME_CONFLICT";
        err.conflict = suggestion.conflict;
        throw err;
      }
    }

    let clientId = request.clientId;
    if (!clientId) {
      let existingClient = null;
      if (request.phone) {
        const { data } = await supabase.from("clients").select("*").eq("name", request.clientName).eq("phone", request.phone).maybeSingle();
        existingClient = data;
      }
      if (existingClient) {
        clientId = existingClient.id;
      } else {
        const created = await Clients.create({
          name: request.clientName,
          phone: request.phone,
          address: request.address,
          city: request.city,
          state: request.state,
        });
        clientId = created.id;
      }
    }

    const service = await Services.create(
      {
        clientId,
        employeeId,
        serviceType: request.serviceType,
        description: request.description,
        notes: request.notes,
        materialsPlan: request.materialsPlan,
        address: request.address,
        city: request.city,
        state: request.state,
        priority: request.priority,
        scheduledAt: targetAt.toISOString(),
      },
      actingUserId
    );

    await addHistory(service.id, "DISTRIBUIDO_POR_CIDADE", null, `${employee.name} (${request.city})`, actingUserId);

    const { data: updatedRequest, error } = await supabase
      .from("service_requests")
      .update({ status: "ASSIGNED", client_id: clientId, resulting_service_id: service.id, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(REQUEST_SELECT)
      .single();
    fail(error);

    return { request: mapRequest(updatedRequest), service: await Services.get(service.id) };
  },
};

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export const Dashboard = {
  async stats() {
    const { data: services } = await supabase.from("services").select("id,status,scheduled_at,employee_id");
    const list = services || [];

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const countBy = (status) => list.filter((s) => s.status === status).length;
    const today = list.filter((s) => s.scheduled_at >= startOfDay.toISOString() && s.scheduled_at <= endOfDay.toISOString()).length;

    const byStatusMap = new Map();
    for (const s of list) byStatusMap.set(s.status, (byStatusMap.get(s.status) || 0) + 1);

    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const dayBuckets = new Map();
    for (const s of list) {
      if (s.scheduled_at < cutoff) continue;
      const key = s.scheduled_at.slice(0, 10);
      dayBuckets.set(key, (dayBuckets.get(key) || 0) + 1);
    }
    const timeline = Array.from(dayBuckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    const { data: employees } = await supabase.from("profiles").select("id,name").eq("role", "EMPLOYEE").eq("status", "ACTIVE");
    const { count: clientsCount } = await supabase.from("clients").select("*", { count: "exact", head: true });
    const { count: employeesCount } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "EMPLOYEE");

    const employeeLoad = (employees || []).map((e) => ({ id: e.id, name: e.name, count: list.filter((s) => s.employee_id === e.id).length }));

    return {
      total: list.length,
      today,
      inProgress: countBy("IN_PROGRESS"),
      completed: countBy("COMPLETED"),
      pending: countBy("PENDING"),
      scheduled: countBy("SCHEDULED"),
      cancelled: countBy("CANCELLED"),
      employees: employeesCount || 0,
      clients: clientsCount || 0,
      byStatus: Array.from(byStatusMap.entries()).map(([status, count]) => ({ status, count })),
      timeline,
      employeeLoad,
    };
  },
};

// ---------------------------------------------------------------------------
// Distribuição
// ---------------------------------------------------------------------------
export const Distribution = {
  async stats() {
    const recentThreshold = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { data: requests } = await supabase.from("service_requests").select("status,created_at");
    const { data: services } = await supabase.from("services").select("status,city,employee_id");
    const { data: employees } = await supabase.from("profiles").select("id,name").eq("role", "EMPLOYEE");
    const empNames = new Map((employees || []).map((e) => [e.id, e.name]));

    const cityMap = new Map();
    for (const s of services || []) {
      if (s.status === "CANCELLED" || !s.city) continue;
      const city = s.city.trim();
      if (!city) continue;
      const key = norm(city);
      if (!cityMap.has(key)) cityMap.set(key, { city, count: 0, employees: new Map() });
      const entry = cityMap.get(key);
      entry.count += 1;
      entry.employees.set(s.employee_id, empNames.get(s.employee_id) || "");
    }
    const byCity = Array.from(cityMap.values())
      .map((e) => ({ city: e.city, count: e.count, employees: Array.from(e.employees.entries()).map(([id, name]) => ({ id, name })) }))
      .sort((a, b) => b.count - a.count);

    const reqs = requests || [];
    const svcs = services || [];
    return {
      newRequests: reqs.filter((r) => r.status === "PENDING" && r.created_at >= recentThreshold).length,
      awaitingRequests: reqs.filter((r) => r.status === "PENDING").length,
      scheduled: svcs.filter((s) => s.status === "SCHEDULED").length,
      inProgress: svcs.filter((s) => s.status === "IN_PROGRESS").length,
      completed: svcs.filter((s) => s.status === "COMPLETED").length,
      pending: svcs.filter((s) => s.status === "PENDING").length,
      byCity,
    };
  },
  async byEmployee() {
    const { data: employees } = await supabase
      .from("profiles")
      .select("*, employee_cities(*)")
      .eq("role", "EMPLOYEE")
      .eq("status", "ACTIVE")
      .order("name");
    const { data: services } = await supabase
      .from("services")
      .select("*, client:clients(id,name)")
      .neq("status", "CANCELLED")
      .order("scheduled_at");

    return (employees || []).map((e) => ({
      id: e.id,
      name: e.name,
      cargo: e.cargo,
      cities: (e.employee_cities || []).slice().sort((a, b) => a.city.localeCompare(b.city)).map((r) => r.city),
      services: (services || [])
        .filter((s) => s.employee_id === e.id)
        .map((s) => ({
          id: s.id,
          serviceType: s.service_type,
          clientName: s.client?.name || s.client_name || "",
          city: s.city,
          address: s.address,
          scheduledAt: s.scheduled_at,
          status: s.status,
        })),
    }));
  },
};

// ---------------------------------------------------------------------------
// Relatórios
// ---------------------------------------------------------------------------
export const STATUS_LABELS_PT = {
  SCHEDULED: "Agendado",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluído",
  PENDING: "Pendente",
  CANCELLED: "Cancelado",
};

async function reportFilter(filters = {}) {
  let query = supabase.from("services").select(`*, client:clients(id,name), employee:profiles!services_employee_id_fkey(id,name), service_materials(*)`);
  if (filters.employeeId) query = query.eq("employee_id", filters.employeeId);
  if (filters.clientId) query = query.eq("client_id", filters.clientId);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.dateFrom) query = query.gte("scheduled_at", new Date(filters.dateFrom).toISOString());
  if (filters.dateTo) query = query.lte("scheduled_at", new Date(filters.dateTo).toISOString());
  const { data, error } = await query.order("scheduled_at", { ascending: false });
  fail(error);
  return data || [];
}

export const Reports = {
  async services(filters) {
    const rows = await reportFilter(filters);
    return rows.map((s) => ({
      id: s.id,
      serviceType: s.service_type,
      client: s.client?.name || s.client_name || "",
      employee: s.employee?.name || "",
      status: s.status,
      statusLabel: STATUS_LABELS_PT[s.status] || s.status,
      scheduledAt: s.scheduled_at,
      startedAt: s.started_at,
      completedAt: s.completed_at,
      address: s.address,
      materialsCount: (s.service_materials || []).length,
    }));
  },
  async materials(filters) {
    const rows = await reportFilter(filters);
    const totals = new Map();
    for (const s of rows) {
      for (const m of s.service_materials || []) {
        const key = norm(m.name);
        const qty = parseFloat(String(m.quantity).replace(",", ".")) || 0;
        const entry = totals.get(key) || { name: m.name, quantity: 0, uses: 0 };
        entry.quantity += qty;
        entry.uses += 1;
        totals.set(key, entry);
      }
    }
    return Array.from(totals.values()).sort((a, b) => b.uses - a.uses);
  },
  async summary(filters) {
    const rows = await reportFilter(filters);
    const byStatus = {};
    const byEmployee = {};
    const byClient = {};
    for (const s of rows) {
      byStatus[s.status] = (byStatus[s.status] || 0) + 1;
      const empName = s.employee?.name || "";
      byEmployee[empName] = (byEmployee[empName] || 0) + 1;
      const cliName = s.client?.name || s.client_name || "";
      byClient[cliName] = (byClient[cliName] || 0) + 1;
    }
    return { total: rows.length, byStatus, byEmployee, byClient };
  },
};
