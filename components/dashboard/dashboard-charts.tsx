"use client"

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from "recharts"

interface DonationTrendChartProps {
  data: { month: string; amount: number }[]
}

export function DonationTrendChart({ data }: DonationTrendChartProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-base font-bold text-gray-900">Donations Over Time</h3>
          <p className="text-sm text-gray-400 mt-0.5">Donations received in the last 8 months</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-700" />
          <span className="text-xs font-medium text-gray-500">Monthly donations</span>
        </div>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="donationFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1D4ED8" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#1D4ED8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#94A3B8" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#94A3B8" }}
              tickFormatter={(v) => String(Number.isInteger(v) ? v : "")}
            />
            <Tooltip
              cursor={{ stroke: "#1D4ED8", strokeWidth: 1, strokeDasharray: "4 4" }}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #E2E8F0",
                boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                fontSize: 13,
              }}
              formatter={(value: number) => [value, "Donations"]}
            />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="#1D4ED8"
              strokeWidth={2.5}
              fill="url(#donationFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

interface CauseBreakdownChartProps {
  data: { name: string; value: number; color: string }[]
}

export function CauseBreakdownChart({ data }: CauseBreakdownChartProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200">
      <h3 className="text-base font-bold text-gray-900">Donations by Cause</h3>
      <p className="text-sm text-gray-400 mt-0.5 mb-4">Distribution across programs</p>
      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={42}
              outerRadius={64}
              paddingAngle={3}
              stroke="none"
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #E2E8F0",
                fontSize: 13,
              }}
              formatter={(value: number, name: string) => [`${value}%`, name]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 space-y-2.5">
        {data.map((cause) => (
          <div key={cause.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cause.color }} />
              <span className="text-sm text-gray-600">{cause.name}</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">{cause.value}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}