import type { Prisma, PrismaClient } from "@prisma/client";

/**
 * Every new member starts on the default plan so billing works before the admin
 * moves them onto a tailored one. Returns null when no default plan exists yet.
 */
export async function getDefaultPlanId(
  db: PrismaClient | Prisma.TransactionClient,
): Promise<string | null> {
  const plan = await db.membershipPlan.findFirst({
    where: { isDefault: true, isActive: true },
    select: { id: true },
  });
  return plan?.id ?? null;
}
