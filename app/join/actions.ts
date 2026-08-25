"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { memberOnboardingSchema } from "@/lib/member-profile";
import { prisma } from "@/lib/prisma";

export type OnboardingState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
};

export const initialOnboardingState: OnboardingState = { status: "idle" };

export async function submitMemberProfile(
  _prevState: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      status: "error",
      message: "Your session has expired. Please sign in with Google again.",
    };
  }

  const parsed = memberOnboardingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= issue.message;
    }
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  const profile = parsed.data;

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: profile.name,
      phone: profile.phone,
      dateOfBirth: profile.dateOfBirth,
      gender: profile.gender ?? null,
      heightCm: profile.heightCm,
      weightKg: profile.weightKg,
      address: profile.address ?? null,
      emergencyContact: profile.emergencyContact ?? null,
      fitnessGoal: profile.fitnessGoal ?? null,
      profileCompletedAt: new Date(),
      measurements: {
        create: { weightKg: profile.weightKg, heightCm: profile.heightCm },
      },
    },
  });

  revalidatePath("/join");
  revalidatePath("/users");

  return { status: "success" };
}
