"use client";

import * as React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CashFlowDataPoint {
  date: string;
  label: string;
  income: number;
  expense: number;
}

interface CashFlowChartProps {
  data: CashFlowDataPoint[];
  className?: string;
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const income = payload.find((p: any) => p.dataKey === "income")?.value ?? 0;
    const expense = payload.find((p: any) => p.dataKey === "expense")?.value ?? 0;
    return (
      <div className="bg-popover border border-border rounded-xl shadow-lg p-3 min-w-[160px]">
        <p className="text-xs font-semibold text-muted-foreground mb-2">{label}</p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-muted-foreground">Pemasukan</span>
            </div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(income)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="text-xs text-muted-foreground">Pengeluaran</span>
            </div>
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
              {formatCurrency(expense)}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export function CashFlowChart({ data, className }: CashFlowChartProps) {
  const totalIncome = data.reduce((s, d) => s + d.income, 0);
  const totalExpense = data.reduce((s, d) => s + d.expense, 0);
  const netFlow = totalIncome - totalExpense;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base">Arus Kas Bulanan</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pemasukan vs Pengeluaran
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Net Flow</p>
            <div className="flex items-center gap-1 justify-end">
              {netFlow >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
              )}
              <span
                className={cn(
                  "text-sm font-bold",
                  netFlow >= 0 ? "text-emerald-600" : "text-rose-600"
                )}
              >
                {formatCurrency(netFlow)}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data} margin={{ top: 10, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `Rp${(v / 1000).toFixed(0)}rb`}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              width={55}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="income"
              stroke="#10B981"
              strokeWidth={2.5}
              fill="url(#incomeGradient)"
              dot={false}
              activeDot={{ r: 5, fill: "#10B981" }}
            />
            <Area
              type="monotone"
              dataKey="expense"
              stroke="#F43F5E"
              strokeWidth={2.5}
              fill="url(#expenseGradient)"
              dot={false}
              activeDot={{ r: 5, fill: "#F43F5E" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
