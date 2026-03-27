-- ============================================================
-- Personal Finance Tracker - Supabase Schema
-- Run this SQL in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  currency TEXT DEFAULT 'IDR',
  locale TEXT DEFAULT 'id-ID',
  theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- WALLETS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cash', 'bank', 'e-wallet', 'credit-card')),
  balance DECIMAL(15, 2) DEFAULT 0,
  currency TEXT DEFAULT 'IDR',
  color TEXT DEFAULT '#6366F1',
  icon TEXT DEFAULT 'wallet',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- TRANSACTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(15, 2) NOT NULL,
  category TEXT NOT NULL,
  sub_category TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  receipt_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- BUDGETS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  limit_amount DECIMAL(15, 2) NOT NULL,
  wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL,
  month TEXT NOT NULL, -- Format: YYYY-MM
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, category, month)
);

-- ============================================================
-- INVESTMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS investments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('saham', 'reksadana', 'deposito', 'crypto', 'emtas', 'obligasi', 'lainnya')),
  initial_value DECIMAL(15, 2) NOT NULL,
  current_value DECIMAL(15, 2) NOT NULL,
  purchase_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- DEBTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS debts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  debt_type TEXT NOT NULL CHECK (debt_type IN ('hutang', 'piutang')),
  creditor_name TEXT, -- For debts: who we owe; for receivables: who owes us
  total_amount DECIMAL(15, 2) NOT NULL,
  remaining_amount DECIMAL(15, 2) NOT NULL,
  due_date DATE,
  interest_rate DECIMAL(5, 2) DEFAULT 0,
  monthly_payment DECIMAL(15, 2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- DEBT PAYMENTS TABLE (for tracking individual payments)
-- ============================================================
CREATE TABLE IF NOT EXISTS debt_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  debt_id UUID REFERENCES debts(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_month ON budgets(month);
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id);
CREATE INDEX IF NOT EXISTS idx_debts_user_id ON debts(user_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Wallets policies
CREATE POLICY "Users can view their own wallets" ON wallets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallets" ON wallets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallets" ON wallets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wallets" ON wallets
  FOR DELETE USING (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users can view their own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions" ON transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions" ON transactions
  FOR DELETE USING (auth.uid() = user_id);

-- Budgets policies
CREATE POLICY "Users can view their own budgets" ON budgets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own budgets" ON budgets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budgets" ON budgets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budgets" ON budgets
  FOR DELETE USING (auth.uid() = user_id);

-- Investments policies
CREATE POLICY "Users can view their own investments" ON investments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own investments" ON investments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own investments" ON investments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own investments" ON investments
  FOR DELETE USING (auth.uid() = user_id);

-- Debts policies
CREATE POLICY "Users can view their own debts" ON debts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own debts" ON debts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own debts" ON debts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own debts" ON debts
  FOR DELETE USING (auth.uid() = user_id);

-- Debt payments policies
CREATE POLICY "Users can manage their own debt payments" ON debt_payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM debts WHERE debts.id = debt_payments.debt_id AND debts.user_id = auth.uid()
    )
  );

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_investments_updated_at BEFORE UPDATE ON investments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_debts_updated_at BEFORE UPDATE ON debts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SEED DATA (Optional - for default wallets)
-- ============================================================

-- ============================================================
-- WHATSAPP USERS TABLE (WhatsApp → Supabase user mapping)
-- ============================================================
CREATE TABLE IF NOT EXISTS wa_users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  wa_number TEXT NOT NULL UNIQUE,           -- WhatsApp number (e.g., 628123456789)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  device_id TEXT,                           -- GOWA device ID (for multi-device)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast phone lookup
CREATE INDEX IF NOT EXISTS idx_wa_users_wa_number ON wa_users(wa_number);
CREATE INDEX IF NOT EXISTS idx_wa_users_user_id ON wa_users(user_id);

-- RLS
ALTER TABLE wa_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wa mapping" ON wa_users
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wa mapping" ON wa_users
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wa mapping" ON wa_users
  FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_wa_users_updated_at BEFORE UPDATE ON wa_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
