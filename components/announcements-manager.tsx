"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";

type Draft = {
  id?: string;
  title: string;
  body: string;
  imageUrl: string;
  startsAt: string;
  endsAt: string;
};

function emptyDraft(): Draft {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 7);
  return {
    title: "",
    body: "",
    imageUrl: "",
    startsAt: toLocalInput(start),
    endsAt: toLocalInput(end),
  };
}

function toLocalInput(value: Date | string) {
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function isActive(startsAt: Date | string, endsAt: Date | string, now = new Date()) {
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  const t = now.getTime();
  return start <= t && t <= end;
}

export function AnnouncementsManager() {
  const list = trpc.announcements.list.useQuery();
  const active = trpc.announcements.active.useQuery();
  const utils = trpc.useUtils();
  const create = trpc.announcements.create.useMutation({
    onSuccess: () => {
      utils.announcements.invalidate();
      setDraft(emptyDraft());
    },
  });
  const update = trpc.announcements.update.useMutation({
    onSuccess: () => {
      utils.announcements.invalidate();
      setDraft(emptyDraft());
    },
  });
  const remove = trpc.announcements.delete.useMutation({
    onSuccess: () => utils.announcements.invalidate(),
  });
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const payload = {
      title: draft.title,
      body: draft.body,
      imageUrl: draft.imageUrl,
      startsAt: new Date(draft.startsAt),
      endsAt: new Date(draft.endsAt),
    };
    if (draft.id) {
      update.mutate({ id: draft.id, ...payload });
    } else {
      create.mutate(payload);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <form
        onSubmit={submit}
        className="space-y-4 rounded-xl border border-card-border bg-card p-5"
      >
        <h2 className="text-lg font-medium">
          {draft.id ? "Edit announcement" : "New announcement"}
        </h2>
        <label className="grid gap-1 text-sm">
          Title
          <input
            required
            value={draft.title}
            onChange={(event) =>
              setDraft((current) => ({ ...current, title: event.target.value }))
            }
            className="h-10 rounded-lg border border-card-border bg-background px-3"
          />
        </label>
        <label className="grid gap-1 text-sm">
          Body
          <textarea
            required
            rows={5}
            value={draft.body}
            onChange={(event) =>
              setDraft((current) => ({ ...current, body: event.target.value }))
            }
            className="rounded-lg border border-card-border bg-background px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          Image URL (optional)
          <input
            value={draft.imageUrl}
            onChange={(event) =>
              setDraft((current) => ({ ...current, imageUrl: event.target.value }))
            }
            className="h-10 rounded-lg border border-card-border bg-background px-3"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Starts
            <input
              type="datetime-local"
              required
              value={draft.startsAt}
              onChange={(event) =>
                setDraft((current) => ({ ...current, startsAt: event.target.value }))
              }
              className="h-10 rounded-lg border border-card-border bg-background px-3"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Ends
            <input
              type="datetime-local"
              required
              value={draft.endsAt}
              onChange={(event) =>
                setDraft((current) => ({ ...current, endsAt: event.target.value }))
              }
              className="h-10 rounded-lg border border-card-border bg-background px-3"
            />
          </label>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={create.isPending || update.isPending}
            className="h-10 rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink disabled:opacity-60"
          >
            {draft.id ? "Save changes" : "Publish"}
          </button>
          {draft.id ? (
            <button
              type="button"
              onClick={() => setDraft(emptyDraft())}
              className="h-10 rounded-full border border-card-border px-4 text-sm"
            >
              Cancel
            </button>
          ) : null}
        </div>
        {create.error || update.error ? (
          <p className="text-sm text-danger">
            {create.error?.message ?? update.error?.message}
          </p>
        ) : null}
      </form>

      <div className="space-y-6">
        <section className="rounded-xl border border-card-border bg-card p-5">
          <h2 className="text-lg font-medium">Member home preview</h2>
          <p className="mt-1 text-sm text-muted">
            What members would see right now, newest first.
          </p>
          {active.data && active.data.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-card-border px-4 py-8 text-center text-sm text-muted">
              No active announcements.
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {active.data?.map((item) => (
                <li key={item.id} className="rounded-lg bg-background p-4">
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 text-sm text-muted">{item.body}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-lg font-medium">All posts</h2>
          <ul className="mt-3 space-y-3">
            {list.data?.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-card-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="mt-1 text-sm text-muted">{item.body}</p>
                    <p className="mt-2 text-xs text-muted">
                      {isActive(item.startsAt, item.endsAt) ? "Active now · " : ""}
                      {new Date(item.startsAt).toLocaleString()} →{" "}
                      {new Date(item.endsAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2 text-sm">
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({
                          id: item.id,
                          title: item.title,
                          body: item.body,
                          imageUrl: item.imageUrl ?? "",
                          startsAt: toLocalInput(item.startsAt),
                          endsAt: toLocalInput(item.endsAt),
                        })
                      }
                      className="text-muted hover:text-foreground"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Delete this announcement?")) {
                          remove.mutate({ id: item.id });
                        }
                      }}
                      className="text-danger"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
