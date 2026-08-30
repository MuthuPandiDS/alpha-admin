import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-10 overflow-y-auto pr-2 pb-10">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="h-8 w-64 animate-pulse rounded-md bg-white/5" />
            <div className="mt-2 h-4 w-40 animate-pulse rounded-md bg-white/5" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-[38px] w-36 animate-pulse rounded-lg bg-white/5" />
            <div className="h-10 w-10 animate-pulse rounded-lg bg-white/5" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-[88px] animate-pulse rounded-xl bg-white/5" />
          ))}
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex h-32 flex-col rounded-2xl bg-white/5 p-6 shadow-sm">
            <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
            <div className="mt-3 h-8 w-32 animate-pulse rounded bg-white/10" />
            <div className="mt-3 h-4 w-40 animate-pulse rounded bg-white/10" />
          </div>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="h-[400px] animate-pulse rounded-2xl bg-white/5 shadow-sm" />
        <div className="h-[400px] animate-pulse rounded-2xl bg-white/5 shadow-sm" />
      </div>

      <div className="flex flex-col items-center justify-center py-10 opacity-50 text-muted gap-2">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm">Crunching the numbers...</span>
      </div>
    </div>
  );
}
