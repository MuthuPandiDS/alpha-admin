import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { CashfreeError, isCashfreeConfigured } from "@/lib/cashfree";
import { PAYMENT_RECORD_STATUSES } from "@/lib/membership";
import {
  issuePaymentLink,
  PaymentRequestError,
  refreshPaymentFromCashfree,
  settlePaymentFromLink,
} from "@/server/payments";
import { PlanNotAllowedError } from "@/server/plans";
import { adminProcedure, router } from "../init";
import { assertPlanAllowedForUser } from "./plans";

const paymentSelect = {
  id: true,
  userId: true,
  planId: true,
  amountInPaise: true,
  amountPaidInPaise: true,
  currency: true,
  status: true,
  provider: true,
  linkUrl: true,
  cashfreeLinkId: true,
  cashfreeOrderId: true,
  notes: true,
  paidAt: true,
  expiresAt: true,
  createdAt: true,
  user: { select: { id: true, name: true, email: true, phone: true } },
  plan: { select: { id: true, name: true, durationDays: true } },
} satisfies Prisma.PaymentSelect;

export const paymentsRouter = router({
  config: adminProcedure.query(() => ({
    cashfreeConfigured: isCashfreeConfigured(),
    environment: process.env.CASHFREE_ENV === "production" ? "production" : "sandbox",
  })),

  list: adminProcedure
    .input(
      z
        .object({
          userId: z.string().min(1).optional(),
          status: z.enum(["all", ...PAYMENT_RECORD_STATUSES]).default("all"),
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(100).default(20),
        })
        .default({ status: "all", page: 1, pageSize: 20 }),
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.PaymentWhereInput = {
        ...(input.userId ? { userId: input.userId } : {}),
        ...(input.status === "all" ? {} : { status: input.status }),
      };

      const [total, items, collected] = await ctx.prisma.$transaction([
        ctx.prisma.payment.count({ where }),
        ctx.prisma.payment.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          select: paymentSelect,
        }),
        ctx.prisma.payment.aggregate({
          where: { ...where, status: "PAID" },
          _sum: { amountPaidInPaise: true },
        }),
      ]);

      return {
        total,
        page: input.page,
        pageSize: input.pageSize,
        collectedInPaise: collected._sum.amountPaidInPaise ?? 0,
        items,
      };
    }),

  /** Raises a Cashfree payment link for a member's plan and stores it for tracking. */
  createLink: adminProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        planId: z.string().min(1).optional(),
        amountInPaise: z.number().int().min(100).max(100_000_000).optional(),
        notes: z.string().trim().max(300).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      let created;
      try {
        created = await issuePaymentLink(ctx.prisma, input);
      } catch (error) {
        throw new TRPCError({
          code:
            error instanceof CashfreeError ||
            error instanceof PaymentRequestError ||
            error instanceof PlanNotAllowedError
              ? "BAD_REQUEST"
              : "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Could not create payment link",
        });
      }

      return ctx.prisma.payment.findUniqueOrThrow({
        where: { id: created.id },
        select: paymentSelect,
      });
    }),

  /** Pulls the latest link status from Cashfree, for when a webhook was missed. */
  refresh: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const payment = await ctx.prisma.payment.findUnique({
        where: { id: input.id },
        select: { id: true, cashfreeLinkId: true },
      });
      if (!payment?.cashfreeLinkId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This payment has no Cashfree link to refresh",
        });
      }

      try {
        await refreshPaymentFromCashfree(ctx.prisma, payment.cashfreeLinkId);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Cashfree lookup failed",
        });
      }

      return ctx.prisma.payment.findUnique({
        where: { id: payment.id },
        select: paymentSelect,
      });
    }),

  /** Records cash or bank transfers collected outside the gateway. */
  recordManual: adminProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        planId: z.string().min(1).optional(),
        amountInPaise: z.number().int().min(0).max(100_000_000),
        notes: z.string().trim().max(300).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: input.userId },
        select: { id: true, planId: true, planExpiresAt: true },
      });
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
      }

      const planId = input.planId ?? user.planId;
      const plan = planId
        ? await assertPlanAllowedForUser(ctx.prisma, user.id, planId)
        : null;

      const paidAt = new Date();
      const payment = await ctx.prisma.payment.create({
        data: {
          userId: user.id,
          planId: plan?.id ?? null,
          amountInPaise: input.amountInPaise,
          amountPaidInPaise: input.amountInPaise,
          currency: plan?.currency ?? "INR",
          status: "PENDING",
          provider: "MANUAL",
          cashfreeLinkId: `manual_${randomUUID()}`,
          notes: input.notes ?? null,
        },
        select: { id: true, cashfreeLinkId: true },
      });

      await settlePaymentFromLink(ctx.prisma, {
        linkId: payment.cashfreeLinkId!,
        status: "PAID",
        amountPaidInPaise: input.amountInPaise,
        paidAt,
      });

      return ctx.prisma.payment.findUnique({
        where: { id: payment.id },
        select: paymentSelect,
      });
    }),

  cancel: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const payment = await ctx.prisma.payment.findUnique({
        where: { id: input.id },
        select: { id: true, status: true },
      });
      if (!payment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Payment not found" });
      }
      if (payment.status === "PAID") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Paid payments cannot be cancelled",
        });
      }
      await ctx.prisma.payment.update({
        where: { id: input.id },
        data: { status: "CANCELLED" },
      });
      return { ok: true as const };
    }),
});
