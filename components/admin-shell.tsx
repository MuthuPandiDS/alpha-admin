import { signOut } from "@/auth";
import { LogOut } from "lucide-react";
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
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-card-border pt-5">
          <div className="flex items-center gap-3 overflow-hidden">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt=""
                className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-white/10"
              />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent ring-1 ring-white/10">
                {(user.name ?? "A").charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {user.name ?? "Admin"}
              </p>
              <p className="truncate text-xs text-muted">{user.email}</p>
            </div>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              title="Sign out"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-white/5 hover:text-danger"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden px-8 py-8">{children}</main>
    </div>
  );
}
