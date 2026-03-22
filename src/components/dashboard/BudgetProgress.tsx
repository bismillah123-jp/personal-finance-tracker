"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";
import { EXPENSE_CATEGORIES, Budget } from "@/types";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface BudgetProgressProps {
  budgets: Budget[];
  className?: string;
}

export function BudgetProgress({ budgets, className }: BudgetProgressProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Budget Bulan Ini</CardTitle>
        <p className="text-xs text-muted-foreground mt-0.5">
          {budgets.filter((b) => b.spent >= b.limit).length} dari {budgets.length} kategori melebihi limit
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {budgets.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-muted-foreground">
              Belum ada budget. Atur di halaman Budgeting.
            </p>
          </div>
        ) : (
          budgets.slice(0, 5).map((budget) => {
            const cat = EXPENSE_CATEGORIES.find((c) => c.id === budget.category) ?? {
              id: budget.category,
              label: budget.category,
              icon: "📦",
              color: "#AEB6BF",
            };
            const percentage = Math.min((budget.spent / budget.limit) * 100, 100);
            const isOver = budget.spent > budget.limit;
            const isWarning = percentage >= 80 && percentage < 100;

            return (
              <div key={budget.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{cat.icon}</span>
                    <span className="text-sm font-medium text-foreground">{cat.label}</span>
                    {isOver && <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />}
                  </div>
                  <div className="text-right">
                    <span className={cn("text-sm font-bold", isOver ? "text-rose-600" : "text-foreground")}>
                      {formatCurrency(budget.spent)}
                    </span>
                    <span className="text-xs text-muted-foreground"> / {formatCurrency(budget.limit)}</span>
                  </div>
                </div>
                <Progress
                  value={percentage}
                  indicatorClassName={cn(
                    "rounded-full transition-all duration-500",
                    isOver && "bg-rose-500",
                    isWarning && "bg-amber-400",
                    !isOver && !isWarning && "bg-emerald-500"
                  )}
                  className="h-2 rounded-full"
                />
                <p className="text-[11px] text-muted-foreground text-right">
                  {percentage.toFixed(0)}% terpakai
                  {isOver && (
                    <span className="text-rose-500 font-medium ml-1">
                      (+{formatCurrency(budget.spent - budget.limit)} lebih)
                    </span>
                  )}
                </p>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
