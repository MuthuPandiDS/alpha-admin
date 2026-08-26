"use client";

import { useState } from "react";
import { PaymentStatusBadge } from "@/components/payments-table";
import { formatMoney, rupeesToPaise } from "@/lib/membership";
import { trpc } from "@/lib/trpc";

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

export function MemberBilling({
  userId,
  currentPlanId,
  payments,
  onChange,
}: {
  userId: string;
  currentPlanId: string | null;
  payments: Payment[];
  onChange: () => void;
}) {
  const config = trpc.payments.config.useQuery();
  const plans = trpc.plans.forUser.useQuery({ userId });
  const utils = trpc.useUtils();
  const refresh = () => {
    onChange();
    utils.payments.invalidate();
  };

  const assign = trpc.plans.assignToUser.useMutation({ onSuccess: refresh });
  const createLink = trpc.payments.createLink.useMutation({ onSuccess: refresh });
  const recordManual = trpc.payments.recordManual.useMutation({
    onSuccess: () => {
      refresh();
      setManualAmount("");
      setManualNotes("");
    },
  });

  const [manualAmount, setManualAmount] = useState("");
  const [manualNotes, setManualNotes] = useState("");

  const selectedPlan = plans.data?.find((plan) => plan.id === currentPlanId);
  const latestLink = payments.find(
    (payment) => payment.status === "PENDING" && payment.linkUrl,
  );

  return (
    <section className="rounded-xl border border-card-border bg-card p-5">
      <h2 className="text-lg font-medium">Membership plan &amp; payments</h2>
      <p className="mt-1 text-sm text-muted">
        Only plans this member is eligible for are listed. Paying a Cashfree link
        extends the membership by the plan duration automatically.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          Assigned plan
          <select
            value={currentPlanId ?? ""}
            onChange={(event) =>
              assign.mutate({
                userId,
                planId: event.target.value ? event.target.value : null,
              })
            }
            className="h-10 rounded-lg border border-card-border bg-background px-3"
          >
            <option value="">No plan</option>
            {plans.data?.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} · {formatMoney(plan.priceInPaise, plan.currency)} /{" "}
                {plan.durationDays}d{plan.isRestricted ? " (restricted)" : ""}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-1 text-sm">
          Plan price
          <p className="flex h-10 items-center text-base">
            {selectedPlan
              ? `${formatMoney(selectedPlan.priceInPaise, selectedPlan.currency)} for ${selectedPlan.durationDays} days`
              : "—"}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={
            createLink.isPending ||
            !currentPlanId ||
            config.data?.cashfreeConfigured === false
          }
          onClick={() => createLink.mutate({ userId })}
          className="h-10 rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink disabled:opacity-60"
        >
          {createLink.isPending ? "Creating link…" : "Create Cashfree payment link"}
        </button>
        {latestLink?.linkUrl ? (
          <a
            href={latestLink.linkUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-accent underline-offset-4 hover:underline"
          >
            Open pending link
          </a>
        ) : null}
      </div>
      {config.data && !config.data.cashfreeConfigured ? (
        <p className="mt-2 text-sm text-warn">
          Add CASHFREE_APP_ID and CASHFREE_SECRET_KEY to enable gateway collection.
        </p>
      ) : null}
      {assign.error || createLink.error ? (
        <p className="mt-2 text-sm text-danger">
          {assign.error?.message ?? createLink.error?.message}
        </p>
      ) : null}

      <form
        className="mt-6 grid gap-4 border-t border-card-border pt-5 sm:grid-cols-[10rem_minmax(0,1fr)_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          recordManual.mutate({
            userId,
            amountInPaise: rupeesToPaise(Number(manualAmount || 0)),
            notes: manualNotes || undefined,
          });
        }}
      >
        <label className="grid gap-1 text-sm">
          Cash / UPI amount (₹)
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={manualAmount}
            onChange={(event) => setManualAmount(event.target.value)}
            className="h-10 rounded-lg border border-card-border bg-background px-3"
          />
        </label>
        <label className="grid gap-1 text-sm">
          Note
          <input
            value={manualNotes}
            onChange={(event) => setManualNotes(event.target.value)}
            placeholder="Paid at the counter"
            className="h-10 rounded-lg border border-card-border bg-background px-3"
          />
        </label>
        <button
          type="submit"
          disabled={recordManual.isPending}
          className="h-10 self-end rounded-full border border-card-border px-4 text-sm disabled:opacity-60"
        >
          Record offline payment
        </button>
      </form>
      {recordManual.error ? (
        <p className="mt-2 text-sm text-danger">{recordManual.error.message}</p>
      ) : null}

      <h3 className="mt-6 text-sm font-medium uppercase tracking-wide text-muted">
        Recent payments
      </h3>
      {payments.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No payments recorded yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-card-border rounded-lg border border-card-border">
          {payments.map((payment) => (
            <li
              key={payment.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
            >
              <span>
                {formatMoney(payment.amountInPaise, payment.currency)} ·{" "}
                {payment.plan?.name ?? "No plan"}
              </span>
              <span className="flex items-center gap-3 text-muted">
                {new Date(payment.createdAt).toLocaleDateString()}
                <PaymentStatusBadge status={payment.status} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
