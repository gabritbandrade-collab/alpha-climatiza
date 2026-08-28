import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAdmin, requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth, requireAdmin);

router.get("/", async (req, res) => {
  const { search } = req.query as { search?: string };
  const clients = await prisma.client.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search } },
            { document: { contains: search } },
            { phone: { contains: search } },
            { email: { contains: search } },
            { city: { contains: search } },
          ],
        }
      : undefined,
    orderBy: { name: "asc" },
    include: { _count: { select: { services: true } } },
  });
  res.json(clients);
});

router.get("/:id", async (req, res) => {
  const client = await prisma.client.findUnique({
    where: { id: req.params.id },
    include: {
      services: {
        orderBy: { scheduledAt: "desc" },
        include: { employee: { select: { id: true, name: true } } },
      },
    },
  });
  if (!client) return res.status(404).json({ error: "Cliente não encontrado." });
  res.json(client);
});

router.post("/", async (req, res) => {
  const b = req.body;
  if (!b.name) return res.status(400).json({ error: "Nome é obrigatório." });
  const client = await prisma.client.create({
    data: {
      name: b.name,
      document: b.document || null,
      phone: b.phone || null,
      email: b.email || null,
      address: b.address || null,
      number: b.number || null,
      complement: b.complement || null,
      city: b.city || null,
      state: b.state || null,
      notes: b.notes || null,
    },
  });
  res.status(201).json(client);
});

router.put("/:id", async (req, res) => {
  const b = req.body;
  try {
    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: {
        name: b.name,
        document: b.document || null,
        phone: b.phone || null,
        email: b.email || null,
        address: b.address || null,
        number: b.number || null,
        complement: b.complement || null,
        city: b.city || null,
        state: b.state || null,
        notes: b.notes || null,
      },
    });
    res.json(client);
  } catch {
    res.status(404).json({ error: "Cliente não encontrado." });
  }
});

router.delete("/:id", async (req, res) => {
  const count = await prisma.service.count({ where: { clientId: req.params.id } });
  if (count > 0) {
    return res.status(400).json({
      error: "Não é possível excluir um cliente com serviços vinculados.",
    });
  }
  try {
    await prisma.client.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Cliente não encontrado." });
  }
});

export default router;
