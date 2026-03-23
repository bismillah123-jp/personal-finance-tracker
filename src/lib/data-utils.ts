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
  return {
    id: investment.id,
    name: investment.name,
    type: investment.type as UiInvestment["type"],
    initialValue: toNumber(investment.initial_value),
    currentValue: toNumber(investment.current_value),
    purchaseDate: investment.purchase_date,
    notes: investment.notes,
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

  if (walletCount === 0) {
    notifications.push({
      id: "wallet-empty",
      title: "Belum ada dompet",
      description: "Tambahin dompet dulu biar transaksi, saldo, dan budgeting bisa kepake full.",
      href: "/settings#wallets",
      tone: "warning",
    });
  }

  if (transactionsThisMonth.length === 0) {
    notifications.push({
      id: "transactions-empty",
      title: "Belum ada transaksi bulan ini",
      description: "Catat pemasukan atau pengeluaran pertama kamu biar dashboard mulai ngisi data.",
      href: "/transactions",
      tone: "info",
    });
  }

  budgetProgress
    .filter((budget) => {
      const limit = toNumber(budget.limit_amount);
      const spent = toNumber(budget.spent);
      return limit > 0 && spent / limit >= 0.8;
    })
    .slice(0, 3)
    .forEach((budget) => {
      const limit = toNumber(budget.limit_amount);
      const spent = toNumber(budget.spent);
      notifications.push({
        id: `budget-${budget.id}`,
        title: spent > limit ? `Budget ${budget.category} jebol` : `Budget ${budget.category} hampir habis`,
        description: `${Math.round((spent / limit) * 100)}% dari limit bulan ini udah kepake.`,
        href: "/budgeting",
        tone: spent > limit ? "danger" : "warning",
      });
    });

  debts
    .filter((debt) => debt.due_date)
    .sort((a, b) => new Date(a.due_date ?? "").getTime() - new Date(b.due_date ?? "").getTime())
    .slice(0, 3)
    .forEach((debt) => {
      const dueDate = new Date(debt.due_date ?? "");
      const diffDays = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (diffDays > 7) return;

      notifications.push({
        id: `debt-${debt.id}`,
        title: diffDays < 0 ? `${debt.name} lewat jatuh tempo` : `${debt.name} jatuh tempo ${diffDays === 0 ? "hari ini" : `${diffDays} hari lagi`}`,
        description:
          debt.debt_type === "hutang"
            ? "Cek dan catat pembayaran biar status utangnya rapi."
            : "Ingetin yang punya kewajiban bayar biar cashflow aman.",
        href: "/debts",
        tone: diffDays < 0 ? "danger" : "warning",
      });
    });

  if (notifications.length === 0) {
    notifications.push({
      id: "all-good",
      title: "Semua aman",
      description: "Belum ada alert penting. Keuangan kamu lagi anteng sekarang.",
      href: "/dashboard",
      tone: "success",
    });
  }

  return notifications;
}
