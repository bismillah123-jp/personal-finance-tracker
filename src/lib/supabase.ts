import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabaseConfigMessage =
  "Supabase credentials not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.";

let supabaseInstance: SupabaseClient | null = null;

function createSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured) {
    console.warn(supabaseConfigMessage);
    return null as unknown as SupabaseClient;
  }
  
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseInstance;
}

export const supabase = createSupabaseClient();

// ============================================================
// TYPES
// ============================================================

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  currency: string;
  locale: string;
  theme: "light" | "dark" | "system";
  created_at: string;
  updated_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  name: string;
  type: "cash" | "bank" | "e-wallet" | "credit-card";
  balance: number;
  currency: string;
  color: string;
  icon: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  wallet_id?: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  sub_category?: string;
  date: string;
  note?: string;
  receipt_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category: string;
  limit_amount: number;
  wallet_id?: string;
  month: string;
  created_at: string;
  updated_at: string;
}

export interface Investment {
  id: string;
  user_id: string;
  name: string;
  type: "saham" | "reksadana" | "deposito" | "crypto" | "emtas" | "obligasi" | "lainnya";
  initial_value: number;
  current_value: number;
  purchase_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Debt {
  id: string;
  user_id: string;
  name: string;
  debt_type: "hutang" | "piutang";
  creditor_name?: string;
  total_amount: number;
  remaining_amount: number;
  due_date?: string;
  interest_rate: number;
  monthly_payment?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DebtPayment {
  id: string;
  debt_id: string;
  amount: number;
  payment_date: string;
  note?: string;
  created_at: string;
}

// ============================================================
// PROFILE OPERATIONS
// ============================================================

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
}

// ============================================================
// WALLET OPERATIONS
// ============================================================

export async function getWallets(userId: string) {
  const { data, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as Wallet[];
}

export async function getWallet(userId: string, walletId: string) {
  const { data, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("id", walletId)
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  return data as Wallet;
}

export async function createWallet(wallet: Omit<Wallet, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase
    .from("wallets")
    .insert(wallet)
    .select()
    .single();
  if (error) throw error;
  return data as Wallet;
}

export async function updateWallet(walletId: string, userId: string, updates: Partial<Wallet>) {
  const { data, error } = await supabase
    .from("wallets")
    .update(updates)
    .eq("id", walletId)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return data as Wallet;
}

export async function deleteWallet(walletId: string, userId: string) {
  const { error } = await supabase
    .from("wallets")
    .delete()
    .eq("id", walletId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function updateWalletBalance(walletId: string, userId: string, amount: number, type: "income" | "expense") {
  const wallet = await getWallet(userId, walletId);
  const newBalance = type === "income" 
    ? wallet.balance + amount 
    : wallet.balance - amount;
  
  return updateWallet(walletId, userId, { balance: newBalance });
}

// ============================================================
// TRANSACTION OPERATIONS
// ============================================================

export async function getTransactions(
  userId: string,
  options?: {
    month?: string;
    walletId?: string;
    type?: "income" | "expense";
    category?: string;
    limit?: number;
    offset?: number;
  }
) {
  let query = supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId);

  if (options?.month) {
    const startDate = `${options.month}-01`;
    const endDate = `${options.month}-31`;
    query = query.gte("date", startDate).lte("date", endDate);
  }
  if (options?.walletId) {
    query = query.eq("wallet_id", options.walletId);
  }
  if (options?.type) {
    query = query.eq("type", options.type);
  }
  if (options?.category) {
    query = query.eq("category", options.category);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
  }

  query = query.order("date", { ascending: false }).order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return data as Transaction[];
}

export async function getTransaction(userId: string, transactionId: string) {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", transactionId)
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  return data as Transaction;
}

export async function createTransaction(
  transaction: Omit<Transaction, "id" | "created_at" | "updated_at">
) {
  const { data, error } = await supabase
    .from("transactions")
    .insert(transaction)
    .select()
    .single();
  if (error) throw error;

  if (transaction.wallet_id) {
    await updateWalletBalance(
      transaction.wallet_id,
      transaction.user_id,
      transaction.amount,
      transaction.type
    );
  }

  return data as Transaction;
}

export async function updateTransaction(
  transactionId: string,
  userId: string,
  updates: Partial<Transaction>
) {
  const oldTransaction = await getTransaction(userId, transactionId);
  
  if (oldTransaction.wallet_id && updates.wallet_id !== oldTransaction.wallet_id) {
    if (oldTransaction.type === "income") {
      await updateWalletBalance(oldTransaction.wallet_id, userId, oldTransaction.amount, "expense");
    } else {
      await updateWalletBalance(oldTransaction.wallet_id, userId, oldTransaction.amount, "income");
    }
  }

  const { data, error } = await supabase
    .from("transactions")
    .update(updates)
    .eq("id", transactionId)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;

  if (updates.wallet_id) {
    await updateWalletBalance(
      updates.wallet_id,
      userId,
      updates.amount || oldTransaction.amount,
      (updates.type || oldTransaction.type) as "income" | "expense"
    );
  }

  return data as Transaction;
}

export async function deleteTransaction(transactionId: string, userId: string) {
  const transaction = await getTransaction(userId, transactionId);
  
  if (transaction.wallet_id) {
    if (transaction.type === "income") {
      await updateWalletBalance(transaction.wallet_id, userId, transaction.amount, "expense");
    } else {
      await updateWalletBalance(transaction.wallet_id, userId, transaction.amount, "income");
    }
  }

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", transactionId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function getTransactionStats(userId: string, month: string) {
  const transactions = await getTransactions(userId, { month });
  
  const income = transactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  
  const expense = transactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const byCategory = transactions.reduce((acc, t) => {
    if (!acc[t.category]) {
      acc[t.category] = { income: 0, expense: 0 };
    }
    acc[t.category][t.type] += t.amount;
    return acc;
  }, {} as Record<string, { income: number; expense: number }>);

  return { income, expense, cashFlow: income - expense, byCategory };
}

// ============================================================
// BUDGET OPERATIONS
// ============================================================

export async function getBudgets(userId: string, month: string) {
  const { data, error } = await supabase
    .from("budgets")
    .select("*")
    .eq("user_id", userId)
    .eq("month", month);
  if (error) throw error;
  return data as Budget[];
}

export async function createBudget(budget: Omit<Budget, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase
    .from("budgets")
    .insert(budget)
    .select()
    .single();
  if (error) throw error;
  return data as Budget;
}

export async function updateBudget(budgetId: string, userId: string, updates: Partial<Budget>) {
  const { data, error } = await supabase
    .from("budgets")
    .update(updates)
    .eq("id", budgetId)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return data as Budget;
}

export async function deleteBudget(budgetId: string, userId: string) {
  const { error } = await supabase
    .from("budgets")
    .delete()
    .eq("id", budgetId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function getBudgetProgress(userId: string, month: string) {
  const [budgets, transactions] = await Promise.all([
    getBudgets(userId, month),
    getTransactions(userId, { month })
  ]);

  return budgets.map(budget => {
    const spent = transactions
      .filter(t => t.type === "expense" && t.category === budget.category)
      .reduce((sum, t) => sum + t.amount, 0);
    
    return {
      ...budget,
      spent,
      percentage: Math.min((spent / budget.limit_amount) * 100, 100),
      isOverBudget: spent > budget.limit_amount
    };
  });
}

// ============================================================
// INVESTMENT OPERATIONS
// ============================================================

export async function getInvestments(userId: string) {
  const { data, error } = await supabase
    .from("investments")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Investment[];
}

export async function createInvestment(investment: Omit<Investment, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase
    .from("investments")
    .insert(investment)
    .select()
    .single();
  if (error) throw error;
  return data as Investment;
}

export async function updateInvestment(investmentId: string, userId: string, updates: Partial<Investment>) {
  const { data, error } = await supabase
    .from("investments")
    .update(updates)
    .eq("id", investmentId)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return data as Investment;
}

export async function deleteInvestment(investmentId: string, userId: string) {
  const { error } = await supabase
    .from("investments")
    .delete()
    .eq("id", investmentId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function getInvestmentStats(userId: string) {
  const investments = await getInvestments(userId);
  
  const totalInitial = investments.reduce((sum, i) => sum + i.initial_value, 0);
  const totalCurrent = investments.reduce((sum, i) => sum + i.current_value, 0);
  const totalGain = totalCurrent - totalInitial;
  const percentageGain = totalInitial > 0 ? (totalGain / totalInitial) * 100 : 0;

  return { totalInitial, totalCurrent, totalGain, percentageGain };
}

// ============================================================
// DEBT OPERATIONS
// ============================================================

export async function getDebts(userId: string) {
  const { data, error } = await supabase
    .from("debts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Debt[];
}

export async function createDebt(debt: Omit<Debt, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase
    .from("debts")
    .insert(debt)
    .select()
    .single();
  if (error) throw error;
  return data as Debt;
}

export async function updateDebt(debtId: string, userId: string, updates: Partial<Debt>) {
  const { data, error } = await supabase
    .from("debts")
    .update(updates)
    .eq("id", debtId)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return data as Debt;
}

export async function deleteDebt(debtId: string, userId: string) {
  const { error } = await supabase
    .from("debts")
    .delete()
    .eq("id", debtId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function getDebtPayments(debtId: string) {
  const { data, error } = await supabase
    .from("debt_payments")
    .select("*")
    .eq("debt_id", debtId)
    .order("payment_date", { ascending: false });
  if (error) throw error;
  return data as DebtPayment[];
}

export async function addDebtPayment(payment: Omit<DebtPayment, "id" | "created_at">) {
  const { data: paymentData, error: paymentError } = await supabase
    .from("debt_payments")
    .insert(payment)
    .select()
    .single();
  if (paymentError) throw paymentError;

  const { data: debt, error: debtError } = await supabase
    .from("debts")
    .select("remaining_amount")
    .eq("id", payment.debt_id)
    .single();
  if (debtError) throw debtError;

  const newRemaining = Math.max(0, debt.remaining_amount - payment.amount);
  await supabase
    .from("debts")
    .update({ remaining_amount: newRemaining })
    .eq("id", payment.debt_id);

  return paymentData as DebtPayment;
}

export async function getDebtStats(userId: string) {
  const debts = await getDebts(userId);
  
  const hutang = debts.filter(d => d.debt_type === "hutang");
  const piutang = debts.filter(d => d.debt_type === "piutang");

  const totalHutang = hutang.reduce((sum, d) => sum + d.remaining_amount, 0);
  const totalPiutang = piutang.reduce((sum, d) => sum + d.remaining_amount, 0);

  return { totalHutang, totalPiutang, netDebt: totalHutang - totalPiutang };
}

// ============================================================
// DASHBOARD AGGREGATIONS
// ============================================================

export async function getDashboardData(userId: string, month: string) {
  const [wallets, transactions, budgets, investments, debts] = await Promise.all([
    getWallets(userId),
    getTransactions(userId, { month }),
    getBudgetProgress(userId, month),
    getInvestments(userId),
    getDebts(userId)
  ]);

  const totalAssets = wallets.reduce((sum, w) => sum + w.balance, 0);
  const totalLiabilities = debts
    .filter(d => d.debt_type === "hutang")
    .reduce((sum, d) => sum + d.remaining_amount, 0);
  
  const monthlyIncome = transactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  
  const monthlyExpense = transactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalInvestmentValue = investments.reduce((sum, i) => sum + i.current_value, 0);

  return {
    wallets,
    transactions,
    budgets,
    investments,
    debts,
    metrics: {
      totalAssets: totalAssets + totalInvestmentValue,
      totalLiabilities,
      netWorth: totalAssets + totalInvestmentValue - totalLiabilities,
      monthlyIncome,
      monthlyExpense,
      cashFlow: monthlyIncome - monthlyExpense
    }
  };
}
