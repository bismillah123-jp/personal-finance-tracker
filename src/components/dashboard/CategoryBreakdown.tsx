"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/providers";
import { formatCurrency } from "@/lib/utils";
import { EXPENSE_CATEGORIES, type Transaction } from "@/types";

export function CategoryBreakdown({ transactions }: { transactions: Transaction[] }) {
  const { currency, locale } = useAuth();

  const categoryData = useMemo(() => {
    const expensesByCategory: Record<string, number> = {};
    transactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
      });

    return Object.entries(expensesByCategory)
      .map(([id, amount]) => {
        const cat = EXPENSE_CATEGORIES.find((c) => c.id === id);
        return {
          id,
          label: cat?.label || id,
          icon: cat?.icon || "📦",
          color: cat?.color || "#888",
          amount,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  const total = categoryData.reduce((sum, c) => sum + c.amount, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Pengeluaran per kategori</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {categoryData.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Belum ada pengeluaran bulan ini.</p>
        ) : (
          categoryData.map((cat) => {
            const pct = total > 0 ? (cat.amount / total) * 100 : 0;
            return (
              <div key={cat.id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base">{cat.icon}</span>
                    <span className="text-sm font-medium truncate">{cat.label}</span>
                  </div>
                  <span className="text-sm font-semibold whitespace-nowrap">{formatCurrency(cat.amount, currency, locale)}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: cat.color }} />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
