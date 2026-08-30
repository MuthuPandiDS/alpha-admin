import { ExpensesManager } from "@/components/expenses-manager";

export default function ExpensesPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Expenses</h1>
        <p className="mt-1 text-sm text-muted">
          Track gym operating expenses, manage recurring bills, and monitor
          payment status across all categories.
        </p>
      </header>
      <ExpensesManager />
    </div>
  );
}
