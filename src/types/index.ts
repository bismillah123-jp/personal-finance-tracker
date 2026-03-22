// ============================
// ENUMS & CONSTANTS
// ============================

export type TransactionType = "income" | "expense";
export type WalletType = "cash" | "bank" | "e-wallet" | "credit-card";

export const WALLET_LABELS: Record<WalletType, string> = {
  cash: "Tunai",
  bank: "Rekening Bank",
  "e-wallet": "E-Wallet",
  "credit-card": "Kartu Kredit",
};

export const EXPENSE_CATEGORIES = [
  { id: "makanan", label: "Makanan & Minuman", icon: "🍔", color: "#FF6B6B" },
  { id: "transportasi", label: "Transportasi", icon: "🚗", color: "#4ECDC4" },
  { id: "belanja", label: "Belanja", icon: "🛒", color: "#45B7D1" },
  { id: "hiburan", label: "Hiburan", icon: "🎬", color: "#96CEB4" },
  { id: "kesehatan", label: "Kesehatan", icon: "💊", color: "#DDA0DD" },
  { id: "pendidikan", label: "Pendidikan", icon: "📚", color: "#F7DC6F" },
  { id: "tagihan", label: "Tagihan & Utilitas", icon: "📄", color: "#BB8FCE" },
  { id: "lainnya", label: "Lainnya", icon: "📦", color: "#AEB6BF" },
] as const;

export const INCOME_CATEGORIES = [
  { id: "gaji", label: "Gaji", icon: "💼", color: "#2ECC71" },
  { id: "freelance", label: "Freelance", icon: "💻", color: "#3498DB" },
  { id: "investas", label: "Hasil Investasi", icon: "📈", color: "#1ABC9C" },
  { id: "hadiah", label: "Hadiah", icon: "🎁", color: "#E74C3C" },
  { id: "lainnya", label: "Lainnya", icon: "💰", color: "#F39C12" },
] as const;

// ============================
// CORE TYPES
// ============================

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  subCategory?: string;
  walletId: string;
  date: string; // ISO date string
  note?: string;
  createdAt: string;
}

export interface Wallet {
  id: string;
  name: string;
  type: WalletType;
  balance: number;
  currency: string;
  color: string;
  icon: string;
  isDefault: boolean;
  createdAt: string;
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
  spent: number;
  month: string; // "YYYY-MM"
  walletId?: string;
}

export interface Investment {
  id: string;
  name: string;
  type: "saham" | "reksadana" | "deposito" | "crypto" | "emtas" | "lainnya";
  initialValue: number;
  currentValue: number;
  purchaseDate: string;
  notes?: string;
}

export interface Debt {
  id: string;
  name: string;
  type: "hutang" | "piutang";
  totalAmount: number;
  remainingAmount: number;
  dueDate?: string;
  interestRate?: number;
  monthlyPayment?: number;
  notes?: string;
}

// ============================
// DASHBOARD TYPES
// ============================

export interface DashboardMetrics {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  monthlyIncome: number;
  monthlyExpense: number;
  cashFlow: number;
}

export interface CashFlowDataPoint {
  date: string;
  income: number;
  expense: number;
}

export interface CategoryDataPoint {
  name: string;
  value: number;
  color: string;
  icon: string;
}

// ============================
// FORM TYPES
// ============================

export interface TransactionFormData {
  type: TransactionType;
  amount: string;
  category: string;
  subCategory?: string;
  walletId: string;
  date: Date;
  note?: string;
}

export interface BudgetFormData {
  category: string;
  limit: string;
  walletId?: string;
}
