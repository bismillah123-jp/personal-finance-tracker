"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";
import { EXPENSE_CATEGORIES, Transaction } from "@/types";
import { cn } from "@/lib/utils";

interface CategoryBreakdownProps {
  transactions: Transaction[];
  className?: string;
}

export function CategoryBreakdown({ transactions, className }: CategoryBreakdownProps) {
  const expenseMap = new Map<string, number>();
  let totalExpense = 0;

  transactions
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      expenseMap.set(t.category, (expenseMap.get(t.category) ?? 0) + t.amount);
      totalExpense += t.amount;
    });

  const sortedCategories = Array.from(expenseMap.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([catId, amount]) => {
      const cat =
        EXPENSE_CATEGORIES.find((c) => c.id === catId) ?? {
          id: catId,
          label: catId,
          icon: "📦",
          color: "#AEB6BF",
        };
      return {
        ...cat,
        amount,
        percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
      };
    });

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Pengeluaran per Kategori</CardTitle>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatCurrency(totalExpense)} total bulan ini
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedCategories.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-muted-foreground">Belum ada data pengeluaran</p>
          </div>
        ) : (
          sortedCategories.slice(0, 6).map((cat) => (
            <div key={cat.id} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">{cat.icon}</span>
                  <span className="text-sm font-medium text-foreground">{cat.label}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-foreground">
                    {formatCurrency(cat.amount)}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1.5">
                    {cat.percentage.toFixed(0)}%
                  </span>
                </div>
              </div>
              <Progress
                value={cat.percentage}
                indicatorClassName="rounded-full"
                className="h-2 rounded-full"
              />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
