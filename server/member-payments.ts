import { getDefaultPlanId } from "@/lib/default-plan";
import { prisma } from "@/lib/prisma";
import {
  issuePaymentLink,
  PaymentRequestError,
  refreshPaymentFromCashfree,
} from "@/server/payments";

/** Cashfree sends members back here after the checkout closes. */
const MEMBER_RETURN_PATH = "/join";

export type MemberPayment = {
  id: string;
  amountInPaise: number;
  currency: string;
  status: string;
  provider: string;
  linkUrl: string | null;
  cashfreeLinkId: string | null;
  expiresAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
  plan: { id: string; name: string } | null;
};

export type MemberMembership = {
  plan: {
    id: string;
    name: string;
    description: string | null;
    priceInPaise: number;
    currency: string;
    durationDays: number;
  } | null;
  paymentStatus: string;
  planExpiresAt: Date | null;
  payments: MemberPayment[];
  pendingPayment: MemberPayment | null;
};

const memberPaymentSelect = {
  id: true,
  amountInPaise: true,
  currency: true,
  status: true,
  provider: true,
  linkUrl: true,
  cashfreeLinkId: true,
  expiresAt: true,
  paidAt: true,
  createdAt: true,
  plan: { select: { id: true, name: true } },
} as const;

function isPayable(payment: MemberPayment, now = new Date()): boolean {
  return (
    payment.status === "PENDING" &&
    payment.provider === "CASHFREE" &&
    Boolean(payment.linkUrl) &&
    (!payment.expiresAt || payment.expiresAt.getTime() > now.getTime())
  );
}

/** Plan, membership status and payment history a member sees on /join. */
export async function getMemberMembership(
  userId: string,
): Promise<MemberMembership> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      paymentStatus: true,
      planExpiresAt: true,
      plan: {
        select: {
          id: true,
          name: true,
          description: true,
          priceInPaise: true,
          currency: true,
          durationDays: true,
        },
      },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: memberPaymentSelect,
      },
    },
  });

  if (!user) {
    return {
      plan: null,
      paymentStatus: "UNPAID",
      planExpiresAt: null,
      payments: [],
      pendingPayment: null,
    };
  }

  return {
    plan: user.plan,
    paymentStatus: user.paymentStatus,
    planExpiresAt: user.planExpiresAt,
    payments: user.payments,
    pendingPayment: user.payments.find((payment) => isPayable(payment)) ?? null,
  };
}

/**
 * Gives a member a payable Cashfree link for their own plan. An unpaid link that
 * is still valid is reused so scanning the QR twice never charges twice.
 */
export async function startMemberPayment(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      planId: true,
      payments: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: memberPaymentSelect,
      },
    },
  });
  if (!user) {
    throw new PaymentRequestError("We could not find your membership.");
  }

  const existing = user.payments.find((payment) => isPayable(payment));
  if (existing?.linkUrl) return existing.linkUrl;

  const planId = user.planId ?? (await getDefaultPlanId(prisma));
  if (!planId) {
    throw new PaymentRequestError(
      "No membership plan is assigned yet. Please ask the front desk.",
    );
  }
  if (!user.planId) {
    await prisma.user.update({ where: { id: userId }, data: { planId } });
  }

  const payment = await issuePaymentLink(prisma, {
    userId,
    planId,
    returnPath: MEMBER_RETURN_PATH,
  });
  if (!payment.linkUrl) {
    throw new PaymentRequestError("Cashfree did not return a payment link.");
  }
  return payment.linkUrl;
}

/**
 * Re-reads the member's open links from Cashfree so the page shows the right
 * status even when the webhook has not reached this app.
 */
export async function syncMemberPayments(userId: string): Promise<void> {
  const pending = await prisma.payment.findMany({
    where: { userId, status: "PENDING", provider: "CASHFREE" },
    select: { cashfreeLinkId: true },
  });

  await Promise.all(
    pending.map(async (payment) => {
      if (!payment.cashfreeLinkId) return;
      try {
        await refreshPaymentFromCashfree(prisma, payment.cashfreeLinkId);
      } catch {
        // A gateway hiccup must not break the member page; the webhook still settles it.
      }
    }),
  );
}
