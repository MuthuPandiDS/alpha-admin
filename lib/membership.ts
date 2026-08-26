export const PAYMENT_RECORD_STATUSES = [
  "PENDING",
  "PARTIALLY_PAID",
  "PAID",
  "FAILED",
  "EXPIRED",
  "CANCELLED",
] as const;
export type PaymentRecordStatus = (typeof PAYMENT_RECORD_STATUSES)[number];

export const PAYMENT_PROVIDERS = ["CASHFREE", "MANUAL"] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

export function formatMoney(paise: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(paiseToRupees(paise));
}

/**
 * Renewals extend from the current expiry when the membership is still running,
 * so a member never loses days by paying early.
 */
export function extendMembership(
  currentExpiry: Date | null,
  durationDays: number,
  now = new Date(),
): Date {
  const base =
    currentExpiry && currentExpiry.getTime() > now.getTime()
      ? new Date(currentExpiry)
      : new Date(now);
  base.setDate(base.getDate() + durationDays);
  return base;
}
