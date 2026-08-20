import { UsersTable } from "@/components/users-table";

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <header>
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
