"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function FinancialAnalytics({
  incomeExpenseData,
  expenseCategoryData,
  financialStats,
}: {
  incomeExpenseData: any;
  expenseCategoryData: any;
  financialStats: any;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-3">
      {/* Income vs Expense Chart (Spans 2 columns) */}
      <div className="flex flex-col gap-6 rounded-2xl border border-card-border bg-card p-6 shadow-sm xl:col-span-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Income vs Expenses</h2>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatBox title="Profit Margin" value={`${financialStats.profitMargin}%`} />
          <StatBox title="Avg Monthly Income" value={financialStats.avgIncome} />
          <StatBox title="Avg Monthly Expense" value={financialStats.avgExpense} />
          <StatBox title="Highest Expense Month" value={financialStats.highestExpenseMonth} />
        </div>

        <div className="h-[300px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={incomeExpenseData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
              <XAxis dataKey="month" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1e1e1e", borderColor: "#333", borderRadius: "8px" }}
                itemStyle={{ color: "#fff" }}
                cursor={{ fill: "#333", opacity: 0.2 }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Expense Breakdown (Spans 1 column) */}
      <div className="flex flex-col gap-6 rounded-2xl border border-card-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Expense Breakdown</h2>
        </div>

        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={expenseCategoryData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {expenseCategoryData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: "#1e1e1e", borderColor: "#333", borderRadius: "8px" }}
                itemStyle={{ color: "#fff" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-muted">Top Categories</h3>
          {expenseCategoryData.slice(0, 5).map((category: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color }} />
                <span>{category.name}</span>
              </div>
              <span className="font-semibold">{category.formattedValue}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatBox({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-background p-3 border border-card-border">
      <span className="text-xs text-muted truncate">{title}</span>
      <span className="text-lg font-semibold">{value}</span>
    </div>
  );
}
