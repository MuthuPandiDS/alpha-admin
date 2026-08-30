import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, router } from "../init";

/* ─── Helpers ────────────────────────────────────────────── */

/** Clamp a day-of-month to the last day of the given month. */
function clampDay(day: number, year: number, month: number): number {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return Math.min(day, lastDay);
}

/** Compute the live status of an expense based on today's date. */
function computeStatus(
  currentStatus: string,
  dueDate: Date,
): string {
  if (currentStatus === "PAID") return "PAID";
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "OVERDUE";
  if (diffDays <= 3) return "DUE";
  return "UPCOMING";
}

/* ─── Input schemas ──────────────────────────────────────── */

const categoryInput = z.object({
  name: z.string().trim().min(1).max(60),
  emoji: z.string().trim().min(1).max(10),
  description: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v ? v : null)),
});

const recurringInput = z.object({
  name: z.string().trim().min(1).max(120),
  categoryId: z.string().min(1),
  amountInPaise: z.number().int().positive(),
  currency: z.string().default("INR"),
  frequency: z.enum(["MONTHLY", "QUARTERLY", "YEARLY", "WEEKLY"]),
  dueDay: z.number().int().min(1).max(31),
  paymentMethod: z
    .string()
    .trim()
    .max(60)
    .optional()
    .transform((v) => (v ? v : null)),
  startDate: z.coerce.date(),
  endDate: z.coerce
    .date()
    .optional()
    .nullable()
    .transform((v) => v ?? null),
});

const expenseInput = z.object({
  name: z.string().trim().min(1).max(120),
  categoryId: z.string().min(1),
  amountInPaise: z.number().int().positive(),
  currency: z.string().default("INR"),
  dueDate: z.coerce.date(),
  paymentMethod: z
    .string()
    .trim()
    .max(60)
    .optional()
    .transform((v) => (v ? v : null)),
  notes: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((v) => (v ? v : null)),
});

/* ─── Router ─────────────────────────────────────────────── */

export const expensesRouter = router({
  /* ── Categories ──────────────────────────────────────── */

  categoriesList: adminProcedure.query(({ ctx }) =>
    ctx.prisma.expenseCategory.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    }),
  ),

  categoriesCreate: adminProcedure
    .input(categoryInput)
    .mutation(({ ctx, input }) =>
      ctx.prisma.expenseCategory.create({
        data: { ...input, isDefault: false },
      }),
    ),

  categoriesUpdate: adminProcedure
    .input(categoryInput.extend({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      try {
        return await ctx.prisma.expenseCategory.update({
          where: { id },
          data,
        });
      } catch {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Category not found",
        });
      }
    }),

  categoriesDelete: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const cat = await ctx.prisma.expenseCategory.findUnique({
        where: { id: input.id },
      });
      if (!cat) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Category not found",
        });
      }
      if (cat.isDefault) {
        // Soft-delete default categories
        await ctx.prisma.expenseCategory.update({
          where: { id: input.id },
          data: { isActive: false },
        });
      } else {
        // Hard-delete custom categories (only if not used)
        const usage = await ctx.prisma.expense.count({
          where: { categoryId: input.id },
        });
        if (usage > 0) {
          await ctx.prisma.expenseCategory.update({
            where: { id: input.id },
            data: { isActive: false },
          });
        } else {
          await ctx.prisma.expenseCategory.delete({
            where: { id: input.id },
          });
        }
      }
      return { ok: true as const };
    }),

  /* ── Recurring Expenses ──────────────────────────────── */

  recurringList: adminProcedure.query(({ ctx }) =>
    ctx.prisma.recurringExpense.findMany({
      orderBy: { createdAt: "desc" },
      include: { category: true },
    }),
  ),

  recurringCreate: adminProcedure
    .input(recurringInput)
    .mutation(async ({ ctx, input }) => {
      const recurring = await ctx.prisma.recurringExpense.create({
        data: input,
      });
      // Immediately generate expense entries from startDate up to current month
      await generateExpensesForRecurring(ctx.prisma, recurring);
      return recurring;
    }),

  recurringUpdate: adminProcedure
    .input(recurringInput.extend({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      try {
        return await ctx.prisma.recurringExpense.update({
          where: { id },
          data,
        });
      } catch {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Recurring expense not found",
        });
      }
    }),

  recurringDelete: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.prisma.recurringExpense.update({
          where: { id: input.id },
          data: { isActive: false },
        });
        return { ok: true as const };
      } catch {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Recurring expense not found",
        });
      }
    }),

  recurringToggle: adminProcedure
    .input(z.object({ id: z.string().min(1), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.recurringExpense.update({
        where: { id: input.id },
        data: { isActive: input.isActive },
      });
    }),

  recurringGenerateDue: adminProcedure.mutation(async ({ ctx }) => {
    const templates = await ctx.prisma.recurringExpense.findMany({
      where: { isActive: true },
    });
    let generated = 0;
    for (const tpl of templates) {
      generated += await generateExpensesForRecurring(ctx.prisma, tpl);
    }
    return { generated };
  }),

  /* ── Expenses (one-off + auto-generated) ─────────────── */

  list: adminProcedure
    .input(
      z.object({
        month: z.number().int().min(0).max(11),
        year: z.number().int().min(2020),
        categoryId: z.string().optional(),
        status: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const startOfMonth = new Date(input.year, input.month, 1);
      const endOfMonth = new Date(input.year, input.month + 1, 0, 23, 59, 59, 999);

      const where: Record<string, unknown> = {
        dueDate: { gte: startOfMonth, lte: endOfMonth },
      };
      if (input.categoryId) where.categoryId = input.categoryId;

      const expenses = await ctx.prisma.expense.findMany({
        where,
        orderBy: { dueDate: "asc" },
        include: { category: true },
      });

      // Compute live status and batch-update stale ones
      const updates: Promise<unknown>[] = [];
      const result = expenses.map((exp) => {
        const liveStatus = computeStatus(exp.status, exp.dueDate);
        if (liveStatus !== exp.status) {
          updates.push(
            ctx.prisma.expense.update({
              where: { id: exp.id },
              data: { status: liveStatus },
            }),
          );
        }
        return { ...exp, status: liveStatus };
      });

      if (updates.length > 0) await Promise.all(updates);

      // Filter by status after live computation
      if (input.status && input.status !== "ALL") {
        return result.filter((e) => e.status === input.status);
      }
      return result;
    }),

  create: adminProcedure.input(expenseInput).mutation(({ ctx, input }) => {
    const status = computeStatus("UPCOMING", input.dueDate);
    return ctx.prisma.expense.create({
      data: { ...input, status },
    });
  }),

  update: adminProcedure
    .input(expenseInput.extend({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const status = computeStatus("UPCOMING", data.dueDate);
      try {
        return await ctx.prisma.expense.update({
          where: { id },
          data: { ...data, status },
        });
      } catch {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Expense not found",
        });
      }
    }),

  updateStatus: adminProcedure
    .input(
      z.object({
        id: z.string().min(1),
        status: z.enum(["UPCOMING", "DUE", "PAID", "OVERDUE"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const data: Record<string, unknown> = { status: input.status };
      if (input.status === "PAID") {
        data.paidDate = new Date();
      } else {
        data.paidDate = null;
      }
      try {
        return await ctx.prisma.expense.update({
          where: { id: input.id },
          data,
        });
      } catch {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Expense not found",
        });
      }
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.prisma.expense.delete({ where: { id: input.id } });
        return { ok: true as const };
      } catch {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Expense not found",
        });
      }
    }),

  monthlySummary: adminProcedure
    .input(
      z.object({
        month: z.number().int().min(0).max(11),
        year: z.number().int().min(2020),
      }),
    )
    .query(async ({ ctx, input }) => {
      const startOfMonth = new Date(input.year, input.month, 1);
      const endOfMonth = new Date(input.year, input.month + 1, 0, 23, 59, 59, 999);

      const expenses = await ctx.prisma.expense.findMany({
        where: { dueDate: { gte: startOfMonth, lte: endOfMonth } },
        include: { category: true },
      });

      let totalPaise = 0;
      let paidPaise = 0;
      let duePaise = 0;
      let overduePaise = 0;
      let upcomingPaise = 0;

      for (const exp of expenses) {
        const live = computeStatus(exp.status, exp.dueDate);
        totalPaise += exp.amountInPaise;
        if (live === "PAID") paidPaise += exp.amountInPaise;
        else if (live === "DUE") duePaise += exp.amountInPaise;
        else if (live === "OVERDUE") overduePaise += exp.amountInPaise;
        else upcomingPaise += exp.amountInPaise;
      }

      return {
        totalPaise,
        paidPaise,
        duePaise,
        overduePaise,
        upcomingPaise,
        count: expenses.length,
      };
    }),
});

/* ─── Recurring Expense Generator ────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateExpensesForRecurring(prisma: any, tpl: any): Promise<number> {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const start = new Date(tpl.startDate);
  const end = tpl.endDate ? new Date(tpl.endDate) : null;

  // Determine starting point for generation
  let genMonth: number;
  let genYear: number;

  if (tpl.lastGeneratedDate) {
    const last = new Date(tpl.lastGeneratedDate);
    // Move to the next period after lastGeneratedDate
    if (tpl.frequency === "MONTHLY") {
      genMonth = last.getMonth() + 1;
      genYear = last.getFullYear();
      if (genMonth > 11) { genMonth = 0; genYear++; }
    } else if (tpl.frequency === "QUARTERLY") {
      genMonth = last.getMonth() + 3;
      genYear = last.getFullYear();
      while (genMonth > 11) { genMonth -= 12; genYear++; }
    } else if (tpl.frequency === "YEARLY") {
      genMonth = last.getMonth();
      genYear = last.getFullYear() + 1;
    } else {
      // WEEKLY: just generate for current month
      genMonth = currentMonth;
      genYear = currentYear;
    }
  } else {
    genMonth = start.getMonth();
    genYear = start.getFullYear();
  }

  let generated = 0;
  let iterations = 0;
  const maxIterations = 120; // safety limit

  while (iterations < maxIterations) {
    iterations++;

    // Don't go past current month
    if (genYear > currentYear || (genYear === currentYear && genMonth > currentMonth)) break;

    // Don't go past end date
    if (end) {
      const genDate = new Date(genYear, genMonth, 1);
      if (genDate > end) break;
    }

    // Don't generate before start date
    const startCheck = new Date(genYear, genMonth, 1);
    const startMonthEnd = new Date(start.getFullYear(), start.getMonth(), 1);
    if (startCheck >= startMonthEnd) {
      const day = clampDay(tpl.dueDay, genYear, genMonth);
      const dueDate = new Date(genYear, genMonth, day, 12, 0, 0);
      const status = computeStatus("UPCOMING", dueDate);

      // Check if already exists for this month
      const existing = await prisma.expense.findFirst({
        where: {
          recurringExpenseId: tpl.id,
          dueDate: {
            gte: new Date(genYear, genMonth, 1),
            lt: new Date(genYear, genMonth + 1, 1),
          },
        },
      });

      if (!existing) {
        await prisma.expense.create({
          data: {
            name: tpl.name,
            categoryId: tpl.categoryId,
            recurringExpenseId: tpl.id,
            amountInPaise: tpl.amountInPaise,
            currency: tpl.currency,
            status,
            dueDate,
            paymentMethod: tpl.paymentMethod,
          },
        });
        generated++;
      }

      // Update lastGeneratedDate
      await prisma.recurringExpense.update({
        where: { id: tpl.id },
        data: { lastGeneratedDate: dueDate },
      });
    }

    // Advance to next period
    if (tpl.frequency === "MONTHLY") {
      genMonth++;
      if (genMonth > 11) { genMonth = 0; genYear++; }
    } else if (tpl.frequency === "QUARTERLY") {
      genMonth += 3;
      while (genMonth > 11) { genMonth -= 12; genYear++; }
    } else if (tpl.frequency === "YEARLY") {
      genYear++;
    } else {
      // WEEKLY handled differently - just break for now
      break;
    }
  }

  return generated;
}
