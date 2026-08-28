import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { requireAdmin, requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth, requireAdmin);

interface CityInput {
  city: string;
  state?: string;
}

function normalizeCities(input: unknown): CityInput[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const result: CityInput[] = [];
  for (const item of input) {
    const city = typeof item?.city === "string" ? item.city.trim() : "";
    if (!city) continue;
    const key = city.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ city, state: typeof item?.state === "string" ? item.state.trim().toUpperCase() || undefined : undefined });
  }
  return result;
}

async function syncCities(employeeId: string, cities: CityInput[]) {
  await prisma.employeeCity.deleteMany({ where: { employeeId } });
  if (cities.length > 0) {
    await prisma.employeeCity.createMany({
      data: cities.map((c) => ({ employeeId, city: c.city, state: c.state || null })),
    });
  }
}

router.get("/", async (req, res) => {
  const { search, city } = req.query as { search?: string; city?: string };
  const employees = await prisma.user.findMany({
    where: {
      role: "EMPLOYEE",
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { email: { contains: search } },
              { cargo: { contains: search } },
            ],
          }
        : {}),
      ...(city
        ? { serviceRegions: { some: { city: { equals: city } } } }
        : {}),
    },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { servicesAsEmployee: true } },
      serviceRegions: { orderBy: { city: "asc" } },
    },
  });
  res.json(employees.map(({ passwordHash, ...e }) => e));
});

router.get("/:id", async (req, res) => {
  const employee = await prisma.user.findFirst({
    where: { id: req.params.id, role: "EMPLOYEE" },
    include: {
      servicesAsEmployee: {
        orderBy: { scheduledAt: "desc" },
        include: { client: { select: { id: true, name: true } } },
      },
      serviceRegions: { orderBy: { city: "asc" } },
    },
  });
  if (!employee) return res.status(404).json({ error: "Funcionário não encontrado." });
  const { passwordHash, ...safe } = employee;
  res.json(safe);
});

router.post("/", async (req, res) => {
  const b = req.body;
  if (!b.name || !b.email || !b.password) {
    return res.status(400).json({ error: "Nome, e-mail e senha são obrigatórios." });
  }
  const existing = await prisma.user.findUnique({ where: { email: b.email.toLowerCase().trim() } });
  if (existing) return res.status(400).json({ error: "Já existe um usuário com este e-mail." });

  const passwordHash = await bcrypt.hash(b.password, 10);
  const cities = normalizeCities(b.cities);
  const employee = await prisma.user.create({
    data: {
      name: b.name,
      email: b.email.toLowerCase().trim(),
      passwordHash,
      role: "EMPLOYEE",
      phone: b.phone || null,
      cargo: b.cargo || null,
      photoUrl: b.photoUrl || null,
      status: b.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
      serviceRegions: cities.length
        ? { create: cities.map((c) => ({ city: c.city, state: c.state || null })) }
        : undefined,
    },
    include: { serviceRegions: true },
  });
  const { passwordHash: _, ...safe } = employee;
  res.status(201).json(safe);
});

router.put("/:id", async (req, res) => {
  const b = req.body;
  const data: Record<string, unknown> = {
    name: b.name,
    phone: b.phone || null,
    cargo: b.cargo || null,
    photoUrl: b.photoUrl || null,
    status: b.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
  };
  if (b.email) data.email = b.email.toLowerCase().trim();
  if (b.password) data.passwordHash = await bcrypt.hash(b.password, 10);

  try {
    const employee = await prisma.user.update({ where: { id: req.params.id }, data });
    if (Array.isArray(b.cities)) {
      await syncCities(employee.id, normalizeCities(b.cities));
    }
    const full = await prisma.user.findUnique({
      where: { id: employee.id },
      include: { serviceRegions: { orderBy: { city: "asc" } } },
    });
    const { passwordHash, ...safe } = full!;
    res.json(safe);
  } catch {
    res.status(404).json({ error: "Funcionário não encontrado." });
  }
});

router.delete("/:id", async (req, res) => {
  const count = await prisma.service.count({ where: { employeeId: req.params.id } });
  if (count > 0) {
    return res.status(400).json({
      error: "Não é possível excluir um funcionário com serviços vinculados. Desative-o em vez disso.",
    });
  }
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Funcionário não encontrado." });
  }
});

export default router;
