"use client";

import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  CalendarDays,
  RefreshCcw,
  UserPlus,
  Target,
  Banknote,
  Receipt,
  Megaphone,
} from "lucide-react";
import { type DashboardPeriod } from "@/lib/date-utils";

export function DashboardHeader({ userName }: { userName: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPeriod =
    (searchParams.get("period") as DashboardPeriod) || "this_month";

  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams);
    params.set("period", e.target.value);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleRefresh = () => {
    router.refresh();
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Welcome back, {userName}
          </h1>
          <p className="mt-1 text-sm text-muted">{today}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <select
              value={currentPeriod}
              onChange={handlePeriodChange}
              className="h-10 cursor-pointer appearance-none rounded-lg border border-card-border bg-card pl-9 pr-10 text-sm font-medium outline-none transition-colors hover:border-foreground/20 focus:border-accent"
            >
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="last_3_months">Last 3 Months</option>
              <option value="this_year">This Year</option>
            </select>
            <svg
              className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 pointer-events-none text-muted"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
          <button
            onClick={handleRefresh}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-card-border bg-card text-muted transition-colors hover:bg-white/5 hover:text-foreground"
            title="Refresh dashboard"
          >
            <RefreshCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <QuickActionLink
          href="/join"
          icon={<UserPlus className="h-5 w-5" />}
          label="Add Member"
        />
        <QuickActionLink
          href="/users" // Assuming leads are added via users page or a specific modal.
          icon={<Target className="h-5 w-5" />}
          label="Add Lead"
        />
        <QuickActionLink
          href="/payments"
          icon={<Banknote className="h-5 w-5" />}
          label="Record Payment"
        />
        <QuickActionLink
          href="/expenses"
          icon={<Receipt className="h-5 w-5" />}
          label="Add Expense"
        />
        <QuickActionLink
          href="/announcements"
          icon={<Megaphone className="h-5 w-5" />}
          label="Announcement"
        />
      </div>
    </div>
  );
}

function QuickActionLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center gap-2 rounded-xl border border-card-border bg-card py-4 text-sm font-medium text-foreground/80 transition-all hover:border-accent/50 hover:bg-white/5 hover:text-accent hover:shadow-md"
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
