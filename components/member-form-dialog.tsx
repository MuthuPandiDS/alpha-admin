"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  GENDERS,
  GENDER_LABELS,
  adminMemberSchema,
  toDateInputValue,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
} from "@/lib/member-profile";
import { PAYMENT_STATUSES, type PaymentStatus } from "@/lib/plan";
import { trpc } from "@/lib/trpc";
import { Button, DropdownSelect } from "@/components/ui-primitives";

export type MemberFormValues = z.input<typeof adminMemberSchema> & { id?: string };

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
  leadStatus: string | null;
  leadFollowUpAt: Date | string | null;
  leadNotes: string | null;
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
  leadStatus: "",
  leadFollowUpAt: "",
  leadNotes: "",
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
    leadStatus: member.leadStatus ?? "",
    leadFollowUpAt: toDateInputValue(member.leadFollowUpAt),
    leadNotes: member.leadNotes ?? "",
  };
}

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
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
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
  const isEdit = Boolean(initialValues?.id);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<MemberFormValues>({
    resolver: zodResolver(adminMemberSchema.extend({ id: z.string().optional() })),
    defaultValues: initialValues ?? emptyValues,
  });

  const createMember = trpc.users.create.useMutation();
  const updateMember = trpc.users.update.useMutation();
  const pending = createMember.isPending || updateMember.isPending;

  const onSubmit = async (values: any) => {
    setSubmitError(null);
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
      leadStatus: values.leadStatus,
      leadFollowUpAt: values.leadFollowUpAt,
      leadNotes: values.leadNotes,
    };

    try {
      if (initialValues?.id) {
        await updateMember.mutateAsync({ ...payload, id: initialValues.id });
      } else {
        await createMember.mutateAsync(payload);
      }
      onSaved();
    } catch (mutationError) {
      setSubmitError(
        mutationError instanceof Error
          ? mutationError.message
          : "Could not save this member.",
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="my-8 w-full max-w-2xl rounded-xl border border-card-border bg-card p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground/90">
              {isEdit ? "Edit member" : "Add member"}
            </h2>
            <p className="mt-1 text-xs text-muted">
              {isEdit
                ? "Update the member's profile and plan details."
                : "Create a member manually. They can still sign in with the same email later."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted hover:bg-white/5 hover:text-foreground"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field label="Full name" error={errors.name?.message}>
            <input {...register("name")} className={fieldClass} placeholder="e.g. John Doe" />
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <input type="email" {...register("email")} className={fieldClass} placeholder="e.g. john@example.com" />
          </Field>
          <Field label="Phone" error={errors.phone?.message}>
            <input type="tel" {...register("phone")} className={fieldClass} placeholder="Optional" />
          </Field>
          <Field label="Date of birth" error={errors.dateOfBirth?.message}>
            <input type="date" {...register("dateOfBirth")} className={fieldClass} />
          </Field>
          <Field label="Gender" error={errors.gender?.message}>
            <Controller
              name="gender"
              control={control}
              render={({ field }) => (
                <DropdownSelect
                  value={(field.value as string) || ""}
                  onChange={field.onChange}
                  options={[
                    { value: "", label: "Unspecified" },
                    ...GENDERS.map((g) => ({ value: g, label: GENDER_LABELS[g] })),
                  ]}
                  className="w-full"
                  triggerClassName="h-10 w-full"
                />
              )}
            />
          </Field>
          <Field label="Emergency contact" error={errors.emergencyContact?.message}>
            <input {...register("emergencyContact")} className={fieldClass} placeholder="Optional" />
          </Field>
          <Field label="Height (cm)" error={errors.heightCm?.message}>
            <input type="number" step="0.1" min="1" {...register("heightCm")} className={fieldClass} placeholder="Optional" />
          </Field>
          <Field label="Weight (kg)" error={errors.weightKg?.message}>
            <input type="number" step="0.1" min="1" {...register("weightKg")} className={fieldClass} placeholder="Optional" />
          </Field>
          <Field label="Payment status" error={errors.paymentStatus?.message}>
            <Controller
              name="paymentStatus"
              control={control}
              render={({ field }) => (
                <DropdownSelect
                  value={(field.value as string) || "UNPAID"}
                  onChange={field.onChange}
                  options={PAYMENT_STATUSES.map((s) => ({ value: s, label: s }))}
                  className="w-full"
                  triggerClassName="h-10 w-full"
                />
              )}
            />
          </Field>
          <Field label="Plan expires" error={errors.planExpiresAt?.message}>
            <input type="date" {...register("planExpiresAt")} className={fieldClass} />
          </Field>
        </div>

        <div className="mt-5 space-y-5">
          <Field label="Address" error={errors.address?.message}>
            <textarea rows={2} {...register("address")} className={areaClass} placeholder="Optional" />
          </Field>
          <Field label="Fitness goal" error={errors.fitnessGoal?.message}>
            <textarea rows={2} {...register("fitnessGoal")} className={areaClass} placeholder="Optional" />
          </Field>
          <Field label="Plan notes" error={errors.planNotes?.message}>
            <textarea rows={2} {...register("planNotes")} className={areaClass} placeholder="Optional" />
          </Field>
        </div>

        <div className="mt-8">
          <h3 className="mb-4 text-sm font-semibold tracking-tight text-foreground/90">Lead Tracking (Optional)</h3>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Lead Status" error={errors.leadStatus?.message}>
              <Controller
                name="leadStatus"
                control={control}
                render={({ field }) => (
                  <DropdownSelect
                    value={(field.value as string) || ""}
                    onChange={field.onChange}
                    options={[
                      { value: "", label: "Not a lead (Active Member)" },
                      ...LEAD_STATUSES.map((s) => ({ value: s, label: LEAD_STATUS_LABELS[s] })),
                    ]}
                    className="w-full"
                    triggerClassName="h-10 w-full"
                  />
                )}
              />
            </Field>
            <Field label="Follow-up Date" error={errors.leadFollowUpAt?.message}>
              <input type="date" {...register("leadFollowUpAt")} className={fieldClass} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Lead Notes" error={errors.leadNotes?.message}>
                <textarea rows={2} {...register("leadNotes")} className={areaClass} placeholder="Optional notes for follow-up..." />
              </Field>
            </div>
          </div>
        </div>

        {submitError && (
          <p className="mt-5 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
            {submitError}
          </p>
        )}

        <div className="mt-8 flex justify-end gap-3 border-t border-card-border pt-5">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : isEdit ? "Save changes" : "Add member"}
          </Button>
        </div>
      </form>
    </div>
  );
}
