import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  createPaymentLink,
  fetchPaymentLink,
  mapLinkStatus,
} from "@/lib/cashfree";
import { extendMembership } from "@/lib/membership";
import { assertPlanAllowedForUser } from "@/server/plans";

type Db = PrismaClient | Prisma.TransactionClient;

/** How long a raised Cashfree link stays payable. */
export const LINK_VALID_DAYS = 7;

export class PaymentRequestError extends Error {}

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

export type IssuePaymentLinkInput = {
  userId: string;
  planId?: string;
  amountInPaise?: number;
  notes?: string;
  /** Where Cashfree returns the payer: "/payments" for admins, "/join" for members. */
  returnPath?: string;
};

function toPaise(amount: number | string | undefined): number | undefined {
  if (amount === undefined) return undefined;
  const value = typeof amount === "number" ? amount : Number(amount);
  return Number.isFinite(value) ? Math.round(value * 100) : undefined;
}

/**
 * Raises a Cashfree payment link for a member's plan and stores it for tracking.
 * Shared by the admin dashboard and the member self-service flow on /join.
 */
export async function issuePaymentLink(
  db: Db,
  input: IssuePaymentLinkInput,
): Promise<{ id: string; linkUrl: string | null; cashfreeLinkId: string | null }> {
  const user = await db.user.findUnique({
    where: { id: input.userId },
    select: { id: true, name: true, email: true, phone: true, planId: true },
  });
  if (!user) {
    throw new PaymentRequestError("Member not found");
  }

  const planId = input.planId ?? user.planId;
  if (!planId) {
    throw new PaymentRequestError("Assign a plan to this member first");
  }
  const plan = await assertPlanAllowedForUser(db, user.id, planId);

  const amountInPaise = input.amountInPaise ?? plan.priceInPaise;
  if (amountInPaise <= 0) {
    throw new PaymentRequestError("Payment amount must be greater than zero");
  }

  const linkId = `alpha_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + LINK_VALID_DAYS);

  const link = await createPaymentLink({
    linkId,
    amountInPaise,
    currency: plan.currency,
    purpose: `${plan.name} membership`,
    expiresAt,
    customer: { name: user.name, email: user.email, phone: user.phone },
    notes: { userId: user.id, planId: plan.id },
    returnPath: input.returnPath,
  });

  return db.payment.create({
    data: {
      userId: user.id,
      planId: plan.id,
      amountInPaise,
      currency: plan.currency,
      status: mapLinkStatus(link.link_status),
      provider: "CASHFREE",
      cashfreeLinkId: linkId,
      cashfreeCfLinkId: link.cf_link_id ? String(link.cf_link_id) : null,
      linkUrl: link.link_url,
      notes: input.notes ?? null,
      expiresAt,
    },
    select: { id: true, linkUrl: true, cashfreeLinkId: true },
  });
}

/**
 * Re-reads a link from Cashfree and applies its status, for when the webhook was
 * missed or the payer just came back from the checkout page.
 */
export async function refreshPaymentFromCashfree(
  db: Db,
  linkId: string,
): Promise<SettleResult> {
  const link = await fetchPaymentLink(linkId);
  return settlePaymentFromLink(db, {
    linkId,
    status: mapLinkStatus(link.link_status),
    amountPaidInPaise: toPaise(link.link_amount_paid),
    cashfreeOrderId: link.order?.order_id ?? null,
    cfLinkId: link.cf_link_id ? String(link.cf_link_id) : null,
    rawPayload: link as unknown as Prisma.InputJsonValue,
  });
}
