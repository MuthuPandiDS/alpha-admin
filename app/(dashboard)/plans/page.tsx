import { PlansManager } from "@/components/plans-manager";

export default function PlansPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Membership plans</h1>
        <p className="mt-1 text-sm text-muted">
          Create the plans you sell, mark one as the default for new joiners, and
          restrict discounted plans to a hand-picked set of members.
        </p>
      </header>
      <PlansManager />
    </div>
  );
}
