import { TRPCError } from "@trpc/server";
import type { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import { adminProcedure, router } from "../init";

const planFields = z.object({
  name: z.string().trim().min(2).max(80),
  description: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((value) => (value ? value : null)),
  priceInPaise: z.number().int().min(0).max(100_000_000),
  currency: z.string().trim().length(3).default("INR"),
  durationDays: z.number().int().min(1).max(3650),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  isRestricted: z.boolean().default(false),
});

const planSelect = {
  id: true,
  name: true,
  description: true,
  priceInPaise: true,
  currency: true,
  durationDays: true,
  isDefault: true,
  isActive: true,
  isRestricted: true,
  createdAt: true,
} satisfies Prisma.MembershipPlanSelect;

/** Only one plan may be the default; clearing the others keeps that invariant. */
async function clearOtherDefaults(
  tx: Prisma.TransactionClient,
  planId: string | null,
) {
  await tx.membershipPlan.updateMany({
    where: { isDefault: true, ...(planId ? { id: { not: planId } } : {}) },
    data: { isDefault: false },
  });
}

export async function assertPlanAllowedForUser(
  db: PrismaClient | Prisma.TransactionClient,
  userId: string,
  planId: string,
) {
  const plan = await db.membershipPlan.findUnique({ where: { id: planId } });
  if (!plan) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found" });
  }
  if (!plan.isActive) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Plan is archived" });
  }
  if (plan.isRestricted) {
    const grant = await db.planEligibility.findUnique({
      where: { userId_planId: { userId, planId } },
    });
    if (!grant) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "This member is not eligible for that plan",
      });
    }
  }
  return plan;
}

export const plansRouter = router({
  list: adminProcedure
    .input(
      z.object({ includeArchived: z.boolean().default(false) }).default({
        includeArchived: false,
      }),
    )
    .query(async ({ ctx, input }) => {
      const plans = await ctx.prisma.membershipPlan.findMany({
        where: input.includeArchived ? {} : { isActive: true },
        orderBy: [{ isDefault: "desc" }, { priceInPaise: "asc" }],
        select: {
          ...planSelect,
          _count: { select: { members: true, eligibleUsers: true } },
          eligibleUsers: {
            select: {
              user: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      });

      return plans.map((plan) => ({
        ...plan,
        memberCount: plan._count.members,
        eligibleCount: plan._count.eligibleUsers,
        eligibleUsers: plan.eligibleUsers.map((row) => row.user),
      }));
    }),

  /** Plans a specific member can be moved onto: open plans plus their restricted grants. */
  forUser: adminProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .query(({ ctx, input }) =>
      ctx.prisma.membershipPlan.findMany({
        where: {
          isActive: true,
          OR: [
            { isRestricted: false },
            { eligibleUsers: { some: { userId: input.userId } } },
          ],
        },
        orderBy: [{ isDefault: "desc" }, { priceInPaise: "asc" }],
        select: planSelect,
      }),
    ),

  create: adminProcedure.input(planFields).mutation(({ ctx, input }) =>
    ctx.prisma.$transaction(async (tx) => {
      if (input.isDefault) await clearOtherDefaults(tx, null);
      return tx.membershipPlan.create({ data: input, select: planSelect });
    }),
  ),

  update: adminProcedure
    .input(planFields.extend({ id: z.string().min(1) }))
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.$transaction(async (tx) => {
        if (data.isDefault) await clearOtherDefaults(tx, id);
        try {
          return await tx.membershipPlan.update({
            where: { id },
            data,
            select: planSelect,
          });
        } catch {
          throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found" });
        }
      });
    }),

  setDefault: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.$transaction(async (tx) => {
        await clearOtherDefaults(tx, input.id);
        await tx.membershipPlan.update({
          where: { id: input.id },
          data: { isDefault: true, isActive: true },
        });
        return { ok: true as const };
      }),
    ),

  delete: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const plan = await ctx.prisma.membershipPlan.findUnique({
        where: { id: input.id },
        select: { id: true, _count: { select: { payments: true } } },
      });
      if (!plan) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found" });
      }
      // Plans with payment history are archived so the ledger keeps its references.
      if (plan._count.payments > 0) {
        await ctx.prisma.membershipPlan.update({
          where: { id: input.id },
          data: { isActive: false, isDefault: false },
        });
        return { ok: true as const, archived: true as const };
      }
      await ctx.prisma.membershipPlan.delete({ where: { id: input.id } });
      return { ok: true as const, archived: false as const };
    }),

  /** Replaces the eligibility list of a restricted plan. */
  setEligibleUsers: adminProcedure
    .input(
      z.object({
        planId: z.string().min(1),
        userIds: z.array(z.string().min(1)).max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const plan = await ctx.prisma.membershipPlan.findUnique({
        where: { id: input.planId },
        select: { id: true },
      });
      if (!plan) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found" });
      }

      await ctx.prisma.$transaction([
        ctx.prisma.planEligibility.deleteMany({
          where: { planId: input.planId, userId: { notIn: input.userIds } },
        }),
        ctx.prisma.planEligibility.createMany({
          data: input.userIds.map((userId) => ({ userId, planId: input.planId })),
          skipDuplicates: true,
        }),
      ]);

      return { ok: true as const, count: input.userIds.length };
    }),

  assignToUser: adminProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        planId: z.string().min(1).nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: input.userId },
        select: { id: true },
      });
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }
      if (input.planId) {
        await assertPlanAllowedForUser(ctx.prisma, input.userId, input.planId);
      }

      await ctx.prisma.user.update({
        where: { id: input.userId },
        data: { planId: input.planId },
      });
      return { ok: true as const };
    }),

  /** Puts every member without a plan onto the default plan. */
  backfillDefault: adminProcedure.mutation(async ({ ctx }) => {
    const fallback = await ctx.prisma.membershipPlan.findFirst({
      where: { isDefault: true, isActive: true },
      select: { id: true },
    });
    if (!fallback) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Mark a plan as default first",
      });
    }
    const result = await ctx.prisma.user.updateMany({
      where: { role: "MEMBER", planId: null },
      data: { planId: fallback.id },
    });
    return { updated: result.count };
  }),
});
