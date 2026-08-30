"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MemberAvatar } from "@/components/member-avatar";
import {
  DropdownSelect,
  SearchInput,
  Button,
  Spinner,
  Checkbox,
  Popover,
} from "@/components/ui-primitives";
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
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  type Gender,
  type JoinSource,
  type LeadStatus,
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
  const [leadStatus, setLeadStatus] = useState<"all" | "NONE" | LeadStatus>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<"name" | "planExpiresAt" | "createdAt" | "leadFollowUpAt">(
    "name",
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  
  // Advanced features state
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({
    phone: true,
    dob: true,
    age: true,
    gender: true,
    height: true,
    weight: true,
    plan: true,
    planStatus: true,
    expiry: true,
    payment: true,
    leadStatus: true,
    followUp: true,
    source: true,
    joined: true,
    actions: true,
  });
  const [rowSelection, setRowSelection] = useState<Set<string>>(new Set());

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
    leadStatus,
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

  function toggleColumn(key: string) {
    setColumnVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleRow(id: string) {
    const next = new Set(rowSelection);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setRowSelection(next);
  }

  function toggleAllRows() {
    if (query.data?.items.length === rowSelection.size && rowSelection.size > 0) {
      setRowSelection(new Set());
    } else {
      setRowSelection(new Set(query.data?.items.map((i) => i.id) || []));
    }
  }

  async function handleExport() {
    try {
      const data = await utils.users.exportList.fetch({
        search: search || undefined,
        planStatus,
        paymentStatus,
        joinSource,
        leadStatus,
        sortBy,
        sortDir,
      });

      if (data.length === 0) return;

      const headers = [
        "Name", "Email", "Phone", "Date of Birth", "Gender", "Height (cm)", "Weight (kg)", 
        "Plan", "Plan Status", "Plan Expires", "Payment Status", "Lead Status", "Follow Up", "Source", "Joined At"
      ];
      
      const rows = data.map((u) => [
        `"${(u.name || "").replace(/"/g, '""')}"`,
        `"${(u.email || "").replace(/"/g, '""')}"`,
        `"${(u.phone || "").replace(/"/g, '""')}"`,
        u.dateOfBirth ? new Date(u.dateOfBirth).toLocaleDateString() : "",
        u.gender ? GENDER_LABELS[u.gender as Gender] : "",
        u.heightCm || "",
        u.weightKg || "",
        `"${(u.plan?.name || "").replace(/"/g, '""')}"`,
        u.planStatus,
        u.planExpiresAt ? new Date(u.planExpiresAt).toLocaleDateString() : "",
        u.paymentStatus,
        u.leadStatus ? LEAD_STATUS_LABELS[u.leadStatus as LeadStatus] : "",
        u.leadFollowUpAt ? new Date(u.leadFollowUpAt).toLocaleDateString() : "",
        u.joinSource,
        u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "",
      ]);

      const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `members_export_${new Date().getTime()}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to export");
    }
  }

  const allSelected = 
    (query.data?.items.length ?? 0) > 0 && 
    rowSelection.size === query.data?.items.length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search name, email or phone"
            className="w-full max-w-sm"
          />
          <Popover
            trigger={
              <Button variant="outline" className="h-8 border-dashed">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                Filters
              </Button>
            }
          >
            <div className="flex flex-col gap-3 p-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted">Plan Status</label>
                <DropdownSelect
                  value={planStatus}
                  options={planFilters.map((f) => ({ value: f.value, label: f.label }))}
                  onChange={(v) => { setPlanStatus(v as "all" | PlanStatus); setPage(1); }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted">Payment</label>
                <DropdownSelect
                  value={paymentStatus}
                  options={[{ value: "all", label: "All payments" }, ...PAYMENT_STATUSES.map((s) => ({ value: s, label: s }))]}
                  onChange={(v) => { setPaymentStatus(v as "all" | PaymentStatus); setPage(1); }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted">Join Source</label>
                <DropdownSelect
                  value={joinSource}
                  options={[{ value: "all", label: "All sources" }, ...JOIN_SOURCES.map((s) => ({ value: s, label: JOIN_SOURCE_LABELS[s] }))]}
                  onChange={(v) => { setJoinSource(v as "all" | JoinSource); setPage(1); }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted">Lead Status</label>
                <DropdownSelect
                  value={leadStatus}
                  options={[{ value: "all", label: "All leads & members" }, { value: "NONE", label: "Active members only" }, ...LEAD_STATUSES.map((s) => ({ value: s, label: LEAD_STATUS_LABELS[s] }))]}
                  onChange={(v) => { setLeadStatus(v as "all" | "NONE" | LeadStatus); setPage(1); }}
                />
              </div>
            </div>
          </Popover>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} className="h-8">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            Export
          </Button>

          <Popover
            placement="bottom-end"
            trigger={
              <Button variant="outline" className="h-8">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>
                View
              </Button>
            }
          >
            <div className="flex flex-col p-1.5 text-xs text-foreground/80">
              <span className="mb-2 px-2 text-muted font-medium">Toggle Columns</span>
              {Object.keys(columnVisibility).map((key) => (
                <label key={key} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/5">
                  <Checkbox 
                    checked={columnVisibility[key]} 
                    onChange={() => toggleColumn(key)}
                  />
                  <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                </label>
              ))}
            </div>
          </Popover>

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
              <th className="w-10 px-4 py-3">
                <Checkbox checked={allSelected} onChange={toggleAllRows} />
              </th>
              <th className={columnClass}>
                <button type="button" onClick={() => toggleSort("name")}>
                  Member{sortIndicator("name")}
                </button>
              </th>
              {columnVisibility.phone && <th className={columnClass}>Phone</th>}
              {columnVisibility.dob && <th className={columnClass}>Date of birth</th>}
              {columnVisibility.age && <th className={columnClass}>Age</th>}
              {columnVisibility.gender && <th className={columnClass}>Gender</th>}
              {columnVisibility.height && <th className={columnClass}>Height</th>}
              {columnVisibility.weight && <th className={columnClass}>Weight</th>}
              {columnVisibility.plan && <th className={columnClass}>Membership</th>}
              {columnVisibility.planStatus && <th className={columnClass}>Plan Status</th>}
              {columnVisibility.expiry && (
                <th className={columnClass}>
                  <button type="button" onClick={() => toggleSort("planExpiresAt")}>
                    Expiry{sortIndicator("planExpiresAt")}
                  </button>
                </th>
              )}
              {columnVisibility.payment && <th className={columnClass}>Payment</th>}
              {columnVisibility.leadStatus && <th className={columnClass}>Lead Status</th>}
              {columnVisibility.followUp && (
                <th className={columnClass}>
                  <button type="button" onClick={() => toggleSort("leadFollowUpAt")}>
                    Follow-up{sortIndicator("leadFollowUpAt")}
                  </button>
                </th>
              )}
              {columnVisibility.source && <th className={columnClass}>Source</th>}
              {columnVisibility.joined && (
                <th className={columnClass}>
                  <button type="button" onClick={() => toggleSort("createdAt")}>
                    Joined{sortIndicator("createdAt")}
                  </button>
                </th>
              )}
              {columnVisibility.actions && <th className={columnClass}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {query.isLoading ? (
              <tr>
                <td colSpan={14} className="h-[60vh] text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <Spinner className="h-6 w-6 text-accent" />
                  </div>
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
                    <td className="w-10 px-4 py-3">
                      <Checkbox 
                        checked={rowSelection.has(user.id)} 
                        onChange={() => toggleRow(user.id)} 
                      />
                    </td>
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
                    {columnVisibility.phone && (
                      <td className={`${columnClass} text-muted`}>
                        {user.phone ?? "—"}
                      </td>
                    )}
                    {columnVisibility.dob && (
                      <td className={`${columnClass} text-muted`}>
                        {formatDate(user.dateOfBirth)}
                      </td>
                    )}
                    {columnVisibility.age && (
                      <td className={`${columnClass} text-muted`}>
                        {age ?? "—"}
                      </td>
                    )}
                    {columnVisibility.gender && (
                      <td className={`${columnClass} text-muted`}>
                        {user.gender
                          ? GENDER_LABELS[user.gender as Gender]
                          : "—"}
                      </td>
                    )}
                    {columnVisibility.height && (
                      <td className={`${columnClass} text-muted`}>
                        {user.heightCm ? `${user.heightCm} cm` : "—"}
                      </td>
                    )}
                    {columnVisibility.weight && (
                      <td className={`${columnClass} text-muted`}>
                        {user.weightKg ? `${user.weightKg} kg` : "—"}
                      </td>
                    )}
                    {columnVisibility.plan && (
                      <td className={`${columnClass} text-muted`}>
                        {user.plan?.name ?? "—"}
                      </td>
                    )}
                    {columnVisibility.planStatus && (
                      <td className={columnClass}>
                        <PlanBadge status={user.planStatus} />
                      </td>
                    )}
                    {columnVisibility.expiry && (
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
                    )}
                    {columnVisibility.payment && (
                      <td className={columnClass}>
                        <PaymentBadge status={user.paymentStatus} />
                      </td>
                    )}
                    {columnVisibility.leadStatus && (
                      <td className={columnClass}>
                        {user.leadStatus ? (
                          <span className="inline-flex rounded-full bg-accent/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-accent border border-accent/20">
                            {LEAD_STATUS_LABELS[user.leadStatus as LeadStatus]}
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                    )}
                    {columnVisibility.followUp && (
                      <td className={`${columnClass} text-muted`}>
                        {formatDate(user.leadFollowUpAt)}
                      </td>
                    )}
                    {columnVisibility.source && (
                      <td className={`${columnClass} text-muted`}>
                        {JOIN_SOURCE_LABELS[user.joinSource as JoinSource] ??
                          user.joinSource}
                      </td>
                    )}
                    {columnVisibility.joined && (
                      <td className={`${columnClass} text-muted`}>
                        {formatDate(user.createdAt)}
                      </td>
                    )}
                    {columnVisibility.actions && (
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
                    )}
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
            {rowSelection.size > 0 ? `${rowSelection.size} of ${total} selected` : `${total} member${total === 1 ? "" : "s"}`}
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
