import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ArrowLeftRight,
  PiggyBank,
  TrendingUp,
  CreditCard,
  Settings,
  Bot,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Home" },
  { href: "/transactions", icon: ArrowLeftRight, label: "Transaksi" },
  { href: "/budgeting", icon: PiggyBank, label: "Budget" },
  { href: "/investments", icon: TrendingUp, label: "Invest" },
  { href: "/debts", icon: CreditCard, label: "Utang" },
  { href: "/ai", icon: Bot, label: "AI" },
  { href: "/settings", icon: Settings, label: "Setting" },
];

export function MobileNav() {
  const location = useLocation();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border glass safe-area-pb">
      <div className="flex items-center justify-around px-1 py-1.5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-xl transition-all duration-200 min-w-0 flex-1",
                isActive ? "text-primary" : "text-muted-foreground active:text-foreground"
              )}
            >
              <div className={cn("p-1 rounded-lg transition-all duration-200", isActive && "bg-primary/10")}>
                <Icon style={{ width: 18, height: 18 }} />
              </div>
              <span className="text-[9px] font-medium leading-none truncate max-w-full">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
