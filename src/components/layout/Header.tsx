"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CreditCard,
  Loader2,
  Settings,
  UserCircle2,
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
import { useAuth, useTheme } from "@/components/providers";
import { buildNotifications, type AppNotification } from "@/lib/data-utils";
import { getBudgets, getDebts, getTransactions, getWallets } from "@/lib/supabase";
import { getCurrentMonth } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";

const toneClasses: Record<AppNotification["tone"], string> = {
  info: "border-blue-500/30 bg-blue-500/10 text-blue-900 dark:text-blue-100",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100",
  danger: "border-rose-500/30 bg-rose-500/10 text-rose-900 dark:text-rose-100",
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
};

export function Header() {
  const { profile, user, signOut } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadNotifications = async () => {
      setLoadingNotifications(true);
      try {
        const month = getCurrentMonth();
        const [wallets, transactions, budgetProgress, debts] = await Promise.all([
          getWallets(user.id),
          getTransactions(user.id, { month }),
          getBudgets(user.id, month).then(async (budgets) => {
            const transactionList = await getTransactions(user.id, { month, type: "expense" });
            return budgets.map((budget) => ({
              ...budget,
              spent: transactionList
                .filter((transaction) => transaction.category === budget.category)
                .reduce((sum, transaction) => sum + Number(transaction.amount), 0),
            }));
          }),
          getDebts(user.id),
        ]);

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
        setNotifications([
          {
            id: "notif-error",
            title: "Notif belum bisa dimuat",
            description: "Coba refresh halaman dulu ya best, terus cek lagi.",
            href: "/dashboard",
            tone: "warning",
          },
        ]);
      } finally {
        setLoadingNotifications(false);
      }
    };

    loadNotifications();
  }, [user]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => notification.tone !== "success").length,
    [notifications],
  );

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3 px-4 py-3 lg:px-6">
          <div className="flex min-w-0 items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
              <span className="text-xs font-extrabold text-white">FT</span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">FinTrack</p>
              <p className="truncate text-[11px] text-muted-foreground">Finance bestie edition</p>
            </div>
          </div>

          <div className="hidden lg:block" />

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />

            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-xl"
              onClick={() => setShowNotifications(true)}
              aria-label="Buka notifikasi"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {Math.min(unreadCount, 9)}
                </span>
              )}
            </Button>

            <button
              type="button"
              onClick={() => setShowAccountMenu(true)}
              className="flex items-center gap-2 rounded-2xl border border-border bg-card px-2.5 py-1.5 transition hover:border-primary/30 hover:bg-accent/40"
              aria-label="Buka menu akun"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xs font-bold text-white shadow-md">
                {profile?.full_name
                  ? getInitials(profile.full_name)
                  : profile?.email?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="hidden max-w-[140px] min-w-0 text-left sm:block">
                <p className="truncate text-sm font-semibold">{profile?.full_name || "Akun kamu"}</p>
                <p className="truncate text-xs text-muted-foreground">{profile?.email}</p>
              </div>
            </button>
          </div>
        </div>
      </header>

      <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
        <DialogContent className="max-w-lg sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Notifikasi & insight</DialogTitle>
            <DialogDescription>
              Ringkasan hal penting yang perlu kamu cek dari akun keuanganmu.
            </DialogDescription>
          </DialogHeader>

          {loadingNotifications ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Lagi ambil update...
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={notification.href}
                  onClick={() => setShowNotifications(false)}
                  className={`block rounded-2xl border px-4 py-3 transition hover:scale-[0.99] ${toneClasses[notification.tone]}`}
                >
                  <p className="text-sm font-semibold leading-snug">{notification.title}</p>
                  <p className="mt-1 text-sm leading-relaxed opacity-90">{notification.description}</p>
                </Link>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showAccountMenu} onOpenChange={setShowAccountMenu}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Kelola akun</DialogTitle>
            <DialogDescription>
              Semua shortcut penting buat profil, dompet, dan pengaturan akun ada di sini.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold text-white">
                {profile?.full_name
                  ? getInitials(profile.full_name)
                  : profile?.email?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold">{profile?.full_name || "Akun kamu"}</p>
                <p className="truncate text-sm text-muted-foreground">{profile?.email}</p>
                <p className="mt-1 text-xs text-muted-foreground">Tema aktif: {theme}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button asChild variant="outline" className="justify-start rounded-xl">
              <Link href="/settings" onClick={() => setShowAccountMenu(false)}>
                <Settings className="mr-2 h-4 w-4" />
                Profil & preferensi
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start rounded-xl">
              <Link href="/settings#wallets" onClick={() => setShowAccountMenu(false)}>
                <Wallet className="mr-2 h-4 w-4" />
                Kelola dompet
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start rounded-xl">
              <Link href="/settings#account-management" onClick={() => setShowAccountMenu(false)}>
                <UserCircle2 className="mr-2 h-4 w-4" />
                Pengelola akun
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start rounded-xl">
              <Link href="/debts" onClick={() => setShowAccountMenu(false)}>
                <CreditCard className="mr-2 h-4 w-4" />
                Lihat utang & piutang
              </Link>
            </Button>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="destructive"
              onClick={async () => {
                await signOut();
                setShowAccountMenu(false);
                router.push("/auth/login");
              }}
            >
              Keluar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
