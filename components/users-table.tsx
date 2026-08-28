"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MemberAvatar } from "@/components/member-avatar";
import { DropdownSelect, SearchInput, Button } from "@/components/ui-primitives";
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
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 flex-col gap-2 lg:flex-row lg:items-center">
        <SearchInput
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Search name, email or phone"
          className="flex-1"
        />
        <div className="flex items-center gap-2">
          <DropdownSelect
            value={planStatus}
            options={planFilters.map((f) => ({ value: f.value, label: f.label }))}
            onChange={(v) => {
              setPlanStatus(v as "all" | PlanStatus);
              setPage(1);
            }}
          />
          <DropdownSelect
            value={paymentStatus}
            options={[
              { value: "all", label: "All payments" },
              ...PAYMENT_STATUSES.map((s) => ({ value: s, label: s })),
            ]}
            onChange={(v) => {
              setPaymentStatus(v as "all" | PaymentStatus);
              setPage(1);
            }}
          />
          <DropdownSelect
            value={joinSource}
            options={[
              { value: "all", label: "All sources" },
              ...JOIN_SOURCES.map((s) => ({ value: s, label: JOIN_SOURCE_LABELS[s] })),
            ]}
            onChange={(v) => {
              setJoinSource(v as "all" | JoinSource);
              setPage(1);
            }}
          />
          <Button
            onClick={() => {
              setDialogValues(null);
              setDialogOpen(true);
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Add member
          </Button>
        </div>
      </div>

      {actionError ? (
        <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {actionError}
        </p>
      ) : null}

      <div className="table-scroll-container min-h-0 flex-1 overflow-auto rounded-xl border border-card-border bg-card">
        <table className="w-full min-w-[1200px] text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-card-border bg-card text-xs uppercase tracking-wide text-muted">
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
                      <div className="flex items-center gap-3">
                        <MemberAvatar src={user.image} name={user.name} />
                        <div className="min-w-0">
                          <Link
                            href={`/users/${user.id}`}
                            className="font-medium hover:text-accent"
                          >
                            {user.name ?? "Unnamed"}
                          </Link>
                          <p className="text-xs text-muted">{user.email}</p>
                        </div>
                      </div>
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDialogValues(toFormValues(user));
                            setDialogOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(user.id, user.name)}
                        >
                          Delete
                        </Button>
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

      <div className="flex shrink-0 flex-col gap-3 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <p>
            {total} member{total === 1 ? "" : "s"}
          </p>
          <DropdownSelect
            value={pageSize.toString()}
            options={pageSizes.map((size) => ({
              value: size.toString(),
              label: `${size} / page`,
            }))}
            onChange={(v) => {
              setPageSize(Number(v));
              setPage(1);
            }}
            placement="top"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((value) => value - 1)}
          >
            Previous
          </Button>
          <span className="min-w-[40px] text-center">
            {page} / {pageCount}
          </span>
          <Button
            variant="outline"
            disabled={page >= pageCount}
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </Button>
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
