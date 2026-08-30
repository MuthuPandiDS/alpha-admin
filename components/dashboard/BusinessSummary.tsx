import { prisma } from "@/lib/prisma";
import { type DashboardPeriod, getDateRanges } from "@/lib/date-utils";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

export async function BusinessSummary({ period }: { period: DashboardPeriod }) {
  const { current, previous } = getDateRanges(period);
  const now = new Date();
  const soon = new Date();
  soon.setDate(soon.getDate() + 7); // Expiring in next 7 days

  const [
    // Current Period Data
    activeMembers,
    prevActiveMembers,
    newMembers,
    prevNewMembers,
    newLeads,
    prevNewLeads,
    expiringSoon,
    currentPayments,
    prevPayments,
    currentExpenses,
    prevExpenses,
    pendingPayments,
  ] = await Promise.all([
    // Active members
    prisma.user.count({ where: { role: "MEMBER", planExpiresAt: { gt: now } } }),
    prisma.user.count({ where: { role: "MEMBER", planExpiresAt: { gt: previous.end } } }),
    
    // New members (profile completed in period)
    prisma.user.count({ where: { role: "MEMBER", profileCompletedAt: { gte: current.start, lte: current.end } } }),
    prisma.user.count({ where: { role: "MEMBER", profileCompletedAt: { gte: previous.start, lte: previous.end } } }),
    
    // New leads
    prisma.user.count({ where: { role: "MEMBER", leadStatus: { not: null }, createdAt: { gte: current.start, lte: current.end } } }),
    prisma.user.count({ where: { role: "MEMBER", leadStatus: { not: null }, createdAt: { gte: previous.start, lte: previous.end } } }),
    
    // Expiring soon
    prisma.user.count({ where: { role: "MEMBER", planExpiresAt: { gte: now, lte: soon } } }),
    
    // Income
    prisma.payment.aggregate({ _sum: { amountPaidInPaise: true }, where: { status: "PAID", paidAt: { gte: current.start, lte: current.end } } }),
    prisma.payment.aggregate({ _sum: { amountPaidInPaise: true }, where: { status: "PAID", paidAt: { gte: previous.start, lte: previous.end } } }),
    
    // Expenses
    prisma.expense.aggregate({ _sum: { amountInPaise: true }, where: { status: "PAID", paidDate: { gte: current.start, lte: current.end } } }),
    prisma.expense.aggregate({ _sum: { amountInPaise: true }, where: { status: "PAID", paidDate: { gte: previous.start, lte: previous.end } } }),
    
    // Pending Payments
    prisma.payment.aggregate({ _sum: { amountInPaise: true }, where: { status: "PENDING" } }),
  ]);

  const currentIncome = currentPayments._sum.amountPaidInPaise || 0;
  const prevIncome = prevPayments._sum.amountPaidInPaise || 0;
  const currentExpenseAmt = currentExpenses._sum.amountInPaise || 0;
  const prevExpenseAmt = prevExpenses._sum.amountInPaise || 0;
  
  const currentProfit = currentIncome - currentExpenseAmt;
  const prevProfit = prevIncome - prevExpenseAmt;
  const pendingAmount = pendingPayments._sum.amountInPaise || 0;

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <SummaryCard 
        title="Total Active Members" 
        value={activeMembers} 
        prevValue={prevActiveMembers} 
        isCurrency={false} 
      />
      <SummaryCard 
        title="New Members" 
        value={newMembers} 
        prevValue={prevNewMembers} 
        isCurrency={false} 
      />
      <SummaryCard 
        title="New Leads" 
        value={newLeads} 
        prevValue={prevNewLeads} 
        isCurrency={false} 
      />
      <SummaryCard 
        title="Expiring Soon (7d)" 
        value={expiringSoon} 
        // No trend for expiring soon since it's a point-in-time metric
      />
      
      <SummaryCard 
        title="Total Income" 
        value={currentIncome} 
        prevValue={prevIncome} 
        isCurrency={true} 
      />
      <SummaryCard 
        title="Total Expenses" 
        value={currentExpenseAmt} 
        prevValue={prevExpenseAmt} 
        isCurrency={true} 
        invertTrendColors // High expenses are bad
      />
      <SummaryCard 
        title="Net Profit" 
        value={currentProfit} 
        prevValue={prevProfit} 
        isCurrency={true} 
      />
      <SummaryCard 
        title="Pending Payments" 
        value={pendingAmount} 
        isCurrency={true} 
        // Point in time
      />
    </section>
  );
}

function SummaryCard({
  title,
  value,
  prevValue,
  isCurrency = false,
  invertTrendColors = false,
}: {
  title: string;
  value: number;
  prevValue?: number;
  isCurrency?: boolean;
  invertTrendColors?: boolean;
}) {
  const formatValue = (val: number) => {
    if (isCurrency) {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(val / 100);
    }
    return val.toString();
  };

  const getTrend = () => {
    if (prevValue === undefined || prevValue === 0) return null;
    const diff = value - prevValue;
    const percent = Math.abs((diff / prevValue) * 100).toFixed(1);
    
    let isGood = diff >= 0;
    if (invertTrendColors) isGood = !isGood;

    if (diff === 0) {
      return (
        <span className="flex items-center text-xs font-medium text-muted">
          <Minus className="mr-1 h-3 w-3" /> 0% vs last period
        </span>
      );
    }

    return (
      <span
        className={`flex items-center text-xs font-medium ${
          isGood ? "text-emerald-500" : "text-danger"
        }`}
      >
        {diff > 0 ? (
          <ArrowUpRight className="mr-1 h-3 w-3" />
        ) : (
          <ArrowDownRight className="mr-1 h-3 w-3" />
        )}
        {percent}% vs last period
      </span>
    );
  };

  return (
    <div className="flex flex-col rounded-2xl border border-card-border bg-card p-6 shadow-sm transition-all hover:border-foreground/20 hover:shadow-md">
      <h3 className="text-sm font-medium text-muted">{title}</h3>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
        {formatValue(value)}
      </p>
      <div className="mt-2 h-5">{getTrend()}</div>
    </div>
  );
}
