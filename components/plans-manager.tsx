"use client";

import { useState } from "react";
import { formatMoney, paiseToRupees, rupeesToPaise } from "@/lib/membership";
import { trpc } from "@/lib/trpc";

type Draft = {
  id?: string;
  name: string;
  description: string;
  priceRupees: string;
  durationDays: string;
  isDefault: boolean;
  isRestricted: boolean;
  isActive: boolean;
};

function emptyDraft(): Draft {
  return {
    name: "",
    description: "",
    priceRupees: "",
    durationDays: "30",
    isDefault: false,
    isRestricted: false,
    isActive: true,
  };
}

export function PlansManager() {
  const [includeArchived, setIncludeArchived] = useState(false);
  const plans = trpc.plans.list.useQuery({ includeArchived });
  const utils = trpc.useUtils();
  const invalidate = () => {
    utils.plans.invalidate();
    utils.users.invalidate();
  };

  const create = trpc.plans.create.useMutation({
    onSuccess: () => {
      invalidate();
      setDraft(emptyDraft());
    },
  });
  const update = trpc.plans.update.useMutation({
    onSuccess: () => {
      invalidate();
      setDraft(emptyDraft());
    },
  });
  const remove = trpc.plans.delete.useMutation({ onSuccess: invalidate });
  const setDefault = trpc.plans.setDefault.useMutation({ onSuccess: invalidate });
  const backfill = trpc.plans.backfillDefault.useMutation({ onSuccess: invalidate });

  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [eligibilityPlanId, setEligibilityPlanId] = useState<string | null>(null);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const payload = {
      name: draft.name,
      description: draft.description,
      priceInPaise: rupeesToPaise(Number(draft.priceRupees || 0)),
      currency: "INR",
      durationDays: Number(draft.durationDays || 0),
      isDefault: draft.isDefault,
      isRestricted: draft.isRestricted,
      isActive: draft.isActive,
    };
    if (draft.id) {
      update.mutate({ id: draft.id, ...payload });
    } else {
      create.mutate(payload);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <form
        onSubmit={submit}
        className="h-fit space-y-4 rounded-xl border border-card-border bg-card p-5"
      >
        <h2 className="text-lg font-medium">
          {draft.id ? "Edit plan" : "New plan"}
        </h2>
        <label className="grid gap-1 text-sm">
          Plan name
          <input
            required
            value={draft.name}
            onChange={(event) =>
              setDraft((current) => ({ ...current, name: event.target.value }))
            }
            placeholder="New joiner – 3 months"
            className="h-10 rounded-lg border border-card-border bg-background px-3"
          />
        </label>
        <label className="grid gap-1 text-sm">
          Description
          <textarea
            rows={3}
            value={draft.description}
            onChange={(event) =>
              setDraft((current) => ({ ...current, description: event.target.value }))
            }
            className="rounded-lg border border-card-border bg-background px-3 py-2"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Price (₹)
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={draft.priceRupees}
              onChange={(event) =>
                setDraft((current) => ({ ...current, priceRupees: event.target.value }))
              }
              className="h-10 rounded-lg border border-card-border bg-background px-3"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Duration (days)
            <input
              required
              type="number"
              min="1"
              value={draft.durationDays}
              onChange={(event) =>
                setDraft((current) => ({ ...current, durationDays: event.target.value }))
              }
              className="h-10 rounded-lg border border-card-border bg-background px-3"
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.isDefault}
            onChange={(event) =>
              setDraft((current) => ({ ...current, isDefault: event.target.checked }))
            }
          />
          Default plan for new members
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.isRestricted}
            onChange={(event) =>
              setDraft((current) => ({ ...current, isRestricted: event.target.checked }))
            }
          />
          Restricted — only members you pick are eligible
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.isActive}
            onChange={(event) =>
              setDraft((current) => ({ ...current, isActive: event.target.checked }))
            }
          />
          Active
        </label>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={create.isPending || update.isPending}
            className="h-10 rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink disabled:opacity-60"
          >
            {draft.id ? "Save changes" : "Create plan"}
          </button>
          {draft.id ? (
            <button
              type="button"
              onClick={() => setDraft(emptyDraft())}
              className="h-10 rounded-full border border-card-border px-4 text-sm"
            >
              Cancel
            </button>
          ) : null}
        </div>
        {create.error || update.error ? (
          <p className="text-sm text-danger">
            {create.error?.message ?? update.error?.message}
          </p>
        ) : null}
      </form>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(event) => setIncludeArchived(event.target.checked)}
            />
            Show archived plans
          </label>
          <button
            type="button"
            onClick={() => backfill.mutate()}
            disabled={backfill.isPending}
            className="h-9 rounded-full border border-card-border px-4 text-sm disabled:opacity-60"
          >
            Put members without a plan on the default
          </button>
        </div>
        {backfill.error ? (
          <p className="text-sm text-danger">{backfill.error.message}</p>
        ) : null}
        {backfill.data ? (
          <p className="text-sm text-accent">
            {backfill.data.updated} member(s) moved to the default plan.
          </p>
        ) : null}

        {plans.data?.length === 0 ? (
          <div className="rounded-xl border border-dashed border-card-border px-4 py-10 text-center text-sm text-muted">
            No plans yet. Create your first membership plan on the left.
          </div>
        ) : null}

        <ul className="space-y-3">
          {plans.data?.map((plan) => (
            <li
              key={plan.id}
              className="rounded-xl border border-card-border bg-card p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    {plan.name}
                    {plan.isDefault ? (
                      <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">
                        default
                      </span>
                    ) : null}
                    {plan.isRestricted ? (
                      <span className="rounded-full bg-warn/15 px-2 py-0.5 text-xs text-warn">
                        restricted
                      </span>
                    ) : null}
                    {!plan.isActive ? (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-muted">
                        archived
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {formatMoney(plan.priceInPaise, plan.currency)} ·{" "}
                    {plan.durationDays} days · {plan.memberCount} member(s)
                    {plan.isRestricted ? ` · ${plan.eligibleCount} eligible` : ""}
                  </p>
                  {plan.description ? (
                    <p className="mt-2 text-sm text-muted">{plan.description}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap gap-3 text-sm">
                  {plan.isRestricted ? (
                    <button
                      type="button"
                      onClick={() =>
                        setEligibilityPlanId(
                          eligibilityPlanId === plan.id ? null : plan.id,
                        )
                      }
                      className="text-muted hover:text-foreground"
                    >
                      Eligibility
                    </button>
                  ) : null}
                  {!plan.isDefault && plan.isActive && !plan.isRestricted ? (
                    <button
                      type="button"
                      onClick={() => setDefault.mutate({ id: plan.id })}
                      className="text-muted hover:text-foreground"
                    >
                      Make default
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({
                        id: plan.id,
                        name: plan.name,
                        description: plan.description ?? "",
                        priceRupees: String(paiseToRupees(plan.priceInPaise)),
                        durationDays: String(plan.durationDays),
                        isDefault: plan.isDefault,
                        isRestricted: plan.isRestricted,
                        isActive: plan.isActive,
                      })
                    }
                    className="text-muted hover:text-foreground"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Delete or archive "${plan.name}"?`)) {
                        remove.mutate({ id: plan.id });
                      }
                    }}
                    className="text-danger"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {eligibilityPlanId === plan.id ? (
                <EligibilityEditor
                  planId={plan.id}
                  selectedIds={plan.eligibleUsers.map((user) => user.id)}
                  onSaved={() => {
                    invalidate();
                    setEligibilityPlanId(null);
                  }}
                />
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function EligibilityEditor({
  planId,
  selectedIds,
  onSaved,
}: {
  planId: string;
  selectedIds: string[];
  onSaved: () => void;
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
    <div className="mt-4 rounded-lg border border-card-border bg-background p-4">
      <p className="text-sm text-muted">
        Pick the members allowed to buy this plan. Everyone else keeps their
        current plan.
      </p>
      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search members"
        className="mt-3 h-10 w-full rounded-lg border border-card-border bg-card px-3 text-sm"
      />
      <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto text-sm">
        {members.data?.items.map((member) => (
          <li key={member.id}>
            <label className="flex items-center gap-2 rounded px-1 py-1 hover:bg-white/5">
              <input
                type="checkbox"
                checked={selected.includes(member.id)}
                onChange={() => toggle(member.id)}
              />
              <span>{member.name ?? "Unnamed"}</span>
              <span className="text-muted">{member.email}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          disabled={save.isPending}
          onClick={() => save.mutate({ planId, userIds: selected })}
          className="h-9 rounded-full bg-accent px-4 text-sm font-semibold text-accent-ink disabled:opacity-60"
        >
          {save.isPending ? "Saving…" : `Save ${selected.length} member(s)`}
        </button>
        {save.error ? (
          <p className="text-sm text-danger">{save.error.message}</p>
        ) : null}
      </div>
    </div>
  );
}
