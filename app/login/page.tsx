import { signIn } from "@/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const denied = error === "AccessDenied" || error === "Configuration";

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-card-border bg-card p-8 shadow-xl">
        <p className="text-sm font-medium tracking-[0.2em] text-accent uppercase">
          Alpha X
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Gym admin
        </h1>
        <p className="mt-2 text-muted">
          Sign in with a Google account that is on the admin allowlist.
        </p>

        {denied ? (
          <p className="mt-6 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            That Google account is not allowed to access this admin app.
          </p>
        ) : null}

        <form
          className="mt-8"
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/users" });
          }}
        >
          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-ink transition hover:brightness-95"
          >
            Continue with Google
          </button>
        </form>
      </div>
    </main>
  );
}
