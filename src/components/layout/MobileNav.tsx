import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ArrowLeftRight,
  PiggyBank,
  Bot,
  Settings,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Home" },
  { href: "/transactions", icon: ArrowLeftRight, label: "Transaksi" },
  { href: "/budgeting", icon: PiggyBank, label: "Budget" },
  { href: "/ai", icon: Bot, label: "AI" },
  { href: "/settings", icon: Settings, label: "Lainnya" },
];

export function MobileNav() {
  const location = useLocation();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 safe-area-pb bg-background/80 backdrop-blur-xl border-t border-border/30">
      <div className="flex items-center justify-around px-2 pt-2 pb-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "mobile-nav-item flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl",
                "min-w-[56px] min-h-[48px] justify-center",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-xl transition-all duration-200",
                isActive && "bg-primary/10"
              )}>
                <Icon style={{ width: 22, height: 22 }} strokeWidth={isActive ? 2.2 : 1.8} />
              </div>
              <span className={cn(
                "text-[10px] font-medium leading-none",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
