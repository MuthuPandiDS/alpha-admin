"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  MemberFormDialog,
  toFormValues,
  type MemberFormValues,
} from "@/components/member-form-dialog";
import { PaymentBadge, PlanBadge } from "@/components/status-badges";
import {
  GENDER_LABELS,
  getAge,
  JOIN_SOURCES,
  JOIN_SOURCE_LABELS,
  type Gender,
  type JoinSource,
} from "@/lib/member-profile";
import { PAYMENT_STATUSES, type PaymentStatus, type PlanStatus } from "@/lib/plan";
import { trpc } from "@/lib/trpc";

const planFilters: Array<{ value: "all" | PlanStatus; label: string }> = [
  { value: "all", label: "All plans" },
  { value: "active", label: "Active" },
  { value: "expiring_soon", label: "Expiring soon" },
  { value: "expired", label: "Expired" },
];

const pageSizes = [10, 25, 50];

const columnClass = "whitespace-nowrap px-4 py-3";

function formatDate(value: Date | string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

export function UsersTable() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [planStatus, setPlanStatus] = useState<"all" | PlanStatus>("all");
  const [paymentStatus, setPaymentStatus] = useState<"all" | PaymentStatus>(
    "all",
  );
  const [joinSource, setJoinSource] = useState<"all" | JoinSource>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<"name" | "planExpiresAt" | "createdAt">(
    "name",
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [dialogValues, setDialogValues] = useState<MemberFormValues | null>(
    null,
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const utils = trpc.useUtils();
  const query = trpc.users.list.useQuery({
    search: search || undefined,
    planStatus,
    paymentStatus,
    joinSource,
    page,
    pageSize,
    sortBy,
    sortDir,
  });
  const deleteMember = trpc.users.delete.useMutation();

  const total = query.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  function toggleSort(column: typeof sortBy) {
    if (sortBy === column) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir(column === "name" ? "asc" : "desc");
    }
    setPage(1);
  }

  function sortIndicator(column: typeof sortBy) {
    if (sortBy !== column) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  async function handleDelete(id: string, name: string | null) {
    if (
      !window.confirm(
        `Delete ${name ?? "this member"}? This removes their profile and history.`,
      )
    ) {
      return;
    }
    setActionError(null);
    try {
      await deleteMember.mutateAsync({ id });
      await utils.users.list.invalidate();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Could not delete this member.",
      );
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search name, email or phone"
          className="h-10 flex-1 rounded-lg border border-card-border bg-background px-3 text-sm outline-none focus:border-accent"
        />
        <select
          value={planStatus}
          onChange={(event) => {
            setPlanStatus(event.target.value as "all" | PlanStatus);
            setPage(1);
          }}
          className="h-10 rounded-lg border border-card-border bg-background px-3 text-sm"
        >
          {planFilters.map((filter) => (
            <option key={filter.value} value={filter.value}>
              {filter.label}
            </option>
          ))}
        </select>
        <select
          value={paymentStatus}
          onChange={(event) => {
            setPaymentStatus(event.target.value as "all" | PaymentStatus);
            setPage(1);
          }}
          className="h-10 rounded-lg border border-card-border bg-background px-3 text-sm"
        >
          <option value="all">All payments</option>
          {PAYMENT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <select
          value={joinSource}
          onChange={(event) => {
            setJoinSource(event.target.value as "all" | JoinSource);
            setPage(1);
          }}
          className="h-10 rounded-lg border border-card-border bg-background px-3 text-sm"
        >
          <option value="all">All sources</option>
          {JOIN_SOURCES.map((source) => (
            <option key={source} value={source}>
              {JOIN_SOURCE_LABELS[source]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            setDialogValues(null);
            setDialogOpen(true);
          }}
          className="h-10 rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink transition hover:brightness-95"
        >
          Add member
        </button>
      </div>

      {actionError ? (
        <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {actionError}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-card-border bg-card">
        <table className="w-full min-w-[1200px] text-left text-sm">
          <thead className="border-b border-card-border text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className={columnClass}>
                <button type="button" onClick={() => toggleSort("name")}>
                  Member{sortIndicator("name")}
                </button>
              </th>
              <th className={columnClass}>Phone</th>
              <th className={columnClass}>Date of birth</th>
              <th className={columnClass}>Age</th>
              <th className={columnClass}>Gender</th>
              <th className={columnClass}>Height</th>
              <th className={columnClass}>Weight</th>
              <th className={columnClass}>Membership</th>
              <th className={columnClass}>Plan</th>
              <th className={columnClass}>
                <button type="button" onClick={() => toggleSort("planExpiresAt")}>
                  Expiry{sortIndicator("planExpiresAt")}
                </button>
              </th>
              <th className={columnClass}>Payment</th>
              <th className={columnClass}>Source</th>
              <th className={columnClass}>
                <button type="button" onClick={() => toggleSort("createdAt")}>
                  Joined{sortIndicator("createdAt")}
                </button>
              </th>
              <th className={columnClass}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading ? (
              <tr>
                <td colSpan={14} className="px-4 py-10 text-center text-muted">
                  Loading members…
                </td>
              </tr>
            ) : query.data?.items.length ? (
              query.data.items.map((user) => {
                const age = getAge(
                  user.dateOfBirth ? new Date(user.dateOfBirth) : null,
                );
                return (
                  <tr
                    key={user.id}
                    className="border-t border-card-border/80 hover:bg-white/5"
                  >
                    <td className={columnClass}>
                      <Link
                        href={`/users/${user.id}`}
                        className="font-medium hover:text-accent"
                      >
                        {user.name ?? "Unnamed"}
                      </Link>
                      <p className="text-xs text-muted">{user.email}</p>
                    </td>
                    <td className={`${columnClass} text-muted`}>
                      {user.phone ?? "—"}
                    </td>
                    <td className={`${columnClass} text-muted`}>
                      {formatDate(user.dateOfBirth)}
                    </td>
                    <td className={`${columnClass} text-muted`}>
                      {age ?? "—"}
                    </td>
                    <td className={`${columnClass} text-muted`}>
                      {user.gender
                        ? GENDER_LABELS[user.gender as Gender]
                        : "—"}
                    </td>
                    <td className={`${columnClass} text-muted`}>
                      {user.heightCm ? `${user.heightCm} cm` : "—"}
                    </td>
                    <td className={`${columnClass} text-muted`}>
                      {user.weightKg ? `${user.weightKg} kg` : "—"}
                    </td>
                    <td className={`${columnClass} text-muted`}>
                      {user.plan?.name ?? "—"}
                    </td>
                    <td className={columnClass}>
                      <PlanBadge status={user.planStatus} />
                    </td>
                    <td className={`${columnClass} text-muted`}>
                      {formatDate(user.planExpiresAt)}
                      {user.daysRemaining !== null ? (
                        <span className="ml-2 text-xs">
                          (
                          {user.daysRemaining >= 0
                            ? `${user.daysRemaining}d left`
                            : `${Math.abs(user.daysRemaining)}d overdue`}
                          )
                        </span>
                      ) : null}
                    </td>
                    <td className={columnClass}>
                      <PaymentBadge status={user.paymentStatus} />
                    </td>
                    <td className={`${columnClass} text-muted`}>
                      {JOIN_SOURCE_LABELS[user.joinSource as JoinSource] ??
                        user.joinSource}
                    </td>
                    <td className={`${columnClass} text-muted`}>
                      {formatDate(user.createdAt)}
                    </td>
                    <td className={columnClass}>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setDialogValues(toFormValues(user));
                            setDialogOpen(true);
                          }}
                          className="rounded-lg border border-card-border px-3 py-1 text-xs hover:border-accent hover:text-accent"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(user.id, user.name)}
                          className="rounded-lg border border-danger/40 px-3 py-1 text-xs text-danger hover:bg-danger/10"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={14} className="px-4 py-10 text-center text-muted">
                  No members match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <p>
            {total} member{total === 1 ? "" : "s"}
          </p>
          <select
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(1);
            }}
            className="h-8 rounded-lg border border-card-border bg-background px-2 text-xs"
          >
            {pageSizes.map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((value) => value - 1)}
            className="rounded-lg border border-card-border px-3 py-1 disabled:opacity-40"
          >
            Previous
          </button>
          <span>
            {page} / {pageCount}
          </span>
          <button
            type="button"
            disabled={page >= pageCount}
            onClick={() => setPage((value) => value + 1)}
            className="rounded-lg border border-card-border px-3 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      {dialogOpen ? (
        <MemberFormDialog
          initialValues={dialogValues ?? undefined}
          onClose={() => setDialogOpen(false)}
          onSaved={async () => {
            setDialogOpen(false);
            await utils.users.list.invalidate();
          }}
        />
      ) : null}
    </div>
  );
}
