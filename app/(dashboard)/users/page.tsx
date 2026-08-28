import { UsersTable } from "@/components/users-table";

export default function UsersPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <header className="shrink-0">
        <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
        <p className="mt-1 text-sm text-muted">
          Search, filter by plan status, and open a member for full profile
          details.
        </p>
      </header>
      <UsersTable />
    </div>
  );
}
