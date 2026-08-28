import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAdmin, requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth, requireAdmin);

router.get("/stats", async (_req, res) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const [
    total,
    today,
    inProgress,
    completed,
    pending,
    scheduled,
    cancelled,
    employees,
    clients,
    byStatusRaw,
    last30Days,
  ] = await Promise.all([
    prisma.service.count(),
    prisma.service.count({ where: { scheduledAt: { gte: startOfDay, lte: endOfDay } } }),
    prisma.service.count({ where: { status: "IN_PROGRESS" } }),
    prisma.service.count({ where: { status: "COMPLETED" } }),
    prisma.service.count({ where: { status: "PENDING" } }),
    prisma.service.count({ where: { status: "SCHEDULED" } }),
    prisma.service.count({ where: { status: "CANCELLED" } }),
    prisma.user.count({ where: { role: "EMPLOYEE" } }),
    prisma.client.count(),
    prisma.service.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.service.findMany({
      where: { scheduledAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      select: { scheduledAt: true, status: true },
    }),
  ]);

  const dayBuckets: Record<string, number> = {};
  for (const s of last30Days) {
    const key = s.scheduledAt.toISOString().slice(0, 10);
    dayBuckets[key] = (dayBuckets[key] || 0) + 1;
  }
  const timeline = Object.entries(dayBuckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  const employeeLoad = await prisma.user.findMany({
    where: { role: "EMPLOYEE", status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      _count: { select: { servicesAsEmployee: true } },
    },
  });

  res.json({
    total,
    today,
    inProgress,
    completed,
    pending,
    scheduled,
    cancelled,
    employees,
    clients,
    byStatus: byStatusRaw.map((s) => ({ status: s.status, count: s._count._all })),
    timeline,
    employeeLoad: employeeLoad.map((e) => ({ id: e.id, name: e.name, count: e._count.servicesAsEmployee })),
  });
});

export default router;
