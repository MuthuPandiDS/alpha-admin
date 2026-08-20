import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import {
  getDaysRemaining,
  getPlanStatus,
  PAYMENT_STATUSES,
  PLAN_STATUSES,
  planStatusWhere,
} from "@/lib/plan";
import { adminProcedure, router } from "../init";

const planFilterSchema = z.enum(["all", ...PLAN_STATUSES]);

export const usersRouter = router({
  list: adminProcedure
    .input(
      z.object({
        search: z.string().trim().optional(),
        planStatus: planFilterSchema.default("all"),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(50).default(10),
        sortBy: z.enum(["name", "planExpiresAt", "createdAt"]).default("name"),
        sortDir: z.enum(["asc", "desc"]).default("asc"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const where: Prisma.UserWhereInput = {
        role: "MEMBER",
        ...planStatusWhere(input.planStatus, now),
      };

      if (input.search) {
        where.AND = [
          {
            OR: [
              { name: { contains: input.search } },
              { email: { contains: input.search } },
            ],
          },
        ];
      }

      const orderBy: Prisma.UserOrderByWithRelationInput = {
        [input.sortBy]: input.sortDir,
      };

      const [total, rows] = await ctx.prisma.$transaction([
        ctx.prisma.user.count({ where }),
        ctx.prisma.user.findMany({
          where,
          orderBy,
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            paymentStatus: true,
            planExpiresAt: true,
            createdAt: true,
          },
        }),
      ]);

      return {
        total,
        page: input.page,
        pageSize: input.pageSize,
        items: rows.map((user) => ({
          ...user,
          planStatus: getPlanStatus(user.planExpiresAt, now),
          daysRemaining: getDaysRemaining(user.planExpiresAt, now),
        })),
      };
    }),

  byId: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: input.id },
        include: {
          measurements: {
            orderBy: { recordedAt: "desc" },
            take: 12,
          },
        },
      });

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      const now = new Date();
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        weightKg: user.weightKg,
        heightCm: user.heightCm,
        paymentStatus: user.paymentStatus,
        planExpiresAt: user.planExpiresAt,
        planNotes: user.planNotes,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        planStatus: getPlanStatus(user.planExpiresAt, now),
        daysRemaining: getDaysRemaining(user.planExpiresAt, now),
        measurements: user.measurements,
        attendance: {
          available: false as const,
          message:
            "Attendance and streak data will appear here once GYM-9 is implemented.",
        },
      };
    }),

  overridePlan: adminProcedure
    .input(
      z.object({
        id: z.string().min(1),
        paymentStatus: z.enum(PAYMENT_STATUSES),
        planExpiresAt: z.coerce.date().nullable(),
        planNotes: z.string().trim().max(500).optional(),
        weightKg: z.number().positive().max(400).nullable().optional(),
        heightCm: z.number().positive().max(300).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.user.findUnique({
        where: { id: input.id },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      const weightChanged =
        input.weightKg !== undefined && input.weightKg !== existing.weightKg;
      const heightChanged =
        input.heightCm !== undefined && input.heightCm !== existing.heightCm;

      const user = await ctx.prisma.user.update({
        where: { id: input.id },
        data: {
          paymentStatus: input.paymentStatus,
          planExpiresAt: input.planExpiresAt,
          planNotes: input.planNotes || null,
          ...(input.weightKg !== undefined ? { weightKg: input.weightKg } : {}),
          ...(input.heightCm !== undefined ? { heightCm: input.heightCm } : {}),
        },
      });

      if (weightChanged || heightChanged) {
        await ctx.prisma.bodyMeasurement.create({
          data: {
            userId: user.id,
            weightKg: input.weightKg ?? existing.weightKg,
            heightCm: input.heightCm ?? existing.heightCm,
          },
        });
      }

      return { ok: true as const };
    }),
});
