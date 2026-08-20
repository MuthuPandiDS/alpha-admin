import type { PlanStatus } from "@/lib/plan";

const planLabels: Record<PlanStatus, string> = {
  active: "Active",
  expiring_soon: "Expiring soon",
  expired: "Expired",
};

const planClass: Record<PlanStatus, string> = {
  active: "bg-accent/15 text-accent",
  expiring_soon: "bg-warn/15 text-warn",
  expired: "bg-danger/15 text-danger",
};

export function PlanBadge({ status }: { status: PlanStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${planClass[status]}`}
    >
      {planLabels[status]}
    </span>
  );
}

export function PaymentBadge({ status }: { status: string }) {
  const tone =
    status === "PAID"
      ? "bg-accent/15 text-accent"
      : status === "OVERDUE"
        ? "bg-danger/15 text-danger"
        : "bg-white/10 text-muted";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}>
      {status.toLowerCase()}
    </span>
  );
}
