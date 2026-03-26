"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CreditCard,
  Loader2,
  LogOut,
  Settings,
  TrendingUp,

  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth, useTheme, usePageVisibility } from "@/components/providers";
import { buildNotifications, type AppNotification } from "@/lib/data-utils";
import { getBudgets, getDebts, getTransactions, getWallets, isSupabaseConfigured } from "@/lib/supabase";
import { getCurrentMonth } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";

const toneClasses: Record<AppNotification["tone"], string> = {
  info: "border-blue-500/30 bg-blue-500/10 text-blue-900 dark:text-blue-100",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100",
  danger: "border-rose-500/30 bg-rose-500/10 text-rose-900 dark:text-rose-100",
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
};

const toneIcons: Record<AppNotification["tone"], string> = {
  info: "💡",
  warning: "⚠️",
  danger: "🚨",
  success: "✅",
};

export function Header() {
  const { profile, user, signOut, reconnect } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);

  const loadNotifications = useCallback(async () => {
    if (!user || !isSupabaseConfigured) {
      setLoadingNotifications(false);
      return;
    }

    setLoadingNotifications(true);
    try {
      const month = getCurrentMonth();
      const [wallets, transactions, budgets, debts] = await Promise.all([
        getWallets(user.id),
        getTransactions(user.id, { month }),
        getBudgets(user.id, month),
        getDebts(user.id),
      ]);

      const expenseByCategory = transactions
        .filter((t) => t.type === "expense")
        .reduce<Record<string, number>>((acc, t) => {
          acc[t.category] = (acc[t.category] ?? 0) + Number(t.amount);
          return acc;
        }, {});

      const budgetProgress = budgets.map((b) => ({
        ...b,
        spent: expenseByCategory[b.category] ?? 0,
      }));

      setNotifications(
        buildNotifications({
          walletCount: wallets.length,
          transactionsThisMonth: transactions,
          budgetProgress,
          debts,
        }),
      );
    } catch (error) {
      console.error("Failed to load notifications", error);
      setNotifications([{
        id: "notif-error",
        title: "Notifikasi gagal dimuat",
        description: "Silakan refresh halaman.",
        href: "/dashboard",
        tone: "warning",
      }]);
    } finally {
      setLoadingNotifications(false);
    }
  }, [user]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Re-load notifications when tab regains focus
  usePageVisibility(useCallback(() => {
    loadNotifications();
  }, [loadNotifications]));

  const unreadCount = useMemo(
    () => notifications.filter((n) => n.tone !== "success").length,
    [notifications],
  );

  const getInitials = (name: string) =>
    name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3 px-3 py-2.5 sm:px-4 sm:py-3 lg:px-6">
          <div className="flex min-w-0 items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
              <span className="text-xs font-extrabold text-white">FT</span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">FinTrack</p>
            </div>
          </div>

          <div className="hidden lg:block" />

          <div className="flex items-center gap-1.5 sm:gap-2">
            <ThemeToggle />

            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-xl h-9 w-9"
              onClick={() => setShowNotifications(true)}
              aria-label="Notifikasi"
            >
              <Bell className="h-[18px] w-[18px]" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {Math.min(unreadCount, 9)}
                </span>
              )}
            </Button>

            <button
              type="button"
              onClick={() => setShowAccountMenu(true)}
              className="flex items-center gap-2 rounded-2xl border border-border bg-card px-2 py-1.5 transition hover:border-primary/30 hover:bg-accent/40"
              aria-label="Menu akun"
            >
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-[10px] sm:text-xs font-bold text-white shadow-md">
                {profile?.full_name
                  ? getInitials(profile.full_name)
                  : profile?.email?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="hidden max-w-[120px] min-w-0 text-left sm:block">
                <p className="truncate text-sm font-semibold leading-tight">{profile?.full_name || "Akun"}</p>
                <p className="truncate text-[11px] text-muted-foreground leading-tight">{profile?.email}</p>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Notifications Dialog */}
      <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifikasi
            </DialogTitle>
            <DialogDescription>
              {unreadCount > 0 ? `${unreadCount} pemberitahuan penting` : "Tidak ada pemberitahuan"}
            </DialogDescription>
          </DialogHeader>

          {loadingNotifications ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Memuat...
            </div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {notifications.map((n) => (
                <Link
                  key={n.id}
                  href={n.href}
                  onClick={() => setShowNotifications(false)}
                  className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 transition hover:opacity-80 ${toneClasses[n.tone]}`}
                >
                  <span className="text-base mt-0.5 shrink-0">{toneIcons[n.tone]}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-snug">{n.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed opacity-80">{n.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Account Menu Dialog — cleaned up layout */}
      <Dialog open={showAccountMenu} onOpenChange={setShowAccountMenu}>
        <DialogContent className="max-w-sm sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Akun Saya</DialogTitle>
          </DialogHeader>

          {/* Profile card */}
          <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 p-3 border border-border">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold text-white">
              {profile?.full_name ? getInitials(profile.full_name) : profile?.email?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold">{profile?.full_name || "User"}</p>
              <p className="truncate text-xs text-muted-foreground">{profile?.email}</p>
            </div>
          </div>

          {/* Quick links */}
          <div className="space-y-1.5">
            {[
              { href: "/settings", icon: Settings, label: "Pengaturan" },
              { href: "/settings#wallets", icon: Wallet, label: "Kelola Dompet" },
              { href: "/investments", icon: TrendingUp, label: "Investasi" },
              { href: "/debts", icon: CreditCard, label: "Utang & Piutang" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setShowAccountMenu(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition hover:bg-accent"
              >
                <item.icon className="h-4 w-4 text-muted-foreground" />
                {item.label}
              </Link>
            ))}
          </div>

          {/* Logout */}
          <div className="border-t border-border pt-3">
            <button
              onClick={async () => {
                await signOut();
                setShowAccountMenu(false);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive transition hover:bg-destructive/5"
            >
              <LogOut className="h-4 w-4" />
              Keluar dari Akun
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
