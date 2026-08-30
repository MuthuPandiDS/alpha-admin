"use client";

import { useActionState } from "react";
import { payMembership, refreshMembershipPayment } from "@/app/join/actions";
import { formatMoney } from "@/lib/membership";
import {
  initialPaymentActionState,
  type PaymentActionState,
} from "@/lib/payment-action-state";
import { getDaysRemaining } from "@/lib/plan";

type Payment = {
  id: string;
  amountInPaise: number;
  currency: string;
  status: string;
  provider: string;
  linkUrl: string | null;
  createdAt: Date | string;
  plan: { id: string; name: string } | null;
};

type Plan = {
  id: string;
  name: string;
  description: string | null;
  priceInPaise: number;
  currency: string;
  durationDays: number;
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Awaiting payment",
  PARTIALLY_PAID: "Partly paid",
  PAID: "Paid",
  FAILED: "Failed",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
};

function MembershipStatus({
  planExpiresAt,
}: {
  planExpiresAt: Date | string | null;
}) {
  const expiry = planExpiresAt ? new Date(planExpiresAt) : null;
  const daysLeft = getDaysRemaining(expiry);

  if (!expiry || daysLeft === null || daysLeft < 0) {
    return (
      <p className="text-sm text-warn">
        Your membership is not active yet. Pay below to start it.
      </p>
    );
  }

  return (
    <p className="text-sm text-accent">
      Active until {expiry.toLocaleDateString()} ({daysLeft} day
      {daysLeft === 1 ? "" : "s"} left).
    </p>
  );
}

export function MemberPaymentPanel({
  plan,
  planExpiresAt,
  payments,
  pendingPayment,
  pendingQrSvg,
  cashfreeConfigured,
}: {
  plan: Plan | null;
  planExpiresAt: Date | string | null;
  payments: Payment[];
  pendingPayment: Payment | null;
  pendingQrSvg: string | null;
  cashfreeConfigured: boolean;
}) {
  const [payState, payAction, paying] = useActionState<PaymentActionState>(
    () => payMembership(),
    initialPaymentActionState,
  );
  const [refreshState, refreshAction, refreshing] =
    useActionState<PaymentActionState>(
      () => refreshMembershipPayment(),
      initialPaymentActionState,
    );

  const isRenewal = payments.some((payment) => payment.status === "PAID");
  const expiry = planExpiresAt ? new Date(planExpiresAt) : null;
  const daysLeft = getDaysRemaining(expiry);
  const isActive = expiry !== null && daysLeft !== null && daysLeft >= 0;

  return (
    <section className="mt-8 rounded-xl border border-card-border bg-background/40 p-5">
      <h2 className="text-lg font-medium">Membership &amp; payment</h2>

      {plan ? (
        <div className="mt-3">
          <p className="text-2xl font-semibold">
            {formatMoney(plan.priceInPaise, plan.currency)}
            <span className="ml-2 text-sm font-normal text-muted">
              / {plan.durationDays} days
            </span>
          </p>
          <p className="mt-1 text-sm text-muted">
            {plan.name}
            {plan.description ? ` — ${plan.description}` : ""}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">
          The gym team has not assigned you a plan yet. They will set one up at
          the front desk.
        </p>
      )}

      <div className="mt-3">
        <MembershipStatus planExpiresAt={planExpiresAt} />
      </div>

      {!cashfreeConfigured ? (
        <p className="mt-4 text-sm text-warn">
          Online payment is not switched on yet — please pay at the front desk.
        </p>
      ) : pendingPayment?.linkUrl ? (
        <div className="mt-5 space-y-4">
          <p className="text-sm text-muted">
            Your payment of{" "}
            {formatMoney(pendingPayment.amountInPaise, pendingPayment.currency)} is
            waiting. Scan the code with any UPI app, or open the checkout for UPI,
            cards and netbanking.
          </p>
          {pendingQrSvg ? (
            <div
              className="w-44 rounded-xl bg-white p-3 [&>svg]:h-full [&>svg]:w-full"
              dangerouslySetInnerHTML={{ __html: pendingQrSvg }}
            />
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={pendingPayment.linkUrl}
              target="_blank"
              rel="noreferrer"
              className="flex h-11 items-center rounded-full bg-accent px-6 text-sm font-semibold text-accent-ink transition hover:brightness-95"
            >
              Open payment page
            </a>
            <form action={refreshAction}>
              <button
                type="submit"
                disabled={refreshing}
                className="h-11 rounded-full border border-card-border px-5 text-sm disabled:opacity-60"
              >
                {refreshing ? "Checking…" : "I have paid — check status"}
              </button>
            </form>
          </div>
        </div>
      ) : isActive ? null : (
        <form action={payAction} className="mt-5">
          <button
            type="submit"
            disabled={paying || !plan}
            className="h-11 rounded-full bg-accent px-6 text-sm font-semibold text-accent-ink transition hover:brightness-95 disabled:opacity-60"
          >
            {paying
              ? "Opening checkout…"
              : isRenewal
                ? "Renew membership"
                : plan
                  ? `Pay ${formatMoney(plan.priceInPaise, plan.currency)}`
                  : "Pay membership fee"}
          </button>
        </form>
      )}

      {payState.status === "error" ? (
        <p className="mt-3 text-sm text-danger">{payState.message}</p>
      ) : null}
      {refreshState.status === "error" ? (
        <p className="mt-3 text-sm text-danger">{refreshState.message}</p>
      ) : null}

      {payments.length > 0 ? (
        <div className="mt-6">
          <h3 className="text-xs uppercase tracking-wide text-muted">
            Your payments
          </h3>
          <ul className="mt-2 divide-y divide-card-border rounded-lg border border-card-border">
            {payments.map((payment) => (
              <li
                key={payment.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <span>
                  {formatMoney(payment.amountInPaise, payment.currency)} ·{" "}
                  {payment.plan?.name ?? "Membership"}
                </span>
                <span className="text-muted">
                  {new Date(payment.createdAt).toLocaleDateString()} ·{" "}
                  {STATUS_LABELS[payment.status] ?? payment.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
