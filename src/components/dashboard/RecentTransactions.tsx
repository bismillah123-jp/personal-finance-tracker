"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, Transaction } from "@/types";
import { ArrowUpLeft, ArrowUpRight, ArrowDownRight, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

function getCategoryInfo(categoryId: string, type: "income" | "expense") {
  const categories = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  return categories.find((c) => c.id === categoryId) ?? { id: categoryId, label: categoryId, icon: "📦", color: "#AEB6BF" };
}

interface RecentTransactionsProps {
  transactions: Transaction[];
  className?: string;
}

export function RecentTransactions({ transactions, className }: RecentTransactionsProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base">Transaksi Terakhir</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            {transactions.length} transaksi bulan ini
          </p>
        </div>
        <Link
          href="/transactions"
          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Lihat semua <ChevronRight className="w-3 h-3" />
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {transactions.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm text-muted-foreground">Belum ada transaksi</p>
            </div>
          ) : (
            transactions.slice(0, 6).map((tx) => {
              const cat = getCategoryInfo(tx.category, tx.type);
              const isIncome = tx.type === "income";
              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-accent/40 transition-colors duration-150 cursor-pointer"
                >
                  {/* Icon */}
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0",
                      isIncome ? "bg-emerald-50 dark:bg-emerald-950" : "bg-rose-50 dark:bg-rose-950"
                    )}
                  >
                    {cat.icon}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {cat.label}
                      </p>
                      <Badge variant={isIncome ? "income" : "expense"} className="text-[10px] px-1.5 py-0">
                        {isIncome ? "Masuk" : "Keluar"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {tx.note || formatShortDate(tx.date)}
                    </p>
                  </div>

                  {/* Amount */}
                  <div className="text-right shrink-0">
                    <div className={cn("flex items-center gap-1 text-sm font-bold", isIncome ? "text-emerald-600" : "text-rose-600")}>
                      {isIncome ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      {isIncome ? "+" : "-"}
                      {formatCurrency(tx.amount)}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {formatShortDate(tx.date)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
