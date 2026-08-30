"use client";

import Link from "next/link";
import { Megaphone, Plus, Users, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function AnnouncementsPanel({
  announcements,
}: {
  announcements: any[];
}) {
  const lastAnnouncementTime =
    announcements.length > 0
      ? formatDistanceToNow(new Date(announcements[0].createdAt), { addSuffix: true })
      : "No announcements yet";

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-card-border bg-card p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-accent" /> Announcements
          </h2>
          <p className="mt-1 text-xs text-muted">
            Last announcement: {lastAnnouncementTime}
          </p>
        </div>
        <Link
          href="/announcements"
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:brightness-95"
        >
          <Plus className="h-4 w-4" /> Create
        </Link>
      </div>

      {announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-card-border py-12 text-center text-muted">
          <Megaphone className="mb-2 h-8 w-8 opacity-50" />
          <p>No active announcements.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {announcements.map((a, i) => (
            <div key={i} className="flex flex-col justify-between rounded-xl border border-card-border bg-background p-5 transition-colors hover:border-foreground/20">
              <div>
                <h3 className="font-semibold text-lg text-foreground">{a.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm text-muted whitespace-pre-wrap">{a.body}</p>
              </div>
              
              <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-card-border pt-4 text-xs text-muted">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> 
                  {new Date(a.createdAt).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> All Members
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
