"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PaymentBadge, PlanBadge } from "@/components/status-badges";
import type { PlanStatus } from "@/lib/plan";
import { trpc } from "@/lib/trpc";

const planFilters: Array<{ value: "all" | PlanStatus; label: string }> = [
  { value: "all", label: "All plans" },
  { value: "active", label: "Active" },
  { value: "expiring_soon", label: "Expiring soon" },
  { value: "expired", label: "Expired" },
];

export function UsersTable() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [planStatus, setPlanStatus] = useState<"all" | PlanStatus>("all");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<"name" | "planExpiresAt" | "createdAt">(
    "name",
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const query = trpc.users.list.useQuery({
    search: search || undefined,
    planStatus,
    page,
    pageSize: 10,
    sortBy,
    sortDir,
  });

  const total = query.data?.total ?? 0;
  const pageSize = query.data?.pageSize ?? 10;
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search name or email"
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
      </div>

      <div className="overflow-hidden rounded-xl border border-card-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-card-border text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">
                <button type="button" onClick={() => toggleSort("name")}>
                  Member {sortBy === "name" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                </button>
              </th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">
                <button type="button" onClick={() => toggleSort("planExpiresAt")}>
                  Expiry{" "}
                  {sortBy === "planExpiresAt" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                </button>
              </th>
              <th className="px-4 py-3">Payment</th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted">
                  Loading members…
                </td>
              </tr>
            ) : query.data?.items.length ? (
              query.data.items.map((user) => (
                <tr
                  key={user.id}
                  className="border-t border-card-border/80 hover:bg-white/5"
                >
                  <td className="px-4 py-3">
                    <Link href={`/users/${user.id}`} className="font-medium hover:text-accent">
                      {user.name ?? "Unnamed"}
                    </Link>
                    <p className="text-xs text-muted">{user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <PlanBadge status={user.planStatus} />
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {user.planExpiresAt
                      ? new Date(user.planExpiresAt).toLocaleDateString()
                      : "—"}
                    {user.daysRemaining !== null ? (
                      <span className="ml-2 text-xs">
                        ({user.daysRemaining >= 0
                          ? `${user.daysRemaining}d left`
                          : `${Math.abs(user.daysRemaining)}d overdue`})
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <PaymentBadge status={user.paymentStatus} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted">
                  No members match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted">
        <p>
          {total} member{total === 1 ? "" : "s"}
        </p>
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
    </div>
  );
}
