import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

export class PlanNotAllowedError extends Error {
  constructor(
    message: string,
    readonly reason: "not_found" | "archived" | "not_eligible",
  ) {
    super(message);
  }
}

/**
 * Restricted plans (e.g. the discounted new-joiner plan) may only be used by the
 * members on their eligibility list; open plans are available to everyone.
 */
export async function assertPlanAllowedForUser(
  db: Db,
  userId: string,
  planId: string,
) {
  const plan = await db.membershipPlan.findUnique({ where: { id: planId } });
  if (!plan) {
    throw new PlanNotAllowedError("Plan not found", "not_found");
  }
  if (!plan.isActive) {
    throw new PlanNotAllowedError("Plan is archived", "archived");
  }
  if (plan.isRestricted) {
    const grant = await db.planEligibility.findUnique({
      where: { userId_planId: { userId, planId } },
    });
    if (!grant) {
      throw new PlanNotAllowedError(
        "This member is not eligible for that plan",
        "not_eligible",
      );
    }
  }
  return plan;
}
