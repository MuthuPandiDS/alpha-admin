"use client";

import { useActionState } from "react";
import {
  initialOnboardingState,
  submitMemberProfile,
} from "@/app/join/actions";
import { GENDERS, GENDER_LABELS } from "@/lib/member-profile";

const fieldClass =
  "h-11 w-full rounded-lg border border-card-border bg-background px-3 text-sm outline-none focus:border-accent";

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
  const [state, formAction, pending] = useActionState(
    submitMemberProfile,
    initialOnboardingState,
  );
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <div>
        <label htmlFor="name" className="text-sm text-muted">
          Full name
        </label>
        <input
          id="name"
          name="name"
          defaultValue={defaultName}
          required
          className={fieldClass}
        />
        <FieldError message={errors.name} />
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
            name="phone"
            type="tel"
            required
            className={fieldClass}
          />
          <FieldError message={errors.phone} />
        </div>
        <div>
          <label htmlFor="dateOfBirth" className="text-sm text-muted">
            Date of birth
          </label>
          <input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            required
            className={fieldClass}
          />
          <FieldError message={errors.dateOfBirth} />
        </div>
        <div>
          <label htmlFor="gender" className="text-sm text-muted">
            Gender
          </label>
          <select id="gender" name="gender" defaultValue="" className={fieldClass}>
            <option value="">Select…</option>
            {GENDERS.map((gender) => (
              <option key={gender} value={gender}>
                {GENDER_LABELS[gender]}
              </option>
            ))}
          </select>
          <FieldError message={errors.gender} />
        </div>
        <div>
          <label htmlFor="emergencyContact" className="text-sm text-muted">
            Emergency contact
          </label>
          <input
            id="emergencyContact"
            name="emergencyContact"
            placeholder="Name and phone"
            className={fieldClass}
          />
          <FieldError message={errors.emergencyContact} />
        </div>
        <div>
          <label htmlFor="heightCm" className="text-sm text-muted">
            Height (cm)
          </label>
          <input
            id="heightCm"
            name="heightCm"
            type="number"
            step="0.1"
            min="1"
            required
            className={fieldClass}
          />
          <FieldError message={errors.heightCm} />
        </div>
        <div>
          <label htmlFor="weightKg" className="text-sm text-muted">
            Weight (kg)
          </label>
          <input
            id="weightKg"
            name="weightKg"
            type="number"
            step="0.1"
            min="1"
            required
            className={fieldClass}
          />
          <FieldError message={errors.weightKg} />
        </div>
      </div>

      <div>
        <label htmlFor="address" className="text-sm text-muted">
          Address
        </label>
        <textarea
          id="address"
          name="address"
          rows={2}
          className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <FieldError message={errors.address} />
      </div>

      <div>
        <label htmlFor="fitnessGoal" className="text-sm text-muted">
          Fitness goal
        </label>
        <textarea
          id="fitnessGoal"
          name="fitnessGoal"
          rows={2}
          placeholder="Weight loss, strength, general fitness…"
          className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <FieldError message={errors.fitnessGoal} />
      </div>

      {state.status === "error" && state.message ? (
        <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="flex h-12 w-full items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-ink transition hover:brightness-95 disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Submit registration"}
      </button>
    </form>
  );
}
