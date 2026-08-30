"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatMoney, paiseToRupees, rupeesToPaise } from "@/lib/membership";
import { trpc } from "@/lib/trpc";
import { Button, DropdownSelect, Spinner } from "@/components/ui-primitives";

/* ─── Constants ──────────────────────────────────────────── */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const FREQUENCIES = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "YEARLY", label: "Yearly" },
  { value: "WEEKLY", label: "Weekly" },
];

const PAYMENT_METHODS = [
  { value: "", label: "Not specified" },
  { value: "Bank Transfer", label: "Bank Transfer" },
  { value: "UPI", label: "UPI" },
  { value: "Cash", label: "Cash" },
  { value: "Credit Card", label: "Credit Card" },
  { value: "Debit Card", label: "Debit Card" },
  { value: "Cheque", label: "Cheque" },
  { value: "Other", label: "Other" },
];

const STATUS_FILTER_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "PAID", label: "🟢 Paid" },
  { value: "DUE", label: "🟡 Due" },
  { value: "UPCOMING", label: "🔵 Upcoming" },
  { value: "OVERDUE", label: "🔴 Overdue" },
];

const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  PAID: { label: "Paid", dot: "bg-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/25", text: "text-emerald-400" },
  DUE: { label: "Due", dot: "bg-amber-400", bg: "bg-amber-400/10 border-amber-400/25", text: "text-amber-400" },
  UPCOMING: { label: "Upcoming", dot: "bg-sky-400", bg: "bg-sky-400/10 border-sky-400/25", text: "text-sky-400" },
  OVERDUE: { label: "Overdue", dot: "bg-red-400", bg: "bg-red-400/10 border-red-400/25", text: "text-red-400" },
};

const fieldClass =
  "h-10 w-full rounded-md border border-card-border bg-card px-3 text-xs text-foreground/90 outline-none transition placeholder:text-muted/60 focus:border-accent focus:ring-1 focus:ring-accent/30";
const fieldErrorClass =
  "h-10 w-full rounded-md border border-danger/50 bg-card px-3 text-xs text-foreground/90 outline-none transition placeholder:text-muted/60 focus:border-danger focus:ring-1 focus:ring-danger/30";

type Tab = "monthly" | "recurring" | "categories";

/* ─── Zod Schemas ────────────────────────────────────────── */

const expenseFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120, "Max 120 characters"),
  categoryId: z.string().min(1, "Category is required"),
  amountRupees: z.string().min(1, "Amount is required").refine(
    (v) => !isNaN(Number(v)) && Number(v) > 0,
    "Must be a positive number",
  ),
  dueDate: z.string().min(1, "Due date is required"),
  paymentMethod: z.string().optional(),
  notes: z.string().max(1000, "Max 1000 characters").optional(),
});
type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

const recurringFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120, "Max 120 characters"),
  categoryId: z.string().min(1, "Category is required"),
  amountRupees: z.string().min(1, "Amount is required").refine(
    (v) => !isNaN(Number(v)) && Number(v) > 0,
    "Must be a positive number",
  ),
  frequency: z.string().min(1, "Frequency is required"),
  dueDay: z.string().min(1, "Due day is required").refine(
    (v) => { const n = Number(v); return !isNaN(n) && n >= 1 && n <= 31; },
    "Must be between 1 and 31",
  ),
  paymentMethod: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
});
type RecurringFormValues = z.infer<typeof recurringFormSchema>;

const categoryFormSchema = z.object({
  emoji: z.string().trim().min(1, "Emoji is required").max(10),
  name: z.string().trim().min(1, "Name is required").max(60, "Max 60 characters"),
  description: z.string().max(200, "Max 200 characters").optional(),
});
type CategoryFormValues = z.infer<typeof categoryFormSchema>;

/* ─── Field wrapper with error support ───────────────────── */

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
      {error && <p className="mt-1.5 text-[11px] text-danger">{error}</p>}
    </label>
  );
}

/* ─── Status Badge ───────────────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.UPCOMING;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${cfg.bg} ${cfg.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */

export function ExpensesManager() {
  const [tab, setTab] = useState<Tab>("monthly");

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "monthly", label: "Monthly Overview", icon: "📊" },
    { key: "recurring", label: "Recurring Expenses", icon: "🔄" },
    { key: "categories", label: "Categories", icon: "🏷️" },
  ];

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg border border-card-border bg-card p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex cursor-pointer items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-all ${
              tab === t.key
                ? "bg-accent text-accent-ink shadow-sm"
                : "text-muted hover:bg-white/5 hover:text-foreground"
            }`}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "monthly" && <MonthlyOverview />}
      {tab === "recurring" && <RecurringTab />}
      {tab === "categories" && <CategoriesTab />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB 1: MONTHLY OVERVIEW
   ═══════════════════════════════════════════════════════════ */

function MonthlyOverview() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showForm, setShowForm] = useState(false);

  const utils = trpc.useUtils();
  const invalidate = () => {
    utils.expenses.list.invalidate();
    utils.expenses.monthlySummary.invalidate();
  };

  const expenses = trpc.expenses.list.useQuery({ month, year, status: statusFilter === "ALL" ? undefined : statusFilter, categoryId: categoryFilter || undefined });
  const summary = trpc.expenses.monthlySummary.useQuery({ month, year });
  const categories = trpc.expenses.categoriesList.useQuery();
  const updateStatus = trpc.expenses.updateStatus.useMutation({ onSuccess: invalidate });
  const deleteExpense = trpc.expenses.delete.useMutation({ onSuccess: invalidate });

  const categoryFilterOptions = [
    { value: "", label: "All categories" },
    ...(categories.data?.map((c) => ({ value: c.id, label: `${c.emoji} ${c.name}` })) ?? []),
  ];

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  return (
    <div className="space-y-6">
      {/* Month navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={prevMonth} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-card-border bg-card text-muted transition hover:border-foreground/20 hover:text-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <h2 className="min-w-[180px] text-center text-lg font-semibold tracking-tight">
            {MONTHS[month]} {year}
          </h2>
          <button type="button" onClick={nextMonth} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-card-border bg-card text-muted transition hover:border-foreground/20 hover:text-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Expense
        </Button>
      </div>

      {/* Summary cards */}
      {summary.data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Total Expenses" amount={summary.data.totalPaise} icon="💰" accent="text-foreground" />
          <SummaryCard label="Paid" amount={summary.data.paidPaise} icon="✅" accent="text-emerald-400" />
          <SummaryCard label="Due" amount={summary.data.duePaise + summary.data.upcomingPaise} icon="⏳" accent="text-amber-400" />
          <SummaryCard label="Overdue" amount={summary.data.overduePaise} icon="🚨" accent="text-red-400" />
        </div>
      )}

      {/* Filters — using DropdownSelect */}
      <div className="flex flex-wrap gap-3">
        <DropdownSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={STATUS_FILTER_OPTIONS}
          className="w-[160px]"
          triggerClassName="h-9 w-full"
        />
        <DropdownSelect
          value={categoryFilter}
          onChange={setCategoryFilter}
          options={categoryFilterOptions}
          className="w-[200px]"
          triggerClassName="h-9 w-full"
        />
      </div>

      {/* Expenses table */}
      {expenses.isLoading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : expenses.data?.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-card-border py-20 text-center">
          <span className="mb-3 text-4xl">📋</span>
          <h3 className="text-lg font-medium text-foreground">No expenses for {MONTHS[month]}</h3>
          <p className="mt-1 text-sm text-muted">Create a one-off expense or set up a recurring template.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-card-border">
          <div className="overflow-x-auto table-scroll-container">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-card-border bg-card/60 text-left">
                  <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-muted">Expense</th>
                  <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-muted">Category</th>
                  <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-muted">Amount</th>
                  <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-muted">Due Date</th>
                  <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-muted">Status</th>
                  <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-muted">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border/50">
                {expenses.data?.map((exp) => (
                  <tr key={exp.id} className="transition hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground/90">{exp.name}</div>
                      {exp.recurringExpenseId && (
                        <span className="text-[10px] text-muted">🔄 Recurring</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-foreground/70">
                        <span>{exp.category.emoji}</span>
                        <span className="text-xs">{exp.category.name}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-foreground">
                      {formatMoney(exp.amountInPaise, exp.currency)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {new Date(exp.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={exp.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {exp.status !== "PAID" && (
                          <button
                            type="button"
                            onClick={() => updateStatus.mutate({ id: exp.id, status: "PAID" })}
                            className="cursor-pointer rounded-md px-2 py-1 text-[11px] font-medium text-emerald-400 transition hover:bg-emerald-400/10"
                            title="Mark as paid"
                          >
                            ✓ Paid
                          </button>
                        )}
                        {exp.status === "PAID" && (
                          <button
                            type="button"
                            onClick={() => updateStatus.mutate({ id: exp.id, status: "DUE" })}
                            className="cursor-pointer rounded-md px-2 py-1 text-[11px] font-medium text-amber-400 transition hover:bg-amber-400/10"
                            title="Mark as unpaid"
                          >
                            Unpay
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Delete "${exp.name}"?`)) {
                              deleteExpense.mutate({ id: exp.id });
                            }
                          }}
                          className="cursor-pointer rounded-md px-2 py-1 text-[11px] font-medium text-red-400 transition hover:bg-red-400/10"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add expense dialog */}
      {showForm && (
        <ExpenseFormDialog
          categories={categories.data ?? []}
          onClose={() => setShowForm(false)}
          onSaved={() => { invalidate(); setShowForm(false); }}
        />
      )}
    </div>
  );
}

/* ─── Summary Card ───────────────────────────────────────── */

function SummaryCard({ label, amount, icon, accent }: { label: string; amount: number; icon: string; accent: string }) {
  return (
    <div className="rounded-xl border border-card-border bg-card p-5 transition hover:border-foreground/10">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <p className={`mt-2 text-2xl font-bold tracking-tight ${accent}`}>
        {formatMoney(amount)}
      </p>
    </div>
  );
}

/* ─── Expense Form Dialog (react-hook-form + DropdownSelect) */

type CategoryData = { id: string; name: string; emoji: string };

function ExpenseFormDialog({
  categories,
  onClose,
  onSaved,
}: {
  categories: CategoryData[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: `${c.emoji} ${c.name}`,
  }));

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      name: "",
      categoryId: categories[0]?.id ?? "",
      amountRupees: "",
      dueDate: "",
      paymentMethod: "",
      notes: "",
    },
  });

  const create = trpc.expenses.create.useMutation({ onSuccess: onSaved });

  const onSubmit = async (values: ExpenseFormValues) => {
    setSubmitError(null);
    try {
      await create.mutateAsync({
        name: values.name,
        categoryId: values.categoryId,
        amountInPaise: rupeesToPaise(Number(values.amountRupees)),
        dueDate: new Date(values.dueDate),
        paymentMethod: values.paymentMethod || undefined,
        notes: values.notes || undefined,
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create expense.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-card-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-card-border px-6 py-4">
          <h3 className="font-semibold text-foreground">Add Expense</h3>
          <button type="button" onClick={onClose} className="cursor-pointer rounded-md p-1.5 text-muted transition hover:bg-white/5 hover:text-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6">
          <Field label="Expense Name" error={errors.name?.message}>
            <input {...register("name")} placeholder="e.g. September Rent" className={errors.name ? fieldErrorClass : fieldClass} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category" error={errors.categoryId?.message}>
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <DropdownSelect
                    value={field.value}
                    onChange={field.onChange}
                    options={categoryOptions}
                    className="w-full"
                    triggerClassName="h-10 w-full"
                  />
                )}
              />
            </Field>
            <Field label="Amount (₹)" error={errors.amountRupees?.message}>
              <input type="number" min="0" step="0.01" {...register("amountRupees")} className={errors.amountRupees ? fieldErrorClass : fieldClass} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Due Date" error={errors.dueDate?.message}>
              <input type="date" {...register("dueDate")} className={errors.dueDate ? fieldErrorClass : fieldClass} />
            </Field>
            <Field label="Payment Method" error={errors.paymentMethod?.message}>
              <Controller
                name="paymentMethod"
                control={control}
                render={({ field }) => (
                  <DropdownSelect
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    options={PAYMENT_METHODS}
                    className="w-full"
                    triggerClassName="h-10 w-full"
                  />
                )}
              />
            </Field>
          </div>
          <Field label="Notes" error={errors.notes?.message}>
            <input {...register("notes")} placeholder="Optional notes..." className={errors.notes ? fieldErrorClass : fieldClass} />
          </Field>
          {submitError && (
            <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
              {submitError}
            </p>
          )}
          <div className="flex justify-end gap-3 border-t border-card-border pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Adding…" : "Add Expense"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB 2: RECURRING EXPENSES
   ═══════════════════════════════════════════════════════════ */

function RecurringTab() {
  const categories = trpc.expenses.categoriesList.useQuery();
  const recurring = trpc.expenses.recurringList.useQuery();
  const utils = trpc.useUtils();
  const invalidate = () => {
    utils.expenses.recurringList.invalidate();
    utils.expenses.list.invalidate();
    utils.expenses.monthlySummary.invalidate();
  };

  const defaultCatId = categories.data?.[0]?.id ?? "";

  const create = trpc.expenses.recurringCreate.useMutation({ onSuccess: invalidate });
  const update = trpc.expenses.recurringUpdate.useMutation({ onSuccess: invalidate });
  const remove = trpc.expenses.recurringDelete.useMutation({ onSuccess: invalidate });
  const toggle = trpc.expenses.recurringToggle.useMutation({ onSuccess: invalidate });
  const generateDue = trpc.expenses.recurringGenerateDue.useMutation({ onSuccess: invalidate });

  const [editId, setEditId] = useState<string | null>(null);

  const categoryOptions = categories.data?.map((c) => ({
    value: c.id,
    label: `${c.emoji} ${c.name}`,
  })) ?? [];

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      {/* Form */}
      <RecurringForm
        key={editId ?? "new"}
        editId={editId}
        defaultCategoryId={defaultCatId}
        categoryOptions={categoryOptions}
        editData={editId ? recurring.data?.find((r) => r.id === editId) : undefined}
        onCreate={(payload) => create.mutateAsync(payload)}
        onUpdate={(payload) => update.mutateAsync(payload)}
        onCancel={() => setEditId(null)}
        isPending={create.isPending || update.isPending}
        error={create.error?.message ?? update.error?.message}
      />

      {/* List */}
      <div className="flex min-w-0 flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-muted">
            {recurring.data?.length ?? 0} recurring template{(recurring.data?.length ?? 0) !== 1 ? "s" : ""}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => generateDue.mutate()}
            disabled={generateDue.isPending}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            {generateDue.isPending ? "Generating…" : "Generate Due Expenses"}
          </Button>
        </div>

        {generateDue.data && (
          <p className="rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent">
            {generateDue.data.generated} expense(s) generated for this month.
          </p>
        )}

        {recurring.isLoading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : recurring.data?.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-card-border py-20 text-center">
            <span className="mb-3 text-4xl">🔄</span>
            <h3 className="text-lg font-medium text-foreground">No recurring expenses</h3>
            <p className="mt-1 text-sm text-muted">Create your first recurring expense on the left.</p>
          </div>
        ) : (
          <ul className="grid gap-4 xl:grid-cols-2">
            {recurring.data?.map((rec) => (
              <li key={rec.id} className="group flex flex-col justify-between overflow-hidden rounded-xl border border-card-border bg-card transition hover:border-foreground/20">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{rec.category.emoji}</span>
                      <h3 className="font-semibold text-foreground/90">{rec.name}</h3>
                    </div>
                    <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      rec.isActive ? "bg-emerald-400/15 text-emerald-400" : "bg-white/10 text-muted"
                    }`}>
                      {rec.isActive ? "Active" : "Paused"}
                    </span>
                  </div>

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-2xl font-bold tracking-tight text-foreground">
                      {formatMoney(rec.amountInPaise, rec.currency)}
                    </span>
                    <span className="text-sm font-medium text-muted">
                      / {FREQUENCIES.find((f) => f.value === rec.frequency)?.label.toLowerCase() ?? rec.frequency}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted">
                    <div>📅 Due: {rec.dueDay}{ordinalSuffix(rec.dueDay)} of month</div>
                    <div>🏷️ {rec.category.name}</div>
                    <div>📆 From: {new Date(rec.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
                    <div>🔚 {rec.endDate ? `Until: ${new Date(rec.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : "No end date"}</div>
                    {rec.paymentMethod && <div className="col-span-2">💳 {rec.paymentMethod}</div>}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-card-border bg-black/20 px-5 py-3">
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditId(rec.id)}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => toggle.mutate({ id: rec.id, isActive: !rec.isActive })}>
                      {rec.isActive ? "Pause" : "Resume"}
                    </Button>
                  </div>
                  <Button variant="danger" size="sm" onClick={() => {
                    if (confirm(`Deactivate "${rec.name}"?`)) remove.mutate({ id: rec.id });
                  }}>
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ─── Recurring Form (react-hook-form) ───────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RecurringForm({
  editId,
  defaultCategoryId,
  categoryOptions,
  editData,
  onCreate,
  onUpdate,
  onCancel,
  isPending,
  error,
}: {
  editId: string | null;
  defaultCategoryId: string;
  categoryOptions: { value: string; label: string }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editData?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onCreate: (payload: any) => Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onUpdate: (payload: any) => Promise<any>;
  onCancel: () => void;
  isPending: boolean;
  error?: string;
}) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RecurringFormValues>({
    resolver: zodResolver(recurringFormSchema),
    defaultValues: editData
      ? {
          name: editData.name,
          categoryId: editData.categoryId,
          amountRupees: String(paiseToRupees(editData.amountInPaise)),
          frequency: editData.frequency,
          dueDay: String(editData.dueDay),
          paymentMethod: editData.paymentMethod ?? "",
          startDate: new Date(editData.startDate).toISOString().split("T")[0],
          endDate: editData.endDate ? new Date(editData.endDate).toISOString().split("T")[0] : "",
        }
      : {
          name: "",
          categoryId: defaultCategoryId,
          amountRupees: "",
          frequency: "MONTHLY",
          dueDay: "5",
          paymentMethod: "",
          startDate: new Date().toISOString().split("T")[0],
          endDate: "",
        },
  });

  const onSubmit = async (values: RecurringFormValues) => {
    setSubmitError(null);
    const payload = {
      name: values.name,
      categoryId: values.categoryId,
      amountInPaise: rupeesToPaise(Number(values.amountRupees)),
      frequency: values.frequency as "MONTHLY" | "QUARTERLY" | "YEARLY" | "WEEKLY",
      dueDay: Number(values.dueDay),
      paymentMethod: values.paymentMethod || undefined,
      startDate: new Date(values.startDate),
      endDate: values.endDate ? new Date(values.endDate) : null,
    };
    try {
      if (editId) {
        await onUpdate({ id: editId, ...payload });
      } else {
        await onCreate(payload);
      }
      onCancel();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="h-fit space-y-6 rounded-xl border border-card-border bg-card p-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground/90">
          {editId ? "Edit recurring expense" : "New recurring expense"}
        </h2>
        <p className="mt-1 text-xs text-muted">
          Set up expenses that repeat automatically.
        </p>
      </div>

      <div className="space-y-4">
        <Field label="Expense Name" error={errors.name?.message}>
          <input {...register("name")} placeholder="e.g. Gym Rent" className={errors.name ? fieldErrorClass : fieldClass} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" error={errors.categoryId?.message}>
            <Controller
              name="categoryId"
              control={control}
              render={({ field }) => (
                <DropdownSelect
                  value={field.value}
                  onChange={field.onChange}
                  options={categoryOptions}
                  className="w-full"
                  triggerClassName="h-10 w-full"
                />
              )}
            />
          </Field>
          <Field label="Amount (₹)" error={errors.amountRupees?.message}>
            <input type="number" min="0" step="0.01" {...register("amountRupees")} className={errors.amountRupees ? fieldErrorClass : fieldClass} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Frequency" error={errors.frequency?.message}>
            <Controller
              name="frequency"
              control={control}
              render={({ field }) => (
                <DropdownSelect
                  value={field.value}
                  onChange={field.onChange}
                  options={FREQUENCIES}
                  className="w-full"
                  triggerClassName="h-10 w-full"
                />
              )}
            />
          </Field>
          <Field label="Due Day (of month)" error={errors.dueDay?.message}>
            <input type="number" min="1" max="31" {...register("dueDay")} className={errors.dueDay ? fieldErrorClass : fieldClass} />
          </Field>
        </div>
        <Field label="Payment Method" error={errors.paymentMethod?.message}>
          <Controller
            name="paymentMethod"
            control={control}
            render={({ field }) => (
              <DropdownSelect
                value={field.value ?? ""}
                onChange={field.onChange}
                options={PAYMENT_METHODS}
                className="w-full"
                triggerClassName="h-10 w-full"
              />
            )}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Start Date" error={errors.startDate?.message}>
            <input type="date" {...register("startDate")} className={errors.startDate ? fieldErrorClass : fieldClass} />
          </Field>
          <Field label="End Date" error={errors.endDate?.message}>
            <input type="date" {...register("endDate")} className={errors.endDate ? fieldErrorClass : fieldClass} />
          </Field>
        </div>
      </div>

      {(error || submitError) && (
        <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
          {error ?? submitError}
        </p>
      )}

      <div className="flex justify-end gap-3 border-t border-card-border pt-6">
        {editId && (
          <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        )}
        <Button type="submit" disabled={isPending}>
          {editId ? "Save changes" : "Create recurring expense"}
        </Button>
      </div>
    </form>
  );
}

function ordinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

/* ═══════════════════════════════════════════════════════════
   TAB 3: CATEGORIES
   ═══════════════════════════════════════════════════════════ */

function CategoriesTab() {
  const categories = trpc.expenses.categoriesList.useQuery();
  const utils = trpc.useUtils();
  const invalidate = () => utils.expenses.categoriesList.invalidate();

  const [showForm, setShowForm] = useState(false);
  const [editCat, setEditCat] = useState<{ id: string; name: string; emoji: string; description: string | null } | null>(null);

  const remove = trpc.expenses.categoriesDelete.useMutation({ onSuccess: invalidate });

  function openCreate() {
    setEditCat(null);
    setShowForm(true);
  }

  function openEdit(cat: { id: string; name: string; emoji: string; description: string | null }) {
    setEditCat(cat);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditCat(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          {categories.data?.length ?? 0} categories
        </p>
        <Button onClick={openCreate}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Category
        </Button>
      </div>

      {categories.isLoading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {categories.data?.map((cat) => (
            <div
              key={cat.id}
              className="group relative flex flex-col items-center gap-3 rounded-xl border border-card-border bg-card p-5 text-center transition hover:border-foreground/20"
            >
              <span className="text-3xl">{cat.emoji}</span>
              <div>
                <h3 className="font-medium text-foreground/90">{cat.name}</h3>
                {cat.description && (
                  <p className="mt-0.5 text-[11px] text-muted">{cat.description}</p>
                )}
              </div>
              {cat.isDefault && (
                <span className="rounded bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
                  Default
                </span>
              )}

              {/* Action buttons — visible on hover */}
              <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => openEdit(cat)}
                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md bg-white/5 text-muted transition hover:bg-white/10 hover:text-foreground"
                  title="Edit"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                {!cat.isDefault && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Delete "${cat.name}"?`)) remove.mutate({ id: cat.id });
                    }}
                    className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md bg-white/5 text-red-400 transition hover:bg-red-400/10"
                    title="Delete"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Category form dialog (react-hook-form) */}
      {showForm && (
        <CategoryFormDialog
          editCat={editCat}
          onClose={closeForm}
          onSaved={() => { invalidate(); closeForm(); }}
        />
      )}
    </div>
  );
}

/* ─── Category Form Dialog (react-hook-form) ─────────────── */

function CategoryFormDialog({
  editCat,
  onClose,
  onSaved,
}: {
  editCat: { id: string; name: string; emoji: string; description: string | null } | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: editCat
      ? { emoji: editCat.emoji, name: editCat.name, description: editCat.description ?? "" }
      : { emoji: "", name: "", description: "" },
  });

  const create = trpc.expenses.categoriesCreate.useMutation({ onSuccess: onSaved });
  const update = trpc.expenses.categoriesUpdate.useMutation({ onSuccess: onSaved });
  const pending = create.isPending || update.isPending;

  const onSubmit = async (values: CategoryFormValues) => {
    setSubmitError(null);
    const payload = {
      name: values.name,
      emoji: values.emoji,
      description: values.description || undefined,
    };
    try {
      if (editCat) {
        await update.mutateAsync({ id: editCat.id, ...payload });
      } else {
        await create.mutateAsync(payload);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save category.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-xl border border-card-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-card-border px-6 py-4">
          <h3 className="font-semibold text-foreground">
            {editCat ? "Edit Category" : "New Category"}
          </h3>
          <button type="button" onClick={onClose} className="cursor-pointer rounded-md p-1.5 text-muted transition hover:bg-white/5 hover:text-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6">
          <div className="grid grid-cols-[4rem_1fr] gap-4">
            <Field label="Emoji" error={errors.emoji?.message}>
              <input {...register("emoji")} placeholder="🏢" className={errors.emoji ? fieldErrorClass : fieldClass} maxLength={10} />
            </Field>
            <Field label="Category Name" error={errors.name?.message}>
              <input {...register("name")} placeholder="e.g. Transport" className={errors.name ? fieldErrorClass : fieldClass} />
            </Field>
          </div>
          <Field label="Description" error={errors.description?.message}>
            <input {...register("description")} placeholder="Optional examples..." className={errors.description ? fieldErrorClass : fieldClass} />
          </Field>
          {submitError && (
            <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
              {submitError}
            </p>
          )}
          <div className="flex justify-end gap-3 border-t border-card-border pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={pending}>
              {editCat ? "Save changes" : "Add Category"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
