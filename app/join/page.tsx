import QRCode from "qrcode";
import { auth, signIn, signOut } from "@/auth";
import { MemberOnboardingForm } from "@/components/member-onboarding-form";
import { MemberPaymentPanel } from "@/components/member-payment-panel";
import { isCashfreeConfigured } from "@/lib/cashfree";
import { GENDER_LABELS, getAge, type Gender } from "@/lib/member-profile";
import { prisma } from "@/lib/prisma";
import { getMemberMembership, syncMemberPayments } from "@/server/member-payments";

export const metadata = {
  title: "Join Alpha X",
  description: "Register as an Alpha X gym member",
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-start justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-xl rounded-2xl border border-card-border bg-card p-6 shadow-xl sm:p-8">
        <p className="text-sm font-medium tracking-[0.2em] text-accent uppercase">
          Alpha X
        </p>
        {children}
      </div>
    </main>
  );
}

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  const query = await searchParams;

  if (!session?.user?.id) {
    return (
      <Shell>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Gym membership sign-up
        </h1>
        <p className="mt-2 text-muted">
          Sign in with your Google account to register. It only takes a minute —
          you will fill in your basic details next.
        </p>
        <form
          className="mt-8"
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/join" });
          }}
        >
          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-ink transition hover:brightness-95"
          >
            Continue with Google
          </button>
        </form>
      </Shell>
    );
  }

  const member = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      phone: true,
      dateOfBirth: true,
      gender: true,
      heightCm: true,
      weightKg: true,
      profileCompletedAt: true,
    },
  });

  if (!member) {
    return (
      <Shell>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Something went wrong
        </h1>
        <p className="mt-2 text-muted">
          We could not find your account. Please sign out and scan the QR code
          again.
        </p>
      </Shell>
    );
  }

  if (!member.profileCompletedAt) {
    return (
      <Shell>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Tell us about yourself
        </h1>
        <p className="mt-2 text-muted">
          Signed in as {member.email}. Fill in your details once — the gym team
          sees them straight away.
        </p>
        <MemberOnboardingForm
          defaultName={member.name ?? ""}
          email={member.email ?? ""}
        />
      </Shell>
    );
  }

  const age = getAge(member.dateOfBirth);

  // Cashfree bounces the payer back here with the link/order in the query string,
  // so pull the fresh status before rendering instead of waiting for the webhook.
  if (query.link_id || query.order_id || query.cf_link_id) {
    await syncMemberPayments(session.user.id);
  }

  const membership = await getMemberMembership(session.user.id);
  const pendingQrSvg = membership.pendingPayment?.linkUrl
    ? await QRCode.toString(membership.pendingPayment.linkUrl, {
        type: "svg",
        margin: 1,
        errorCorrectionLevel: "M",
      })
    : null;

  return (
    <Shell>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">
        You are registered
      </h1>
      <p className="mt-2 text-muted">
        Welcome{member.name ? `, ${member.name}` : ""}! Your details are with
        the gym team. Ask the front desk if anything needs updating.
      </p>

      <dl className="mt-8 grid gap-4 sm:grid-cols-2">
        {[
          ["Email", member.email],
          ["Phone", member.phone],
          [
            "Date of birth",
            member.dateOfBirth
              ? `${member.dateOfBirth.toLocaleDateString()}${age !== null ? ` (${age})` : ""}`
              : null,
          ],
          [
            "Gender",
            member.gender ? GENDER_LABELS[member.gender as Gender] : null,
          ],
          ["Height", member.heightCm ? `${member.heightCm} cm` : null],
          ["Weight", member.weightKg ? `${member.weightKg} kg` : null],
        ].map(([label, value]) => (
          <div key={label as string}>
            <dt className="text-xs uppercase tracking-wide text-muted">
              {label}
            </dt>
            <dd className="mt-1 text-sm">{value ?? "—"}</dd>
          </div>
        ))}
      </dl>

      <MemberPaymentPanel
        plan={membership.plan}
        planExpiresAt={membership.planExpiresAt}
        payments={membership.payments}
        pendingPayment={membership.pendingPayment}
        pendingQrSvg={pendingQrSvg}
        cashfreeConfigured={isCashfreeConfigured()}
      />

      <form
        className="mt-8"
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/join" });
        }}
      >
        <button
          type="submit"
          className="text-sm text-muted underline-offset-4 hover:text-foreground hover:underline"
        >
          Sign out
        </button>
      </form>
    </Shell>
  );
}
