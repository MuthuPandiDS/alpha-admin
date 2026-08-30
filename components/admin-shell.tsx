import { signOut } from "@/auth";
import Link from "next/link";

export function AdminShell({
  user,
  children,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null };
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex w-60 shrink-0 flex-col border-r border-card-border bg-card px-5 py-6 overflow-y-auto">
        <Link href="/users" className="text-lg font-semibold tracking-tight">
          Alpha X
        </Link>
        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted">
          Admin
        </p>
        <nav className="mt-8 flex flex-col gap-1 text-sm">
          <Link
            href="/dashboard"
            className="rounded-lg px-3 py-2 text-foreground/90 hover:bg-white/5"
          >
            Dashboard
          </Link>
          <Link
            href="/users"
            className="rounded-lg px-3 py-2 text-foreground/90 hover:bg-white/5"
          >
            Members
          </Link>
          <Link
            href="/payments"
            className="rounded-lg px-3 py-2 text-foreground/90 hover:bg-white/5"
          >
            Payments
          </Link>
          <Link
            href="/expenses"
            className="rounded-lg px-3 py-2 text-foreground/90 hover:bg-white/5"
          >
            Expenses
          </Link>
          <Link
            href="/plans"
            className="rounded-lg px-3 py-2 text-foreground/90 hover:bg-white/5"
          >
            Plans
          </Link>
          <Link
            href="/qr-signup"
            className="rounded-lg px-3 py-2 text-foreground/90 hover:bg-white/5"
          >
            QR sign-up
          </Link>
          <Link
            href="/announcements"
            className="rounded-lg px-3 py-2 text-foreground/90 hover:bg-white/5"
          >
            Announcements
          </Link>
        </nav>
        <div className="mt-auto border-t border-card-border pt-4">
          <p className="truncate text-sm">{user.name ?? "Admin"}</p>
          <p className="truncate text-xs text-muted">{user.email}</p>
          <form
            className="mt-3"
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="text-sm text-muted underline-offset-4 hover:text-foreground hover:underline"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden px-8 py-8">{children}</main>
    </div>
  );
}
