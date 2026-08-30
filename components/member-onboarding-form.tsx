"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { submitMemberProfile } from "@/app/join/actions";
import { GENDERS, GENDER_LABELS, memberOnboardingSchema, type MemberOnboardingInput } from "@/lib/member-profile";
import { PhotoUpload } from "@/components/photo-upload";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const fieldClass =
  "h-11 w-full rounded-lg border border-card-border bg-background px-3 text-sm outline-none focus:border-accent";

function FormSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
}: {
  value?: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center justify-between transition-colors ${fieldClass} ${
          open ? "border-accent" : ""
        }`}
      >
        <span className={selected ? "text-foreground" : "text-muted"}>
          {selected?.label || placeholder}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-40 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-card-border bg-card py-1 shadow-xl shadow-black/40">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`flex w-full cursor-pointer items-center justify-between px-3 py-2.5 text-left text-sm transition hover:bg-white/5 ${
                option.value === value ? "text-accent font-medium" : "text-foreground/90"
              }`}
            >
              <span>{option.label}</span>
              {option.value === value && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-danger">{message}</p>;
}

export function MemberOnboardingForm({
  defaultName,
  email,
}: {
  defaultName: string;
  email: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<MemberOnboardingInput>({
    resolver: zodResolver(memberOnboardingSchema) as any,
    defaultValues: {
      name: defaultName,
      phone: "",
      gender: undefined,
      heightCm: undefined,
      weightKg: undefined,
      address: "",
      emergencyContact: "",
      fitnessGoal: "",
      photo: "",
    },
  });

  const onSubmit = form.handleSubmit((data) => {
    setServerError(null);
    startTransition(async () => {
      const res = await submitMemberProfile(data);
      if (res.status === "error") {
        setServerError(res.message);
      }
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
      {/* Photo upload */}
      <PhotoUpload onUploaded={(url) => form.setValue("photo", url)} />

      <div>
        <label htmlFor="name" className="text-sm text-muted">
          Full name
        </label>
        <input
          id="name"
          {...form.register("name")}
          required
          className={fieldClass}
        />
        <FieldError message={form.formState.errors.name?.message} />
      </div>

      <div>
        <label className="text-sm text-muted">Email</label>
        <input value={email} readOnly disabled className={`${fieldClass} opacity-60`} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="phone" className="text-sm text-muted">
            Phone number
          </label>
          <input
            id="phone"
            {...form.register("phone")}
            type="tel"
            required
            className={fieldClass}
          />
          <FieldError message={form.formState.errors.phone?.message} />
        </div>
        <div>
          <label htmlFor="dateOfBirth" className="text-sm text-muted">
            Date of birth
          </label>
          <input
            id="dateOfBirth"
            {...form.register("dateOfBirth")}
            type="date"
            required
            className={fieldClass}
          />
          <FieldError message={form.formState.errors.dateOfBirth?.message} />
        </div>
        <div>
          <label htmlFor="gender" className="text-sm text-muted">
            Gender
          </label>
          <Controller
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormSelect
                value={field.value}
                onChange={field.onChange}
                options={GENDERS.map((g) => ({ value: g, label: GENDER_LABELS[g] }))}
              />
            )}
          />
          <FieldError message={form.formState.errors.gender?.message} />
        </div>
        <div>
          <label htmlFor="emergencyContact" className="text-sm text-muted">
            Emergency contact
          </label>
          <input
            id="emergencyContact"
            {...form.register("emergencyContact")}
            placeholder="Name and phone"
            className={fieldClass}
          />
          <FieldError message={form.formState.errors.emergencyContact?.message} />
        </div>
        <div>
          <label htmlFor="heightCm" className="text-sm text-muted">
            Height (cm)
          </label>
          <input
            id="heightCm"
            {...form.register("heightCm")}
            type="number"
            step="0.1"
            min="1"
            required
            className={fieldClass}
          />
          <FieldError message={form.formState.errors.heightCm?.message} />
        </div>
        <div>
          <label htmlFor="weightKg" className="text-sm text-muted">
            Weight (kg)
          </label>
          <input
            id="weightKg"
            {...form.register("weightKg")}
            type="number"
            step="0.1"
            min="1"
            required
            className={fieldClass}
          />
          <FieldError message={form.formState.errors.weightKg?.message} />
        </div>
      </div>

      <div>
        <label htmlFor="address" className="text-sm text-muted">
          Address
        </label>
        <textarea
          id="address"
          {...form.register("address")}
          rows={2}
          className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <FieldError message={form.formState.errors.address?.message} />
      </div>

      <div>
        <label htmlFor="fitnessGoal" className="text-sm text-muted">
          Fitness goal
        </label>
        <textarea
          id="fitnessGoal"
          {...form.register("fitnessGoal")}
          rows={2}
          placeholder="Weight loss, strength, general fitness…"
          className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <FieldError message={form.formState.errors.fitnessGoal?.message} />
      </div>

      {serverError ? (
        <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {serverError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="flex h-12 w-full items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-ink transition hover:brightness-95 disabled:opacity-60"
      >
        {isPending ? "Submitting…" : "Submit registration"}
      </button>
    </form>
  );
}
