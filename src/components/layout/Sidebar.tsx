"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ArrowLeftRight,
  PiggyBank,
  TrendingUp,
  CreditCard,
  Settings,
  LogOut,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/components/providers";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Transaksi", href: "/transactions", icon: ArrowLeftRight },
  { label: "Budgeting", href: "/budgeting", icon: PiggyBank },
  { label: "Investasi", href: "/investments", icon: TrendingUp },
  { label: "Utang", href: "/debts", icon: CreditCard },
];

export function Sidebar() {
  const pathname = usePathname();
  const { signOut, profile } = useAuth();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <aside className="flex flex-col h-screen sticky top-0 border-r border-border bg-card w-64">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 shrink-0">
          <Wallet className="w-4 h-4 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-foreground tracking-tight">
            Fintrack
          </span>
          <span className="text-[10px] text-muted-foreground">
            Personal Finance
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                isActive
                  ? "bg-primary/10 text-primary dark:bg-primary/20"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5 shrink-0 transition-transform duration-200",
                  !isActive && "group-hover:scale-110"
                )}
              />
              <span>{item.label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Nav */}
      <div className="px-3 pb-4 space-y-1 border-t border-border pt-2">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
            pathname === "/settings"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          <Settings className="w-5 h-5 shrink-0" />
          <span>Pengaturan</span>
        </Link>
        <button
          onClick={() => signOut()}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200 w-full"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span>Keluar</span>
        </button>
      </div>

      {/* User Profile */}
      <div className="px-3 pb-3">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-muted/50">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {profile?.full_name ? getInitials(profile.full_name) : profile?.email?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {profile?.full_name || "User"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {profile?.email}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
