import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/components/providers";
import { formatCurrency } from "@/lib/utils";
import { EXPENSE_CATEGORIES, type Budget } from "@/types";
import { Link } from "react-router-dom";

const getCategoryInfo = (id: string) =>
  EXPENSE_CATEGORIES.find((c) => c.id === id) || { label: id, icon: "📦", color: "#888" };

export function BudgetProgress({ budgets }: { budgets: Budget[] }) {
  const { currency, locale } = useAuth();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Budget</CardTitle>
        <Link to="/budgeting" className="text-xs text-primary hover:underline">Kelola</Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {budgets.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Belum ada budget bulan ini.</p>
        ) : (
          budgets.slice(0, 5).map((b) => {
            const cat = getCategoryInfo(b.category);
            const pct = b.limit > 0 ? Math.min((b.spent / b.limit) * 100, 100) : 0;
            const isOver = b.spent > b.limit;
            return (
              <div key={b.id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span>{cat.icon}</span>
                    <span className="font-medium truncate">{cat.label}</span>
                  </div>
                  <span className={`text-xs font-medium ${isOver ? "text-rose-600" : "text-muted-foreground"}`}>
                    {formatCurrency(b.spent, currency, locale)} / {formatCurrency(b.limit, currency, locale)}
                  </span>
                </div>
                <Progress value={pct} className="h-1.5" indicatorClassName={isOver ? "bg-rose-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500"} />
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
