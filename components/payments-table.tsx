"use client";

import Link from "next/link";
import { useState } from "react";
import { formatMoney, PAYMENT_RECORD_STATUSES } from "@/lib/membership";
import { trpc } from "@/lib/trpc";

const statusTone: Record<string, string> = {
  PAID: "bg-accent/15 text-accent",
  PENDING: "bg-white/10 text-muted",
  PARTIALLY_PAID: "bg-warn/15 text-warn",
  FAILED: "bg-danger/15 text-danger",
  EXPIRED: "bg-danger/15 text-danger",
  CANCELLED: "bg-white/10 text-muted",
};

export function PaymentStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
        statusTone[status] ?? "bg-white/10 text-muted"
      }`}
    >
      {status.toLowerCase().replace("_", " ")}
    </span>
  );
}

export function PaymentsTable() {
  const [status, setStatus] = useState<"all" | (typeof PAYMENT_RECORD_STATUSES)[number]>(
    "all",
  );
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const config = trpc.payments.config.useQuery();
  const payments = trpc.payments.list.useQuery({ status, page, pageSize });
  const utils = trpc.useUtils();
  const refresh = trpc.payments.refresh.useMutation({
    onSuccess: () => utils.payments.invalidate(),
  });
  const cancel = trpc.payments.cancel.useMutation({
    onSuccess: () => utils.payments.invalidate(),
  });

  const totalPages = payments.data
    ? Math.max(1, Math.ceil(payments.data.total / pageSize))
    : 1;

  return (
    <div className="space-y-4">
      {config.data && !config.data.cashfreeConfigured ? (
        <p className="rounded-lg border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
          Cashfree keys are missing. Set CASHFREE_APP_ID and CASHFREE_SECRET_KEY to
          raise payment links; manual payments still work.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-muted">
          Status
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as typeof status);
              setPage(1);
            }}
            className="h-9 rounded-lg border border-card-border bg-card px-3 text-foreground"
          >
            <option value="all">All</option>
            {PAYMENT_RECORD_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value.toLowerCase().replace("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <p className="text-sm text-muted">
          Collected:{" "}
          <span className="text-foreground">
            {formatMoney(payments.data?.collectedInPaise ?? 0)}
          </span>{" "}
          · {payments.data?.total ?? 0} payment(s)
          {config.data ? ` · ${config.data.environment}` : ""}
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-card-border bg-card">
        <table className="w-full min-w-[52rem] text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted">
            <tr className="border-b border-card-border">
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-card-border">
            {payments.data?.items.map((payment) => (
              <tr key={payment.id}>
                <td className="px-4 py-3">
                  <Link href={`/users/${payment.userId}`} className="hover:underline">
                    {payment.user.name ?? "Unnamed"}
                  </Link>
                  <p className="text-xs text-muted">{payment.user.email}</p>
                </td>
                <td className="px-4 py-3">{payment.plan?.name ?? "—"}</td>
                <td className="px-4 py-3">
                  {formatMoney(payment.amountInPaise, payment.currency)}
                  {payment.provider === "MANUAL" ? (
                    <span className="ml-2 text-xs text-muted">manual</span>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <PaymentStatusBadge status={payment.status} />
                </td>
                <td className="px-4 py-3 text-muted">
                  {new Date(payment.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-3">
                    {payment.linkUrl ? (
                      <a
                        href={payment.linkUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted hover:text-foreground"
                      >
                        Link
                      </a>
                    ) : null}
                    {payment.provider === "CASHFREE" && payment.status !== "PAID" ? (
                      <button
                        type="button"
                        onClick={() => refresh.mutate({ id: payment.id })}
                        className="text-muted hover:text-foreground"
                      >
                        Refresh
                      </button>
                    ) : null}
                    {payment.status === "PENDING" ? (
                      <button
                        type="button"
                        onClick={() => cancel.mutate({ id: payment.id })}
                        className="text-danger"
                      >
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {payments.data?.items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  No payments yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {refresh.error || cancel.error ? (
        <p className="text-sm text-danger">
          {refresh.error?.message ?? cancel.error?.message}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-3 text-sm">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((current) => current - 1)}
          className="h-9 rounded-full border border-card-border px-4 disabled:opacity-40"
        >
          Previous
        </button>
        <span className="text-muted">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => setPage((current) => current + 1)}
          className="h-9 rounded-full border border-card-border px-4 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
