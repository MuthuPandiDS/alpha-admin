"use client";

import { AlertTriangle, BellRing, Info, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";

export function InsightsAlerts({
  insights,
  health,
}: {
  insights: { type: "info" | "warning" | "critical"; message: string }[];
  health: {
    status: "healthy" | "attention" | "critical";
    income: number;
    expenses: number;
    profit: number;
    margin: number;
    pending: number;
  };
}) {
  const formatMoney = (paise: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(paise / 100);
  };

  const getHealthConfig = () => {
    switch (health.status) {
      case "healthy":
        return {
          icon: <ShieldCheck className="h-10 w-10 text-emerald-500" />,
          color: "text-emerald-500",
          bg: "bg-emerald-500/10",
          border: "border-emerald-500/20",
          text: "Healthy",
        };
      case "attention":
        return {
          icon: <ShieldQuestion className="h-10 w-10 text-warning" />,
          color: "text-warning",
          bg: "bg-warning/10",
          border: "border-warning/20",
          text: "Needs Attention",
        };
      case "critical":
        return {
          icon: <ShieldAlert className="h-10 w-10 text-danger" />,
          color: "text-danger",
          bg: "bg-danger/10",
          border: "border-danger/20",
          text: "Critical",
        };
    }
  };

  const h = getHealthConfig();

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Financial Health */}
      <div className="flex flex-col gap-6 rounded-2xl border border-card-border bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold tracking-tight">Financial Health</h2>
        <div className={`flex flex-col items-center justify-center rounded-xl border ${h.border} ${h.bg} p-6 text-center`}>
          {h.icon}
          <span className={`mt-3 text-lg font-bold uppercase tracking-wider ${h.color}`}>
            {h.text}
          </span>
        </div>

        <div className="flex flex-col gap-3">
          <HealthRow label="Income (Mtd)" value={formatMoney(health.income)} />
          <HealthRow label="Expenses (Mtd)" value={formatMoney(health.expenses)} />
          <HealthRow label="Net Profit" value={formatMoney(health.profit)} highlight={health.profit >= 0 ? "text-emerald-500" : "text-danger"} />
          <HealthRow label="Profit Margin" value={`${health.margin}%`} />
          <HealthRow label="Pending Payments" value={formatMoney(health.pending)} highlight="text-warning" />
        </div>
      </div>

      {/* Insights & Alerts */}
      <div className="flex flex-col gap-6 rounded-2xl border border-card-border bg-card p-6 shadow-sm lg:col-span-2">
        <div className="flex items-center gap-2">
          <BellRing className="h-5 w-5 text-accent" />
          <h2 className="text-xl font-semibold tracking-tight">Insights & Alerts</h2>
        </div>
        
        {insights.length === 0 ? (
          <p className="text-sm text-muted">No new insights or alerts.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {insights.map((insight, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 rounded-xl border p-4 ${
                  insight.type === "critical"
                    ? "border-danger/20 bg-danger/5"
                    : insight.type === "warning"
                    ? "border-warning/20 bg-warning/5"
                    : "border-card-border bg-background"
                }`}
              >
                {insight.type === "critical" && <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />}
                {insight.type === "warning" && <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />}
                {insight.type === "info" && <Info className="mt-0.5 h-5 w-5 shrink-0 text-accent" />}
                
                <p className={`text-sm ${
                  insight.type === "critical" ? "text-danger font-medium" 
                  : insight.type === "warning" ? "text-warning font-medium" 
                  : "text-foreground"
                }`}>
                  {insight.message}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HealthRow({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className={`font-semibold ${highlight || "text-foreground"}`}>{value}</span>
    </div>
  );
}
