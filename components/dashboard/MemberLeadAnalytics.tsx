"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Users, UserMinus, UserCheck, PhoneCall } from "lucide-react";

export function MemberLeadAnalytics({
  memberData,
  leadData,
}: {
  memberData: any;
  leadData: any;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <MemberSection data={memberData} />
      <LeadSection data={leadData} />
    </div>
  );
}

function MemberSection({ data }: { data: any }) {
  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-card-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Member Analytics</h2>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MiniStat title="Total Members" value={data.totalMembers} />
        <MiniStat title="Active" value={data.activeMembers} className="text-emerald-500" />
        <MiniStat title="Expired" value={data.expiredMembers} className="text-danger" />
        <MiniStat title="New (Period)" value={data.newMembers} />
      </div>

      <div className="flex flex-col gap-2 rounded-xl bg-background p-4 border border-card-border">
        <h3 className="text-sm font-medium text-muted mb-2">Expiring Memberships</h3>
        <div className="flex justify-between items-center text-sm">
          <span className="flex items-center gap-2"><UserMinus className="h-4 w-4 text-warning" /> In 7 Days</span>
          <span className="font-semibold">{data.expiring7Days}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="flex items-center gap-2"><UserMinus className="h-4 w-4 text-muted" /> In 30 Days</span>
          <span className="font-semibold">{data.expiring30Days}</span>
        </div>
        {data.expiring7Days > 0 && (
          <p className="mt-2 text-xs text-warning bg-warning/10 p-2 rounded-md">
            {data.expiring7Days} memberships expire in the next 7 days.
          </p>
        )}
      </div>

      <div className="h-[250px] w-full">
        <h3 className="text-sm font-medium text-muted mb-4">Member Growth</h3>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.growthData}>
            <defs>
              <linearGradient id="colorMembers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: "#1e1e1e", borderColor: "#333", borderRadius: "8px" }}
              itemStyle={{ color: "#fff" }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#3b82f6"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorMembers)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function LeadSection({ data }: { data: any }) {
  const funnelData = [
    { name: "Total Leads", value: data.totalLeads },
    { name: "Contacted", value: data.contactedLeads },
    { name: "Trial", value: data.trialLeads },
    { name: "Converted", value: data.convertedLeads },
  ];

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-card-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Lead Analytics</h2>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MiniStat title="Total Leads" value={data.totalLeads} />
        <MiniStat title="New (Period)" value={data.newLeads} />
        <MiniStat title="Converted" value={data.convertedLeads} className="text-emerald-500" />
        <MiniStat title="Conversion Rate" value={`${data.conversionRate}%`} />
      </div>

      <div className="flex flex-col gap-2 rounded-xl bg-background p-4 border border-card-border">
        <h3 className="text-sm font-medium text-muted mb-2">Action Items</h3>
        <div className="flex justify-between items-center text-sm">
          <span className="flex items-center gap-2"><PhoneCall className="h-4 w-4 text-warning" /> Follow-ups due today</span>
          <span className="font-semibold">{data.followUpsToday}</span>
        </div>
        {data.followUpsToday > 0 && (
          <p className="mt-2 text-xs text-warning bg-warning/10 p-2 rounded-md">
            {data.followUpsToday} leads are waiting for follow-up today.
          </p>
        )}
      </div>

      <div className="h-[250px] w-full">
        <h3 className="text-sm font-medium text-muted mb-4">Lead Funnel</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={funnelData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={12} stroke="#888888" />
            <Tooltip
              cursor={{ fill: "transparent" }}
              contentStyle={{ backgroundColor: "#1e1e1e", borderColor: "#333", borderRadius: "8px" }}
            />
            <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24}>
              {funnelData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={index === funnelData.length - 1 ? "#10b981" : "#3b82f6"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function MiniStat({ title, value, className = "" }: { title: string; value: string | number; className?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted truncate">{title}</span>
      <span className={`text-xl font-semibold ${className}`}>{value}</span>
    </div>
  );
}
