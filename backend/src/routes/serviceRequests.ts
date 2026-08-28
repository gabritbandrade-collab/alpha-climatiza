import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { notify } from "../lib/notify";
import { getEmployeeSuggestions } from "../lib/scheduling";

const router = Router();
router.use(requireAuth, requireAdmin);

const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"];

// ---- List ----
router.get("/", async (req, res) => {
  const { status, city, priority, search } = req.query as Record<string, string>;
  const where: any = {};
  if (status) where.status = status;
  if (city) where.city = { equals: city };
  if (priority) where.priority = priority;
  if (search) {
    where.OR = [
      { clientName: { contains: search } },
      { address: { contains: search } },
      { city: { contains: search } },
      { serviceType: { contains: search } },
    ];
  }

  const requests = await prisma.serviceRequest.findMany({
    where,
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    include: {
      resultingService: {
        select: { id: true, status: true, employee: { select: { id: true, name: true } } },
      },
    },
  });
  res.json(requests);
});

// ---- Detail ----
router.get("/:id", async (req, res) => {
  const request = await prisma.serviceRequest.findUnique({
    where: { id: req.params.id },
    include: {
      resultingService: {
        include: { employee: { select: { id: true, name: true, phone: true, cargo: true } } },
      },
    },
  });
  if (!request) return res.status(404).json({ error: "Solicitação não encontrada." });
  res.json(request);
});

// ---- Create ----
router.post("/", async (req, res) => {
  const b = req.body;
  if (!b.clientName || !b.address || !b.city || !b.serviceType || !b.desiredAt) {
    return res.status(400).json({
      error: "Cliente, endereço, cidade, tipo de serviço e data desejada são obrigatórios.",
    });
  }
  const priority = PRIORITIES.includes(b.priority) ? b.priority : "NORMAL";

  const request = await prisma.serviceRequest.create({
    data: {
      clientName: b.clientName,
      phone: b.phone || null,
      address: b.address,
      city: b.city,
      state: b.state || null,
      serviceType: b.serviceType,
      description: b.description || null,
      desiredAt: new Date(b.desiredAt),
      notes: b.notes || null,
      materialsPlan: b.materialsPlan || null,
      priority,
      clientId: b.clientId || null,
      status: "PENDING",
    },
  });
  res.status(201).json(request);
});

// ---- Update (only while still pending) ----
router.put("/:id", async (req, res) => {
  const existing = await prisma.serviceRequest.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Solicitação não encontrada." });
  if (existing.status !== "PENDING") {
    return res.status(400).json({ error: "Somente solicitações pendentes podem ser editadas." });
  }
  const b = req.body;
  const priority = b.priority && PRIORITIES.includes(b.priority) ? b.priority : existing.priority;

  const request = await prisma.serviceRequest.update({
    where: { id: req.params.id },
    data: {
      clientName: b.clientName ?? existing.clientName,
      phone: b.phone ?? existing.phone,
      address: b.address ?? existing.address,
      city: b.city ?? existing.city,
      state: b.state ?? existing.state,
      serviceType: b.serviceType ?? existing.serviceType,
      description: b.description ?? existing.description,
      desiredAt: b.desiredAt ? new Date(b.desiredAt) : existing.desiredAt,
      notes: b.notes ?? existing.notes,
      materialsPlan: b.materialsPlan ?? existing.materialsPlan,
      priority,
    },
  });
  res.json(request);
});

// ---- Cancel ----
router.patch("/:id/cancel", async (req, res) => {
  const existing = await prisma.serviceRequest.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Solicitação não encontrada." });
  if (existing.status !== "PENDING") {
    return res.status(400).json({ error: "Somente solicitações pendentes podem ser canceladas." });
  }
  const request = await prisma.serviceRequest.update({
    where: { id: req.params.id },
    data: { status: "CANCELLED" },
  });
  res.json(request);
});

// ---- Employee suggestions for this request's city/date ----
router.get("/:id/suggestions", async (req, res) => {
  const request = await prisma.serviceRequest.findUnique({ where: { id: req.params.id } });
  if (!request) return res.status(404).json({ error: "Solicitação não encontrada." });

  const suggestions = await getEmployeeSuggestions({ city: request.city, targetAt: request.desiredAt });
  res.json(suggestions);
});

// ---- Assign / distribute: creates the real Service and links it back ----
router.post("/:id/assign", async (req, res) => {
  const request = await prisma.serviceRequest.findUnique({ where: { id: req.params.id } });
  if (!request) return res.status(404).json({ error: "Solicitação não encontrada." });
  if (request.status !== "PENDING") {
    return res.status(400).json({ error: "Esta solicitação já foi distribuída ou cancelada." });
  }

  const { employeeId, scheduledAt, force } = req.body as {
    employeeId?: string;
    scheduledAt?: string;
    force?: boolean;
  };
  if (!employeeId) return res.status(400).json({ error: "Selecione um funcionário responsável." });

  const employee = await prisma.user.findFirst({
    where: { id: employeeId, role: "EMPLOYEE" },
    include: { serviceRegions: true },
  });
  if (!employee) return res.status(404).json({ error: "Funcionário não encontrado." });

  const servesCity = employee.serviceRegions.some(
    (r) => r.city.trim().toLowerCase() === request.city.trim().toLowerCase()
  );
  if (!servesCity && !force) {
    return res.status(409).json({
      error: `${employee.name} não está cadastrado para atender ${request.city}.`,
      code: "OUT_OF_REGION",
    });
  }

  const targetAt = scheduledAt ? new Date(scheduledAt) : request.desiredAt;

  if (!force) {
    const [suggestion] = await getEmployeeSuggestions({ city: request.city, targetAt }).then((list) =>
      list.filter((s) => s.id === employeeId)
    );
    if (suggestion?.conflict.hasConflict) {
      const alternatives = await getEmployeeSuggestions({ city: request.city, targetAt });
      return res.status(409).json({
        error: "⚠️ Este funcionário já possui um serviço agendado neste horário.",
        code: "TIME_CONFLICT",
        conflict: suggestion.conflict,
        alternatives: alternatives.filter((a) => a.id !== employeeId),
      });
    }
  }

  // Find or create a lightweight Client record so the resulting Service fits
  // the existing client/service data model and history views.
  let clientId = request.clientId;
  if (!clientId) {
    const existingClient = request.phone
      ? await prisma.client.findFirst({ where: { name: request.clientName, phone: request.phone } })
      : null;
    if (existingClient) {
      clientId = existingClient.id;
    } else {
      const created = await prisma.client.create({
        data: {
          name: request.clientName,
          phone: request.phone,
          address: request.address,
          city: request.city,
          state: request.state,
        },
      });
      clientId = created.id;
    }
  }

  const service = await prisma.service.create({
    data: {
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
      scheduledAt: targetAt,
      status: "SCHEDULED",
    },
    include: { client: true, employee: { select: { id: true, name: true } } },
  });

  await prisma.serviceRequest.update({
    where: { id: request.id },
    data: { status: "ASSIGNED", clientId, resultingServiceId: service.id },
  });

  await prisma.serviceHistory.create({
    data: {
      serviceId: service.id,
      userId: req.user!.id,
      action: "CRIADO",
      toValue: "SCHEDULED",
    },
  });
  await prisma.serviceHistory.create({
    data: {
      serviceId: service.id,
      userId: req.user!.id,
      action: "DISTRIBUIDO_POR_CIDADE",
      toValue: `${employee.name} (${request.city})`,
    },
  });

  await notify(
    employeeId,
    "📋 Novo serviço para você!",
    `Cliente: ${service.client.name}\nCidade: ${request.city}\nServiço: ${request.serviceType}\nData: ${targetAt.toLocaleDateString(
      "pt-BR"
    )}\nHorário: ${targetAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
    service.id
  );

  res.status(201).json({ request: { ...request, status: "ASSIGNED" }, service });
});

export default router;
