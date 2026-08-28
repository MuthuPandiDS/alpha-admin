"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDefaultPlanId } from "@/lib/default-plan";
import { memberOnboardingSchema } from "@/lib/member-profile";
import type { OnboardingState } from "@/lib/onboarding-state";
import type { PaymentActionState } from "@/lib/payment-action-state";
import { prisma } from "@/lib/prisma";
import { startMemberPayment, syncMemberPayments } from "@/server/member-payments";

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
  const current = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { planId: true },
  });
  const defaultPlanId = current?.planId ? null : await getDefaultPlanId(prisma);

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(defaultPlanId ? { planId: defaultPlanId } : {}),
      name: profile.name,
      phone: profile.phone,
      dateOfBirth: profile.dateOfBirth,
      gender: profile.gender ?? null,
      heightCm: profile.heightCm,
      weightKg: profile.weightKg,
      address: profile.address ?? null,
      emergencyContact: profile.emergencyContact ?? null,
      fitnessGoal: profile.fitnessGoal ?? null,
      ...(profile.photo ? { image: profile.photo } : {}),
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

/**
 * Raises (or reuses) the member's Cashfree link and sends them to the hosted
 * checkout, where UPI, cards and netbanking are all available.
 */
export async function payMembership(): Promise<PaymentActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      status: "error",
      message: "Your session has expired. Please sign in with Google again.",
    };
  }

  let checkoutUrl: string;
  try {
    checkoutUrl = await startMemberPayment(session.user.id);
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Could not start the payment. Please try again.",
    };
  }

  revalidatePath("/join");
  redirect(checkoutUrl);
}

/** Pulls the latest status from Cashfree for members whose webhook was slow. */
export async function refreshMembershipPayment(): Promise<PaymentActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      status: "error",
      message: "Your session has expired. Please sign in with Google again.",
    };
  }

  await syncMemberPayments(session.user.id);
  revalidatePath("/join");
  revalidatePath("/users");

  return { status: "success" };
}
