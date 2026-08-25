import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { adminMemberSchema, JOIN_SOURCES } from "@/lib/member-profile";
import {
  getDaysRemaining,
  getPlanStatus,
  PAYMENT_STATUSES,
  PLAN_STATUSES,
  planStatusWhere,
} from "@/lib/plan";
import { adminProcedure, router } from "../init";

const planFilterSchema = z.enum(["all", ...PLAN_STATUSES]);
const paymentFilterSchema = z.enum(["all", ...PAYMENT_STATUSES]);
const joinSourceFilterSchema = z.enum(["all", ...JOIN_SOURCES]);

const memberSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  phone: true,
  dateOfBirth: true,
  gender: true,
  address: true,
  emergencyContact: true,
  fitnessGoal: true,
  heightCm: true,
  weightKg: true,
  paymentStatus: true,
  planExpiresAt: true,
  planNotes: true,
  joinSource: true,
  profileCompletedAt: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

function toMemberData(input: z.infer<typeof adminMemberSchema>) {
  return {
    name: input.name,
    email: input.email,
    phone: input.phone ?? null,
    dateOfBirth: input.dateOfBirth ?? null,
    gender: input.gender ?? null,
    address: input.address ?? null,
    emergencyContact: input.emergencyContact ?? null,
    fitnessGoal: input.fitnessGoal ?? null,
    heightCm: input.heightCm ?? null,
    weightKg: input.weightKg ?? null,
    paymentStatus: input.paymentStatus,
    planExpiresAt: input.planExpiresAt ?? null,
    planNotes: input.planNotes ?? null,
  };
}

export const usersRouter = router({
  list: adminProcedure
    .input(
      z.object({
        search: z.string().trim().optional(),
        planStatus: planFilterSchema.default("all"),
        paymentStatus: paymentFilterSchema.default("all"),
        joinSource: joinSourceFilterSchema.default("all"),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(10),
        sortBy: z
          .enum(["name", "planExpiresAt", "createdAt"])
          .default("name"),
        sortDir: z.enum(["asc", "desc"]).default("asc"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const where: Prisma.UserWhereInput = {
        role: "MEMBER",
        ...planStatusWhere(input.planStatus, now),
        ...(input.paymentStatus === "all"
          ? {}
          : { paymentStatus: input.paymentStatus }),
        ...(input.joinSource === "all" ? {} : { joinSource: input.joinSource }),
      };

      if (input.search) {
        where.AND = [
          {
            OR: [
              { name: { contains: input.search, mode: "insensitive" } },
              { email: { contains: input.search, mode: "insensitive" } },
              { phone: { contains: input.search, mode: "insensitive" } },
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
          select: memberSelect,
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
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        address: user.address,
        emergencyContact: user.emergencyContact,
        fitnessGoal: user.fitnessGoal,
        joinSource: user.joinSource,
        profileCompletedAt: user.profileCompletedAt,
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

  create: adminProcedure
    .input(adminMemberSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.user.findUnique({
        where: { email: input.email },
        select: { id: true },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A user with that email already exists",
        });
      }

      const data = toMemberData(input);
      const user = await ctx.prisma.user.create({
        data: {
          ...data,
          role: "MEMBER",
          joinSource: "ADMIN",
          profileCompletedAt: new Date(),
          ...(data.weightKg !== null || data.heightCm !== null
            ? {
                measurements: {
                  create: {
                    weightKg: data.weightKg,
                    heightCm: data.heightCm,
                  },
                },
              }
            : {}),
        },
        select: { id: true },
      });

      return { id: user.id };
    }),

  update: adminProcedure
    .input(adminMemberSchema.extend({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const existing = await ctx.prisma.user.findUnique({ where: { id } });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }
      if (existing.role === "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin accounts cannot be edited from the members table",
        });
      }

      const emailOwner = await ctx.prisma.user.findUnique({
        where: { email: rest.email },
        select: { id: true },
      });
      if (emailOwner && emailOwner.id !== id) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Another user already uses that email",
        });
      }

      const data = toMemberData(rest);
      await ctx.prisma.user.update({ where: { id }, data });

      const weightChanged = data.weightKg !== existing.weightKg;
      const heightChanged = data.heightCm !== existing.heightCm;
      if (weightChanged || heightChanged) {
        await ctx.prisma.bodyMeasurement.create({
          data: {
            userId: id,
            weightKg: data.weightKg,
            heightCm: data.heightCm,
          },
        });
      }

      return { ok: true as const };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.user.findUnique({
        where: { id: input.id },
        select: { id: true, role: true },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }
      if (existing.role === "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin accounts cannot be deleted here",
        });
      }

      await ctx.prisma.user.delete({ where: { id: input.id } });
      return { ok: true as const };
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
