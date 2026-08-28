import { z } from "zod";
import { PAYMENT_STATUSES } from "@/lib/plan";

export const GENDERS = ["MALE", "FEMALE", "OTHER", "UNSPECIFIED"] as const;
export type Gender = (typeof GENDERS)[number];

export const GENDER_LABELS: Record<Gender, string> = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
  UNSPECIFIED: "Prefer not to say",
};

export const JOIN_SOURCES = ["ADMIN", "QR"] as const;
export type JoinSource = (typeof JOIN_SOURCES)[number];

export const JOIN_SOURCE_LABELS: Record<JoinSource, string> = {
  ADMIN: "Added by admin",
  QR: "QR self sign-up",
};

const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalText = (max: number) =>
  z.preprocess(blankToUndefined, z.string().trim().max(max).optional());

const optionalNumber = (max: number) =>
  z.preprocess(
    (value) => (blankToUndefined(value) === undefined ? undefined : Number(value)),
    z.number().positive().max(max).optional(),
  );

const optionalDate = z.preprocess(
  (value) => (blankToUndefined(value) === undefined ? undefined : new Date(String(value))),
  z.date().max(new Date(), "Date cannot be in the future").optional(),
);

const requiredDate = z.preprocess(
  (value) => (blankToUndefined(value) === undefined ? undefined : new Date(String(value))),
  z.date().max(new Date(), "Date of birth cannot be in the future"),
);

const genderSchema = z.preprocess(blankToUndefined, z.enum(GENDERS).optional());

/** Fields a member fills in themselves after scanning the gym QR code. */
export const memberOnboardingSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name").max(120),
  phone: z.string().trim().min(6, "Please enter a valid phone number").max(30),
  dateOfBirth: requiredDate,
  gender: genderSchema,
  heightCm: z.preprocess(
    (value) => (blankToUndefined(value) === undefined ? undefined : Number(value)),
    z.number({ error: "Height is required" }).positive().max(300),
  ),
  weightKg: z.preprocess(
    (value) => (blankToUndefined(value) === undefined ? undefined : Number(value)),
    z.number({ error: "Weight is required" }).positive().max(400),
  ),
  address: optionalText(300),
  emergencyContact: optionalText(120),
  fitnessGoal: optionalText(300),
  photo: optionalText(500),
});

export type MemberOnboardingInput = z.infer<typeof memberOnboardingSchema>;

/** Fields an admin can set when adding or editing a member from the dashboard. */
export const adminMemberSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  email: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
    z.email("A valid email is required"),
  ),
  phone: optionalText(30),
  dateOfBirth: optionalDate,
  gender: genderSchema,
  heightCm: optionalNumber(300),
  weightKg: optionalNumber(400),
  address: optionalText(300),
  emergencyContact: optionalText(120),
  fitnessGoal: optionalText(300),
  paymentStatus: z.enum(PAYMENT_STATUSES).default("UNPAID"),
  planExpiresAt: optionalDate,
  planNotes: optionalText(500),
});

export function getAge(dateOfBirth: Date | null, now = new Date()): number | null {
  if (!dateOfBirth) return null;
  let age = now.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = now.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dateOfBirth.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

export function toDateInputValue(date: Date | string | null | undefined): string {
  if (!date) return "";
  const value = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) return "";
  return value.toISOString().slice(0, 10);
}
