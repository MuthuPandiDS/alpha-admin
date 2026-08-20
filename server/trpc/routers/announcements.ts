import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, publicProcedure, router } from "../init";

const announcementFields = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(4000),
  imageUrl: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((value) => (value ? value : null)),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
});

const dateRange = (value: { startsAt: Date; endsAt: Date }) =>
  value.endsAt > value.startsAt;

const announcementInput = announcementFields.refine(dateRange, {
  message: "End date must be after start date",
  path: ["endsAt"],
});

const announcementUpdateInput = announcementFields
  .extend({ id: z.string().min(1) })
  .refine(dateRange, {
    message: "End date must be after start date",
    path: ["endsAt"],
  });

export const announcementsRouter = router({
  list: adminProcedure.query(({ ctx }) =>
    ctx.prisma.announcement.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { name: true, email: true } },
      },
    }),
  ),

  active: publicProcedure.query(({ ctx }) => {
    const now = new Date();
    return ctx.prisma.announcement.findMany({
      where: {
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        body: true,
        imageUrl: true,
        startsAt: true,
        endsAt: true,
        createdAt: true,
      },
    });
  }),

  create: adminProcedure.input(announcementInput).mutation(({ ctx, input }) =>
    ctx.prisma.announcement.create({
      data: {
        ...input,
        createdById: ctx.session.user.id,
      },
    }),
  ),

  update: adminProcedure
    .input(announcementUpdateInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      try {
        return await ctx.prisma.announcement.update({
          where: { id },
          data,
        });
      } catch {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Announcement not found",
        });
      }
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.prisma.announcement.delete({ where: { id: input.id } });
        return { ok: true as const };
      } catch {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Announcement not found",
        });
      }
    }),
});
