import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  CreditCard,
  Loader2,
  LogOut,
  Settings,
  TrendingUp,
  Wallet,
  Info,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth, useTheme, usePageVisibility } from "@/components/providers";
import { buildNotifications, type AppNotification } from "@/lib/data-utils";
import { getBudgets, getDebts, getTransactions, getWallets, isSupabaseConfigured } from "@/lib/supabase";
import { getCurrentMonth } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";

type ToneConfig = {
  bg: string;
  border: string;
  text: string;
  Icon: React.FC<{ className?: string }>;
};

const toneConfig: Record<AppNotification["tone"], ToneConfig> = {
  info: {
    bg: "bg-blue-50 dark:bg-blue-950/50",
    border: "border-blue-200 dark:border-blue-800",
    text: "text-blue-800 dark:text-blue-200",
    Icon: Info,
  },
  warning: {
    bg: "bg-amber-50 dark:bg-amber-950/50",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-800 dark:text-amber-200",
    Icon: AlertTriangle,
  },
  danger: {
    bg: "bg-rose-50 dark:bg-rose-950/50",
    border: "border-rose-200 dark:border-rose-800",
    text: "text-rose-800 dark:text-rose-200",
    Icon: AlertCircle,
  },
  success: {
    bg: "bg-emerald-50 dark:bg-emerald-950/50",
    border: "border-emerald-200 dark:border-emerald-800",
    text: "text-emerald-800 dark:text-emerald-200",
    Icon: CheckCircle,
  },
};

export function Header() {
  const { profile, user, signOut } = useAuth();
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
        })
      );
    } catch (error) {
      console.error("Failed to load notifications", error);
    } finally {
      setLoadingNotifications(false);
    }
  }, [user]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  usePageVisibility(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  const unreadCount = useMemo(
    () => notifications.filter((n) => n.tone !== "success").length,
    [notifications]
  );

  const getInitials = (name: string) =>
    name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3 px-3 py-2.5 sm:px-4 sm:py-3 lg:px-6">
          {/* Mobile logo */}
          <div className="flex min-w-0 items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
              <span className="text-xs font-extrabold text-white">FT</span>
            </div>
            <p className="truncate text-sm font-bold">FinTrack</p>
          </div>

          <div className="hidden lg:block" />

          <div className="flex items-center gap-1.5 sm:gap-2">
            <ThemeToggle />

            {/* Notification Bell */}
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

            {/* Account Button */}
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
              <Bell className="h-4 w-4" />
              Notifikasi
              {unreadCount > 0 && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white">
                  {Math.min(unreadCount, 99)}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {loadingNotifications ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span className="text-sm">Memuat notifikasi...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-10 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-900/30">
                <CheckCircle className="h-6 w-6 text-emerald-500" />
              </div>
              <p className="font-semibold text-sm">Semua beres!</p>
              <p className="text-xs text-muted-foreground mt-1">Tidak ada pemberitahuan saat ini.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {notifications.map((n) => {
                const config = toneConfig[n.tone];
                const { Icon } = config;
                return (
                  <Link
                    key={n.id}
                    to={n.href}
                    onClick={() => setShowNotifications(false)}
                    className={`flex items-start gap-3 rounded-xl border p-3 transition-all hover:opacity-90 hover:shadow-sm ${config.bg} ${config.border}`}
                  >
                    <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${config.text}`} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold leading-snug ${config.text}`}>{n.title}</p>
                      <p className={`mt-0.5 text-xs leading-relaxed opacity-80 ${config.text}`}>{n.description}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Account Menu Dialog */}
      <Dialog open={showAccountMenu} onOpenChange={setShowAccountMenu}>
        <DialogContent className="max-w-sm sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Akun Saya</DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 p-3 border border-border">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold text-white">
              {profile?.full_name ? getInitials(profile.full_name) : profile?.email?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold">{profile?.full_name || "User"}</p>
              <p className="truncate text-xs text-muted-foreground">{profile?.email}</p>
            </div>
          </div>

          <div className="space-y-1">
            {[
              { to: "/settings", icon: Settings, label: "Pengaturan" },
              { to: "/settings", icon: Wallet, label: "Kelola Dompet" },
              { to: "/investments", icon: TrendingUp, label: "Investasi" },
              { to: "/debts", icon: CreditCard, label: "Utang & Piutang" },
            ].map((item) => (
              <Link
                key={item.to + item.label}
                to={item.to}
                onClick={() => setShowAccountMenu(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition hover:bg-accent"
              >
                <item.icon className="h-4 w-4 text-muted-foreground" />
                {item.label}
              </Link>
            ))}
          </div>

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
