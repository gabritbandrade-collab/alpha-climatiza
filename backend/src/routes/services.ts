import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { notify } from "../lib/notify";
import { uploadServicePhoto } from "../lib/upload";
import { getEmployeeSuggestions } from "../lib/scheduling";

const router = Router();
router.use(requireAuth);

const STATUSES = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "PENDING", "CANCELLED"];

const serviceInclude = {
  client: true,
  employee: { select: { id: true, name: true, phone: true, cargo: true, photoUrl: true } },
  photos: { orderBy: { createdAt: "asc" as const } },
  materials: { orderBy: { createdAt: "asc" as const } },
  history: {
    orderBy: { createdAt: "desc" as const },
    include: { user: { select: { id: true, name: true } } },
  },
};

async function assertAccess(req: any, serviceId: string) {
  const service = await prisma.service.findUnique({ where: { id: serviceId }, include: serviceInclude });
  if (!service) return { service: null, allowed: false };
  if (req.user.role === "ADMIN") return { service, allowed: true };
  return { service, allowed: service.employeeId === req.user.id };
}

// ---- List ----
router.get("/", async (req, res) => {
  const { status, employeeId, clientId, city, priority, dateFrom, dateTo, search } = req.query as Record<
    string,
    string
  >;
  const where: any = {};

  if (req.user!.role === "EMPLOYEE") {
    where.employeeId = req.user!.id;
  } else if (employeeId) {
    where.employeeId = employeeId;
  }
  if (status) where.status = status;
  if (clientId) where.clientId = clientId;
  if (city) where.city = { equals: city };
  if (priority) where.priority = priority;
  if (dateFrom || dateTo) {
    where.scheduledAt = {};
    if (dateFrom) where.scheduledAt.gte = new Date(dateFrom);
    if (dateTo) where.scheduledAt.lte = new Date(dateTo);
  }
  if (search) {
    where.OR = [
      { serviceType: { contains: search } },
      { address: { contains: search } },
      { client: { name: { contains: search } } },
    ];
  }

  const services = await prisma.service.findMany({
    where,
    orderBy: { scheduledAt: "asc" },
    include: serviceInclude,
  });
  res.json(services);
});

// ---- Detail ----
router.get("/:id", async (req, res) => {
  const { service, allowed } = await assertAccess(req, req.params.id);
  if (!service) return res.status(404).json({ error: "Serviço não encontrado." });
  if (!allowed) return res.status(403).json({ error: "Você não tem acesso a este serviço." });
  res.json(service);
});

// ---- Create (admin) ----
router.post("/", requireAdmin, async (req, res) => {
  const b = req.body;
  if (!b.clientId || !b.employeeId || !b.serviceType || !b.scheduledAt || !b.address) {
    return res.status(400).json({
      error: "Cliente, funcionário, tipo de serviço, endereço e data/horário são obrigatórios.",
    });
  }
  const service = await prisma.service.create({
    data: {
      clientId: b.clientId,
      employeeId: b.employeeId,
      serviceType: b.serviceType,
      description: b.description || null,
      notes: b.notes || null,
      materialsPlan: b.materialsPlan || null,
      address: b.address,
      city: b.city || null,
      state: b.state || null,
      priority: ["LOW", "NORMAL", "HIGH", "URGENT"].includes(b.priority) ? b.priority : "NORMAL",
      scheduledAt: new Date(b.scheduledAt),
      status: "SCHEDULED",
    },
    include: serviceInclude,
  });

  await prisma.serviceHistory.create({
    data: {
      serviceId: service.id,
      userId: req.user!.id,
      action: "CRIADO",
      toValue: "SCHEDULED",
    },
  });

  await notify(
    b.employeeId,
    "Novo serviço atribuído",
    `Você recebeu um novo serviço: ${b.serviceType} para ${service.client.name} em ${new Date(
      b.scheduledAt
    ).toLocaleString("pt-BR")}.`,
    service.id
  );

  res.status(201).json(service);
});

// ---- Update (admin) ----
router.put("/:id", requireAdmin, async (req, res) => {
  const b = req.body;
  const existing = await prisma.service.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Serviço não encontrado." });
  if (b.status && !STATUSES.includes(b.status)) {
    return res.status(400).json({ error: "Status inválido." });
  }

  const data: Record<string, unknown> = {
    clientId: b.clientId ?? existing.clientId,
    employeeId: b.employeeId ?? existing.employeeId,
    serviceType: b.serviceType ?? existing.serviceType,
    description: b.description ?? existing.description,
    notes: b.notes ?? existing.notes,
    materialsPlan: b.materialsPlan ?? existing.materialsPlan,
    address: b.address ?? existing.address,
    city: b.city ?? existing.city,
    state: b.state ?? existing.state,
    priority: ["LOW", "NORMAL", "HIGH", "URGENT"].includes(b.priority) ? b.priority : existing.priority,
    scheduledAt: b.scheduledAt ? new Date(b.scheduledAt) : existing.scheduledAt,
    status: b.status ?? existing.status,
  };

  const service = await prisma.service.update({
    where: { id: req.params.id },
    data,
    include: serviceInclude,
  });

  const changedEmployee = b.employeeId && b.employeeId !== existing.employeeId;
  const changedDate =
    b.scheduledAt && new Date(b.scheduledAt).getTime() !== existing.scheduledAt.getTime();
  const changedStatus = b.status && b.status !== existing.status;
  const changedInfo =
    (b.description !== undefined && b.description !== existing.description) ||
    (b.address !== undefined && b.address !== existing.address) ||
    (b.notes !== undefined && b.notes !== existing.notes) ||
    (b.materialsPlan !== undefined && b.materialsPlan !== existing.materialsPlan);

  if (changedStatus) {
    await prisma.serviceHistory.create({
      data: {
        serviceId: service.id,
        userId: req.user!.id,
        action: "STATUS_ALTERADO",
        fromValue: existing.status,
        toValue: b.status,
      },
    });
  }
  if (changedDate) {
    await prisma.serviceHistory.create({
      data: {
        serviceId: service.id,
        userId: req.user!.id,
        action: "DATA_ALTERADA",
        fromValue: existing.scheduledAt.toISOString(),
        toValue: new Date(b.scheduledAt).toISOString(),
      },
    });
  }

  if (changedStatus && b.status === "CANCELLED") {
    await notify(
      service.employeeId,
      "Serviço cancelado",
      `O serviço ${service.serviceType} para ${service.client.name} foi cancelado.`,
      service.id
    );
  } else if (changedEmployee) {
    await notify(
      service.employeeId,
      "Novo serviço atribuído",
      `Você recebeu o serviço: ${service.serviceType} para ${service.client.name}.`,
      service.id
    );
  } else if (changedDate) {
    await notify(
      service.employeeId,
      "Horário do serviço alterado",
      `O horário do serviço ${service.serviceType} para ${service.client.name} foi alterado para ${service.scheduledAt.toLocaleString(
        "pt-BR"
      )}.`,
      service.id
    );
  } else if (changedInfo) {
    await notify(
      service.employeeId,
      "Serviço atualizado",
      `As informações do serviço ${service.serviceType} para ${service.client.name} foram atualizadas. Confira os detalhes.`,
      service.id
    );
  }

  res.json(service);
});

// ---- Transfer to another employee (admin) ----
router.patch("/:id/transfer", requireAdmin, async (req, res) => {
  const existing = await prisma.service.findUnique({
    where: { id: req.params.id },
    include: { client: true, employee: true },
  });
  if (!existing) return res.status(404).json({ error: "Serviço não encontrado." });
  if (existing.status === "COMPLETED" || existing.status === "CANCELLED") {
    return res.status(400).json({ error: "Não é possível transferir um serviço concluído ou cancelado." });
  }

  const { employeeId, force } = req.body as { employeeId?: string; force?: boolean };
  if (!employeeId) return res.status(400).json({ error: "Selecione o novo funcionário responsável." });
  if (employeeId === existing.employeeId) {
    return res.status(400).json({ error: "Este já é o funcionário responsável pelo serviço." });
  }

  const newEmployee = await prisma.user.findFirst({
    where: { id: employeeId, role: "EMPLOYEE" },
    include: { serviceRegions: true },
  });
  if (!newEmployee) return res.status(404).json({ error: "Funcionário não encontrado." });

  if (existing.city) {
    const servesCity = newEmployee.serviceRegions.some(
      (r) => r.city.trim().toLowerCase() === existing.city!.trim().toLowerCase()
    );
    if (!servesCity && !force) {
      return res.status(409).json({
        error: `${newEmployee.name} não está cadastrado para atender ${existing.city}.`,
        code: "OUT_OF_REGION",
      });
    }
  }

  if (!force) {
    const suggestions = await getEmployeeSuggestions({
      city: existing.city || "",
      targetAt: existing.scheduledAt,
      excludeServiceId: existing.id,
    });
    const target = suggestions.find((s) => s.id === employeeId);
    if (target?.conflict.hasConflict) {
      return res.status(409).json({
        error: "⚠️ Este funcionário já possui um serviço agendado neste horário.",
        code: "TIME_CONFLICT",
        conflict: target.conflict,
      });
    }
  }

  const oldEmployeeName = existing.employee.name;

  const service = await prisma.service.update({
    where: { id: existing.id },
    data: { employeeId },
    include: serviceInclude,
  });

  await prisma.serviceHistory.create({
    data: {
      serviceId: service.id,
      userId: req.user!.id,
      action: "TRANSFERIDO",
      fromValue: oldEmployeeName,
      toValue: newEmployee.name,
    },
  });

  await notify(
    employeeId,
    "📋 Novo serviço para você!",
    `Cliente: ${service.client.name}\nCidade: ${service.city || "—"}\nServiço: ${service.serviceType}\nData: ${service.scheduledAt.toLocaleDateString(
      "pt-BR"
    )}\nHorário: ${service.scheduledAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
    service.id
  );
  await notify(
    existing.employeeId,
    "Serviço transferido",
    `O serviço ${service.serviceType} para ${service.client.name} foi transferido para ${newEmployee.name}.`,
    service.id
  );

  res.json(service);
});

// ---- Delete (admin) ----
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    await prisma.service.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Serviço não encontrado." });
  }
});

// ---- Start service (employee) ----
router.patch("/:id/start", async (req, res) => {
  const { service, allowed } = await assertAccess(req, req.params.id);
  if (!service) return res.status(404).json({ error: "Serviço não encontrado." });
  if (!allowed) return res.status(403).json({ error: "Você não tem acesso a este serviço." });
  if (service.status !== "SCHEDULED" && service.status !== "PENDING") {
    return res.status(400).json({ error: "Este serviço não pode ser iniciado no status atual." });
  }

  const updated = await prisma.service.update({
    where: { id: service.id },
    data: { status: "IN_PROGRESS", startedAt: new Date() },
    include: serviceInclude,
  });

  await prisma.serviceHistory.create({
    data: {
      serviceId: service.id,
      userId: req.user!.id,
      action: "SERVICO_INICIADO",
      fromValue: service.status,
      toValue: "IN_PROGRESS",
    },
  });

  const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
  await Promise.all(
    admins.map((a) =>
      notify(
        a.id,
        "Serviço iniciado",
        `${updated.employee.name} iniciou o serviço ${updated.serviceType} para ${updated.client.name}.`,
        service.id
      )
    )
  );

  res.json(updated);
});

// ---- Update observations / problems / pending (employee) ----
router.patch("/:id/observations", async (req, res) => {
  const { service, allowed } = await assertAccess(req, req.params.id);
  if (!service) return res.status(404).json({ error: "Serviço não encontrado." });
  if (!allowed) return res.status(403).json({ error: "Você não tem acesso a este serviço." });

  const updated = await prisma.service.update({
    where: { id: service.id },
    data: { employeeObservations: req.body.text ?? "" },
    include: serviceInclude,
  });
  res.json(updated);
});

router.patch("/:id/problems", async (req, res) => {
  const { service, allowed } = await assertAccess(req, req.params.id);
  if (!service) return res.status(404).json({ error: "Serviço não encontrado." });
  if (!allowed) return res.status(403).json({ error: "Você não tem acesso a este serviço." });

  const text = req.body.text ?? "";
  const updated = await prisma.service.update({
    where: { id: service.id },
    data: { problems: text },
    include: serviceInclude,
  });

  if (text && text !== service.problems) {
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
    await Promise.all(
      admins.map((a) =>
        notify(
          a.id,
          "Problema registrado em serviço",
          `${updated.employee.name} registrou um problema no serviço ${updated.serviceType} (${updated.client.name}): ${text}`,
          service.id
        )
      )
    );
  }
  res.json(updated);
});

router.patch("/:id/pending", async (req, res) => {
  const { service, allowed } = await assertAccess(req, req.params.id);
  if (!service) return res.status(404).json({ error: "Serviço não encontrado." });
  if (!allowed) return res.status(403).json({ error: "Você não tem acesso a este serviço." });

  const text = req.body.text ?? "";
  const updated = await prisma.service.update({
    where: { id: service.id },
    data: { pendingNotes: text },
    include: serviceInclude,
  });

  if (text && text !== service.pendingNotes) {
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
    await Promise.all(
      admins.map((a) =>
        notify(
          a.id,
          "Pendência registrada em serviço",
          `${updated.employee.name} registrou uma pendência no serviço ${updated.serviceType} (${updated.client.name}): ${text}`,
          service.id
        )
      )
    );
  }
  res.json(updated);
});

// ---- Complete service (employee) ----
router.patch("/:id/complete", async (req, res) => {
  const { service, allowed } = await assertAccess(req, req.params.id);
  if (!service) return res.status(404).json({ error: "Serviço não encontrado." });
  if (!allowed) return res.status(403).json({ error: "Você não tem acesso a este serviço." });
  if (service.status !== "IN_PROGRESS") {
    return res.status(400).json({ error: "O serviço precisa estar em andamento para ser concluído." });
  }

  const missing: string[] = [];
  const hasBefore = service.photos.some((p) => p.type === "BEFORE");
  const hasAfter = service.photos.some((p) => p.type === "AFTER");
  if (!hasBefore) missing.push("ao menos 1 foto do tipo ANTES");
  if (!hasAfter) missing.push("ao menos 1 foto do tipo DEPOIS");

  if (missing.length && !req.body.force) {
    return res.status(400).json({
      error: `Antes de concluir, registre: ${missing.join(", ")}.`,
      missing,
    });
  }

  const updated = await prisma.service.update({
    where: { id: service.id },
    data: {
      status: service.pendingNotes ? "PENDING" : "COMPLETED",
      completedAt: new Date(),
    },
    include: serviceInclude,
  });

  await prisma.serviceHistory.create({
    data: {
      serviceId: service.id,
      userId: req.user!.id,
      action: "SERVICO_CONCLUIDO",
      fromValue: "IN_PROGRESS",
      toValue: updated.status,
    },
  });

  const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
  await Promise.all(
    admins.map((a) =>
      notify(
        a.id,
        "Serviço concluído",
        `${updated.employee.name} concluiu o serviço ${updated.serviceType} para ${updated.client.name}.`,
        service.id
      )
    )
  );

  res.json(updated);
});

// ---- Photos ----
router.post("/:id/photos", uploadServicePhoto.single("photo"), async (req, res) => {
  const { service, allowed } = await assertAccess(req, req.params.id);
  if (!service) return res.status(404).json({ error: "Serviço não encontrado." });
  if (!allowed) return res.status(403).json({ error: "Você não tem acesso a este serviço." });
  if (!req.file) return res.status(400).json({ error: "Nenhuma imagem enviada." });

  const type = req.body.type === "AFTER" ? "AFTER" : "BEFORE";
  const photo = await prisma.servicePhoto.create({
    data: {
      serviceId: service.id,
      type,
      url: `/uploads/services/${req.file.filename}`,
    },
  });
  res.status(201).json(photo);
});

router.delete("/:id/photos/:photoId", async (req, res) => {
  const { service, allowed } = await assertAccess(req, req.params.id);
  if (!service) return res.status(404).json({ error: "Serviço não encontrado." });
  if (!allowed) return res.status(403).json({ error: "Você não tem acesso a este serviço." });

  await prisma.servicePhoto.deleteMany({ where: { id: req.params.photoId, serviceId: service.id } });
  res.status(204).end();
});

// ---- Materials ----
router.post("/:id/materials", async (req, res) => {
  const { service, allowed } = await assertAccess(req, req.params.id);
  if (!service) return res.status(404).json({ error: "Serviço não encontrado." });
  if (!allowed) return res.status(403).json({ error: "Você não tem acesso a este serviço." });
  const { name, quantity, notes } = req.body;
  if (!name || !quantity) return res.status(400).json({ error: "Nome e quantidade são obrigatórios." });

  const material = await prisma.serviceMaterial.create({
    data: { serviceId: service.id, name, quantity: String(quantity), notes: notes || null },
  });
  res.status(201).json(material);
});

router.put("/:id/materials/:materialId", async (req, res) => {
  const { service, allowed } = await assertAccess(req, req.params.id);
  if (!service) return res.status(404).json({ error: "Serviço não encontrado." });
  if (!allowed) return res.status(403).json({ error: "Você não tem acesso a este serviço." });
  const { name, quantity, notes } = req.body;

  try {
    const material = await prisma.serviceMaterial.update({
      where: { id: req.params.materialId },
      data: { name, quantity: String(quantity), notes: notes || null },
    });
    res.json(material);
  } catch {
    res.status(404).json({ error: "Material não encontrado." });
  }
});

router.delete("/:id/materials/:materialId", async (req, res) => {
  const { service, allowed } = await assertAccess(req, req.params.id);
  if (!service) return res.status(404).json({ error: "Serviço não encontrado." });
  if (!allowed) return res.status(403).json({ error: "Você não tem acesso a este serviço." });

  await prisma.serviceMaterial.deleteMany({ where: { id: req.params.materialId, serviceId: service.id } });
  res.status(204).end();
});

export default router;
