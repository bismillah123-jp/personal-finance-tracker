"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/providers";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, type Transaction } from "@/types";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";

const getCategoryInfo = (categoryId: string, type: "income" | "expense") => {
  const categories = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  return categories.find((c) => c.id === categoryId) || { label: categoryId, icon: "📦", color: "#888" };
};

export function RecentTransactions({ transactions }: { transactions: Transaction[] }) {
  const { currency, locale } = useAuth();
  const recent = transactions.slice(0, 8);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Transaksi terbaru</CardTitle>
        <Link href="/transactions" className="text-xs text-primary hover:underline">Lihat semua</Link>
      </CardHeader>
      <CardContent className="space-y-2">
        {recent.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Belum ada transaksi bulan ini.</p>
        ) : (
          recent.map((t) => {
            const cat = getCategoryInfo(t.category, t.type);
            return (
              <div key={t.id} className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-accent/30">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base" style={{ backgroundColor: `${cat.color}15` }}>
                  {cat.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.note || cat.label}</p>
                  <p className="text-xs text-muted-foreground">{formatShortDate(t.date, locale)}</p>
                </div>
                <p className={`shrink-0 text-sm font-semibold ${t.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                  {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount, currency, locale)}
                </p>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
