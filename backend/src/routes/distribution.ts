import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAdmin, requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth, requireAdmin);

router.get("/stats", async (_req, res) => {
  const recentThreshold = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const [newRequests, awaitingRequests, scheduled, inProgress, completed, pending] = await Promise.all([
    prisma.serviceRequest.count({ where: { status: "PENDING", createdAt: { gte: recentThreshold } } }),
    prisma.serviceRequest.count({ where: { status: "PENDING" } }),
    prisma.service.count({ where: { status: "SCHEDULED" } }),
    prisma.service.count({ where: { status: "IN_PROGRESS" } }),
    prisma.service.count({ where: { status: "COMPLETED" } }),
    prisma.service.count({ where: { status: "PENDING" } }),
  ]);

  const services = await prisma.service.findMany({
    where: { status: { not: "CANCELLED" }, city: { not: null } },
    select: { city: true, employee: { select: { id: true, name: true } } },
  });

  const cityMap = new Map<string, { city: string; count: number; employees: Map<string, string> }>();
  for (const s of services) {
    const city = (s.city || "").trim();
    if (!city) continue;
    const key = city.toLowerCase();
    if (!cityMap.has(key)) cityMap.set(key, { city, count: 0, employees: new Map() });
    const entry = cityMap.get(key)!;
    entry.count += 1;
    entry.employees.set(s.employee.id, s.employee.name);
  }

  const byCity = Array.from(cityMap.values())
    .map((e) => ({
      city: e.city,
      count: e.count,
      employees: Array.from(e.employees.entries()).map(([id, name]) => ({ id, name })),
    }))
    .sort((a, b) => b.count - a.count);

  res.json({
    newRequests,
    awaitingRequests,
    scheduled,
    inProgress,
    completed,
    pending,
    byCity,
  });
});

router.get("/by-employee", async (_req, res) => {
  const employees = await prisma.user.findMany({
    where: { role: "EMPLOYEE", status: "ACTIVE" },
    orderBy: { name: "asc" },
    include: {
      serviceRegions: { orderBy: { city: "asc" } },
      servicesAsEmployee: {
        where: { status: { not: "CANCELLED" } },
        orderBy: { scheduledAt: "asc" },
        include: { client: { select: { name: true } } },
      },
    },
  });

  res.json(
    employees.map((e) => ({
      id: e.id,
      name: e.name,
      cargo: e.cargo,
      cities: e.serviceRegions.map((r) => r.city),
      services: e.servicesAsEmployee.map((s) => ({
        id: s.id,
        serviceType: s.serviceType,
        clientName: s.client.name,
        city: s.city,
        address: s.address,
        scheduledAt: s.scheduledAt,
        status: s.status,
      })),
    }))
  );
});

export default router;
