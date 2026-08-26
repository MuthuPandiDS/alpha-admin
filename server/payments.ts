import type { Prisma, PrismaClient } from "@prisma/client";
import { extendMembership } from "@/lib/membership";

type Db = PrismaClient | Prisma.TransactionClient;

export type SettlePaymentInput = {
  linkId: string;
  status: string;
  amountPaidInPaise?: number;
  cashfreeOrderId?: string | null;
  cfLinkId?: string | null;
  rawPayload?: Prisma.InputJsonValue;
  paidAt?: Date;
};

export type SettleResult =
  | { handled: false; reason: "unknown_link" | "already_settled" }
  | { handled: true; paymentId: string; status: string };

/**
 * Applies a Cashfree link status to the stored payment. When the link is paid the
 * member's plan expiry is extended and their payment status flipped to PAID.
 * Safe to call repeatedly: an already PAID payment is never applied twice.
 */
export async function settlePaymentFromLink(
  db: Db,
  input: SettlePaymentInput,
): Promise<SettleResult> {
  const payment = await db.payment.findUnique({
    where: { cashfreeLinkId: input.linkId },
    include: { plan: true },
  });

  if (!payment) return { handled: false, reason: "unknown_link" };
  if (payment.status === "PAID") return { handled: false, reason: "already_settled" };

  const paidAt = input.paidAt ?? new Date();

  await db.payment.update({
    where: { id: payment.id },
    data: {
      status: input.status,
      amountPaidInPaise: input.amountPaidInPaise ?? payment.amountPaidInPaise,
      cashfreeOrderId: input.cashfreeOrderId ?? payment.cashfreeOrderId,
      cashfreeCfLinkId: input.cfLinkId ?? payment.cashfreeCfLinkId,
      rawPayload: input.rawPayload,
      paidAt: input.status === "PAID" ? paidAt : null,
    },
  });

  if (input.status === "PAID") {
    const user = await db.user.findUnique({
      where: { id: payment.userId },
      select: { planExpiresAt: true },
    });
    const durationDays = payment.plan?.durationDays ?? 30;

    await db.user.update({
      where: { id: payment.userId },
      data: {
        paymentStatus: "PAID",
        planExpiresAt: extendMembership(
          user?.planExpiresAt ?? null,
          durationDays,
          paidAt,
        ),
        ...(payment.planId ? { planId: payment.planId } : {}),
      },
    });
  }

  return { handled: true, paymentId: payment.id, status: input.status };
}
