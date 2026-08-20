import { router } from "./init";
import { announcementsRouter } from "./routers/announcements";
import { usersRouter } from "./routers/users";

export const appRouter = router({
  users: usersRouter,
  announcements: announcementsRouter,
});

export type AppRouter = typeof appRouter;
