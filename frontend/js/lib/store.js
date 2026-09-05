// Camada de dados 100% local (substitui a antiga API Node/Express/Prisma).
// Tudo é lido/gravado em localStorage, no navegador do usuário. Todos os
// "logins" de demonstração compartilham a mesma base local, exatamente como
// todos compartilhavam o mesmo banco SQLite antes.

const DB_KEY = "ns_db_v1";
const SESSION_KEY = "ns_session_v1";

export class StoreError extends Error {}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
export function genId(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso() {
  return new Date().toISOString();
}

const PLACEHOLDER_PHOTO =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

function norm(s) {
  return (s || "").toString().trim().toLowerCase();
}

function includesCI(haystack, needle) {
  return norm(haystack).includes(norm(needle));
}

// Redimensiona/comprime uma foto antes de guardar em localStorage (o limite do
// navegador costuma ser ~5-10MB por origem, então evitamos fotos gigantes).
export function fileToDataUrl(file, maxDim = 1000, quality = 0.72) {
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
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new StoreError("Arquivo de imagem inválido."));
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// ---------------------------------------------------------------------------
// Persistência
// ---------------------------------------------------------------------------
let db = null;

function blankDb() {
  return { users: [], clients: [], services: [], serviceRequests: [], notifications: [] };
}

function load() {
  if (db) return db;
  try {
    const raw = localStorage.getItem(DB_KEY);
    db = raw ? JSON.parse(raw) : null;
  } catch {
    db = null;
  }
  if (!db) {
    db = blankDb();
    seed();
    persist();
  }
  return db;
}

function persist() {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

export function resetDemoData() {
  db = blankDb();
  seed();
  persist();
  clearSession();
}

// ---------------------------------------------------------------------------
// Seed (dados de demonstração — espelha backend/prisma/seed.ts)
// ---------------------------------------------------------------------------
function seed() {
  const admin = {
    id: genId("user"),
    name: "ALPHA CLIMATIZAÇÃO",
    email: "admin@nsclimatizacao.com.br",
    password: "admin123",
    role: "ADMIN",
    cargo: "Administrador",
    phone: "(11) 98888-0001",
    photoUrl: null,
    status: "ACTIVE",
    createdAt: nowIso(),
    serviceRegions: [],
  };
  db.users.push(admin);

  const empData = [
    { name: "João Silva", email: "joao@nsclimatizacao.com.br", cargo: "Técnico de Instalação", phone: "(11) 97777-1111", cities: [["São Paulo", "SP"], ["Guarulhos", "SP"], ["Londrina", "PR"], ["Cambé", "PR"]] },
    { name: "Marcos Oliveira", email: "marcos@nsclimatizacao.com.br", cargo: "Técnico de Manutenção", phone: "(11) 97777-2222", cities: [["São Paulo", "SP"], ["Maringá", "PR"], ["Sarandi", "PR"]] },
    { name: "Renata Souza", email: "renata@nsclimatizacao.com.br", cargo: "Técnica de Instalação", phone: "(11) 97777-3333", cities: [["São Paulo", "SP"], ["Guarulhos", "SP"], ["Rolândia", "PR"], ["Paiçandu", "PR"]] },
    { name: "Paulo Costa", email: "paulo@nsclimatizacao.com.br", cargo: "Técnico de Manutenção", phone: "(11) 97777-4444", cities: [["Curitiba", "PR"]], status: "INACTIVE" },
  ];
  const employees = empData.map((e) => {
    const u = {
      id: genId("user"),
      name: e.name,
      email: e.email,
      password: "123456",
      role: "EMPLOYEE",
      cargo: e.cargo,
      phone: e.phone,
      photoUrl: null,
      status: e.status || "ACTIVE",
      createdAt: nowIso(),
      serviceRegions: e.cities.map(([city, state]) => ({ id: genId("city"), city, state })),
    };
    db.users.push(u);
    return u;
  });
  const [joao, marcos, renata] = employees;

  const clientsData = [
    { name: "Condomínio Jardim das Flores", document: "12.345.678/0001-90", phone: "(11) 3222-1000", email: "sindico@jardimdasflores.com.br", address: "Rua das Acácias, 500", number: "500", complement: "Portaria principal", city: "São Paulo", state: "SP", notes: "Cliente desde 2022. Prefere agendamentos pela manhã." },
    { name: "Supermercado Boa Compra", document: "98.765.432/0001-10", phone: "(11) 3222-2000", email: "manutencao@boacompra.com.br", address: "Av. Brasil, 1200", number: "1200", complement: "Loja 2", city: "São Paulo", state: "SP", notes: "Contrato de manutenção mensal dos climatizadores." },
    { name: "Ana Paula Ribeiro", document: "123.456.789-00", phone: "(11) 91234-5678", email: "anapaula.ribeiro@email.com", address: "Rua dos Ipês, 88", number: "88", complement: "Apto 42", city: "Guarulhos", state: "SP", notes: "" },
    { name: "Clínica Vida Saudável", document: "45.678.912/0001-33", phone: "(11) 3222-4000", email: "contato@vidasaudavel.com.br", address: "Rua Voluntários da Pátria, 300", number: "300", complement: "", city: "São Paulo", state: "SP", notes: "Equipamentos críticos: sala de procedimentos precisa de atenção prioritária." },
    { name: "Restaurante Sabor & Arte", document: "22.333.444/0001-55", phone: "(11) 3222-5000", email: "gerencia@saborarte.com.br", address: "Alameda Santos, 750", number: "750", complement: "", city: "São Paulo", state: "SP", notes: "" },
  ];
  const clients = clientsData.map((c) => {
    const client = { id: genId("client"), createdAt: nowIso(), updatedAt: nowIso(), ...c };
    db.clients.push(client);
    return client;
  });
  const [condominio, mercado, ana, clinica, restaurante] = clients;

  function inDays(d, h = 9, m = 0) {
    const dt = new Date();
    dt.setDate(dt.getDate() + d);
    dt.setHours(h, m, 0, 0);
    return dt;
  }

  function createService(o) {
    const id = genId("svc");
    const service = {
      id,
      serviceType: o.serviceType,
      description: o.description || null,
      notes: o.notes || null,
      materialsPlan: o.materialsPlan || null,
      address: o.address,
      city: o.city || null,
      state: o.state || null,
      priority: o.priority || "NORMAL",
      scheduledAt: o.scheduledAt.toISOString(),
      status: o.status,
      clientId: o.clientId,
      employeeId: o.employeeId,
      employeeObservations: o.employeeObservations || null,
      problems: o.problems || null,
      pendingNotes: o.pendingNotes || null,
      startedAt: ["IN_PROGRESS", "COMPLETED", "PENDING"].includes(o.status)
        ? new Date(o.scheduledAt.getTime() + (o.startedOffsetMin ?? 5) * 60000).toISOString()
        : null,
      completedAt: ["COMPLETED", "PENDING"].includes(o.status)
        ? new Date(o.scheduledAt.getTime() + (o.completedOffsetMin ?? 90) * 60000).toISOString()
        : null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      photos: [],
      materials: [],
      history: [{ id: genId("hist"), action: "CRIADO", toValue: "SCHEDULED", createdAt: nowIso(), userId: null }],
    };
    if (service.status !== "SCHEDULED") {
      service.history.push({ id: genId("hist"), action: "STATUS_ALTERADO", fromValue: "SCHEDULED", toValue: service.status, createdAt: nowIso(), userId: null });
    }
    if (o.withPhotos) {
      service.photos.push({ id: genId("photo"), type: "BEFORE", url: PLACEHOLDER_PHOTO, createdAt: nowIso() });
      service.photos.push({ id: genId("photo"), type: "AFTER", url: PLACEHOLDER_PHOTO, createdAt: nowIso() });
    }
    if (o.materials) {
      for (const m of o.materials) {
        service.materials.push({ id: genId("mat"), name: m.name, quantity: m.quantity, notes: m.notes || null, createdAt: nowIso() });
      }
    }
    db.services.push(service);
    return service;
  }

  createService({
    serviceType: "Instalação de Ar Condicionado Split",
    description: "Instalação de 2 unidades split 12.000 BTUs no salão de festas.",
    notes: "Levar escada de 6m. Cliente libera acesso a partir das 8h.",
    materialsPlan: "2x unidade split 12.000 BTUs, suportes, tubulação de cobre",
    address: `${condominio.address}, ${condominio.number} - ${condominio.city}/${condominio.state}`,
    city: condominio.city, state: condominio.state,
    scheduledAt: inDays(-3, 8, 30), status: "COMPLETED", clientId: condominio.id, employeeId: joao.id,
    withPhotos: true,
    employeeObservations: "Instalação concluída sem intercorrências. Testado o funcionamento por 30 minutos.",
    materials: [
      { name: "Unidade Split 12.000 BTUs", quantity: "2", notes: "Marca Fujitsu" },
      { name: "Tubulação de cobre 1/4 e 3/8", quantity: "15m" },
      { name: "Suporte para condensadora", quantity: "2" },
    ],
  });

  createService({
    serviceType: "Manutenção Preventiva",
    description: "Limpeza de filtros e verificação de gás refrigerante dos climatizadores da loja.",
    notes: "Contrato mensal - verificar todas as 8 unidades.",
    address: `${mercado.address}, ${mercado.number} - ${mercado.city}/${mercado.state}`,
    city: mercado.city, state: mercado.state,
    scheduledAt: inDays(0, 9, 0), status: "IN_PROGRESS", clientId: mercado.id, employeeId: marcos.id,
    employeeObservations: "Já verificadas 5 das 8 unidades. Tudo dentro do esperado até o momento.",
  });

  createService({
    serviceType: "Manutenção Corretiva",
    description: "Ar condicionado não está gelando. Verificar gás e compressor.",
    notes: "Cliente relatou barulho estranho no equipamento.",
    address: `${ana.address}, ${ana.number}, ${ana.complement} - ${ana.city}/${ana.state}`,
    city: ana.city, state: ana.state,
    scheduledAt: inDays(0, 14, 0), status: "SCHEDULED", clientId: ana.id, employeeId: joao.id,
  });

  createService({
    serviceType: "Instalação de Climatizador",
    description: "Instalação de climatizador evaporativo na sala de espera.",
    address: `${clinica.address}, ${clinica.number} - ${clinica.city}/${clinica.state}`,
    city: clinica.city, state: clinica.state,
    scheduledAt: inDays(1, 10, 0), status: "SCHEDULED", clientId: clinica.id, employeeId: renata.id,
    materialsPlan: "1x climatizador evaporativo industrial, mangueira de alimentação",
  });

  createService({
    serviceType: "Manutenção Preventiva",
    description: "Revisão trimestral dos equipamentos da cozinha industrial.",
    address: `${restaurante.address}, ${restaurante.number} - ${restaurante.city}/${restaurante.state}`,
    city: restaurante.city, state: restaurante.state,
    scheduledAt: inDays(2, 8, 0), status: "SCHEDULED", clientId: restaurante.id, employeeId: marcos.id,
  });

  createService({
    serviceType: "Manutenção Corretiva",
    description: "Troca de placa eletrônica do climatizador central.",
    address: `${condominio.address}, ${condominio.number} - ${condominio.city}/${condominio.state}`,
    city: condominio.city, state: condominio.state,
    scheduledAt: inDays(-1, 13, 0), status: "PENDING", clientId: condominio.id, employeeId: renata.id,
    withPhotos: true,
    employeeObservations: "Peça necessária não estava disponível em estoque no momento do atendimento.",
    problems: "Placa eletrônica apresentava queima parcial não identificada previamente.",
    pendingNotes: "Necessário retornar ao local para instalar a placa eletrônica assim que a peça chegar (previsão: 3 dias úteis).",
    materials: [{ name: "Placa eletrônica universal", quantity: "1", notes: "Aguardando peça de reposição" }],
  });

  createService({
    serviceType: "Instalação de Ar Condicionado Split",
    description: "Instalação de unidade split no quarto principal.",
    address: `${ana.address}, ${ana.number}, ${ana.complement} - ${ana.city}/${ana.state}`,
    city: ana.city, state: ana.state,
    scheduledAt: inDays(-2, 15, 0), status: "CANCELLED", clientId: ana.id, employeeId: joao.id,
  });

  const pastTypes = ["Manutenção Preventiva", "Manutenção Corretiva", "Instalação de Ar Condicionado Split", "Limpeza de Filtros"];
  const pastClients = [condominio, mercado, ana, clinica, restaurante];
  const pastEmployees = [joao, marcos, renata];
  for (let i = 4; i <= 20; i += 2) {
    const client = pastClients[i % pastClients.length];
    const employee = pastEmployees[i % pastEmployees.length];
    createService({
      serviceType: pastTypes[i % pastTypes.length],
      description: "Atendimento de rotina.",
      address: `${client.address}, ${client.number} - ${client.city}/${client.state}`,
      city: client.city, state: client.state,
      scheduledAt: inDays(-i, 8 + (i % 6), 0),
      status: i % 7 === 0 ? "CANCELLED" : "COMPLETED",
      clientId: client.id, employeeId: employee.id,
      withPhotos: i % 7 !== 0,
      employeeObservations: i % 7 !== 0 ? "Serviço realizado conforme previsto." : undefined,
      materials: i % 7 !== 0 ? [{ name: "Filtro de ar", quantity: String(1 + (i % 3)) }] : undefined,
    });
  }

  db.serviceRequests.push(
    { id: genId("req"), clientName: "Empresa ABC Comércio", phone: "(43) 3325-1010", address: "Av. Higienópolis, 620", city: "Londrina", state: "PR", serviceType: "Manutenção Preventiva", description: "Revisão geral dos aparelhos do escritório antes do verão.", desiredAt: inDays(2, 14, 0).toISOString(), notes: "Prefere atendimento à tarde.", materialsPlan: "Filtros de ar, gás refrigerante R410a", priority: "NORMAL", status: "PENDING", clientId: null, resultingServiceId: null, createdAt: nowIso(), updatedAt: nowIso() },
    { id: genId("req"), clientName: "Indústria Maringá Metais", phone: "(44) 3227-4040", address: "Rod. PR-317, Km 12", city: "Maringá", state: "PR", serviceType: "Instalação de Climatizador", description: "Instalação de climatizador industrial no galpão 2.", desiredAt: inDays(2, 8, 0).toISOString(), notes: "Acesso liberado somente com agendamento prévio na portaria.", materialsPlan: null, priority: "HIGH", status: "PENDING", clientId: null, resultingServiceId: null, createdAt: nowIso(), updatedAt: nowIso() },
    { id: genId("req"), clientName: "Farmácia Saúde Já", phone: "(43) 3172-9090", address: "Rua Pernambuco, 210", city: "Cambé", state: "PR", serviceType: "Manutenção Corretiva", description: "Ar condicionado da farmácia parou de funcionar, loja climatizada é essencial para os remédios.", desiredAt: inDays(1, 11, 0).toISOString(), notes: "Urgente — produtos sensíveis à temperatura.", materialsPlan: null, priority: "URGENT", status: "PENDING", clientId: null, resultingServiceId: null, createdAt: nowIso(), updatedAt: nowIso() }
  );

  db.notifications.push(
    { id: genId("notif"), userId: admin.id, title: "Bem-vindo ao sistema", message: "Este é o painel administrativo da ALPHA CLIMATIZAÇÃO. Explore os módulos no menu lateral.", read: false, relatedServiceId: null, createdAt: nowIso() },
    { id: genId("notif"), userId: joao.id, title: "Novo serviço atribuído", message: "Você tem um serviço de manutenção corretiva agendado para hoje às 14:00.", read: false, relatedServiceId: null, createdAt: nowIso() }
  );
}

// ---------------------------------------------------------------------------
// Sessão / Autenticação
// ---------------------------------------------------------------------------
export const Auth = {
  currentUser() {
    let sessionUserId;
    try {
      sessionUserId = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    } catch {
      sessionUserId = null;
    }
    if (!sessionUserId) return null;
    const u = load().users.find((u) => u.id === sessionUserId);
    return u ? safeUser(u) : null;
  },
  login(email, password) {
    const user = load().users.find((u) => norm(u.email) === norm(email));
    if (!user) throw new StoreError("E-mail ou senha inválidos.");
    if (user.status === "INACTIVE") throw new StoreError("Usuário inativo. Contate o administrador.");
    if (user.password !== password) throw new StoreError("E-mail ou senha inválidos.");
    localStorage.setItem(SESSION_KEY, JSON.stringify(user.id));
    return safeUser(user);
  },
  logout() {
    clearSession();
  },
  forgotPassword(email) {
    const user = load().users.find((u) => norm(u.email) === norm(email));
    if (user) {
      for (const admin of load().users.filter((u) => u.role === "ADMIN")) {
        notify(admin.id, "Solicitação de redefinição de senha", `${user.name} (${user.email}) solicitou a redefinição de senha.`);
      }
      persist();
    }
    return "Se este e-mail estiver cadastrado, o administrador do sistema foi notificado para redefinir sua senha. Entre em contato com a empresa para receber uma nova senha temporária.";
  },
  updateMe(userId, data) {
    const user = mustFind(load().users, userId, "Usuário não encontrado.");
    if (data.name !== undefined) user.name = data.name || user.name;
    if (data.phone !== undefined) user.phone = data.phone;
    if (data.photoUrl !== undefined) user.photoUrl = data.photoUrl;
    persist();
    return safeUser(user);
  },
  changePassword(userId, currentPassword, newPassword) {
    const user = mustFind(load().users, userId, "Usuário não encontrado.");
    if (!currentPassword || !newPassword) throw new StoreError("Informe a senha atual e a nova senha.");
    if (newPassword.length < 6) throw new StoreError("A nova senha deve ter ao menos 6 caracteres.");
    if (user.password !== currentPassword) throw new StoreError("Senha atual incorreta.");
    user.password = newPassword;
    persist();
  },
};

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function safeUser(u) {
  const { password, ...safe } = u;
  return safe;
}

function mustFind(arr, id, msg) {
  const item = arr.find((x) => x.id === id);
  if (!item) throw new StoreError(msg);
  return item;
}

// ---------------------------------------------------------------------------
// Notificações
// ---------------------------------------------------------------------------
function notify(userId, title, message, relatedServiceId = null) {
  load().notifications.unshift({
    id: genId("notif"),
    userId,
    title,
    message,
    read: false,
    relatedServiceId,
    createdAt: nowIso(),
  });
}

export const Notifications = {
  list(userId) {
    return load()
      .notifications.filter((n) => n.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 100);
  },
  unreadCount(userId) {
    return load().notifications.filter((n) => n.userId === userId && !n.read).length;
  },
  markRead(userId, id) {
    const n = load().notifications.find((n) => n.id === id && n.userId === userId);
    if (n) n.read = true;
    persist();
  },
  markAllRead(userId) {
    for (const n of load().notifications) if (n.userId === userId) n.read = true;
    persist();
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
    out.push({ id: genId("city"), city, state: (item.state || "").toString().trim().toUpperCase() || null });
  }
  return out;
}

export const Employees = {
  list({ search, city } = {}) {
    let items = load().users.filter((u) => u.role === "EMPLOYEE");
    if (search) {
      items = items.filter(
        (e) => includesCI(e.name, search) || includesCI(e.email, search) || includesCI(e.cargo, search)
      );
    }
    if (city) {
      items = items.filter((e) => (e.serviceRegions || []).some((r) => norm(r.city) === norm(city)));
    }
    return items
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((e) => ({ ...safeUser(e), _count: { servicesAsEmployee: countServicesForEmployee(e.id) } }));
  },
  get(id) {
    const e = load().users.find((u) => u.id === id && u.role === "EMPLOYEE");
    if (!e) throw new StoreError("Funcionário não encontrado.");
    const services = load()
      .services.filter((s) => s.employeeId === id)
      .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))
      .map((s) => ({ ...s, client: { id: s.clientId, name: clientDisplayName(s) } }));
    return { ...safeUser(e), servicesAsEmployee: services };
  },
  create(data) {
    if (!data.name || !data.email || !data.password) {
      throw new StoreError("Nome, e-mail e senha são obrigatórios.");
    }
    if (load().users.some((u) => norm(u.email) === norm(data.email))) {
      throw new StoreError("Já existe um usuário com este e-mail.");
    }
    const employee = {
      id: genId("user"),
      name: data.name,
      email: norm(data.email),
      password: data.password,
      role: "EMPLOYEE",
      phone: data.phone || null,
      cargo: data.cargo || null,
      photoUrl: data.photoUrl || null,
      status: data.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
      createdAt: nowIso(),
      serviceRegions: normalizeCities(data.cities),
    };
    load().users.push(employee);
    persist();
    return safeUser(employee);
  },
  update(id, data) {
    const e = mustFind(load().users.filter((u) => u.role === "EMPLOYEE"), id, "Funcionário não encontrado.");
    e.name = data.name ?? e.name;
    e.phone = data.phone || null;
    e.cargo = data.cargo || null;
    if (data.photoUrl !== undefined) e.photoUrl = data.photoUrl || null;
    e.status = data.status === "INACTIVE" ? "INACTIVE" : "ACTIVE";
    if (data.email) e.email = norm(data.email);
    if (data.password) e.password = data.password;
    if (Array.isArray(data.cities)) e.serviceRegions = normalizeCities(data.cities);
    persist();
    return safeUser(e);
  },
  delete(id) {
    if (countServicesForEmployee(id) > 0) {
      throw new StoreError("Não é possível excluir um funcionário com serviços vinculados. Desative-o em vez disso.");
    }
    const before = load().users.length;
    db.users = db.users.filter((u) => u.id !== id);
    if (db.users.length === before) throw new StoreError("Funcionário não encontrado.");
    persist();
  },
};

function countServicesForEmployee(employeeId) {
  return load().services.filter((s) => s.employeeId === employeeId).length;
}

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------
export const Clients = {
  list({ search } = {}) {
    let items = load().clients;
    if (search) {
      items = items.filter(
        (c) =>
          includesCI(c.name, search) ||
          includesCI(c.document, search) ||
          includesCI(c.phone, search) ||
          includesCI(c.email, search) ||
          includesCI(c.city, search)
      );
    }
    return items
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => ({ ...c, _count: { services: load().services.filter((s) => s.clientId === c.id).length } }));
  },
  get(id) {
    const c = mustFind(load().clients, id, "Cliente não encontrado.");
    const services = load()
      .services.filter((s) => s.clientId === id)
      .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))
      .map((s) => ({ ...s, employee: { id: s.employeeId, name: findEmployeeName(s.employeeId) } }));
    return { ...c, services };
  },
  create(data) {
    if (!data.name) throw new StoreError("Nome é obrigatório.");
    const client = {
      id: genId("client"),
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
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    load().clients.push(client);
    persist();
    return client;
  },
  update(id, data) {
    const c = mustFind(load().clients, id, "Cliente não encontrado.");
    Object.assign(c, {
      name: data.name ?? c.name,
      document: data.document || null,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      number: data.number || null,
      complement: data.complement || null,
      city: data.city || null,
      state: data.state || null,
      notes: data.notes || null,
      updatedAt: nowIso(),
    });
    persist();
    return c;
  },
  delete(id) {
    if (load().services.some((s) => s.clientId === id)) {
      throw new StoreError("Não é possível excluir um cliente com serviços vinculados.");
    }
    const before = load().clients.length;
    db.clients = db.clients.filter((c) => c.id !== id);
    if (db.clients.length === before) throw new StoreError("Cliente não encontrado.");
    persist();
  },
};

function findClientName(clientId) {
  return load().clients.find((c) => c.id === clientId)?.name || "";
}
function findEmployeeName(employeeId) {
  return load().users.find((u) => u.id === employeeId)?.name || "";
}

// Nome do cliente de um serviço: usa o cadastro em Clientes quando o serviço
// está vinculado a um (fluxo de Solicitações/Distribuição); caso contrário
// usa o nome digitado livremente na criação do serviço (sem cadastro).
function clientDisplayName(s) {
  if (s.clientId) return findClientName(s.clientId) || s.clientName || "";
  return s.clientName || "";
}

// ---------------------------------------------------------------------------
// Serviços
// ---------------------------------------------------------------------------
function hydrateService(s) {
  let client;
  if (s.clientId) {
    const c = load().clients.find((c) => c.id === s.clientId);
    client = c || { id: s.clientId, name: s.clientName || "(cliente removido)" };
  } else {
    client = { id: null, name: s.clientName || "(cliente não informado)" };
  }
  const emp = load().users.find((u) => u.id === s.employeeId);
  return {
    ...s,
    client,
    employee: emp
      ? { id: emp.id, name: emp.name, phone: emp.phone, cargo: emp.cargo, photoUrl: emp.photoUrl }
      : { id: s.employeeId, name: "(funcionário removido)" },
    history: (s.history || [])
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((h) => ({ ...h, user: h.userId ? { id: h.userId, name: findEmployeeName(h.userId) } : null })),
  };
}

const STATUSES = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "PENDING", "CANCELLED"];
const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"];

export const Services = {
  list(filters = {}) {
    let items = load().services;
    if (filters.employeeId) items = items.filter((s) => s.employeeId === filters.employeeId);
    if (filters.status) items = items.filter((s) => s.status === filters.status);
    if (filters.clientId) items = items.filter((s) => s.clientId === filters.clientId);
    if (filters.city) items = items.filter((s) => norm(s.city) === norm(filters.city));
    if (filters.priority) items = items.filter((s) => s.priority === filters.priority);
    if (filters.dateFrom) items = items.filter((s) => s.scheduledAt >= new Date(filters.dateFrom).toISOString());
    if (filters.dateTo) items = items.filter((s) => s.scheduledAt <= new Date(filters.dateTo).toISOString());
    if (filters.search) {
      items = items.filter(
        (s) =>
          includesCI(s.serviceType, filters.search) ||
          includesCI(s.address, filters.search) ||
          includesCI(clientDisplayName(s), filters.search)
      );
    }
    return items
      .slice()
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
      .map(hydrateService);
  },
  get(id) {
    const s = mustFind(load().services, id, "Serviço não encontrado.");
    return hydrateService(s);
  },
  create(data, actingUserId) {
    const typedClientName = (data.clientName || "").trim();
    if ((!data.clientId && !typedClientName) || !data.employeeId || !data.serviceType || !data.scheduledAt || !data.address) {
      throw new StoreError("Cliente, funcionário, tipo de serviço, endereço e data/horário são obrigatórios.");
    }
    const service = {
      id: genId("svc"),
      clientId: data.clientId || null,
      clientName: data.clientId ? null : typedClientName,
      employeeId: data.employeeId,
      serviceType: data.serviceType,
      description: data.description || null,
      notes: data.notes || null,
      materialsPlan: data.materialsPlan || null,
      address: data.address,
      city: data.city || null,
      state: data.state || null,
      priority: PRIORITIES.includes(data.priority) ? data.priority : "NORMAL",
      scheduledAt: new Date(data.scheduledAt).toISOString(),
      status: "SCHEDULED",
      startedAt: null,
      completedAt: null,
      employeeObservations: null,
      problems: null,
      pendingNotes: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      photos: [],
      materials: [],
      history: [{ id: genId("hist"), action: "CRIADO", toValue: "SCHEDULED", createdAt: nowIso(), userId: actingUserId }],
    };
    load().services.push(service);
    notify(
      data.employeeId,
      "Novo serviço atribuído",
      `Você recebeu um novo serviço: ${data.serviceType} para ${clientDisplayName(service)} em ${new Date(data.scheduledAt).toLocaleString("pt-BR")}.`,
      service.id
    );
    persist();
    return hydrateService(service);
  },
  update(id, data, actingUserId) {
    const existing = mustFind(load().services, id, "Serviço não encontrado.");
    if (data.status && !STATUSES.includes(data.status)) throw new StoreError("Status inválido.");

    const prev = { ...existing };
    if (data.clientName !== undefined) {
      // O formulário de serviço sempre envia o nome do cliente como texto
      // livre — editar um serviço não depende (nem grava) do cadastro em
      // Clientes.
      existing.clientId = null;
      existing.clientName = data.clientName;
    } else if (data.clientId !== undefined) {
      existing.clientId = data.clientId;
    }
    existing.employeeId = data.employeeId ?? existing.employeeId;
    existing.serviceType = data.serviceType ?? existing.serviceType;
    existing.description = data.description ?? existing.description;
    existing.notes = data.notes ?? existing.notes;
    existing.materialsPlan = data.materialsPlan ?? existing.materialsPlan;
    existing.address = data.address ?? existing.address;
    existing.city = data.city ?? existing.city;
    existing.state = data.state ?? existing.state;
    existing.priority = PRIORITIES.includes(data.priority) ? data.priority : existing.priority;
    existing.scheduledAt = data.scheduledAt ? new Date(data.scheduledAt).toISOString() : existing.scheduledAt;
    existing.status = data.status ?? existing.status;
    existing.updatedAt = nowIso();

    const changedEmployee = data.employeeId && data.employeeId !== prev.employeeId;
    const changedDate = data.scheduledAt && new Date(data.scheduledAt).toISOString() !== prev.scheduledAt;
    const changedStatus = data.status && data.status !== prev.status;
    const changedInfo =
      (data.description !== undefined && data.description !== prev.description) ||
      (data.address !== undefined && data.address !== prev.address) ||
      (data.notes !== undefined && data.notes !== prev.notes) ||
      (data.materialsPlan !== undefined && data.materialsPlan !== prev.materialsPlan);

    if (changedStatus) {
      existing.history.push({ id: genId("hist"), action: "STATUS_ALTERADO", fromValue: prev.status, toValue: data.status, createdAt: nowIso(), userId: actingUserId });
    }
    if (changedDate) {
      existing.history.push({ id: genId("hist"), action: "DATA_ALTERADA", fromValue: prev.scheduledAt, toValue: existing.scheduledAt, createdAt: nowIso(), userId: actingUserId });
    }

    if (changedStatus && data.status === "CANCELLED") {
      notify(existing.employeeId, "Serviço cancelado", `O serviço ${existing.serviceType} para ${clientDisplayName(existing)} foi cancelado.`, existing.id);
    } else if (changedEmployee) {
      notify(existing.employeeId, "Novo serviço atribuído", `Você recebeu o serviço: ${existing.serviceType} para ${clientDisplayName(existing)}.`, existing.id);
    } else if (changedDate) {
      notify(existing.employeeId, "Horário do serviço alterado", `O horário do serviço ${existing.serviceType} para ${clientDisplayName(existing)} foi alterado para ${new Date(existing.scheduledAt).toLocaleString("pt-BR")}.`, existing.id);
    } else if (changedInfo) {
      notify(existing.employeeId, "Serviço atualizado", `As informações do serviço ${existing.serviceType} para ${clientDisplayName(existing)} foram atualizadas. Confira os detalhes.`, existing.id);
    }

    persist();
    return hydrateService(existing);
  },
  transfer(id, { employeeId, force }, actingUserId) {
    const existing = mustFind(load().services, id, "Serviço não encontrado.");
    if (existing.status === "COMPLETED" || existing.status === "CANCELLED") {
      throw new StoreError("Não é possível transferir um serviço concluído ou cancelado.");
    }
    if (!employeeId) throw new StoreError("Selecione o novo funcionário responsável.");
    if (employeeId === existing.employeeId) throw new StoreError("Este já é o funcionário responsável pelo serviço.");

    const newEmployee = load().users.find((u) => u.id === employeeId && u.role === "EMPLOYEE");
    if (!newEmployee) throw new StoreError("Funcionário não encontrado.");

    if (existing.city) {
      const servesCity = (newEmployee.serviceRegions || []).some((r) => norm(r.city) === norm(existing.city));
      if (!servesCity && !force) {
        const err = new StoreError(`${newEmployee.name} não está cadastrado para atender ${existing.city}.`);
        err.code = "OUT_OF_REGION";
        throw err;
      }
    }

    if (!force) {
      const suggestions = getEmployeeSuggestions({ city: existing.city || "", targetAt: new Date(existing.scheduledAt), excludeServiceId: existing.id });
      const target = suggestions.find((s) => s.id === employeeId);
      if (target?.conflict.hasConflict) {
        const err = new StoreError("⚠️ Este funcionário já possui um serviço agendado neste horário.");
        err.code = "TIME_CONFLICT";
        err.conflict = target.conflict;
        throw err;
      }
    }

    const oldEmployeeName = findEmployeeName(existing.employeeId);
    const oldEmployeeId = existing.employeeId;
    existing.employeeId = employeeId;
    existing.updatedAt = nowIso();
    existing.history.push({ id: genId("hist"), action: "TRANSFERIDO", fromValue: oldEmployeeName, toValue: newEmployee.name, createdAt: nowIso(), userId: actingUserId });

    const dt = new Date(existing.scheduledAt);
    notify(
      employeeId,
      "📋 Novo serviço para você!",
      `Cliente: ${clientDisplayName(existing)}\nCidade: ${existing.city || "—"}\nServiço: ${existing.serviceType}\nData: ${dt.toLocaleDateString("pt-BR")}\nHorário: ${dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
      existing.id
    );
    notify(oldEmployeeId, "Serviço transferido", `O serviço ${existing.serviceType} para ${clientDisplayName(existing)} foi transferido para ${newEmployee.name}.`, existing.id);

    persist();
    return hydrateService(existing);
  },
  delete(id) {
    const before = load().services.length;
    db.services = db.services.filter((s) => s.id !== id);
    if (db.services.length === before) throw new StoreError("Serviço não encontrado.");
    persist();
  },
  start(id, actingUserId) {
    const s = mustFind(load().services, id, "Serviço não encontrado.");
    if (s.status !== "SCHEDULED" && s.status !== "PENDING") {
      throw new StoreError("Este serviço não pode ser iniciado no status atual.");
    }
    const fromStatus = s.status;
    s.status = "IN_PROGRESS";
    s.startedAt = nowIso();
    s.updatedAt = nowIso();
    s.history.push({ id: genId("hist"), action: "SERVICO_INICIADO", fromValue: fromStatus, toValue: "IN_PROGRESS", createdAt: nowIso(), userId: actingUserId });
    for (const admin of load().users.filter((u) => u.role === "ADMIN")) {
      notify(admin.id, "Serviço iniciado", `${findEmployeeName(s.employeeId)} iniciou o serviço ${s.serviceType} para ${clientDisplayName(s)}.`, s.id);
    }
    persist();
    return hydrateService(s);
  },
  setObservations(id, text) {
    const s = mustFind(load().services, id, "Serviço não encontrado.");
    s.employeeObservations = text ?? "";
    s.updatedAt = nowIso();
    persist();
    return hydrateService(s);
  },
  setProblems(id, text) {
    const s = mustFind(load().services, id, "Serviço não encontrado.");
    const changed = text && text !== s.problems;
    s.problems = text ?? "";
    s.updatedAt = nowIso();
    if (changed) {
      for (const admin of load().users.filter((u) => u.role === "ADMIN")) {
        notify(admin.id, "Problema registrado em serviço", `${findEmployeeName(s.employeeId)} registrou um problema no serviço ${s.serviceType} (${clientDisplayName(s)}): ${text}`, s.id);
      }
    }
    persist();
    return hydrateService(s);
  },
  setPending(id, text) {
    const s = mustFind(load().services, id, "Serviço não encontrado.");
    const changed = text && text !== s.pendingNotes;
    s.pendingNotes = text ?? "";
    s.updatedAt = nowIso();
    if (changed) {
      for (const admin of load().users.filter((u) => u.role === "ADMIN")) {
        notify(admin.id, "Pendência registrada em serviço", `${findEmployeeName(s.employeeId)} registrou uma pendência no serviço ${s.serviceType} (${clientDisplayName(s)}): ${text}`, s.id);
      }
    }
    persist();
    return hydrateService(s);
  },
  complete(id, { force } = {}, actingUserId) {
    const s = mustFind(load().services, id, "Serviço não encontrado.");
    if (s.status !== "IN_PROGRESS") throw new StoreError("O serviço precisa estar em andamento para ser concluído.");
    const missing = [];
    if (!s.photos.some((p) => p.type === "BEFORE")) missing.push("ao menos 1 foto do tipo ANTES");
    if (!s.photos.some((p) => p.type === "AFTER")) missing.push("ao menos 1 foto do tipo DEPOIS");
    if (missing.length && !force) {
      const err = new StoreError(`Antes de concluir, registre: ${missing.join(", ")}.`);
      err.missing = missing;
      throw err;
    }
    s.status = s.pendingNotes ? "PENDING" : "COMPLETED";
    s.completedAt = nowIso();
    s.updatedAt = nowIso();
    s.history.push({ id: genId("hist"), action: "SERVICO_CONCLUIDO", fromValue: "IN_PROGRESS", toValue: s.status, createdAt: nowIso(), userId: actingUserId });
    for (const admin of load().users.filter((u) => u.role === "ADMIN")) {
      notify(admin.id, "Serviço concluído", `${findEmployeeName(s.employeeId)} concluiu o serviço ${s.serviceType} para ${clientDisplayName(s)}.`, s.id);
    }
    persist();
    return hydrateService(s);
  },
  addPhoto(id, { type, dataUrl }) {
    const s = mustFind(load().services, id, "Serviço não encontrado.");
    const photo = { id: genId("photo"), type: type === "AFTER" ? "AFTER" : "BEFORE", url: dataUrl, createdAt: nowIso() };
    s.photos.push(photo);
    persist();
    return photo;
  },
  deletePhoto(id, photoId) {
    const s = mustFind(load().services, id, "Serviço não encontrado.");
    s.photos = s.photos.filter((p) => p.id !== photoId);
    persist();
  },
  addMaterial(id, { name, quantity, notes }) {
    const s = mustFind(load().services, id, "Serviço não encontrado.");
    if (!name || !quantity) throw new StoreError("Nome e quantidade são obrigatórios.");
    const material = { id: genId("mat"), name, quantity: String(quantity), notes: notes || null, createdAt: nowIso() };
    s.materials.push(material);
    persist();
    return material;
  },
  deleteMaterial(id, materialId) {
    const s = mustFind(load().services, id, "Serviço não encontrado.");
    s.materials = s.materials.filter((m) => m.id !== materialId);
    persist();
  },
};

// ---------------------------------------------------------------------------
// Agendamento / sugestões de funcionário (porta de backend/src/lib/scheduling.ts)
// ---------------------------------------------------------------------------
const CONFLICT_WINDOW_MINUTES = 60;

export function getEmployeeSuggestions({ city, targetAt, excludeServiceId }) {
  const cityKey = norm(city);
  const employees = load()
    .users.filter((u) => u.role === "EMPLOYEE" && u.status === "ACTIVE")
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  const eligible = employees.filter((e) => (e.serviceRegions || []).some((r) => norm(r.city) === cityKey));

  const dayStart = new Date(targetAt);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(targetAt);
  dayEnd.setHours(23, 59, 59, 999);

  const results = [];
  for (const emp of eligible) {
    const dayServices = load()
      .services.filter(
        (s) =>
          s.employeeId === emp.id &&
          s.status !== "CANCELLED" &&
          s.scheduledAt >= dayStart.toISOString() &&
          s.scheduledAt <= dayEnd.toISOString() &&
          (!excludeServiceId || s.id !== excludeServiceId)
      )
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

    let conflictingService;
    for (const s of dayServices) {
      const diffMinutes = Math.abs(new Date(s.scheduledAt).getTime() - targetAt.getTime()) / 60000;
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
      photoUrl: emp.photoUrl,
      phone: emp.phone,
      cities: (emp.serviceRegions || []).map((r) => ({ city: r.city, state: r.state })),
      serviceCountOnDate: dayServices.length,
      sameCityServiceCountOnDate: sameCityCount,
      conflict: {
        hasConflict: Boolean(conflictingService),
        conflictingService: conflictingService
          ? { id: conflictingService.id, serviceType: conflictingService.serviceType, scheduledAt: conflictingService.scheduledAt, clientName: clientDisplayName(conflictingService) }
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
  list({ status, city, priority, search } = {}) {
    let items = load().serviceRequests;
    if (status) items = items.filter((r) => r.status === status);
    if (city) items = items.filter((r) => norm(r.city) === norm(city));
    if (priority) items = items.filter((r) => r.priority === priority);
    if (search) {
      items = items.filter(
        (r) => includesCI(r.clientName, search) || includesCI(r.address, search) || includesCI(r.city, search) || includesCI(r.serviceType, search)
      );
    }
    return items
      .slice()
      .sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] || b.createdAt.localeCompare(a.createdAt))
      .map(hydrateRequest);
  },
  get(id) {
    const r = mustFind(load().serviceRequests, id, "Solicitação não encontrada.");
    return hydrateRequest(r);
  },
  create(data) {
    if (!data.clientName || !data.address || !data.city || !data.serviceType || !data.desiredAt) {
      throw new StoreError("Cliente, endereço, cidade, tipo de serviço e data desejada são obrigatórios.");
    }
    const request = {
      id: genId("req"),
      clientName: data.clientName,
      phone: data.phone || null,
      address: data.address,
      city: data.city,
      state: data.state || null,
      serviceType: data.serviceType,
      description: data.description || null,
      desiredAt: new Date(data.desiredAt).toISOString(),
      notes: data.notes || null,
      materialsPlan: data.materialsPlan || null,
      priority: PRIORITIES.includes(data.priority) ? data.priority : "NORMAL",
      clientId: data.clientId || null,
      status: "PENDING",
      resultingServiceId: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    load().serviceRequests.push(request);
    persist();
    return request;
  },
  update(id, data) {
    const existing = mustFind(load().serviceRequests, id, "Solicitação não encontrada.");
    if (existing.status !== "PENDING") throw new StoreError("Somente solicitações pendentes podem ser editadas.");
    Object.assign(existing, {
      clientName: data.clientName ?? existing.clientName,
      phone: data.phone ?? existing.phone,
      address: data.address ?? existing.address,
      city: data.city ?? existing.city,
      state: data.state ?? existing.state,
      serviceType: data.serviceType ?? existing.serviceType,
      description: data.description ?? existing.description,
      desiredAt: data.desiredAt ? new Date(data.desiredAt).toISOString() : existing.desiredAt,
      notes: data.notes ?? existing.notes,
      materialsPlan: data.materialsPlan ?? existing.materialsPlan,
      priority: data.priority && PRIORITIES.includes(data.priority) ? data.priority : existing.priority,
      updatedAt: nowIso(),
    });
    persist();
    return existing;
  },
  cancel(id) {
    const existing = mustFind(load().serviceRequests, id, "Solicitação não encontrada.");
    if (existing.status !== "PENDING") throw new StoreError("Somente solicitações pendentes podem ser canceladas.");
    existing.status = "CANCELLED";
    existing.updatedAt = nowIso();
    persist();
    return existing;
  },
  suggestions(id) {
    const request = mustFind(load().serviceRequests, id, "Solicitação não encontrada.");
    return getEmployeeSuggestions({ city: request.city, targetAt: new Date(request.desiredAt) });
  },
  assign(id, { employeeId, scheduledAt, force }, actingUserId) {
    const request = mustFind(load().serviceRequests, id, "Solicitação não encontrada.");
    if (request.status !== "PENDING") throw new StoreError("Esta solicitação já foi distribuída ou cancelada.");
    if (!employeeId) throw new StoreError("Selecione um funcionário responsável.");

    const employee = load().users.find((u) => u.id === employeeId && u.role === "EMPLOYEE");
    if (!employee) throw new StoreError("Funcionário não encontrado.");

    const servesCity = (employee.serviceRegions || []).some((r) => norm(r.city) === norm(request.city));
    if (!servesCity && !force) {
      const err = new StoreError(`${employee.name} não está cadastrado para atender ${request.city}.`);
      err.code = "OUT_OF_REGION";
      throw err;
    }

    const targetAt = scheduledAt ? new Date(scheduledAt) : new Date(request.desiredAt);

    if (!force) {
      const suggestion = getEmployeeSuggestions({ city: request.city, targetAt }).find((s) => s.id === employeeId);
      if (suggestion?.conflict.hasConflict) {
        const err = new StoreError("⚠️ Este funcionário já possui um serviço agendado neste horário.");
        err.code = "TIME_CONFLICT";
        err.conflict = suggestion.conflict;
        throw err;
      }
    }

    let clientId = request.clientId;
    if (!clientId) {
      const existingClient = request.phone
        ? load().clients.find((c) => c.name === request.clientName && c.phone === request.phone)
        : null;
      if (existingClient) {
        clientId = existingClient.id;
      } else {
        const created = Clients.create({
          name: request.clientName,
          phone: request.phone,
          address: request.address,
          city: request.city,
          state: request.state,
        });
        clientId = created.id;
      }
    }

    const service = Services.create(
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

    const svc = mustFind(load().services, service.id, "Serviço não encontrado.");
    svc.history.push({ id: genId("hist"), action: "DISTRIBUIDO_POR_CIDADE", toValue: `${employee.name} (${request.city})`, createdAt: nowIso(), userId: actingUserId });

    request.status = "ASSIGNED";
    request.clientId = clientId;
    request.resultingServiceId = service.id;
    request.updatedAt = nowIso();

    persist();
    return { request: hydrateRequest(request), service: hydrateService(svc) };
  },
};

function hydrateRequest(r) {
  let resultingService = null;
  if (r.resultingServiceId) {
    const svc = load().services.find((s) => s.id === r.resultingServiceId);
    if (svc) {
      resultingService = { id: svc.id, status: svc.status, employee: { id: svc.employeeId, name: findEmployeeName(svc.employeeId), phone: null, cargo: null } };
    }
  }
  return { ...r, resultingService };
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export const Dashboard = {
  stats() {
    const services = load().services;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const countBy = (status) => services.filter((s) => s.status === status).length;
    const today = services.filter((s) => s.scheduledAt >= startOfDay.toISOString() && s.scheduledAt <= endOfDay.toISOString()).length;

    const byStatusMap = new Map();
    for (const s of services) byStatusMap.set(s.status, (byStatusMap.get(s.status) || 0) + 1);

    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const dayBuckets = new Map();
    for (const s of services) {
      if (s.scheduledAt < cutoff) continue;
      const key = s.scheduledAt.slice(0, 10);
      dayBuckets.set(key, (dayBuckets.get(key) || 0) + 1);
    }
    const timeline = Array.from(dayBuckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    const employeeLoad = load()
      .users.filter((u) => u.role === "EMPLOYEE" && u.status === "ACTIVE")
      .map((e) => ({ id: e.id, name: e.name, count: services.filter((s) => s.employeeId === e.id).length }));

    return {
      total: services.length,
      today,
      inProgress: countBy("IN_PROGRESS"),
      completed: countBy("COMPLETED"),
      pending: countBy("PENDING"),
      scheduled: countBy("SCHEDULED"),
      cancelled: countBy("CANCELLED"),
      employees: load().users.filter((u) => u.role === "EMPLOYEE").length,
      clients: load().clients.length,
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
  stats() {
    const recentThreshold = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const requests = load().serviceRequests;
    const services = load().services;

    const cityMap = new Map();
    for (const s of services) {
      if (s.status === "CANCELLED" || !s.city) continue;
      const city = s.city.trim();
      if (!city) continue;
      const key = norm(city);
      if (!cityMap.has(key)) cityMap.set(key, { city, count: 0, employees: new Map() });
      const entry = cityMap.get(key);
      entry.count += 1;
      entry.employees.set(s.employeeId, findEmployeeName(s.employeeId));
    }
    const byCity = Array.from(cityMap.values())
      .map((e) => ({ city: e.city, count: e.count, employees: Array.from(e.employees.entries()).map(([id, name]) => ({ id, name })) }))
      .sort((a, b) => b.count - a.count);

    return {
      newRequests: requests.filter((r) => r.status === "PENDING" && r.createdAt >= recentThreshold).length,
      awaitingRequests: requests.filter((r) => r.status === "PENDING").length,
      scheduled: services.filter((s) => s.status === "SCHEDULED").length,
      inProgress: services.filter((s) => s.status === "IN_PROGRESS").length,
      completed: services.filter((s) => s.status === "COMPLETED").length,
      pending: services.filter((s) => s.status === "PENDING").length,
      byCity,
    };
  },
  byEmployee() {
    return load()
      .users.filter((u) => u.role === "EMPLOYEE" && u.status === "ACTIVE")
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((e) => ({
        id: e.id,
        name: e.name,
        cargo: e.cargo,
        cities: (e.serviceRegions || []).slice().sort((a, b) => a.city.localeCompare(b.city)).map((r) => r.city),
        services: load()
          .services.filter((s) => s.employeeId === e.id && s.status !== "CANCELLED")
          .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
          .map((s) => ({ id: s.id, serviceType: s.serviceType, clientName: clientDisplayName(s), city: s.city, address: s.address, scheduledAt: s.scheduledAt, status: s.status })),
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

function reportFilter(filters = {}) {
  let items = load().services;
  if (filters.employeeId) items = items.filter((s) => s.employeeId === filters.employeeId);
  if (filters.clientId) items = items.filter((s) => s.clientId === filters.clientId);
  if (filters.status) items = items.filter((s) => s.status === filters.status);
  if (filters.dateFrom) items = items.filter((s) => s.scheduledAt >= new Date(filters.dateFrom).toISOString());
  if (filters.dateTo) items = items.filter((s) => s.scheduledAt <= new Date(filters.dateTo).toISOString());
  return items.slice().sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
}

export const Reports = {
  services(filters) {
    return reportFilter(filters).map((s) => ({
      id: s.id,
      serviceType: s.serviceType,
      client: clientDisplayName(s),
      employee: findEmployeeName(s.employeeId),
      status: s.status,
      statusLabel: STATUS_LABELS_PT[s.status] || s.status,
      scheduledAt: s.scheduledAt,
      startedAt: s.startedAt,
      completedAt: s.completedAt,
      address: s.address,
      materialsCount: s.materials.length,
    }));
  },
  materials(filters) {
    const totals = new Map();
    for (const s of reportFilter(filters)) {
      for (const m of s.materials) {
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
  summary(filters) {
    const items = reportFilter(filters);
    const byStatus = {};
    const byEmployee = {};
    const byClient = {};
    for (const s of items) {
      byStatus[s.status] = (byStatus[s.status] || 0) + 1;
      const empName = findEmployeeName(s.employeeId);
      byEmployee[empName] = (byEmployee[empName] || 0) + 1;
      const cliName = clientDisplayName(s);
      byClient[cliName] = (byClient[cliName] || 0) + 1;
    }
    return { total: items.length, byStatus, byEmployee, byClient };
  },
};
