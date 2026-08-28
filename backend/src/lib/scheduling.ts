import { prisma } from "./prisma";

// Two services for the same employee within this many minutes of each other
// are considered a scheduling conflict (accounts for travel/setup time).
const CONFLICT_WINDOW_MINUTES = 60;

export interface EmployeeSuggestion {
  id: string;
  name: string;
  cargo: string | null;
  photoUrl: string | null;
  phone: string | null;
  cities: { city: string; state: string | null }[];
  serviceCountOnDate: number;
  sameCityServiceCountOnDate: number;
  conflict: {
    hasConflict: boolean;
    conflictingService?: {
      id: string;
      serviceType: string;
      scheduledAt: string;
      clientName: string;
    };
  };
  recommended: boolean;
  reasons: string[];
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Returns every active employee whose service regions include `city`
 * (case-insensitive), annotated with same-day workload, scheduling
 * conflicts around `targetAt`, and a best-effort recommendation.
 */
export async function getEmployeeSuggestions(opts: {
  city: string;
  targetAt: Date;
  excludeServiceId?: string;
}): Promise<EmployeeSuggestion[]> {
  const { city, targetAt, excludeServiceId } = opts;
  const cityKey = city.trim().toLowerCase();

  const employees = await prisma.user.findMany({
    where: { role: "EMPLOYEE", status: "ACTIVE" },
    include: { serviceRegions: true },
    orderBy: { name: "asc" },
  });

  const eligible = employees.filter((e) =>
    e.serviceRegions.some((r) => r.city.trim().toLowerCase() === cityKey)
  );

  const dayStart = startOfDay(targetAt);
  const dayEnd = endOfDay(targetAt);

  const results: EmployeeSuggestion[] = [];

  for (const emp of eligible) {
    const dayServices = await prisma.service.findMany({
      where: {
        employeeId: emp.id,
        status: { not: "CANCELLED" },
        scheduledAt: { gte: dayStart, lte: dayEnd },
        ...(excludeServiceId ? { id: { not: excludeServiceId } } : {}),
      },
      include: { client: { select: { name: true } } },
      orderBy: { scheduledAt: "asc" },
    });

    let conflictingService: (typeof dayServices)[number] | undefined;
    for (const s of dayServices) {
      const diffMinutes = Math.abs(s.scheduledAt.getTime() - targetAt.getTime()) / 60000;
      if (diffMinutes < CONFLICT_WINDOW_MINUTES) {
        conflictingService = s;
        break;
      }
    }

    const sameCityCount = dayServices.filter(
      (s) => (s.city || "").trim().toLowerCase() === cityKey
    ).length;

    const reasons: string[] = [`Atende ${city}`];
    if (!conflictingService) {
      reasons.push("Sem conflito de horário nesse dia");
    }
    reasons.push(
      dayServices.length === 0
        ? "Nenhum outro serviço nesse dia"
        : `Possui ${dayServices.length} serviço(s) nesse dia`
    );
    if (sameCityCount > 0) {
      reasons.push(`Já atende ${sameCityCount} serviço(s) em ${city} no mesmo dia (menor deslocamento)`);
    }

    results.push({
      id: emp.id,
      name: emp.name,
      cargo: emp.cargo,
      photoUrl: emp.photoUrl,
      phone: emp.phone,
      cities: emp.serviceRegions.map((r) => ({ city: r.city, state: r.state })),
      serviceCountOnDate: dayServices.length,
      sameCityServiceCountOnDate: sameCityCount,
      conflict: {
        hasConflict: Boolean(conflictingService),
        conflictingService: conflictingService
          ? {
              id: conflictingService.id,
              serviceType: conflictingService.serviceType,
              scheduledAt: conflictingService.scheduledAt.toISOString(),
              clientName: conflictingService.client.name,
            }
          : undefined,
      },
      recommended: false,
      reasons,
    });
  }

  results.sort((a, b) => {
    if (a.conflict.hasConflict !== b.conflict.hasConflict) return a.conflict.hasConflict ? 1 : -1;
    if (a.sameCityServiceCountOnDate !== b.sameCityServiceCountOnDate)
      return b.sameCityServiceCountOnDate - a.sameCityServiceCountOnDate;
    return a.serviceCountOnDate - b.serviceCountOnDate;
  });

  if (results.length > 0 && !results[0].conflict.hasConflict) {
    results[0].recommended = true;
  }

  return results;
}
