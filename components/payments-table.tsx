"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatMoney, PAYMENT_RECORD_STATUSES } from "@/lib/membership";
import { trpc } from "@/lib/trpc";
import {
  DropdownSelect,
  SearchInput,
  Button,
  Spinner,
  Checkbox,
  Popover,
} from "@/components/ui-primitives";

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
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | (typeof PAYMENT_RECORD_STATUSES)[number]>("all");
  const [provider, setProvider] = useState<"all" | "CASHFREE" | "MANUAL">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState<"createdAt" | "amountInPaise" | "status">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({
    member: true,
    plan: true,
    amount: true,
    status: true,
    provider: true,
    reference: false,
    created: true,
    actions: true,
  });
  const [rowSelection, setRowSelection] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const config = trpc.payments.config.useQuery();
  const payments = trpc.payments.list.useQuery({
    search: search || undefined,
    status,
    provider,
    page,
    pageSize,
    sortBy,
    sortDir,
  });
  const utils = trpc.useUtils();
  const refresh = trpc.payments.refresh.useMutation({
    onSuccess: () => utils.payments.list.invalidate(),
  });
  const cancel = trpc.payments.cancel.useMutation({
    onSuccess: () => utils.payments.list.invalidate(),
  });

  const totalPages = payments.data
    ? Math.max(1, Math.ceil(payments.data.total / pageSize))
    : 1;

  function toggleSort(column: typeof sortBy) {
    if (sortBy === column) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir(column === "createdAt" ? "desc" : "asc");
    }
    setPage(1);
  }

  function sortIndicator(column: typeof sortBy) {
    if (sortBy !== column) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
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
    if (payments.data?.items.length === rowSelection.size && rowSelection.size > 0) {
      setRowSelection(new Set());
    } else {
      setRowSelection(new Set(payments.data?.items.map((i) => i.id) || []));
    }
  }

  async function handleExport() {
    try {
      const data = await utils.payments.exportList.fetch({
        search: search || undefined,
        status,
        provider,
        sortBy,
        sortDir,
      });

      if (data.length === 0) return;

      const headers = ["Member", "Email", "Plan", "Amount", "Status", "Provider", "Reference", "Created At"];
      
      const rows = data.map((p) => [
        `"${(p.user.name || "").replace(/"/g, '""')}"`,
        `"${(p.user.email || "").replace(/"/g, '""')}"`,
        `"${(p.plan?.name || "").replace(/"/g, '""')}"`,
        formatMoney(p.amountInPaise, p.currency).replace(/,/g, ''),
        p.status,
        p.provider,
        p.cashfreeOrderId || p.cashfreeLinkId || "",
        new Date(p.createdAt).toLocaleString(),
      ]);

      const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `payments_export_${new Date().getTime()}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Failed to export", e);
    }
  }

  const allSelected = 
    (payments.data?.items.length ?? 0) > 0 && 
    rowSelection.size === payments.data?.items.length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {config.data && !config.data.cashfreeConfigured ? (
        <p className="rounded-lg border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
          Cashfree keys are missing. Set CASHFREE_APP_ID and CASHFREE_SECRET_KEY to
          raise payment links; manual payments still work.
        </p>
      ) : null}

      <div className="flex shrink-0 flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search member name or email"
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
                <label className="text-xs font-medium text-muted">Status</label>
                <DropdownSelect
                  value={status}
                  options={[{ value: "all", label: "All statuses" }, ...PAYMENT_RECORD_STATUSES.map((s) => ({ value: s, label: s.toLowerCase().replace("_", " ") }))]}
                  onChange={(v) => { setStatus(v as "all" | typeof status); setPage(1); }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted">Provider</label>
                <DropdownSelect
                  value={provider}
                  options={[
                    { value: "all", label: "All providers" },
                    { value: "CASHFREE", label: "Cashfree" },
                    { value: "MANUAL", label: "Manual" }
                  ]}
                  onChange={(v) => { setProvider(v as "all" | "CASHFREE" | "MANUAL"); setPage(1); }}
                />
              </div>
            </div>
          </Popover>
        </div>

        <div className="flex items-center gap-2">
          <p className="mr-2 text-xs text-muted">
            <span className="font-medium text-foreground">{formatMoney(payments.data?.collectedInPaise ?? 0)}</span> collected
          </p>

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
        </div>
      </div>

      <div className="table-scroll-container min-h-0 flex-1 overflow-auto rounded-xl border border-card-border bg-card">
        <table className="w-full min-w-[52rem] text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-card-border bg-card text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="w-10 px-4 py-3">
                <Checkbox checked={allSelected} onChange={toggleAllRows} />
              </th>
              {columnVisibility.member && <th className="px-4 py-3">Member</th>}
              {columnVisibility.plan && <th className="px-4 py-3">Plan</th>}
              {columnVisibility.amount && (
                <th className="px-4 py-3">
                  <button type="button" onClick={() => toggleSort("amountInPaise")}>
                    Amount{sortIndicator("amountInPaise")}
                  </button>
                </th>
              )}
              {columnVisibility.status && (
                <th className="px-4 py-3">
                  <button type="button" onClick={() => toggleSort("status")}>
                    Status{sortIndicator("status")}
                  </button>
                </th>
              )}
              {columnVisibility.provider && <th className="px-4 py-3">Provider</th>}
              {columnVisibility.reference && <th className="px-4 py-3">Reference</th>}
              {columnVisibility.created && (
                <th className="px-4 py-3">
                  <button type="button" onClick={() => toggleSort("createdAt")}>
                    Created{sortIndicator("createdAt")}
                  </button>
                </th>
              )}
              {columnVisibility.actions && <th className="px-4 py-3">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-card-border">
            {payments.isLoading ? (
              <tr>
                <td colSpan={10} className="h-[40vh] text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <Spinner className="h-6 w-6 text-accent" />
                  </div>
                </td>
              </tr>
            ) : payments.data?.items.length ? (
              payments.data.items.map((payment) => (
                <tr key={payment.id} className="hover:bg-white/5">
                  <td className="w-10 px-4 py-3">
                    <Checkbox 
                      checked={rowSelection.has(payment.id)} 
                      onChange={() => toggleRow(payment.id)} 
                    />
                  </td>
                  {columnVisibility.member && (
                    <td className="px-4 py-3">
                      <Link href={`/users/${payment.userId}`} className="font-medium hover:text-accent">
                        {payment.user.name ?? "Unnamed"}
                      </Link>
                      <p className="text-xs text-muted">{payment.user.email}</p>
                    </td>
                  )}
                  {columnVisibility.plan && (
                    <td className="px-4 py-3 text-muted">{payment.plan?.name ?? "—"}</td>
                  )}
                  {columnVisibility.amount && (
                    <td className="px-4 py-3 font-medium">
                      {formatMoney(payment.amountInPaise, payment.currency)}
                    </td>
                  )}
                  {columnVisibility.status && (
                    <td className="px-4 py-3">
                      <PaymentStatusBadge status={payment.status} />
                    </td>
                  )}
                  {columnVisibility.provider && (
                    <td className="px-4 py-3 text-muted">
                      {payment.provider}
                    </td>
                  )}
                  {columnVisibility.reference && (
                    <td className="px-4 py-3 text-xs text-muted font-mono">
                      {payment.cashfreeOrderId || payment.cashfreeLinkId || "—"}
                    </td>
                  )}
                  {columnVisibility.created && (
                    <td className="px-4 py-3 text-muted">
                      {new Date(payment.createdAt).toLocaleString()}
                    </td>
                  )}
                  {columnVisibility.actions && (
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {payment.linkUrl ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(payment.linkUrl!, "_blank")}
                          >
                            Link
                          </Button>
                        ) : null}
                        {payment.provider === "CASHFREE" && payment.status !== "PAID" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refresh.mutate({ id: payment.id })}
                            disabled={refresh.isPending}
                          >
                            Refresh
                          </Button>
                        ) : null}
                        {payment.status === "PENDING" ? (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => cancel.mutate({ id: payment.id })}
                            disabled={cancel.isPending}
                          >
                            Cancel
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-muted">
                  No payments found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {refresh.error || cancel.error ? (
        <p className="text-sm text-danger">
          {refresh.error?.message ?? cancel.error?.message}
        </p>
      ) : null}

      <div className="flex shrink-0 flex-col gap-3 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <p>
            {rowSelection.size > 0 ? `${rowSelection.size} of ${payments.data?.total || 0} selected` : `${payments.data?.total || 0} payment(s)`}
          </p>
          <DropdownSelect
            value={pageSize.toString()}
            options={[10, 20, 50, 100].map((size) => ({
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
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
