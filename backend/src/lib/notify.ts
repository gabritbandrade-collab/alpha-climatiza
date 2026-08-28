import { prisma } from "./prisma";

export async function notify(
  userId: string,
  title: string,
  message: string,
  relatedServiceId?: string
) {
  return prisma.notification.create({
    data: { userId, title, message, relatedServiceId },
  });
}
