import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================================
// Database types (match your Supabase schema)
// ============================================================

export interface DbTransaction {
  id: string;
  user_id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  sub_category?: string;
  wallet_id: string;
  date: string;
  note?: string;
  created_at: string;
}

export interface DbWallet {
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
}

export interface DbBudget {
  id: string;
  user_id: string;
  category: string;
  limit_amount: number;
  wallet_id?: string;
  created_at: string;
}

// ============================================================
// API HELPERS
// ============================================================

export async function getTransactions(
  userId: string,
  filters?: {
    month?: string;
    walletId?: string;
    type?: "income" | "expense";
    limit?: number;
  }
) {
  let query = supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });

  if (filters?.month) {
    const [year, month] = filters.month.split("-");
    const startDate = `${year}-${month}-01`;
    const endDate = `${year}-${month}-31`;
    query = query.gte("date", startDate).lte("date", endDate);
  }
  if (filters?.walletId) {
    query = query.eq("wallet_id", filters.walletId);
  }
  if (filters?.type) {
    query = query.eq("type", filters.type);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getWallets(userId: string) {
  const { data, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createTransaction(transaction: Omit<DbTransaction, "id" | "created_at">) {
  const { data, error } = await supabase
    .from("transactions")
    .insert(transaction)
    .select()
    .single();
  if (error) throw error;
  return data;
}
