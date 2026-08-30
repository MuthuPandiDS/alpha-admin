"use client";

import { CalendarClock, AlertCircle, CheckCircle2 } from "lucide-react";

export function UpcomingActivity({
  upcomingPayments,
  upcomingExpenses,
}: {
  upcomingPayments: any[];
  upcomingExpenses: any[];
}) {
  const formatMoney = (paise: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(paise / 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OVERDUE":
        return "text-danger bg-danger/10 border-danger/20";
      case "DUE_TODAY":
        return "text-warning bg-warning/10 border-warning/20";
      case "UPCOMING":
        return "text-muted bg-white/5 border-card-border";
      default:
        return "text-muted bg-white/5 border-card-border";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "OVERDUE":
        return <AlertCircle className="h-4 w-4" />;
      case "DUE_TODAY":
        return <CalendarClock className="h-4 w-4" />;
      case "PAID":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      default:
        return <CalendarClock className="h-4 w-4" />;
    }
  };

  const formatStatus = (status: string) => {
    return status.replace("_", " ");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-4 rounded-2xl border border-card-border bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold tracking-tight">Upcoming Payments</h2>
        {upcomingPayments.length === 0 ? (
          <p className="text-sm text-muted">No upcoming or overdue payments.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {upcomingPayments.map((p, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl border border-card-border bg-background p-4">
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-foreground">{p.name}</span>
                  <span className="text-xs text-muted">Due: {p.dueDate}</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-semibold text-accent">{formatMoney(p.amount)}</span>
                  <span
                    className={`flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${getStatusColor(
                      p.status
                    )}`}
                  >
                    {getStatusIcon(p.status)}
                    {formatStatus(p.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-card-border bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold tracking-tight">Upcoming Expenses</h2>
        {upcomingExpenses.length === 0 ? (
          <p className="text-sm text-muted">No upcoming or overdue expenses.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {upcomingExpenses.map((e, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl border border-card-border bg-background p-4">
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-foreground">{e.name}</span>
                  <span className="text-xs text-muted">Due: {e.dueDate}</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-semibold text-danger">{formatMoney(e.amount)}</span>
                  <span
                    className={`flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${getStatusColor(
                      e.status
                    )}`}
                  >
                    {getStatusIcon(e.status)}
                    {formatStatus(e.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
