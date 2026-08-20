export const PLAN_STATUSES = ["active", "expired", "expiring_soon"] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export const PAYMENT_STATUSES = ["PAID", "UNPAID", "OVERDUE"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const EXPIRING_SOON_DAYS = 7;

export function getPlanStatus(
  planExpiresAt: Date | null,
  now = new Date(),
): PlanStatus {
  if (!planExpiresAt) return "expired";
  const days = getDaysRemaining(planExpiresAt, now);
  if (days === null || days < 0) return "expired";
  if (days <= EXPIRING_SOON_DAYS) return "expiring_soon";
  return "active";
}

export function getDaysRemaining(
  planExpiresAt: Date | null,
  now = new Date(),
): number | null {
  if (!planExpiresAt) return null;
  return Math.ceil((planExpiresAt.getTime() - now.getTime()) / 86_400_000);
}

export function planStatusWhere(
  planStatus: PlanStatus | "all",
  now = new Date(),
) {
  if (planStatus === "all") return {};

  const soon = new Date(
    now.getTime() + EXPIRING_SOON_DAYS * 86_400_000,
  );

  if (planStatus === "expired") {
    return {
      OR: [{ planExpiresAt: null }, { planExpiresAt: { lt: now } }],
    };
  }

  if (planStatus === "expiring_soon") {
    return { planExpiresAt: { gte: now, lte: soon } };
  }

  return { planExpiresAt: { gt: soon } };
}
