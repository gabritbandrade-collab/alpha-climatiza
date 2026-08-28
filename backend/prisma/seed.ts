import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Minimal valid 1x1 PNG, used only as placeholder demo "before/after" photos
// so the seeded completed services have real image files to display.
const PLACEHOLDER_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

function ensurePlaceholderPhotos() {
  const dir = path.resolve(__dirname, "..", "uploads", "services");
  fs.mkdirSync(dir, { recursive: true });
  const beforePath = path.join(dir, "seed-before.png");
  const afterPath = path.join(dir, "seed-after.png");
  const buf = Buffer.from(PLACEHOLDER_PNG_B64, "base64");
  fs.writeFileSync(beforePath, buf);
  fs.writeFileSync(afterPath, buf);
  return { before: "/uploads/services/seed-before.png", after: "/uploads/services/seed-after.png" };
}

async function main() {
  const photoUrls = ensurePlaceholderPhotos();

  console.log("Limpando dados existentes...");
  await prisma.notification.deleteMany();
  await prisma.serviceHistory.deleteMany();
  await prisma.serviceMaterial.deleteMany();
  await prisma.servicePhoto.deleteMany();
  await prisma.serviceRequest.deleteMany();
  await prisma.service.deleteMany();
  await prisma.employeeCity.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();

  console.log("Criando usuários...");
  const adminPass = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.create({
    data: {
      name: "ALPHA CLIMATIZAÇÃO",
      email: "admin@nsclimatizacao.com.br",
      passwordHash: adminPass,
      role: "ADMIN",
      cargo: "Administrador",
      phone: "(11) 98888-0001",
      status: "ACTIVE",
    },
  });

  const empPass = await bcrypt.hash("123456", 10);
  const employeesData = [
    { name: "João Silva", email: "joao@nsclimatizacao.com.br", cargo: "Técnico de Instalação", phone: "(11) 97777-1111" },
    { name: "Marcos Oliveira", email: "marcos@nsclimatizacao.com.br", cargo: "Técnico de Manutenção", phone: "(11) 97777-2222" },
    { name: "Renata Souza", email: "renata@nsclimatizacao.com.br", cargo: "Técnica de Instalação", phone: "(11) 97777-3333" },
    { name: "Paulo Costa", email: "paulo@nsclimatizacao.com.br", cargo: "Técnico de Manutenção", phone: "(11) 97777-4444", status: "INACTIVE" },
  ];
  const employees = [];
  for (const e of employeesData) {
    employees.push(
      await prisma.user.create({
        data: {
          name: e.name,
          email: e.email,
          passwordHash: empPass,
          role: "EMPLOYEE",
          cargo: e.cargo,
          phone: e.phone,
          status: (e as any).status || "ACTIVE",
        },
      })
    );
  }
  const [joao, marcos, renata, paulo] = employees;

  console.log("Cadastrando regiões de atendimento dos funcionários...");
  const regions: { employeeId: string; city: string; state: string }[] = [
    { employeeId: joao.id, city: "São Paulo", state: "SP" },
    { employeeId: joao.id, city: "Guarulhos", state: "SP" },
    { employeeId: joao.id, city: "Londrina", state: "PR" },
    { employeeId: joao.id, city: "Cambé", state: "PR" },
    { employeeId: marcos.id, city: "São Paulo", state: "SP" },
    { employeeId: marcos.id, city: "Maringá", state: "PR" },
    { employeeId: marcos.id, city: "Sarandi", state: "PR" },
    { employeeId: renata.id, city: "São Paulo", state: "SP" },
    { employeeId: renata.id, city: "Guarulhos", state: "SP" },
    { employeeId: renata.id, city: "Rolândia", state: "PR" },
    { employeeId: renata.id, city: "Paiçandu", state: "PR" },
    { employeeId: paulo.id, city: "Curitiba", state: "PR" },
  ];
  await prisma.employeeCity.createMany({ data: regions });

  console.log("Criando clientes...");
  const clientsData = [
    {
      name: "Condomínio Jardim das Flores",
      document: "12.345.678/0001-90",
      phone: "(11) 3222-1000",
      email: "sindico@jardimdasflores.com.br",
      address: "Rua das Acácias, 500",
      number: "500",
      complement: "Portaria principal",
      city: "São Paulo",
      state: "SP",
      notes: "Cliente desde 2022. Prefere agendamentos pela manhã.",
    },
    {
      name: "Supermercado Boa Compra",
      document: "98.765.432/0001-10",
      phone: "(11) 3222-2000",
      email: "manutencao@boacompra.com.br",
      address: "Av. Brasil, 1200",
      number: "1200",
      complement: "Loja 2",
      city: "São Paulo",
      state: "SP",
      notes: "Contrato de manutenção mensal dos climatizadores.",
    },
    {
      name: "Ana Paula Ribeiro",
      document: "123.456.789-00",
      phone: "(11) 91234-5678",
      email: "anapaula.ribeiro@email.com",
      address: "Rua dos Ipês, 88",
      number: "88",
      complement: "Apto 42",
      city: "Guarulhos",
      state: "SP",
      notes: "",
    },
    {
      name: "Clínica Vida Saudável",
      document: "45.678.912/0001-33",
      phone: "(11) 3222-4000",
      email: "contato@vidasaudavel.com.br",
      address: "Rua Voluntários da Pátria, 300",
      number: "300",
      complement: "",
      city: "São Paulo",
      state: "SP",
      notes: "Equipamentos críticos: sala de procedimentos precisa de atenção prioritária.",
    },
    {
      name: "Restaurante Sabor & Arte",
      document: "22.333.444/0001-55",
      phone: "(11) 3222-5000",
      email: "gerencia@saborarte.com.br",
      address: "Alameda Santos, 750",
      number: "750",
      complement: "",
      city: "São Paulo",
      state: "SP",
      notes: "",
    },
  ];
  const clients = [];
  for (const c of clientsData) {
    clients.push(await prisma.client.create({ data: c }));
  }
  const [condominio, mercado, ana, clinica, restaurante] = clients;

  console.log("Criando serviços de exemplo...");
  const now = new Date();
  const inDays = (d: number, h = 9, m = 0) => {
    const dt = new Date(now);
    dt.setDate(dt.getDate() + d);
    dt.setHours(h, m, 0, 0);
    return dt;
  };

  async function createService(opts: {
    serviceType: string;
    description?: string;
    notes?: string;
    materialsPlan?: string;
    address: string;
    city?: string;
    state?: string;
    priority?: string;
    scheduledAt: Date;
    status: string;
    clientId: string;
    employeeId: string;
    withPhotos?: boolean;
    employeeObservations?: string;
    problems?: string;
    pendingNotes?: string;
    startedOffsetMin?: number;
    completedOffsetMin?: number;
    materials?: { name: string; quantity: string; notes?: string }[];
  }) {
    const service = await prisma.service.create({
      data: {
        serviceType: opts.serviceType,
        description: opts.description || null,
        notes: opts.notes || null,
        materialsPlan: opts.materialsPlan || null,
        address: opts.address,
        city: opts.city || null,
        state: opts.state || null,
        priority: opts.priority || "NORMAL",
        scheduledAt: opts.scheduledAt,
        status: opts.status,
        clientId: opts.clientId,
        employeeId: opts.employeeId,
        employeeObservations: opts.employeeObservations || null,
        problems: opts.problems || null,
        pendingNotes: opts.pendingNotes || null,
        startedAt:
          opts.status === "IN_PROGRESS" || opts.status === "COMPLETED" || opts.status === "PENDING"
            ? new Date(opts.scheduledAt.getTime() + (opts.startedOffsetMin ?? 5) * 60000)
            : null,
        completedAt:
          opts.status === "COMPLETED" || opts.status === "PENDING"
            ? new Date(opts.scheduledAt.getTime() + (opts.completedOffsetMin ?? 90) * 60000)
            : null,
      },
    });

    await prisma.serviceHistory.create({
      data: { serviceId: service.id, action: "CRIADO", toValue: "SCHEDULED" },
    });
    if (service.status !== "SCHEDULED") {
      await prisma.serviceHistory.create({
        data: { serviceId: service.id, action: "STATUS_ALTERADO", fromValue: "SCHEDULED", toValue: service.status },
      });
    }

    if (opts.withPhotos) {
      await prisma.servicePhoto.create({ data: { serviceId: service.id, type: "BEFORE", url: photoUrls.before } });
      await prisma.servicePhoto.create({ data: { serviceId: service.id, type: "AFTER", url: photoUrls.after } });
    }
    if (opts.materials) {
      for (const m of opts.materials) {
        await prisma.serviceMaterial.create({
          data: { serviceId: service.id, name: m.name, quantity: m.quantity, notes: m.notes || null },
        });
      }
    }
    return service;
  }

  // Concluído com fotos e materiais
  await createService({
    serviceType: "Instalação de Ar Condicionado Split",
    description: "Instalação de 2 unidades split 12.000 BTUs no salão de festas.",
    notes: "Levar escada de 6m. Cliente libera acesso a partir das 8h.",
    materialsPlan: "2x unidade split 12.000 BTUs, suportes, tubulação de cobre",
    address: `${condominio.address}, ${condominio.number} - ${condominio.city}/${condominio.state}`,
    city: condominio.city!,
    state: condominio.state!,
    scheduledAt: inDays(-3, 8, 30),
    status: "COMPLETED",
    clientId: condominio.id,
    employeeId: joao.id,
    withPhotos: true,
    employeeObservations: "Instalação concluída sem intercorrências. Testado o funcionamento por 30 minutos.",
    materials: [
      { name: "Unidade Split 12.000 BTUs", quantity: "2", notes: "Marca Fujitsu" },
      { name: "Tubulação de cobre 1/4 e 3/8", quantity: "15m" },
      { name: "Suporte para condensadora", quantity: "2" },
    ],
  });

  // Em andamento
  await createService({
    serviceType: "Manutenção Preventiva",
    description: "Limpeza de filtros e verificação de gás refrigerante dos climatizadores da loja.",
    notes: "Contrato mensal - verificar todas as 8 unidades.",
    address: `${mercado.address}, ${mercado.number} - ${mercado.city}/${mercado.state}`,
    city: mercado.city!,
    state: mercado.state!,
    scheduledAt: inDays(0, 9, 0),
    status: "IN_PROGRESS",
    clientId: mercado.id,
    employeeId: marcos.id,
    employeeObservations: "Já verificadas 5 das 8 unidades. Tudo dentro do esperado até o momento.",
  });

  // Agendado (hoje, próximo do funcionário)
  await createService({
    serviceType: "Manutenção Corretiva",
    description: "Ar condicionado não está gelando. Verificar gás e compressor.",
    notes: "Cliente relatou barulho estranho no equipamento.",
    address: `${ana.address}, ${ana.number}, ${ana.complement} - ${ana.city}/${ana.state}`,
    city: ana.city!,
    state: ana.state!,
    scheduledAt: inDays(0, 14, 0),
    status: "SCHEDULED",
    clientId: ana.id,
    employeeId: joao.id,
  });

  // Agendado para amanhã
  await createService({
    serviceType: "Instalação de Climatizador",
    description: "Instalação de climatizador evaporativo na sala de espera.",
    address: `${clinica.address}, ${clinica.number} - ${clinica.city}/${clinica.state}`,
    city: clinica.city!,
    state: clinica.state!,
    scheduledAt: inDays(1, 10, 0),
    status: "SCHEDULED",
    clientId: clinica.id,
    employeeId: renata.id,
    materialsPlan: "1x climatizador evaporativo industrial, mangueira de alimentação",
  });

  // Agendado para depois de amanhã
  await createService({
    serviceType: "Manutenção Preventiva",
    description: "Revisão trimestral dos equipamentos da cozinha industrial.",
    address: `${restaurante.address}, ${restaurante.number} - ${restaurante.city}/${restaurante.state}`,
    city: restaurante.city!,
    state: restaurante.state!,
    scheduledAt: inDays(2, 8, 0),
    status: "SCHEDULED",
    clientId: restaurante.id,
    employeeId: marcos.id,
  });

  // Pendente (concluído parcialmente, com pendência registrada)
  await createService({
    serviceType: "Manutenção Corretiva",
    description: "Troca de placa eletrônica do climatizador central.",
    address: `${condominio.address}, ${condominio.number} - ${condominio.city}/${condominio.state}`,
    city: condominio.city!,
    state: condominio.state!,
    scheduledAt: inDays(-1, 13, 0),
    status: "PENDING",
    clientId: condominio.id,
    employeeId: renata.id,
    withPhotos: true,
    employeeObservations: "Peça necessária não estava disponível em estoque no momento do atendimento.",
    problems: "Placa eletrônica apresentava queima parcial não identificada previamente.",
    pendingNotes: "Necessário retornar ao local para instalar a placa eletrônica assim que a peça chegar (previsão: 3 dias úteis).",
    materials: [{ name: "Placa eletrônica universal", quantity: "1", notes: "Aguardando peça de reposição" }],
  });

  // Cancelado
  await createService({
    serviceType: "Instalação de Ar Condicionado Split",
    description: "Instalação de unidade split no quarto principal.",
    address: `${ana.address}, ${ana.number}, ${ana.complement} - ${ana.city}/${ana.state}`,
    city: ana.city!,
    state: ana.state!,
    scheduledAt: inDays(-2, 15, 0),
    status: "CANCELLED",
    clientId: ana.id,
    employeeId: joao.id,
  });

  // Mais concluídos no histórico (últimos 20 dias) para gráficos
  const pastTypes = ["Manutenção Preventiva", "Manutenção Corretiva", "Instalação de Ar Condicionado Split", "Limpeza de Filtros"];
  const pastClients = [condominio, mercado, ana, clinica, restaurante];
  const pastEmployees = [joao, marcos, renata];
  for (let i = 4; i <= 20; i += 2) {
    const client = pastClients[i % pastClients.length];
    const employee = pastEmployees[i % pastEmployees.length];
    await createService({
      serviceType: pastTypes[i % pastTypes.length],
      description: "Atendimento de rotina.",
      address: `${client.address}, ${client.number} - ${client.city}/${client.state}`,
      city: client.city!,
      state: client.state!,
      scheduledAt: inDays(-i, 8 + (i % 6), 0),
      status: i % 7 === 0 ? "CANCELLED" : "COMPLETED",
      clientId: client.id,
      employeeId: employee.id,
      withPhotos: i % 7 !== 0,
      employeeObservations: i % 7 !== 0 ? "Serviço realizado conforme previsto." : undefined,
      materials:
        i % 7 !== 0
          ? [{ name: "Filtro de ar", quantity: String(1 + (i % 3)) }]
          : undefined,
    });
  }

  console.log("Criando solicitações de serviço de exemplo (distribuição por cidade)...");
  await prisma.serviceRequest.create({
    data: {
      clientName: "Empresa ABC Comércio",
      phone: "(43) 3325-1010",
      address: "Av. Higienópolis, 620",
      city: "Londrina",
      state: "PR",
      serviceType: "Manutenção Preventiva",
      description: "Revisão geral dos aparelhos do escritório antes do verão.",
      desiredAt: inDays(2, 14, 0),
      notes: "Prefere atendimento à tarde.",
      materialsPlan: "Filtros de ar, gás refrigerante R410a",
      priority: "NORMAL",
      status: "PENDING",
    },
  });
  await prisma.serviceRequest.create({
    data: {
      clientName: "Indústria Maringá Metais",
      phone: "(44) 3227-4040",
      address: "Rod. PR-317, Km 12",
      city: "Maringá",
      state: "PR",
      serviceType: "Instalação de Climatizador",
      description: "Instalação de climatizador industrial no galpão 2.",
      desiredAt: inDays(2, 8, 0),
      notes: "Acesso liberado somente com agendamento prévio na portaria.",
      priority: "HIGH",
      status: "PENDING",
    },
  });
  await prisma.serviceRequest.create({
    data: {
      clientName: "Farmácia Saúde Já",
      phone: "(43) 3172-9090",
      address: "Rua Pernambuco, 210",
      city: "Cambé",
      state: "PR",
      serviceType: "Manutenção Corretiva",
      description: "Ar condicionado da farmácia parou de funcionar, loja climatizada é essencial para os remédios.",
      desiredAt: inDays(1, 11, 0),
      notes: "Urgente — produtos sensíveis à temperatura.",
      priority: "URGENT",
      status: "PENDING",
    },
  });

  console.log("Criando notificações de exemplo...");
  await prisma.notification.create({
    data: {
      userId: admin.id,
      title: "Bem-vindo ao sistema",
      message: "Este é o painel administrativo da ALPHA CLIMATIZAÇÃO. Explore os módulos no menu lateral.",
    },
  });
  await prisma.notification.create({
    data: {
      userId: joao.id,
      title: "Novo serviço atribuído",
      message: "Você tem um serviço de manutenção corretiva agendado para hoje às 14:00.",
    },
  });

  console.log("Seed concluído com sucesso!");
  console.log("");
  console.log("Credenciais de acesso de demonstração:");
  console.log("  Administrador: admin@nsclimatizacao.com.br / admin123");
  console.log("  Funcionário:   joao@nsclimatizacao.com.br / 123456");
  console.log("  Funcionário:   marcos@nsclimatizacao.com.br / 123456");
  console.log("  Funcionário:   renata@nsclimatizacao.com.br / 123456");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
