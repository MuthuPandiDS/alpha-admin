"use client";

import { useState } from "react";
import {
  GENDERS,
  GENDER_LABELS,
  toDateInputValue,
} from "@/lib/member-profile";
import { PAYMENT_STATUSES, type PaymentStatus } from "@/lib/plan";
import { trpc } from "@/lib/trpc";

export type MemberFormValues = {
  id?: string;
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  heightCm: string;
  weightKg: string;
  address: string;
  emergencyContact: string;
  fitnessGoal: string;
  paymentStatus: PaymentStatus;
  planExpiresAt: string;
  planNotes: string;
};

export type MemberRecord = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  dateOfBirth: Date | string | null;
  gender: string | null;
  heightCm: number | null;
  weightKg: number | null;
  address: string | null;
  emergencyContact: string | null;
  fitnessGoal: string | null;
  paymentStatus: string;
  planExpiresAt: Date | string | null;
  planNotes: string | null;
};

const emptyValues: MemberFormValues = {
  name: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  gender: "",
  heightCm: "",
  weightKg: "",
  address: "",
  emergencyContact: "",
  fitnessGoal: "",
  paymentStatus: "UNPAID",
  planExpiresAt: "",
  planNotes: "",
};

export function toFormValues(member: MemberRecord): MemberFormValues {
  return {
    id: member.id,
    name: member.name ?? "",
    email: member.email ?? "",
    phone: member.phone ?? "",
    dateOfBirth: toDateInputValue(member.dateOfBirth),
    gender: member.gender ?? "",
    heightCm: member.heightCm?.toString() ?? "",
    weightKg: member.weightKg?.toString() ?? "",
    address: member.address ?? "",
    emergencyContact: member.emergencyContact ?? "",
    fitnessGoal: member.fitnessGoal ?? "",
    paymentStatus: (PAYMENT_STATUSES as readonly string[]).includes(
      member.paymentStatus,
    )
      ? (member.paymentStatus as PaymentStatus)
      : "UNPAID",
    planExpiresAt: toDateInputValue(member.planExpiresAt),
    planNotes: member.planNotes ?? "",
  };
}

const fieldClass =
  "h-10 w-full rounded-lg border border-card-border bg-background px-3 text-sm outline-none focus:border-accent";
const areaClass =
  "w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wide text-muted">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

export function MemberFormDialog({
  initialValues,
  onClose,
  onSaved,
}: {
  initialValues?: MemberFormValues;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<MemberFormValues>(
    initialValues ?? emptyValues,
  );
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(values.id);

  const createMember = trpc.users.create.useMutation();
  const updateMember = trpc.users.update.useMutation();
  const pending = createMember.isPending || updateMember.isPending;

  function set<K extends keyof MemberFormValues>(
    key: K,
    value: MemberFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const payload = {
      name: values.name,
      email: values.email,
      phone: values.phone,
      dateOfBirth: values.dateOfBirth,
      gender: values.gender,
      heightCm: values.heightCm,
      weightKg: values.weightKg,
      address: values.address,
      emergencyContact: values.emergencyContact,
      fitnessGoal: values.fitnessGoal,
      paymentStatus: values.paymentStatus,
      planExpiresAt: values.planExpiresAt,
      planNotes: values.planNotes,
    };

    try {
      if (values.id) {
        await updateMember.mutateAsync({ ...payload, id: values.id });
      } else {
        await createMember.mutateAsync(payload);
      }
      onSaved();
    } catch (mutationError) {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Could not save this member.",
      );
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4">
      <form
        onSubmit={handleSubmit}
        className="my-8 w-full max-w-2xl rounded-2xl border border-card-border bg-card p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              {isEdit ? "Edit member" : "Add member"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {isEdit
                ? "Update the member's profile and plan details."
                : "Create a member manually. They can still sign in with the same email later."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-card-border px-3 py-1 text-sm text-muted hover:text-foreground"
          >
            Close
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <input
              value={values.name}
              onChange={(event) => set("name", event.target.value)}
              required
              className={fieldClass}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={values.email}
              onChange={(event) => set("email", event.target.value)}
              required
              className={fieldClass}
            />
          </Field>
          <Field label="Phone">
            <input
              type="tel"
              value={values.phone}
              onChange={(event) => set("phone", event.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="Date of birth">
            <input
              type="date"
              value={values.dateOfBirth}
              onChange={(event) => set("dateOfBirth", event.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="Gender">
            <select
              value={values.gender}
              onChange={(event) => set("gender", event.target.value)}
              className={fieldClass}
            >
              <option value="">Unspecified</option>
              {GENDERS.map((gender) => (
                <option key={gender} value={gender}>
                  {GENDER_LABELS[gender]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Emergency contact">
            <input
              value={values.emergencyContact}
              onChange={(event) => set("emergencyContact", event.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="Height (cm)">
            <input
              type="number"
              step="0.1"
              min="1"
              value={values.heightCm}
              onChange={(event) => set("heightCm", event.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="Weight (kg)">
            <input
              type="number"
              step="0.1"
              min="1"
              value={values.weightKg}
              onChange={(event) => set("weightKg", event.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="Payment status">
            <select
              value={values.paymentStatus}
              onChange={(event) =>
                set("paymentStatus", event.target.value as PaymentStatus)
              }
              className={fieldClass}
            >
              {PAYMENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Plan expires">
            <input
              type="date"
              value={values.planExpiresAt}
              onChange={(event) => set("planExpiresAt", event.target.value)}
              className={fieldClass}
            />
          </Field>
        </div>

        <div className="mt-4 space-y-4">
          <Field label="Address">
            <textarea
              rows={2}
              value={values.address}
              onChange={(event) => set("address", event.target.value)}
              className={areaClass}
            />
          </Field>
          <Field label="Fitness goal">
            <textarea
              rows={2}
              value={values.fitnessGoal}
              onChange={(event) => set("fitnessGoal", event.target.value)}
              className={areaClass}
            />
          </Field>
          <Field label="Plan notes">
            <textarea
              rows={2}
              value={values.planNotes}
              onChange={(event) => set("planNotes", event.target.value)}
              className={areaClass}
            />
          </Field>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-card-border px-5 py-2 text-sm text-muted hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-ink transition hover:brightness-95 disabled:opacity-60"
          >
            {pending ? "Saving…" : isEdit ? "Save changes" : "Add member"}
          </button>
        </div>
      </form>
    </div>
  );
}
