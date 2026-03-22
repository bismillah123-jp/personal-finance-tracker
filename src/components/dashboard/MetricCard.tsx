"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string;
  change?: number;
  icon: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
  className?: string;
}

export function MetricCard({
  label,
  value,
  change,
  icon,
  iconBg = "bg-primary/10",
  iconColor = "text-primary",
  className,
}: MetricCardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <div
      className={cn(
        "bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5",
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn("p-2.5 rounded-xl", iconBg)}>
          <div className={iconColor}>{icon}</div>
        </div>
        {change !== undefined && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg",
              isPositive && "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
              isNegative && "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400",
              !isPositive && !isNegative && "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
            )}
          >
            {isPositive && <TrendingUp className="w-3 h-3" />}
            {isNegative && <TrendingDown className="w-3 h-3" />}
            {!isPositive && !isNegative && <Minus className="w-3 h-3" />}
            <span>{Math.abs(change ?? 0).toFixed(1)}%</span>
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground font-medium mb-1">{label}</p>
      <p className="text-2xl font-extrabold text-foreground tracking-tight">{value}</p>
    </div>
  );
}
