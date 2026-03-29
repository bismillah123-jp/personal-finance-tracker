import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

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
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        // Auto-refresh token even when tab is in background
        autoRefreshToken: true,
        // Persist session in localStorage (survives tab close / browser restart)
        persistSession: true,
        // Detect session from URL hash (for magic links / OAuth callbacks)
        detectSessionInUrl: true,
        // Refresh the token every time the tab comes back into focus
        // Supabase v2 handles this via storage event listeners
        storageKey: "fintrack-auth",
      },
    });
  }
  return supabaseInstance;
}

export const supabase = createSupabaseClient();

// ── Admin client (service role) — bypasses RLS for server-side operations ──
let supabaseAdminInstance: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (supabaseAdminInstance) return supabaseAdminInstance;

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.warn("SUPABASE_SERVICE_ROLE_KEY not set — admin operations may fail due to RLS");
    return null;
  }

  supabaseAdminInstance = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return supabaseAdminInstance;
}

type CacheEntry = {
  expiresAt: number;
  value: unknown;
};

const QUERY_CACHE_TTL_MS = 5 * 60 * 1000;
const QUERY_CACHE_STORAGE_KEY = "fintrack-query-cache-v1";
const queryCache = new Map<string, CacheEntry>();
let hasHydratedPersistentCache = false;

function cacheKey(scope: string, ...parts: Array<string | number | undefined | null>) {
  return [scope, ...parts.map((part) => String(part ?? "all"))].join(":");
}

function isBrowser() {
  return typeof window !== "undefined";
}

function persistQueryCache() {
  if (!isBrowser()) return;

  try {
    const serializableEntries = Array.from(queryCache.entries()).filter(([, entry]) => entry.expiresAt > Date.now());
    window.localStorage.setItem(QUERY_CACHE_STORAGE_KEY, JSON.stringify(serializableEntries));
  } catch {
    // Ignore storage failures; in-memory cache still works.
  }
}

function hydratePersistentCache() {
  if (!isBrowser() || hasHydratedPersistentCache) return;
  hasHydratedPersistentCache = true;

  try {
    const raw = window.localStorage.getItem(QUERY_CACHE_STORAGE_KEY);
    if (!raw) return;

    const entries = JSON.parse(raw) as Array<[string, CacheEntry]>;
    entries.forEach(([key, entry]) => {
      if (entry?.expiresAt > Date.now()) {
        queryCache.set(key, entry);
      }
    });
  } catch {
    window.localStorage.removeItem(QUERY_CACHE_STORAGE_KEY);
  }
}

function cacheGet<T>(key: string): T | null {
  hydratePersistentCache();

  const hit = queryCache.get(key);
  if (!hit) return null;

  if (Date.now() > hit.expiresAt) {
    queryCache.delete(key);
    persistQueryCache();
    return null;
  }

  return hit.value as T;
}

function cacheSet<T>(key: string, value: T, ttlMs = QUERY_CACHE_TTL_MS): T {
  queryCache.set(key, { value, expiresAt: Date.now() + ttlMs });
  persistQueryCache();
  return value;
}

function cacheInvalidate(match: (key: string) => boolean) {
  Array.from(queryCache.keys()).forEach((key) => {
    if (match(key)) {
      queryCache.delete(key);
    }
  });

  persistQueryCache();
}

function invalidateUserCache(userId?: string) {
  if (!userId) return;

  cacheInvalidate((key) => key.includes(`:${userId}`) || key.endsWith(userId));
}

function stableKeyPart(value: unknown) {
  if (value == null) return "none";
  if (typeof value !== "object") return String(value);

  const sortedEntries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  return JSON.stringify(Object.fromEntries(sortedEntries));
}

export function clearLocalQueryCache() {
  queryCache.clear();

  if (isBrowser()) {
    window.localStorage.removeItem(QUERY_CACHE_STORAGE_KEY);
  }
}

export function getCachedProfileSnapshot(userId: string) {
  return cacheGet<Profile>(cacheKey("profile", userId)) ?? null;
}

export function getCachedWalletsSnapshot(userId: string) {
  return cacheGet<Wallet[]>(cacheKey("wallets", userId)) ?? [];
}

export function getCachedTransactionsSnapshot(
  userId: string,
  options?: {
    month?: string;
    walletId?: string;
    type?: "income" | "expense";
    category?: string;
    limit?: number;
    offset?: number;
  },
) {
  return cacheGet<Transaction[]>(cacheKey("transactions", userId, stableKeyPart(options ?? {}))) ?? [];
}

export function getCachedBudgetProgressSnapshot(userId: string, month: string) {
  return (
    cacheGet<Array<Budget & { spent: number; percentage: number; isOverBudget: boolean }>>(
      cacheKey("budget-progress", userId, month),
    ) ?? []
  );
}

export function getCachedInvestmentsSnapshot(userId: string) {
  return cacheGet<Investment[]>(cacheKey("investments", userId)) ?? [];
}

export function getCachedDebtsSnapshot(userId: string) {
  return cacheGet<Debt[]>(cacheKey("debts", userId)) ?? [];
}

export function getCachedDashboardSnapshot(userId: string, month: string) {
  return (
    cacheGet<{
      wallets: Wallet[];
      transactions: Transaction[];
      budgets: Array<Budget & { spent: number; percentage: number; isOverBudget: boolean }>;
      investments: Investment[];
      debts: Debt[];
      metrics: {
        totalAssets: number;
        totalLiabilities: number;
        netWorth: number;
        monthlyIncome: number;
        monthlyExpense: number;
        cashFlow: number;
      };
    }>(cacheKey("dashboard", userId, month)) ?? null
  );
}

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
  const key = cacheKey("profile", userId);
  const cached = cacheGet<Profile>(key);
  if (cached) return cached;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return cacheSet(key, data as Profile);
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();
  if (error) throw error;

  invalidateUserCache(userId);
  return data as Profile;
}

// ============================================================
// WALLET OPERATIONS
// ============================================================

export async function getWallets(userId: string) {
  const key = cacheKey("wallets", userId);
  const cached = cacheGet<Wallet[]>(key);
  if (cached) return cached;

  const { data, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return cacheSet(key, data as Wallet[]);
}

export async function getWallet(userId: string, walletId: string) {
  const key = cacheKey("wallet", userId, walletId);
  const cached = cacheGet<Wallet>(key);
  if (cached) return cached;

  const { data, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("id", walletId)
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  return cacheSet(key, data as Wallet);
}

export async function createWallet(wallet: Omit<Wallet, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase
    .from("wallets")
    .insert(wallet)
    .select()
    .single();
  if (error) throw error;

  invalidateUserCache(wallet.user_id);
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

  invalidateUserCache(userId);
  return data as Wallet;
}

async function applyWalletDelta(walletId: string, userId: string, delta: number) {
  if (!delta) return;
  const wallet = await getWallet(userId, walletId);
  await updateWallet(walletId, userId, { balance: wallet.balance + delta });
}

function getTransactionSignedAmount(transaction: Pick<Transaction, "amount" | "type">) {
  return transaction.type === "income" ? Number(transaction.amount) : Number(transaction.amount) * -1;
}

export async function deleteWallet(walletId: string, userId: string) {
  const { error } = await supabase
    .from("wallets")
    .delete()
    .eq("id", walletId)
    .eq("user_id", userId);
  if (error) throw error;

  invalidateUserCache(userId);
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
  const key = cacheKey("transactions", userId, stableKeyPart(options ?? {}));
  const cached = cacheGet<Transaction[]>(key);
  if (cached) return cached;

  let query = supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId);

  if (options?.month) {
    const [year, month] = options.month.split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    const startDate = `${options.month}-01`;
    const endDate = `${options.month}-${String(lastDay).padStart(2, "0")}`;
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
  return cacheSet(key, data as Transaction[]);
}

export async function getTransaction(userId: string, transactionId: string) {
  const key = cacheKey("transaction", userId, transactionId);
  const cached = cacheGet<Transaction>(key);
  if (cached) return cached;

  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", transactionId)
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  return cacheSet(key, data as Transaction);
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

  invalidateUserCache(transaction.user_id);
  return data as Transaction;
}

export async function updateTransaction(
  transactionId: string,
  userId: string,
  updates: Partial<Transaction>
) {
  const oldTransaction = await getTransaction(userId, transactionId);
  const nextTransaction = {
    ...oldTransaction,
    ...updates,
    amount: Number(updates.amount ?? oldTransaction.amount),
    type: (updates.type ?? oldTransaction.type) as "income" | "expense",
  };

  const { data, error } = await supabase
    .from("transactions")
    .update(updates)
    .eq("id", transactionId)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;

  const walletDeltas = new Map<string, number>();
  const pushDelta = (walletId: string | undefined, delta: number) => {
    if (!walletId || !delta) return;
    walletDeltas.set(walletId, (walletDeltas.get(walletId) ?? 0) + delta);
  };

  pushDelta(oldTransaction.wallet_id, getTransactionSignedAmount(oldTransaction) * -1);
  pushDelta(nextTransaction.wallet_id, getTransactionSignedAmount(nextTransaction));

  await Promise.all(
    Array.from(walletDeltas.entries()).map(([walletId, delta]) =>
      applyWalletDelta(walletId, userId, delta)
    )
  );

  invalidateUserCache(userId);
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

  invalidateUserCache(userId);
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
  const key = cacheKey("budgets", userId, month);
  const cached = cacheGet<Budget[]>(key);
  if (cached) return cached;

  const { data, error } = await supabase
    .from("budgets")
    .select("*")
    .eq("user_id", userId)
    .eq("month", month);
  if (error) throw error;
  return cacheSet(key, data as Budget[]);
}

export async function createBudget(budget: Omit<Budget, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase
    .from("budgets")
    .insert(budget)
    .select()
    .single();
  if (error) throw error;

  invalidateUserCache(budget.user_id);
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

  invalidateUserCache(userId);
  return data as Budget;
}

export async function deleteBudget(budgetId: string, userId: string) {
  const { error } = await supabase
    .from("budgets")
    .delete()
    .eq("id", budgetId)
    .eq("user_id", userId);
  if (error) throw error;

  invalidateUserCache(userId);
}

export async function getBudgetProgress(userId: string, month: string) {
  const key = cacheKey("budget-progress", userId, month);
  const cached = cacheGet<Array<Budget & { spent: number; percentage: number; isOverBudget: boolean }>>(key);
  if (cached) return cached;

  const [budgets, transactions] = await Promise.all([
    getBudgets(userId, month),
    getTransactions(userId, { month })
  ]);

  const progress = budgets.map((budget) => {
    const spent = transactions
      .filter((t) => t.type === "expense" && t.category === budget.category)
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      ...budget,
      spent,
      percentage: Math.min((spent / budget.limit_amount) * 100, 100),
      isOverBudget: spent > budget.limit_amount
    };
  });

  return cacheSet(key, progress);
}

// ============================================================
// INVESTMENT OPERATIONS
// ============================================================

export async function getInvestments(userId: string) {
  const key = cacheKey("investments", userId);
  const cached = cacheGet<Investment[]>(key);
  if (cached) return cached;

  const { data, error } = await supabase
    .from("investments")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return cacheSet(key, data as Investment[]);
}

export async function createInvestment(investment: Omit<Investment, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase
    .from("investments")
    .insert(investment)
    .select()
    .single();
  if (error) throw error;

  invalidateUserCache(investment.user_id);
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

  invalidateUserCache(userId);
  return data as Investment;
}

export async function deleteInvestment(investmentId: string, userId: string) {
  const { error } = await supabase
    .from("investments")
    .delete()
    .eq("id", investmentId)
    .eq("user_id", userId);
  if (error) throw error;

  invalidateUserCache(userId);
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
  const key = cacheKey("debts", userId);
  const cached = cacheGet<Debt[]>(key);
  if (cached) return cached;

  const { data, error } = await supabase
    .from("debts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return cacheSet(key, data as Debt[]);
}

export async function createDebt(debt: Omit<Debt, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase
    .from("debts")
    .insert(debt)
    .select()
    .single();
  if (error) throw error;

  invalidateUserCache(debt.user_id);
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

  invalidateUserCache(userId);
  return data as Debt;
}

export async function deleteDebt(debtId: string, userId: string) {
  const { error } = await supabase
    .from("debts")
    .delete()
    .eq("id", debtId)
    .eq("user_id", userId);
  if (error) throw error;

  invalidateUserCache(userId);
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
  const { data, error } = await supabase
    .from("debt_payments")
    .insert(payment)
    .select()
    .single();
  if (error) throw error;

  const debt = await supabase
    .from("debts")
    .select("remaining_amount, user_id")
    .eq("id", payment.debt_id)
    .single();

  if (debt.data) {
    await supabase
      .from("debts")
      .update({ remaining_amount: Math.max(0, debt.data.remaining_amount - payment.amount) })
      .eq("id", payment.debt_id);

    invalidateUserCache(debt.data.user_id);
  }

  return data as DebtPayment;
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
// ACCOUNT & DATA MANAGEMENT
// ============================================================

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${typeof window !== "undefined" ? window.location.origin : supabaseUrl}/auth/login`,
  });
  if (error) throw error;
}

export async function clearUserData(userId: string) {
  const debts = await getDebts(userId);
  if (debts.length) {
    const { error: debtPaymentsError } = await supabase
      .from("debt_payments")
      .delete()
      .in("debt_id", debts.map((debt) => debt.id));
    if (debtPaymentsError) throw debtPaymentsError;
  }

  const operations = await Promise.all([
    supabase.from("transactions").delete().eq("user_id", userId),
    supabase.from("budgets").delete().eq("user_id", userId),
    supabase.from("investments").delete().eq("user_id", userId),
    supabase.from("debts").delete().eq("user_id", userId),
    supabase.from("wallets").delete().eq("user_id", userId),
  ]);

  const failed = operations.find((operation) => operation.error);
  if (failed?.error) throw failed.error;

  invalidateUserCache(userId);
  clearLocalQueryCache();
}

export interface UserBackup {
  version: number;
  exported_at: string;
  profile: Partial<Profile>;
  wallets: Wallet[];
  transactions: Transaction[];
  budgets: Budget[];
  investments: Investment[];
  debts: Debt[];
  debt_payments: DebtPayment[];
}

export async function exportUserBackup(userId: string): Promise<UserBackup> {
  const [wallets, transactions, investments, debts, budgetsResult] = await Promise.all([
    getWallets(userId),
    getTransactions(userId),
    getInvestments(userId),
    getDebts(userId),
    supabase
      .from("budgets")
      .select("*")
      .eq("user_id", userId)
      .order("month", { ascending: false }),
  ]);

  if (budgetsResult.error) throw budgetsResult.error;

  let profile: Partial<Profile> = {};
  try {
    const profileRow = await getProfile(userId);
    profile = {
      full_name: profileRow.full_name,
      avatar_url: profileRow.avatar_url,
      currency: profileRow.currency,
      locale: profileRow.locale,
      theme: profileRow.theme,
      email: profileRow.email,
    };
  } catch {
    profile = {};
  }

  let debtPayments: DebtPayment[] = [];
  if (debts.length) {
    const paymentsResult = await supabase
      .from("debt_payments")
      .select("*")
      .in("debt_id", debts.map((debt) => debt.id))
      .order("payment_date", { ascending: false });

    if (paymentsResult.error) throw paymentsResult.error;
    debtPayments = paymentsResult.data as DebtPayment[];
  }

  return {
    version: 1,
    exported_at: new Date().toISOString(),
    profile,
    wallets,
    transactions,
    budgets: budgetsResult.data as Budget[],
    investments,
    debts,
    debt_payments: debtPayments,
  };
}

export async function importUserBackup(
  userId: string,
  backup: Partial<UserBackup>,
  options: { wipeExisting?: boolean } = {},
) {
  const wipeExisting = options.wipeExisting ?? true;

  if (wipeExisting) {
    await clearUserData(userId);
  }

  const wallets = (backup.wallets ?? []).map((wallet) => ({
    ...wallet,
    user_id: userId,
  }));

  const walletIdSet = new Set(wallets.map((wallet) => wallet.id));

  const debts = (backup.debts ?? []).map((debt) => ({
    ...debt,
    user_id: userId,
  }));

  const debtIdSet = new Set(debts.map((debt) => debt.id));

  const transactions = (backup.transactions ?? []).map((transaction) => ({
    ...transaction,
    user_id: userId,
    wallet_id: transaction.wallet_id && walletIdSet.has(transaction.wallet_id) ? transaction.wallet_id : null,
  }));

  const budgets = (backup.budgets ?? []).map((budget) => ({
    ...budget,
    user_id: userId,
    wallet_id: budget.wallet_id && walletIdSet.has(budget.wallet_id) ? budget.wallet_id : null,
  }));

  const investments = (backup.investments ?? []).map((investment) => ({
    ...investment,
    user_id: userId,
  }));

  const debtPayments = (backup.debt_payments ?? []).filter((payment) => debtIdSet.has(payment.debt_id));

  if (wallets.length) {
    const { error } = await supabase.from("wallets").insert(wallets);
    if (error) throw error;
  }

  if (debts.length) {
    const { error } = await supabase.from("debts").insert(debts);
    if (error) throw error;
  }

  if (transactions.length) {
    const { error } = await supabase.from("transactions").insert(transactions);
    if (error) throw error;
  }

  if (budgets.length) {
    const { error } = await supabase.from("budgets").insert(budgets);
    if (error) throw error;
  }

  if (investments.length) {
    const { error } = await supabase.from("investments").insert(investments);
    if (error) throw error;
  }

  if (debtPayments.length) {
    const { error } = await supabase.from("debt_payments").insert(debtPayments);
    if (error) throw error;
  }

  const profileUpdates = backup.profile
    ? {
        full_name: backup.profile.full_name,
        avatar_url: backup.profile.avatar_url,
        currency: backup.profile.currency,
        locale: backup.profile.locale,
        theme: backup.profile.theme,
      }
    : null;

  if (profileUpdates) {
    const filteredUpdates = Object.fromEntries(
      Object.entries(profileUpdates).filter(([, value]) => value !== undefined),
    );

    if (Object.keys(filteredUpdates).length) {
      await updateProfile(userId, filteredUpdates as Partial<Profile>);
    }
  }

  invalidateUserCache(userId);
  clearLocalQueryCache();

  return {
    wallets: wallets.length,
    transactions: transactions.length,
    budgets: budgets.length,
    investments: investments.length,
    debts: debts.length,
    debt_payments: debtPayments.length,
  };
}

// ============================================================
// DASHBOARD AGGREGATIONS
// ============================================================

export async function getDashboardData(userId: string, month: string) {
  const key = cacheKey("dashboard", userId, month);
  const cached = cacheGet<{
    wallets: Wallet[];
    transactions: Transaction[];
    budgets: Array<Budget & { spent: number; percentage: number; isOverBudget: boolean }>;
    investments: Investment[];
    debts: Debt[];
    metrics: {
      totalAssets: number;
      totalLiabilities: number;
      netWorth: number;
      monthlyIncome: number;
      monthlyExpense: number;
      cashFlow: number;
    };
  }>(key);

  if (cached) return cached;

  const [wallets, transactions, budgets, investments, debts] = await Promise.all([
    getWallets(userId),
    getTransactions(userId, { month }),
    getBudgetProgress(userId, month),
    getInvestments(userId),
    getDebts(userId)
  ]);

  const totalAssets = wallets.reduce((sum, w) => sum + w.balance, 0);
  const totalLiabilities = debts
    .filter((d) => d.debt_type === "hutang")
    .reduce((sum, d) => sum + d.remaining_amount, 0);

  const monthlyIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalInvestmentValue = investments.reduce((sum, i) => sum + i.current_value, 0);

  return cacheSet(key, {
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
  });
}

export async function prefetchUserAppData(userId: string, month: string) {
  await Promise.allSettled([
    getProfile(userId),
    getWallets(userId),
    getTransactions(userId, { month }),
    getBudgets(userId, month),
    getBudgetProgress(userId, month),
    getInvestments(userId),
    getDebts(userId),
    getDashboardData(userId, month),
  ]);
}
