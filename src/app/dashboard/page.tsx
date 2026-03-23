"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ChevronLeft, ChevronRight, Landmark, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { AddTransactionFAB } from "@/components/add-transaction-fab";
import { BudgetProgress } from "@/components/dashboard/BudgetProgress";
import { CategoryBreakdown } from "@/components/dashboard/CategoryBreakdown";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/components/providers";
import { buildCashFlowSeries, mapBudgetToUi, mapTransactionToUi, mapWalletToUi, toNumber } from "@/lib/data-utils";
import { getCachedDashboardSnapshot, getDashboardData, type Budget as DbBudget, type Debt as DbDebt, type Investment as DbInvestment, type Transaction as DbTransaction, type Wallet as DbWallet } from "@/lib/supabase";
import { formatCurrency, getCurrentMonth, getMonthName } from "@/lib/utils";

const CashFlowChart = dynamic(
  () => import("@/components/dashboard/CashFlowChart").then((mod) => mod.CashFlowChart),
  {
    ssr: false,
    loading: () => (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">Menyiapkan grafik arus kas...</CardContent>
      </Card>
    ),
  },
);

export default function DashboardPage() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth());
  const cachedDashboard = user ? getCachedDashboardSnapshot(user.id, currentMonth) : null;
  const [wallets, setWallets] = useState<DbWallet[]>(cachedDashboard?.wallets ?? []);
  const [transactions, setTransactions] = useState<DbTransaction[]>(cachedDashboard?.transactions ?? []);
  const [budgets, setBudgets] = useState<Array<DbBudget & { spent?: number }>>(cachedDashboard?.budgets ?? []);
  const [investments, setInvestments] = useState<DbInvestment[]>(cachedDashboard?.investments ?? []);
  const [debts, setDebts] = useState<DbDebt[]>(cachedDashboard?.debts ?? []);
  const [loading, setLoading] = useState(!cachedDashboard);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;

    const snapshot = getCachedDashboardSnapshot(user.id, currentMonth);
    if (!snapshot) return;

    setWallets(snapshot.wallets);
    setTransactions(snapshot.transactions);
    setBudgets(snapshot.budgets);
    setInvestments(snapshot.investments);
    setDebts(snapshot.debts);
    setLoading(false);
  }, [currentMonth, user]);

  const loadData = async () => {
    if (!user) return;
    setLoading((prev) => (wallets.length === 0 && transactions.length === 0 && budgets.length === 0 && investments.length === 0 && debts.length === 0 ? true : prev));
    setError("");

    try {
      const data = await getDashboardData(user.id, currentMonth);
      setWallets(data.wallets);
      setTransactions(data.transactions);
      setBudgets(data.budgets);
      setInvestments(data.investments);
      setDebts(data.debts);
    } catch (loadError: any) {
      console.error(loadError);
      setError(loadError?.message || "Dashboard belum bisa dimuat.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, currentMonth]);

  const uiTransactions = useMemo(() => transactions.map(mapTransactionToUi), [transactions]);
  const uiBudgets = useMemo(() => budgets.map(mapBudgetToUi), [budgets]);
  const uiWallets = useMemo(() => wallets.map(mapWalletToUi), [wallets]);
  const cashFlowData = useMemo(() => buildCashFlowSeries(transactions, currentMonth), [transactions, currentMonth]);

  const totalInvestmentValue = investments.reduce((sum, investment) => sum + toNumber(investment.current_value), 0);
  const totalAssets = wallets.reduce((sum, wallet) => sum + Math.max(0, toNumber(wallet.balance)), 0) + totalInvestmentValue;
  const totalLiabilities = debts
    .filter((debt) => debt.debt_type === "hutang")
    .reduce((sum, debt) => sum + toNumber(debt.remaining_amount), 0);
  const monthlyIncome = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0);
  const monthlyExpense = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0);
  const netWorth = totalAssets - totalLiabilities;
  const monthLabel = getMonthName(currentMonth);
  const hasData = wallets.length > 0 || transactions.length > 0 || budgets.length > 0 || investments.length > 0 || debts.length > 0;

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6 min-w-0">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="break-words text-sm text-muted-foreground">Ringkasan keuangan untuk {monthLabel}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/settings#wallets">Tambah dompet</Link>
            </Button>
            <AddTransactionFAB
              canCreateTransaction={wallets.length > 0}
              disabledReason="Tambahkan dompet terlebih dahulu agar transaksi dapat dicatat dari dashboard."
              onSaved={loadData}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-3 py-2 sm:px-4">
          <button
            onClick={() => {
              const [year, month] = currentMonth.split("-").map(Number);
              const nextDate = new Date(year, month - 2, 1);
              setCurrentMonth(`${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`);
            }}
            className="rounded-xl p-2 transition hover:bg-accent"
          >
            <ChevronLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <div className="min-w-0 text-center">
            <p className="truncate text-base font-semibold">{monthLabel}</p>
            <p className="text-xs text-muted-foreground">{transactions.length} transaksi bulan ini</p>
          </div>
          <button
            onClick={() => {
              const [year, month] = currentMonth.split("-").map(Number);
              const nextDate = new Date(year, month, 1);
              setCurrentMonth(`${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`);
            }}
            className="rounded-xl p-2 transition hover:bg-accent"
          >
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">Memuat dashboard...</CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="p-6 text-sm text-rose-700 dark:text-rose-200">{error}</CardContent>
          </Card>
        ) : !hasData ? (
          <Card>
            <CardContent className="space-y-4 p-6 sm:p-8">
              <div>
                <h2 className="text-xl font-bold">Belum ada data keuangan</h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Dashboard akan menampilkan data setelah dompet, transaksi, anggaran, investasi, atau utang mulai dicatat.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-border p-4">
                  <p className="font-semibold">1. Bikin dompet</p>
                  <p className="mt-1 text-sm text-muted-foreground">Tambahkan dompet utama, e-wallet, atau rekening bank sebagai sumber transaksi.</p>
                </div>
                <div className="rounded-2xl border border-border p-4">
                  <p className="font-semibold">2. Catat transaksi pertama</p>
                  <p className="mt-1 text-sm text-muted-foreground">Setelah transaksi tercatat, saldo dan grafik akan diperbarui secara otomatis.</p>
                </div>
                <div className="rounded-2xl border border-border p-4">
                  <p className="font-semibold">3. Atur budget</p>
                  <p className="mt-1 text-sm text-muted-foreground">Tetapkan anggaran agar pemantauan pengeluaran menjadi lebih terstruktur.</p>
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild className="rounded-xl">
                  <Link href="/settings#wallets">Kelola dompet</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-xl">
                  <Link href="/budgeting">Atur budget</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Total Aset"
                value={formatCurrency(totalAssets)}
                icon={<Landmark className="h-5 w-5" />}
                iconBg="bg-blue-50 dark:bg-blue-950"
                iconColor="text-blue-600 dark:text-blue-400"
              />
              <MetricCard
                label="Total Kewajiban"
                value={formatCurrency(totalLiabilities)}
                icon={<Wallet className="h-5 w-5" />}
                iconBg="bg-rose-50 dark:bg-rose-950"
                iconColor="text-rose-600 dark:text-rose-400"
              />
              <MetricCard
                label="Pemasukan Bulan Ini"
                value={formatCurrency(monthlyIncome)}
                icon={<TrendingUp className="h-5 w-5" />}
                iconBg="bg-emerald-50 dark:bg-emerald-950"
                iconColor="text-emerald-600 dark:text-emerald-400"
              />
              <MetricCard
                label="Pengeluaran Bulan Ini"
                value={formatCurrency(monthlyExpense)}
                icon={<TrendingDown className="h-5 w-5" />}
                iconBg="bg-amber-50 dark:bg-amber-950"
                iconColor="text-amber-600 dark:text-amber-400"
              />
            </div>

            <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 p-6 text-white shadow-xl">
              <p className="text-sm text-white/75">Net worth</p>
              <p className="mt-2 break-words text-3xl font-extrabold tracking-tight">{formatCurrency(netWorth)}</p>
              <p className="mt-1 text-xs text-white/70">{wallets.length} dompet • {investments.length} investasi • {debts.length} catatan utang/piutang</p>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <CashFlowChart data={cashFlowData} />
              </div>
              <div>
                <BudgetProgress budgets={uiBudgets} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <RecentTransactions transactions={uiTransactions} />
              <CategoryBreakdown transactions={uiTransactions} />
            </div>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold">Ringkasan dompet</p>
                    <p className="text-sm text-muted-foreground">Saldo terkini dari akun Anda</p>
                  </div>
                  <Button asChild variant="outline" size="sm" className="rounded-xl">
                    <Link href="/settings#wallets">Kelola</Link>
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {uiWallets.map((wallet) => (
                    <div key={wallet.id} className="rounded-2xl border border-border p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl text-base" style={{ backgroundColor: `${wallet.color}20` }}>
                          {wallet.icon === "wallet" ? "👛" : wallet.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{wallet.name}</p>
                          <p className="truncate text-xs text-muted-foreground capitalize">{wallet.type.replace("-", " ")}</p>
                        </div>
                      </div>
                      <p className={`mt-4 break-words text-lg font-bold ${wallet.balance < 0 ? "text-rose-600" : "text-foreground"}`}>
                        {formatCurrency(wallet.balance)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}
