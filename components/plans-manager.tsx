"use client";

import { useState } from "react";
import { formatMoney, paiseToRupees, rupeesToPaise } from "@/lib/membership";
import { trpc } from "@/lib/trpc";
import { Button, SearchInput } from "@/components/ui-primitives";
import { MemberAvatar } from "@/components/member-avatar";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const planSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Plan name is required"),
  description: z.string().optional(),
  priceRupees: z.union([z.string(), z.number()]),
  durationDays: z.union([z.string(), z.number()]),
  isDefault: z.boolean(),
  isRestricted: z.boolean(),
  isActive: z.boolean(),
});

type PlanFormValues = z.infer<typeof planSchema>;

const fieldClass =
  "h-10 w-full rounded-md border border-card-border bg-card px-3 text-xs text-foreground/90 outline-none transition placeholder:text-muted/60 focus:border-accent focus:ring-1 focus:ring-accent/30";
const areaClass =
  "w-full rounded-md border border-card-border bg-card px-3 py-2 text-xs text-foreground/90 outline-none transition placeholder:text-muted/60 focus:border-accent focus:ring-1 focus:ring-accent/30";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
          {label}
        </span>
        {error && <span className="text-[11px] font-medium text-danger">{error}</span>}
      </div>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export function PlansManager() {
  const [includeArchived, setIncludeArchived] = useState(false);
  const plans = trpc.plans.list.useQuery({ includeArchived });
  const utils = trpc.useUtils();
  const invalidate = () => {
    utils.plans.invalidate();
    utils.users.invalidate();
  };

  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: "",
      description: "",
      priceRupees: 0,
      durationDays: 30,
      isDefault: false,
      isRestricted: false,
      isActive: true,
    },
  });

  const create = trpc.plans.create.useMutation({
    onSuccess: () => {
      invalidate();
      form.reset({ name: "", description: "", priceRupees: 0, durationDays: 30, isDefault: false, isRestricted: false, isActive: true });
    },
  });
  const update = trpc.plans.update.useMutation({
    onSuccess: () => {
      invalidate();
      form.reset({ name: "", description: "", priceRupees: 0, durationDays: 30, isDefault: false, isRestricted: false, isActive: true });
    },
  });
  const remove = trpc.plans.delete.useMutation({ onSuccess: invalidate });
  const setDefault = trpc.plans.setDefault.useMutation({ onSuccess: invalidate });
  const backfill = trpc.plans.backfillDefault.useMutation({ onSuccess: invalidate });

  const [eligibilityPlanId, setEligibilityPlanId] = useState<string | null>(null);

  const onSubmit = form.handleSubmit((data) => {
    const payload = {
      name: data.name,
      description: data.description ?? "",
      priceInPaise: rupeesToPaise(Number(data.priceRupees)),
      currency: "INR",
      durationDays: Number(data.durationDays),
      isDefault: data.isDefault,
      isRestricted: data.isRestricted,
      isActive: data.isActive,
    };
    if (data.id) {
      update.mutate({ id: data.id, ...payload });
    } else {
      create.mutate(payload);
    }
  });

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <form
        onSubmit={onSubmit}
        className="h-fit space-y-6 rounded-xl border border-card-border bg-card p-6"
      >
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground/90">
            {form.watch("id") ? "Edit plan" : "New plan"}
          </h2>
          <p className="mt-1 text-xs text-muted">
            Configure the plan details and pricing.
          </p>
        </div>

        <div className="space-y-4">
          <Field label="Plan name" error={form.formState.errors.name?.message}>
            <input
              {...form.register("name")}
              placeholder="e.g. New joiner – 3 months"
              className={fieldClass}
            />
          </Field>
          <Field label="Description" error={form.formState.errors.description?.message}>
            <textarea
              {...form.register("description")}
              rows={3}
              placeholder="Optional plan details..."
              className={areaClass}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Price (₹)" error={form.formState.errors.priceRupees?.message}>
              <input
                {...form.register("priceRupees")}
                type="number"
                min="0"
                step="0.01"
                className={fieldClass}
              />
            </Field>
            <Field label="Duration (days)" error={form.formState.errors.durationDays?.message}>
              <input
                {...form.register("durationDays")}
                type="number"
                min="1"
                className={fieldClass}
              />
            </Field>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              {...form.register("isDefault")}
              className="mt-1 h-4 w-4 shrink-0 rounded border-card-border accent-accent"
            />
            <span className="text-sm text-foreground/80">
              Default plan for new members
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              {...form.register("isRestricted")}
              className="mt-1 h-4 w-4 shrink-0 rounded border-card-border accent-accent"
            />
            <span className="text-sm text-foreground/80">
              Restricted (only selected members are eligible)
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              {...form.register("isActive")}
              className="mt-1 h-4 w-4 shrink-0 rounded border-card-border accent-accent"
            />
            <span className="text-sm text-foreground/80">Active</span>
          </label>
        </div>

        {create.error || update.error ? (
          <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
            {create.error?.message ?? update.error?.message}
          </p>
        ) : null}

        <div className="flex justify-end gap-3 border-t border-card-border pt-6">
          {form.watch("id") ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => form.reset({ name: "", description: "", priceRupees: 0, durationDays: 30, isDefault: false, isRestricted: false, isActive: true, id: undefined })}
            >
              Cancel
            </Button>
          ) : null}
          <Button type="submit" disabled={create.isPending || update.isPending}>
            {form.watch("id") ? "Save changes" : "Create plan"}
          </Button>
        </div>
      </form>

      <div className="flex min-w-0 flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(event) => setIncludeArchived(event.target.checked)}
              className="h-4 w-4 rounded border-card-border accent-accent"
            />
            Show archived plans
          </label>
          <Button
            type="button"
            variant="outline"
            onClick={() => backfill.mutate()}
            disabled={backfill.isPending}
          >
            Apply default to members without plans
          </Button>
        </div>
        
        {backfill.error ? (
          <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{backfill.error.message}</p>
        ) : null}
        {backfill.data ? (
          <p className="rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent">
            {backfill.data.updated} member(s) moved to the default plan.
          </p>
        ) : null}

        {plans.data?.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-card-border py-20 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 text-muted/50"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
            <h3 className="text-lg font-medium text-foreground">No plans created yet</h3>
            <p className="mt-1 text-sm text-muted">Create your first membership plan on the left.</p>
          </div>
        ) : null}

        <ul className="grid gap-4 xl:grid-cols-2">
          {plans.data?.map((plan) => (
            <li
              key={plan.id}
              className="group flex flex-col justify-between overflow-hidden rounded-xl border border-card-border bg-card transition hover:border-foreground/20"
            >
              <div className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3 className="font-semibold text-foreground/90">{plan.name}</h3>
                  <div className="flex shrink-0 gap-2">
                    {plan.isDefault && (
                      <span className="rounded bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
                        Default
                      </span>
                    )}
                    {plan.isRestricted && (
                      <span className="rounded bg-warn/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-warn">
                        Restricted
                      </span>
                    )}
                    {!plan.isActive && (
                      <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                        Archived
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-3xl font-bold tracking-tight text-foreground">
                    {formatMoney(plan.priceInPaise, plan.currency)}
                  </span>
                  <span className="text-sm font-medium text-muted">/ {plan.durationDays} days</span>
                </div>

                <div className="mt-5 space-y-3">
                  {plan.description && (
                    <p className="text-sm text-muted">{plan.description}</p>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-muted">
                    <div className="flex items-center gap-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                      {plan.memberCount} active
                    </div>
                    {plan.isRestricted && (
                      <div className="flex items-center gap-1.5 text-warn">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                        {plan.eligibleCount} eligible
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-card-border bg-black/20 px-6 py-4">
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      form.reset({
                        id: plan.id,
                        name: plan.name,
                        description: plan.description ?? "",
                        priceRupees: paiseToRupees(plan.priceInPaise),
                        durationDays: plan.durationDays,
                        isDefault: plan.isDefault,
                        isRestricted: plan.isRestricted,
                        isActive: plan.isActive,
                      });
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    Edit
                  </Button>
                  {!plan.isDefault && plan.isActive && !plan.isRestricted && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDefault.mutate({ id: plan.id })}
                    >
                      Make Default
                    </Button>
                  )}
                  {plan.isRestricted && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEligibilityPlanId(plan.id)}
                    >
                      Manage Eligibility
                    </Button>
                  )}
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    if (confirm(`Delete or archive "${plan.name}"?`)) {
                      remove.mutate({ id: plan.id });
                    }
                  }}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {eligibilityPlanId && (
        <EligibilityEditor
          planId={eligibilityPlanId}
          selectedIds={
            plans.data
              ?.find((p) => p.id === eligibilityPlanId)
              ?.eligibleUsers.map((u) => u.id) ?? []
          }
          onSaved={() => {
            invalidate();
            setEligibilityPlanId(null);
          }}
          onCancel={() => setEligibilityPlanId(null)}
        />
      )}
    </div>
  );
}

function EligibilityEditor({
  planId,
  selectedIds,
  onSaved,
  onCancel,
}: {
  planId: string;
  selectedIds: string[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>(selectedIds);
  const members = trpc.users.list.useQuery({
    search: search || undefined,
    page: 1,
    pageSize: 50,
    sortBy: "name",
    sortDir: "asc",
    planStatus: "all",
    paymentStatus: "all",
    joinSource: "all",
  });
  const save = trpc.plans.setEligibleUsers.useMutation({ onSuccess: onSaved });

  function toggle(userId: string) {
    setSelected((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-card-border bg-card p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-medium text-foreground">Select Eligible Members</h4>
            <p className="mt-1 text-xs text-muted">
              Everyone else will keep their current plan.
            </p>
          </div>
          <button type="button" onClick={onCancel} className="text-muted hover:text-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        
        <div className="mt-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search members by name or email"
            className="w-full"
          />
        </div>

        <ul className="mt-4 max-h-[50vh] space-y-1 overflow-y-auto pr-2 table-scroll-container">
          {members.data?.items.map((member) => (
            <li key={member.id}>
              <label className="flex cursor-pointer items-center justify-between rounded-lg p-2 transition hover:bg-white/5">
                <div className="flex items-center gap-3">
                  <MemberAvatar src={member.image} name={member.name} size="h-8 w-8" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground/90">
                      {member.name ?? "Unnamed"}
                    </span>
                    <span className="text-xs text-muted">{member.email}</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={selected.includes(member.id)}
                  onChange={() => toggle(member.id)}
                  className="h-4 w-4 rounded border-card-border accent-accent"
                />
              </label>
            </li>
          ))}
          {members.data?.items.length === 0 && (
            <li className="py-4 text-center text-sm text-muted">No members found</li>
          )}
        </ul>
        
        <div className="mt-5 flex items-center justify-between border-t border-card-border/50 pt-4">
          <span className="text-xs font-medium text-muted">
            {selected.length} selected
          </span>
          <Button
            type="button"
            disabled={save.isPending}
            onClick={() => save.mutate({ planId, userIds: selected })}
          >
            {save.isPending ? "Saving…" : "Save Eligibility"}
          </Button>
        </div>
        
        {save.error ? (
          <p className="mt-3 text-xs text-danger">{save.error.message}</p>
        ) : null}
      </div>
    </div>
  );
}
