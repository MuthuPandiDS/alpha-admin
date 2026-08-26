import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  CashfreeError,
  createPaymentLink,
  fetchPaymentLink,
  isCashfreeConfigured,
  mapLinkStatus,
} from "@/lib/cashfree";
import { PAYMENT_RECORD_STATUSES } from "@/lib/membership";
import { settlePaymentFromLink } from "@/server/payments";
import { adminProcedure, router } from "../init";
import { assertPlanAllowedForUser } from "./plans";

const LINK_VALID_DAYS = 7;

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

function toPaise(amount: number | string | undefined): number | undefined {
  if (amount === undefined) return undefined;
  const value = typeof amount === "number" ? amount : Number(amount);
  return Number.isFinite(value) ? Math.round(value * 100) : undefined;
}

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
      const user = await ctx.prisma.user.findUnique({
        where: { id: input.userId },
        select: { id: true, name: true, email: true, phone: true, planId: true },
      });
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
      }

      const planId = input.planId ?? user.planId;
      if (!planId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Assign a plan to this member first",
        });
      }
      const plan = await assertPlanAllowedForUser(ctx.prisma, user.id, planId);

      const amountInPaise = input.amountInPaise ?? plan.priceInPaise;
      if (amountInPaise <= 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Payment amount must be greater than zero",
        });
      }

      const linkId = `alpha_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + LINK_VALID_DAYS);

      let link;
      try {
        link = await createPaymentLink({
          linkId,
          amountInPaise,
          currency: plan.currency,
          purpose: `${plan.name} membership`,
          expiresAt,
          customer: { name: user.name, email: user.email, phone: user.phone },
          notes: { userId: user.id, planId: plan.id },
        });
      } catch (error) {
        throw new TRPCError({
          code: error instanceof CashfreeError ? "BAD_REQUEST" : "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Could not create payment link",
        });
      }

      const payment = await ctx.prisma.payment.create({
        data: {
          userId: user.id,
          planId: plan.id,
          amountInPaise,
          currency: plan.currency,
          status: mapLinkStatus(link.link_status),
          provider: "CASHFREE",
          cashfreeLinkId: linkId,
          cashfreeCfLinkId: link.cf_link_id ? String(link.cf_link_id) : null,
          linkUrl: link.link_url,
          notes: input.notes ?? null,
          expiresAt,
        },
        select: paymentSelect,
      });

      return payment;
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

      let link;
      try {
        link = await fetchPaymentLink(payment.cashfreeLinkId);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Cashfree lookup failed",
        });
      }

      await settlePaymentFromLink(ctx.prisma, {
        linkId: payment.cashfreeLinkId,
        status: mapLinkStatus(link.link_status),
        amountPaidInPaise: toPaise(link.link_amount_paid),
        cashfreeOrderId: link.order?.order_id ?? null,
        cfLinkId: link.cf_link_id ? String(link.cf_link_id) : null,
        rawPayload: link as unknown as Prisma.InputJsonValue,
      });

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
