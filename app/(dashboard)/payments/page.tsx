import { PaymentsTable } from "@/components/payments-table";

export default function PaymentsPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <header className="shrink-0">
        <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
        <p className="mt-1 text-sm text-muted">
          Every Cashfree link and offline collection raised from the dashboard,
          with live status from the gateway.
        </p>
      </header>
      <PaymentsTable />
    </div>
  );
}
