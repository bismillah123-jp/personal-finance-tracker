"use client";

import * as React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { CashFlowChart } from "@/components/dashboard/CashFlowChart";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { CategoryBreakdown } from "@/components/dashboard/CategoryBreakdown";
import { BudgetProgress } from "@/components/dashboard/BudgetProgress";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Landmark,
  PiggyBank,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatCurrency, getMonthName, getCurrentMonth } from "@/lib/utils";
import {
  Transaction,
  Wallet as WalletType,
  Budget,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
} from "@/types";

// ============================
// MOCK DATA — replace with Supabase fetch
// ============================

const MOCK_WALLETS: WalletType[] = [
  {
    id: "w1",
    name: "BCA Utama",
    type: "bank",
    balance: 12_500_000,
    currency: "IDR",
    color: "#2563EB",
    icon: "🏦",
    isDefault: true,
    createdAt: "2024-01-01",
  },
  {
    id: "w2",
    name: "GoPay",
    type: "e-wallet",
    balance: 850_000,
    currency: "IDR",
    color: "#10B981",
    icon: "📱",
    isDefault: false,
    createdAt: "2024-01-01",
  },
  {
    id: "w3",
    name: "Tunai",
    type: "cash",
    balance: 300_000,
    currency: "IDR",
    color: "#F59E0B",
    icon: "💵",
    isDefault: false,
    createdAt: "2024-01-01",
  },
  {
    id: "w4",
    name: "BCA Credit",
    type: "credit-card",
    balance: -2_100_000,
    currency: "IDR",
    color: "#EF4444",
    icon: "💳",
    isDefault: false,
    createdAt: "2024-01-01",
  },
];

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: "t1",
    type: "income",
    amount: 8_500_000,
    category: "gaji",
    walletId: "w1",
    date: "2024-03-01",
    note: "Gaji bulan Maret",
    createdAt: "2024-03-01",
  },
  {
    id: "t2",
    type: "expense",
    amount: 1_200_000,
    category: "makanan",
    walletId: "w1",
    date: "2024-03-02",
    note: "Belanja mingguan",
    createdAt: "2024-03-02",
  },
  {
    id: "t3",
    type: "expense",
    amount: 350_000,
    category: "transportasi",
    walletId: "w2",
    date: "2024-03-03",
    note: "Grab ke kantor",
    createdAt: "2024-03-03",
  },
  {
    id: "t4",
    type: "expense",
    amount: 450_000,
    category: "hiburan",
    walletId: "w1",
    date: "2024-03-05",
    note: "Nonton bioskop",
    createdAt: "2024-03-05",
  },
  {
    id: "t5",
    type: "income",
    amount: 1_500_000,
    category: "freelance",
    walletId: "w1",
    date: "2024-03-07",
    note: "Project freelance desain",
    createdAt: "2024-03-07",
  },
  {
    id: "t6",
    type: "expense",
    amount: 75_000,
    category: "makanan",
    walletId: "w2",
    date: "2024-03-08",
    note: "Kopi & snack",
    createdAt: "2024-03-08",
  },
  {
    id: "t7",
    type: "expense",
    amount: 890_000,
    category: "belanja",
    walletId: "w1",
    date: "2024-03-10",
    note: "Shopping online",
    createdAt: "2024-03-10",
  },
  {
    id: "t8",
    type: "expense",
    amount: 250_000,
    category: "kesehatan",
    walletId: "w3",
    date: "2024-03-12",
    note: "Vitamin & obat",
    createdAt: "2024-03-12",
  },
];

const MOCK_BUDGETS: Budget[] = [
  { id: "b1", category: "makanan", limit: 2_000_000, spent: 1_650_000, month: "2024-03" },
  { id: "b2", category: "transportasi", limit: 500_000, spent: 350_000, month: "2024-03" },
  { id: "b3", category: "hiburan", limit: 600_000, spent: 450_000, month: "2024-03" },
  { id: "b4", category: "belanja", limit: 1_500_000, spent: 1_890_000, month: "2024-03" },
  { id: "b5", category: "kesehatan", limit: 300_000, spent: 250_000, month: "2024-03" },
];

// Cash flow chart mock data — last 30 days
const MOCK_CASHFLOW = Array.from({ length: 30 }, (_, i) => {
  const date = new Date(2024, 2, i + 1);
  return {
    date: date.toISOString().split("T")[0],
    label: date.toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
    income: Math.random() > 0.7 ? Math.floor(Math.random() * 500_000 + 100_000) : 0,
    expense: Math.floor(Math.random() * 300_000 + 50_000),
  };
});

// ============================
// COMPONENT
// ============================

export default function DashboardPage() {
  const [currentMonth, setCurrentMonth] = React.useState(getCurrentMonth());

  // Compute metrics from mock data
  const totalAssets =
    MOCK_WALLETS.filter((w) => w.balance > 0).reduce((s, w) => s + w.balance, 0) +
    Math.abs(MOCK_WALLETS.filter((w) => w.balance < 0).reduce((s, w) => s + w.balance, 0));

  const totalLiabilities = Math.abs(
    MOCK_WALLETS.filter((w) => w.balance < 0).reduce((s, w) => s + w.balance, 0)
  );

  const netWorth = MOCK_WALLETS.reduce((s, w) => s + w.balance, 0);

  const monthlyIncome = MOCK_TRANSACTIONS.filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);

  const monthlyExpense = MOCK_TRANSACTIONS.filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  const monthLabel = getMonthName(currentMonth);

  return (
    <AppShell
      title="Dashboard"
      subtitle={monthLabel}
    >
      <div className="space-y-6 max-w-7xl mx-auto">

        {/* Month Selector */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentMonth((prev) => {
              const [y, m] = prev.split("-").map(Number);
              const d = new Date(y, m - 2, 1);
              return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            })}
            className="p-2 rounded-xl hover:bg-accent transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <h2 className="text-lg font-bold text-foreground">{monthLabel}</h2>
          <button
            onClick={() => setCurrentMonth((prev) => {
              const [y, m] = prev.split("-").map(Number);
              const d = new Date(y, m, 1);
              return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            })}
            className="p-2 rounded-xl hover:bg-accent transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Total Aset"
            value={formatCurrency(totalAssets)}
            change={5.2}
            icon={<Landmark className="w-5 h-5" />}
            iconBg="bg-blue-50 dark:bg-blue-950"
            iconColor="text-blue-600 dark:text-blue-400"
          />
          <MetricCard
            label="Total Kewajiban"
            value={formatCurrency(totalLiabilities)}
            change={-2.1}
            icon={<Wallet className="w-5 h-5" />}
            iconBg="bg-rose-50 dark:bg-rose-950"
            iconColor="text-rose-600 dark:text-rose-400"
          />
          <MetricCard
            label="Pemasukan Bulan Ini"
            value={formatCurrency(monthlyIncome)}
            change={12.8}
            icon={<TrendingUp className="w-5 h-5" />}
            iconBg="bg-emerald-50 dark:bg-emerald-950"
            iconColor="text-emerald-600 dark:text-emerald-400"
          />
          <MetricCard
            label="Pengeluaran Bulan Ini"
            value={formatCurrency(monthlyExpense)}
            change={-8.3}
            icon={<TrendingDown className="w-5 h-5" />}
            iconBg="bg-amber-50 dark:bg-amber-950"
            iconColor="text-amber-600 dark:text-amber-400"
          />
        </div>

        {/* Net Worth Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 p-6 text-white shadow-xl">
          <div className="relative z-10">
            <p className="text-sm text-white/70 font-medium mb-1">Net Worth</p>
            <p className="text-3xl font-extrabold tracking-tight mb-1">
              {formatCurrency(netWorth)}
            </p>
            <p className="text-xs text-white/60">
              Dari {MOCK_WALLETS.length} dompet · diperbarui hari ini
            </p>
          </div>
          {/* Decorative blobs */}
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-white/5 blur-xl" />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <CashFlowChart data={MOCK_CASHFLOW} />
          </div>
          <div>
            <BudgetProgress budgets={MOCK_BUDGETS} />
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentTransactions transactions={MOCK_TRANSACTIONS} />
          <CategoryBreakdown transactions={MOCK_TRANSACTIONS} />
        </div>

        {/* Wallet Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {MOCK_WALLETS.map((wallet) => (
            <div
              key={wallet.id}
              className="bg-card border border-border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                  style={{ backgroundColor: wallet.color + "20" }}
                >
                  <span>{wallet.icon}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{wallet.name}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">
                    {wallet.type.replace("-", " ")}
                  </p>
                </div>
              </div>
              <p
                className={`text-base font-bold ${
                  wallet.balance < 0 ? "text-rose-600" : "text-foreground"
                }`}
              >
                {formatCurrency(Math.abs(wallet.balance))}
                {wallet.balance < 0 && (
                  <span className="text-xs font-normal text-muted-foreground ml-1">terutang</span>
                )}
              </p>
            </div>
          ))}
        </div>

      </div>
    </AppShell>
  );
}
