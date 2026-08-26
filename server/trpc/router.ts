import { router } from "./init";
import { announcementsRouter } from "./routers/announcements";
import { paymentsRouter } from "./routers/payments";
import { plansRouter } from "./routers/plans";
import { usersRouter } from "./routers/users";

export const appRouter = router({
  users: usersRouter,
  announcements: announcementsRouter,
  plans: plansRouter,
  payments: paymentsRouter,
});

export type AppRouter = typeof appRouter;
