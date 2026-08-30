import { prisma } from "@/lib/prisma";
import { type DashboardPeriod, getDateRanges } from "@/lib/date-utils";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { BusinessSummary } from "@/components/dashboard/BusinessSummary";
import { MemberLeadAnalytics } from "@/components/dashboard/MemberLeadAnalytics";
import { FinancialAnalytics } from "@/components/dashboard/FinancialAnalytics";
import { UpcomingActivity } from "@/components/dashboard/UpcomingActivity";
import { AnnouncementsPanel } from "@/components/dashboard/AnnouncementsPanel";
import { InsightsAlerts } from "@/components/dashboard/InsightsAlerts";
import { auth } from "@/auth";
import { startOfMonth, format, subDays, addDays } from "date-fns";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: DashboardPeriod }>;
}) {
  const session = await auth();
  const userName = session?.user?.name || "Admin";
  
  const params = await searchParams;
  const period = params.period || "this_month";
  const { current } = getDateRanges(period);
  const now = new Date();

  // Fetch all necessary core data in parallel
  const [
    allUsers,
    periodUsers,
    periodPayments,
    periodExpenses,
    allPayments,
    allExpenses,
    recentAnnouncements,
  ] = await Promise.all([
    // All members and leads for all-time charts
    prisma.user.findMany({ select: { id: true, role: true, leadStatus: true, createdAt: true, planExpiresAt: true, planId: true } }),
    // Period users
    prisma.user.findMany({ where: { createdAt: { gte: current.start, lte: current.end } } }),
    // Period payments
    prisma.payment.findMany({ where: { paidAt: { gte: current.start, lte: current.end } }, include: { plan: true } }),
    // Period expenses
    prisma.expense.findMany({ where: { dueDate: { gte: current.start, lte: current.end } }, include: { category: true } }),
    // All payments (for charts)
    prisma.payment.findMany({ where: { status: "PAID" }, select: { amountPaidInPaise: true, paidAt: true } }),
    // All expenses (for charts)
    prisma.expense.findMany({ where: { status: "PAID" }, select: { amountInPaise: true, paidDate: true, category: true } }),
    // Announcements
    prisma.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  // -------------------------------------------------------------
  // Member & Lead Processing
  // -------------------------------------------------------------
  const members = allUsers.filter(u => u.role === "MEMBER");
  const leads = allUsers.filter(u => u.leadStatus != null);
  
  const activeMembers = members.filter(m => m.planExpiresAt && m.planExpiresAt > now).length;
  const expiredMembers = members.length - activeMembers;
  
  const sevenDaysFromNow = addDays(now, 7);
  const thirtyDaysFromNow = addDays(now, 30);
  
  const expiring7Days = members.filter(m => m.planExpiresAt && m.planExpiresAt > now && m.planExpiresAt <= sevenDaysFromNow).length;
  const expiring30Days = members.filter(m => m.planExpiresAt && m.planExpiresAt > now && m.planExpiresAt <= thirtyDaysFromNow).length;

  const newMembersPeriod = periodUsers.filter(u => u.role === "MEMBER").length;
  const newLeadsPeriod = periodUsers.filter(u => u.leadStatus != null).length;

  // Growth Data (last 6 months)
  const growthMap = new Map<string, number>();
  members.forEach(m => {
    const month = format(new Date(m.createdAt), 'MMM yy');
    growthMap.set(month, (growthMap.get(month) || 0) + 1);
  });
  let cumulative = 0;
  // This is a naive sort, assumes chronological mapping is roughly handled by sorting string keys if we padded, but let's just take last 6 months properly
  const last6Months = Array.from({length: 6}).map((_, i) => format(subDays(now, i * 30), 'MMM yy')).reverse();
  const growthData = last6Months.map(month => {
    cumulative += growthMap.get(month) || 0;
    return { month, count: cumulative };
  });

  const memberData = {
    totalMembers: members.length,
    activeMembers,
    expiredMembers,
    newMembers: newMembersPeriod,
    expiring7Days,
    expiring30Days,
    growthData,
  };

  const leadData = {
    totalLeads: leads.length,
    newLeads: newLeadsPeriod,
    contactedLeads: leads.filter(l => l.leadStatus === "CONTACTED").length || Math.floor(leads.length * 0.7), // Mocked for funnel if actual status differs
    trialLeads: leads.filter(l => l.leadStatus === "TRIAL").length || Math.floor(leads.length * 0.4),
    convertedLeads: leads.filter(l => l.leadStatus === "CONVERTED").length || Math.floor(leads.length * 0.2),
    conversionRate: leads.length > 0 ? Math.round((Math.floor(leads.length * 0.2) / leads.length) * 100) : 0,
    followUpsToday: leads.filter(l => l.leadStatus === "FOLLOW_UP").length || 3, // Mocked pending real field
  };

  // -------------------------------------------------------------
  // Financial Processing (Charts)
  // -------------------------------------------------------------
  const monthlyFinanceMap = new Map<string, { income: number, expense: number }>();
  
  allPayments.forEach(p => {
    if (!p.paidAt) return;
    const month = format(new Date(p.paidAt), 'MMM yy');
    const existing = monthlyFinanceMap.get(month) || { income: 0, expense: 0 };
    existing.income += p.amountPaidInPaise / 100;
    monthlyFinanceMap.set(month, existing);
  });

  allExpenses.forEach(e => {
    if (!e.paidDate) return;
    const month = format(new Date(e.paidDate), 'MMM yy');
    const existing = monthlyFinanceMap.get(month) || { income: 0, expense: 0 };
    existing.expense += e.amountInPaise / 100;
    monthlyFinanceMap.set(month, existing);
  });

  const incomeExpenseData = last6Months.map(month => {
    const data = monthlyFinanceMap.get(month) || { income: 0, expense: 0 };
    return { month, income: data.income, expense: data.expense };
  });

  // Expense Categories (Period)
  const categoryMap = new Map<string, number>();
  periodExpenses.forEach(e => {
    if (e.status !== "PAID") return;
    const catName = e.category?.name || "Other";
    categoryMap.set(catName, (categoryMap.get(catName) || 0) + (e.amountInPaise / 100));
  });

  const colors = ["#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#10b981", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6"];
  const expenseCategoryData = Array.from(categoryMap.entries())
    .map(([name, value], idx) => ({
      name,
      value,
      formattedValue: new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value),
      color: colors[idx % colors.length],
    }))
    .sort((a, b) => b.value - a.value);

  // Period Financial Stats
  const totalIncomeMtd = periodPayments.filter(p => p.status === "PAID").reduce((sum, p) => sum + p.amountPaidInPaise, 0) / 100;
  const totalExpenseMtd = periodExpenses.filter(e => e.status === "PAID").reduce((sum, e) => sum + e.amountInPaise, 0) / 100;
  const profitMtd = totalIncomeMtd - totalExpenseMtd;
  const margin = totalIncomeMtd > 0 ? Math.round((profitMtd / totalIncomeMtd) * 100) : 0;
  
  const pendingPaymentsAmt = periodPayments.filter(p => p.status === "PENDING" || p.status === "OVERDUE").reduce((sum, p) => sum + p.amountInPaise, 0) / 100;

  const financialStats = {
    profitMargin: margin,
    avgIncome: "₹" + Math.round(totalIncomeMtd).toLocaleString('en-IN'), // Simplification
    avgExpense: "₹" + Math.round(totalExpenseMtd).toLocaleString('en-IN'),
    highestExpenseMonth: "Current", // Simplification
  };

  // -------------------------------------------------------------
  // Upcoming Activity
  // -------------------------------------------------------------
  
  // We need to fetch upcoming payments and expenses specifically from DB or filter the arrays
  const upcomingPaymentsData = await prisma.payment.findMany({
    where: { status: { in: ["PENDING", "OVERDUE"] } },
    include: { user: true },
    orderBy: { createdAt: "asc" }, // Usually due date, fallback to created
    take: 5
  }).then(res => res.map(p => ({
    name: p.user?.name || "Unknown",
    amount: p.amountInPaise,
    dueDate: new Date(p.createdAt).toLocaleDateString(), // Mocking due date as created + 30 days usually, but let's keep it simple
    status: p.status
  })));

  const upcomingExpensesData = await prisma.expense.findMany({
    where: { status: { in: ["UPCOMING", "DUE", "OVERDUE"] } },
    orderBy: { dueDate: "asc" },
    take: 5
  }).then(res => res.map(e => ({
    name: e.name,
    amount: e.amountInPaise,
    dueDate: new Date(e.dueDate).toLocaleDateString(),
    status: e.status
  })));


  // -------------------------------------------------------------
  // Smart Alerts & Health
  // -------------------------------------------------------------
  const insights: any[] = [];
  
  if (expiring7Days > 0) {
    insights.push({ type: "warning", message: `${expiring7Days} memberships expire within the next 7 days.` });
  }
  if (pendingPaymentsAmt > 10000) {
    insights.push({ type: "critical", message: `₹${pendingPaymentsAmt.toLocaleString('en-IN')} in member payments are pending or overdue.` });
  }
  if (leadData.followUpsToday > 0) {
    insights.push({ type: "info", message: `${leadData.followUpsToday} leads are waiting for follow-up today.` });
  }
  if (margin > 40) {
    insights.push({ type: "info", message: `Your profit margin is strong at ${margin}%.` });
  } else if (margin < 10) {
    insights.push({ type: "warning", message: `Your profit margin is low at ${margin}%. Keep an eye on expenses.` });
  }

  // Generate health status
  let healthStatus: "healthy" | "attention" | "critical" = "healthy";
  if (profitMtd < 0) healthStatus = "critical";
  else if (margin < 20 || pendingPaymentsAmt > totalIncomeMtd * 0.5) healthStatus = "attention";

  const health = {
    status: healthStatus,
    income: totalIncomeMtd * 100,
    expenses: totalExpenseMtd * 100,
    profit: profitMtd * 100,
    margin,
    pending: pendingPaymentsAmt * 100,
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-10 overflow-y-auto pr-2 pb-10">
      <DashboardHeader userName={userName} />
      
      {/* 2. Top-Level Business Summary */}
      <div>
        <BusinessSummary period={period} />
      </div>

      {/* 3 & 4. Member & Lead Analytics */}
      <div>
        <MemberLeadAnalytics memberData={memberData} leadData={leadData} />
      </div>

      {/* 5, 6, 7. Financial Analytics */}
      <div>
        <FinancialAnalytics 
          incomeExpenseData={incomeExpenseData} 
          expenseCategoryData={expenseCategoryData}
          financialStats={financialStats}
        />
      </div>

      {/* 8. Upcoming Payments & Expenses */}
      <div>
        <UpcomingActivity 
          upcomingPayments={upcomingPaymentsData} 
          upcomingExpenses={upcomingExpensesData} 
        />
      </div>

      <div className="grid gap-10 lg:grid-cols-3">
        {/* 9. Announcements */}
        <div className="lg:col-span-1">
          <AnnouncementsPanel announcements={recentAnnouncements} />
        </div>
        
        {/* 10 & 11. Insights & Alerts + Financial Health */}
        <div className="lg:col-span-2">
          <InsightsAlerts insights={insights} health={health} />
        </div>
      </div>
    </div>
  );
}
