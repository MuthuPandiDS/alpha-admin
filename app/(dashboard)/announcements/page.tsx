import { AnnouncementsManager } from "@/components/announcements-manager";

export default function AnnouncementsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Announcements</h1>
        <p className="mt-1 text-sm text-muted">
          Create, edit, and schedule home-screen announcements. Members only
          see posts that are currently active.
        </p>
      </header>
      <AnnouncementsManager />
    </div>
  );
}
