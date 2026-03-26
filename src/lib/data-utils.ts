import type {
  Budget as DbBudget,
  Debt as DbDebt,
  Investment as DbInvestment,
  Transaction as DbTransaction,
  Wallet as DbWallet,
} from "@/lib/supabase";
import type {
  Budget as UiBudget,
  Debt as UiDebt,
  Investment as UiInvestment,
  Transaction as UiTransaction,
  Wallet as UiWallet,
} from "@/types";
import { parseInvestmentNotes } from "@/lib/gold-investments";
import { formatShortDate } from "@/lib/utils";

export function toNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function mapWalletToUi(wallet: DbWallet): UiWallet {
  return {
    id: wallet.id,
    name: wallet.name,
    type: wallet.type,
    balance: toNumber(wallet.balance),
    currency: wallet.currency,
    color: wallet.color,
    icon: wallet.icon,
    isDefault: wallet.is_default,
    createdAt: wallet.created_at,
  };
}

export function mapTransactionToUi(transaction: DbTransaction): UiTransaction {
  return {
    id: transaction.id,
    type: transaction.type,
    amount: toNumber(transaction.amount),
    category: transaction.category,
    subCategory: transaction.sub_category,
    walletId: transaction.wallet_id ?? "",
    date: transaction.date,
    note: transaction.note,
    createdAt: transaction.created_at,
  };
}

export function mapBudgetToUi(
  budget: DbBudget & { spent?: number },
): UiBudget {
  return {
    id: budget.id,
    category: budget.category,
    limit: toNumber(budget.limit_amount),
    spent: toNumber(budget.spent),
    month: budget.month,
    walletId: budget.wallet_id,
  };
}

export function mapInvestmentToUi(investment: DbInvestment): UiInvestment {
  const { userNotes } = parseInvestmentNotes(investment.notes);

  return {
    id: investment.id,
    name: investment.name,
    type: investment.type as UiInvestment["type"],
    initialValue: toNumber(investment.initial_value),
    currentValue: toNumber(investment.current_value),
    purchaseDate: investment.purchase_date,
    notes: userNotes,
  };
}

export function mapDebtToUi(debt: DbDebt): UiDebt {
  return {
    id: debt.id,
    name: debt.name,
    type: debt.debt_type,
    totalAmount: toNumber(debt.total_amount),
    remainingAmount: toNumber(debt.remaining_amount),
    dueDate: debt.due_date,
    interestRate: toNumber(debt.interest_rate),
    monthlyPayment: toNumber(debt.monthly_payment),
    notes: debt.notes,
  };
}

export function buildCashFlowSeries(transactions: DbTransaction[], month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  const grouped = new Map<string, { income: number; expense: number }>();

  transactions.forEach((transaction) => {
    const current = grouped.get(transaction.date) ?? { income: 0, expense: 0 };
    if (transaction.type === "income") {
      current.income += toNumber(transaction.amount);
    } else {
      current.expense += toNumber(transaction.amount);
    }
    grouped.set(transaction.date, current);
  });

  return Array.from({ length: lastDay }, (_, index) => {
    const day = index + 1;
    const date = `${month}-${String(day).padStart(2, "0")}`;
    const current = grouped.get(date) ?? { income: 0, expense: 0 };

    return {
      date,
      label: formatShortDate(date),
      income: current.income,
      expense: current.expense,
    };
  });
}

export function buildTransactionSummary(transactions: DbTransaction[]) {
  return transactions.reduce(
    (summary, transaction) => {
      const amount = toNumber(transaction.amount);
      if (transaction.type === "income") {
        summary.income += amount;
      } else {
        summary.expense += amount;
      }
      return summary;
    },
    { income: 0, expense: 0 },
  );
}

export type AppNotification = {
  id: string;
  title: string;
  description: string;
  href: string;
  tone: "info" | "warning" | "danger" | "success";
};

export function buildNotifications(args: {
  walletCount: number;
  transactionsThisMonth: DbTransaction[];
  budgetProgress: Array<DbBudget & { spent?: number }>;
  debts: DbDebt[];
}): AppNotification[] {
  const notifications: AppNotification[] = [];
  const { walletCount, transactionsThisMonth, budgetProgress, debts } = args;

  // ---- Setup: no wallet ----
  if (walletCount === 0) {
    notifications.push({
      id: "wallet-empty",
      title: "Belum ada dompet",
      description: "Tambahkan dompet agar transaksi, saldo, dan anggaran dapat digunakan.",
      href: "/settings#wallets",
      tone: "warning",
    });
  }

  // ---- No transactions this month ----
  if (transactionsThisMonth.length === 0) {
    notifications.push({
      id: "transactions-empty",
      title: "Belum ada transaksi bulan ini",
      description: "Catat pemasukan atau pengeluaran pertama agar dashboard aktif.",
      href: "/transactions",
      tone: "info",
    });
  }

  // ---- Spending analysis ----
  const totalIncome = transactionsThisMonth
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + toNumber(t.amount), 0);
  const totalExpense = transactionsThisMonth
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + toNumber(t.amount), 0);

  // Spending > income warning
  if (totalIncome > 0 && totalExpense > totalIncome) {
    const overPercent = Math.round(((totalExpense - totalIncome) / totalIncome) * 100);
    notifications.push({
      id: "overspend",
      title: `Pengeluaran melebihi pemasukan ${overPercent}%`,
      description: "Pengeluaran bulan ini lebih besar dari pemasukan. Cek dan kurangi pengeluaran tidak perlu.",
      href: "/transactions",
      tone: "danger",
    });
  }

  // Spending > 70% of income warning
  if (totalIncome > 0 && totalExpense > totalIncome * 0.7 && totalExpense <= totalIncome) {
    notifications.push({
      id: "high-spend-ratio",
      title: `Sudah pakai ${Math.round((totalExpense / totalIncome) * 100)}% pemasukan`,
      description: "Pengeluaran mendekati total pemasukan bulan ini. Pertimbangkan untuk menahan belanja.",
      href: "/transactions",
      tone: "warning",
    });
  }

  // ---- No budget set reminder ----
  if (budgetProgress.length === 0 && transactionsThisMonth.length > 0) {
    notifications.push({
      id: "no-budget",
      title: "Belum ada budget bulan ini",
      description: "Tetapkan batas pengeluaran per kategori agar keuangan lebih terkontrol.",
      href: "/budgeting",
      tone: "info",
    });
  }

  // ---- Budget alerts (80%+ used) ----
  budgetProgress
    .filter((budget) => {
      const limit = toNumber(budget.limit_amount);
      const spent = toNumber(budget.spent);
      return limit > 0 && spent / limit >= 0.8;
    })
    .slice(0, 5)
    .forEach((budget) => {
      const limit = toNumber(budget.limit_amount);
      const spent = toNumber(budget.spent);
      const pct = Math.round((spent / limit) * 100);
      notifications.push({
        id: `budget-${budget.id}`,
        title: spent > limit ? `Budget ${budget.category} jebol!` : `Budget ${budget.category} ${pct}%`,
        description: spent > limit
          ? `Sudah melebihi limit. Kurangi pengeluaran di kategori ini.`
          : `${pct}% budget terpakai. Sisa tinggal sedikit.`,
        href: "/budgeting",
        tone: spent > limit ? "danger" : "warning",
      });
    });

  // ---- Debt due dates (30 days window) ----
  debts
    .filter((debt) => debt.due_date && toNumber(debt.remaining_amount) > 0)
    .sort((a, b) => new Date(a.due_date ?? "").getTime() - new Date(b.due_date ?? "").getTime())
    .slice(0, 5)
    .forEach((debt) => {
      const dueDate = new Date(debt.due_date ?? "");
      const diffDays = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (diffDays > 30) return;

      if (diffDays < 0) {
        notifications.push({
          id: `debt-overdue-${debt.id}`,
          title: `${debt.name} LEWAT jatuh tempo ${Math.abs(diffDays)} hari`,
          description: debt.debt_type === "hutang"
            ? "Segera bayar untuk menghindari denda atau bunga tambahan."
            : "Tagih piutang ini secepatnya.",
          href: "/debts",
          tone: "danger",
        });
      } else if (diffDays === 0) {
        notifications.push({
          id: `debt-today-${debt.id}`,
          title: `${debt.name} jatuh tempo HARI INI`,
          description: "Segera lakukan pembayaran atau penagihan.",
          href: "/debts",
          tone: "danger",
        });
      } else if (diffDays <= 3) {
        notifications.push({
          id: `debt-soon-${debt.id}`,
          title: `${debt.name} jatuh tempo ${diffDays} hari lagi`,
          description: "Siapkan dana untuk pembayaran mendatang.",
          href: "/debts",
          tone: "danger",
        });
      } else if (diffDays <= 7) {
        notifications.push({
          id: `debt-week-${debt.id}`,
          title: `${debt.name} jatuh tempo minggu ini`,
          description: `Jatuh tempo dalam ${diffDays} hari. Pastikan saldo cukup.`,
          href: "/debts",
          tone: "warning",
        });
      } else {
        notifications.push({
          id: `debt-month-${debt.id}`,
          title: `${debt.name} jatuh tempo ${diffDays} hari lagi`,
          description: "Persiapkan dana dari sekarang.",
          href: "/debts",
          tone: "info",
        });
      }
    });

  // ---- Large single expense alert (> 500k) ----
  const largeExpenses = transactionsThisMonth
    .filter((t) => t.type === "expense" && toNumber(t.amount) >= 500000)
    .sort((a, b) => toNumber(b.amount) - toNumber(a.amount))
    .slice(0, 2);

  largeExpenses.forEach((t) => {
    notifications.push({
      id: `large-expense-${t.id}`,
      title: `Pengeluaran besar: ${t.category}`,
      description: `Ada transaksi besar di kategori ${t.category}. Pastikan ini sesuai rencana.`,
      href: "/transactions",
      tone: "info",
    });
  });

  // ---- Daily spending reminder (afternoon) ----
  const hour = new Date().getHours();
  const today = new Date().toISOString().split("T")[0];
  const todayTransactions = transactionsThisMonth.filter((t) => t.date === today);
  if (hour >= 14 && todayTransactions.length === 0 && transactionsThisMonth.length > 0) {
    notifications.push({
      id: "daily-reminder",
      title: "Jangan lupa catat pengeluaran hari ini",
      description: "Belum ada transaksi hari ini. Catat biar data keuangan tetap akurat.",
      href: "/transactions",
      tone: "info",
    });
  }

  // ---- Savings rate insight ----
  if (totalIncome > 0 && totalExpense < totalIncome) {
    const savingsRate = Math.round(((totalIncome - totalExpense) / totalIncome) * 100);
    if (savingsRate >= 30) {
      notifications.push({
        id: "savings-great",
        title: `Saving rate ${savingsRate}% — mantap!`,
        description: "Kamu berhasil menabung lebih dari 30% pemasukan bulan ini. Terus pertahankan!",
        href: "/dashboard",
        tone: "success",
      });
    }
  }

  // ---- All good fallback ----
  if (notifications.length === 0) {
    notifications.push({
      id: "all-good",
      title: "Semua aman",
      description: "Tidak ada peringatan. Keuangan dalam kondisi stabil.",
      href: "/dashboard",
      tone: "success",
    });
  }

  return notifications;
}
