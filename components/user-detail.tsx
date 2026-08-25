"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PaymentBadge, PlanBadge } from "@/components/status-badges";
import {
  GENDER_LABELS,
  getAge,
  JOIN_SOURCE_LABELS,
  type Gender,
  type JoinSource,
} from "@/lib/member-profile";
import { PAYMENT_STATUSES } from "@/lib/plan";
import { trpc } from "@/lib/trpc";

function toDateInput(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function UserDetail({ userId }: { userId: string }) {
  const query = trpc.users.byId.useQuery(
    { id: userId },
    { refetchInterval: 120_000 },
  );
  const override = trpc.users.overridePlan.useMutation({
    onSuccess: () => query.refetch(),
  });

  const user = query.data;
  const [paymentStatus, setPaymentStatus] = useState("PAID");
  const [planExpiresAt, setPlanExpiresAt] = useState("");
  const [planNotes, setPlanNotes] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");

  useEffect(() => {
    if (!user) return;
    setPaymentStatus(user.paymentStatus);
    setPlanExpiresAt(toDateInput(user.planExpiresAt));
    setPlanNotes(user.planNotes ?? "");
    setWeightKg(user.weightKg?.toString() ?? "");
    setHeightCm(user.heightCm?.toString() ?? "");
  }, [user]);

  if (query.isLoading) {
    return <p className="text-muted">Loading member…</p>;
  }

  if (query.error || !user) {
    return (
      <p className="text-danger">
        {query.error?.message ?? "Member not found."}{" "}
        <Link href="/users" className="underline">
          Back to list
        </Link>
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/users" className="text-sm text-muted hover:text-foreground">
          ← Members
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {user.name ?? "Unnamed member"}
            </h1>
            <p className="text-sm text-muted">{user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <PlanBadge status={user.planStatus} />
            <PaymentBadge status={user.paymentStatus} />
          </div>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-4">
        <Stat
          label="Weight"
          value={user.weightKg != null ? `${user.weightKg} kg` : "—"}
        />
        <Stat
          label="Height"
          value={user.heightCm != null ? `${user.heightCm} cm` : "—"}
        />
        <Stat
          label="Days remaining"
          value={
            user.daysRemaining === null
              ? "No plan"
              : user.daysRemaining >= 0
                ? `${user.daysRemaining} days`
                : `${Math.abs(user.daysRemaining)} overdue`
          }
        />
        <Stat
          label="Attendance / streak"
          value="Not available"
          hint={user.attendance.message}
        />
      </section>

      <section className="rounded-xl border border-card-border bg-card p-5">
        <h2 className="text-lg font-medium">Profile</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          {(
            [
              ["Phone", user.phone],
              [
                "Date of birth",
                user.dateOfBirth
                  ? new Date(user.dateOfBirth).toLocaleDateString()
                  : null,
              ],
              [
                "Age",
                (() => {
                  const age = getAge(
                    user.dateOfBirth ? new Date(user.dateOfBirth) : null,
                  );
                  return age === null ? null : `${age}`;
                })(),
              ],
              [
                "Gender",
                user.gender ? GENDER_LABELS[user.gender as Gender] : null,
              ],
              ["Emergency contact", user.emergencyContact],
              ["Fitness goal", user.fitnessGoal],
              ["Address", user.address],
              [
                "Joined via",
                JOIN_SOURCE_LABELS[user.joinSource as JoinSource] ??
                  user.joinSource,
              ],
              [
                "Profile completed",
                user.profileCompletedAt
                  ? new Date(user.profileCompletedAt).toLocaleDateString()
                  : "Pending",
              ],
            ] as Array<[string, string | null]>
          ).map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs uppercase tracking-wide text-muted">
                {label}
              </dt>
              <dd className="mt-1 text-sm">{value ?? "—"}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-xl border border-card-border bg-card p-5">
        <h2 className="text-lg font-medium">Override plan</h2>
        <p className="mt-1 text-sm text-muted">
          Use this for goodwill extensions or payment corrections. Changes are
          saved immediately.
        </p>
        <form
          className="mt-5 grid gap-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            override.mutate({
              id: user.id,
              paymentStatus: paymentStatus as (typeof PAYMENT_STATUSES)[number],
              planExpiresAt: planExpiresAt ? new Date(`${planExpiresAt}T12:00:00`) : null,
              planNotes,
              weightKg: weightKg ? Number(weightKg) : null,
              heightCm: heightCm ? Number(heightCm) : null,
            });
          }}
        >
          <label className="grid gap-1 text-sm">
            Payment status
            <select
              value={paymentStatus}
              onChange={(event) => setPaymentStatus(event.target.value)}
              className="h-10 rounded-lg border border-card-border bg-background px-3"
            >
              {PAYMENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Plan expiry
            <input
              type="date"
              value={planExpiresAt}
              onChange={(event) => setPlanExpiresAt(event.target.value)}
              className="h-10 rounded-lg border border-card-border bg-background px-3"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Weight (kg)
            <input
              type="number"
              step="0.1"
              value={weightKg}
              onChange={(event) => setWeightKg(event.target.value)}
              className="h-10 rounded-lg border border-card-border bg-background px-3"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Height (cm)
            <input
              type="number"
              step="0.1"
              value={heightCm}
              onChange={(event) => setHeightCm(event.target.value)}
              className="h-10 rounded-lg border border-card-border bg-background px-3"
            />
          </label>
          <label className="grid gap-1 text-sm sm:col-span-2">
            Internal note
            <textarea
              value={planNotes}
              onChange={(event) => setPlanNotes(event.target.value)}
              rows={3}
              className="rounded-lg border border-card-border bg-background px-3 py-2"
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={override.isPending}
              className="h-10 rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink disabled:opacity-60"
            >
              {override.isPending ? "Saving…" : "Save override"}
            </button>
            {override.error ? (
              <p className="mt-2 text-sm text-danger">{override.error.message}</p>
            ) : null}
            {override.isSuccess ? (
              <p className="mt-2 text-sm text-accent">Saved.</p>
            ) : null}
          </div>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-medium">Measurement history</h2>
        <p className="mt-1 text-sm text-muted">
          Current weight and height are stored on the member. Each override also
          appends a history row for later progress analytics.
        </p>
        {user.measurements.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No history yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-card-border rounded-xl border border-card-border bg-card">
            {user.measurements.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <span>{new Date(row.recordedAt).toLocaleString()}</span>
                <span className="text-muted">
                  {row.weightKg ?? "—"} kg · {row.heightCm ?? "—"} cm
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-card-border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 text-xl font-medium">{value}</p>
      {hint ? <p className="mt-2 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
