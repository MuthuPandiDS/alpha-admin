"use client";

import { trpc } from "@/lib/trpc";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const announcementSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  body: z.string().min(1, "Body is required"),
  imageUrl: z.string().optional(),
  startsAt: z.string().min(1, "Start date is required"),
  endsAt: z.string().min(1, "End date is required"),
});

type AnnouncementFormValues = z.infer<typeof announcementSchema>;

function emptyDraft(): AnnouncementFormValues {
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

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementSchema),
    defaultValues: emptyDraft(),
  });

  const draftId = watch("id");

  const create = trpc.announcements.create.useMutation({
    onSuccess: () => {
      utils.announcements.invalidate();
      reset(emptyDraft());
    },
  });
  const update = trpc.announcements.update.useMutation({
    onSuccess: () => {
      utils.announcements.invalidate();
      reset(emptyDraft());
    },
  });
  const remove = trpc.announcements.delete.useMutation({
    onSuccess: () => utils.announcements.invalidate(),
  });

  function onSubmit(data: AnnouncementFormValues) {
    const payload = {
      title: data.title,
      body: data.body,
      imageUrl: data.imageUrl || "",
      startsAt: new Date(data.startsAt),
      endsAt: new Date(data.endsAt),
    };
    if (data.id) {
      update.mutate({ id: data.id, ...payload });
    } else {
      create.mutate(payload);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4 rounded-xl border border-card-border bg-card p-5"
        noValidate
      >
        <h2 className="text-lg font-medium">
          {draftId ? "Edit announcement" : "New announcement"}
        </h2>
        
        <label className="grid gap-1 text-sm">
          Title
          <input
            {...register("title")}
            className="h-10 rounded-lg border border-card-border bg-background px-3 outline-none focus:border-accent transition-colors"
          />
          {errors.title && <span className="text-xs text-danger">{errors.title.message}</span>}
        </label>
        
        <label className="grid gap-1 text-sm">
          Body
          <textarea
            {...register("body")}
            rows={5}
            className="rounded-lg border border-card-border bg-background px-3 py-2 outline-none focus:border-accent transition-colors"
          />
          {errors.body && <span className="text-xs text-danger">{errors.body.message}</span>}
        </label>
        
        <label className="grid gap-1 text-sm">
          Image URL (optional)
          <input
            {...register("imageUrl")}
            className="h-10 rounded-lg border border-card-border bg-background px-3 outline-none focus:border-accent transition-colors"
          />
        </label>
        
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Starts
            <input
              type="datetime-local"
              {...register("startsAt")}
              className="h-10 rounded-lg border border-card-border bg-background px-3 outline-none focus:border-accent transition-colors"
            />
            {errors.startsAt && <span className="text-xs text-danger">{errors.startsAt.message}</span>}
          </label>
          <label className="grid gap-1 text-sm">
            Ends
            <input
              type="datetime-local"
              {...register("endsAt")}
              className="h-10 rounded-lg border border-card-border bg-background px-3 outline-none focus:border-accent transition-colors"
            />
            {errors.endsAt && <span className="text-xs text-danger">{errors.endsAt.message}</span>}
          </label>
        </div>
        
        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={create.isPending || update.isPending}
            className="h-10 rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink disabled:opacity-60 transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {draftId ? "Save changes" : "Publish"}
          </button>
          {draftId ? (
            <button
              type="button"
              onClick={() => reset(emptyDraft())}
              className="h-10 rounded-full border border-card-border px-4 text-sm hover:bg-white/5 transition-colors"
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
                  <p className="font-semibold text-lg">{item.title}</p>
                  <p className="mt-2 text-sm text-muted whitespace-pre-wrap">{item.body}</p>
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
                className="rounded-xl border border-card-border bg-card p-4 transition-colors hover:border-foreground/20"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-lg">{item.title}</p>
                    <p className="mt-2 text-sm text-muted whitespace-pre-wrap">{item.body}</p>
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
                        reset({
                          id: item.id,
                          title: item.title,
                          body: item.body,
                          imageUrl: item.imageUrl ?? "",
                          startsAt: toLocalInput(item.startsAt),
                          endsAt: toLocalInput(item.endsAt),
                        })
                      }
                      className="text-muted hover:text-accent transition-colors"
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
                      className="text-danger hover:brightness-125 transition-colors"
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
