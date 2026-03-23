"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { AddTransactionFAB } from "@/components/add-transaction-fab";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TransactionForm } from "@/components/forms/transaction-form";
import { useAuth } from "@/components/providers";
import { deleteTransaction, getCachedTransactionsSnapshot, getCachedWalletsSnapshot, getTransactions, getWallets, type Transaction as DbTransaction, type Wallet as DbWallet } from "@/lib/supabase";
import { exportToCSV, exportToPDF } from "@/lib/export";
import { mapTransactionToUi, mapWalletToUi, toNumber } from "@/lib/data-utils";
import { formatCurrency, formatDate, getCurrentMonth, getMonthName } from "@/lib/utils";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/types";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit2,
  Search,
  Trash2,
  Wallet,
} from "lucide-react";
import Link from "next/link";

const getCategoryInfo = (categoryId: string, type: "income" | "expense") => {
  const categories = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  return categories.find((category) => category.id === categoryId) || {
    label: categoryId,
    icon: "📦",
    color: "#888",
  };
};

export default function TransactionsPage() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth());
  const cachedTransactions = user ? getCachedTransactionsSnapshot(user.id, { month: currentMonth }) : [];
  const cachedWallets = user ? getCachedWalletsSnapshot(user.id) : [];
  const [transactions, setTransactions] = useState<DbTransaction[]>(cachedTransactions);
  const [wallets, setWallets] = useState<DbWallet[]>(cachedWallets);
  const [loading, setLoading] = useState(!(cachedTransactions.length || cachedWallets.length));
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [editingTransaction, setEditingTransaction] = useState<DbTransaction | null>(null);

  const monthLabel = getMonthName(currentMonth);

  useEffect(() => {
    if (!user) return;

    const nextTransactions = getCachedTransactionsSnapshot(user.id, { month: currentMonth });
    const nextWallets = getCachedWalletsSnapshot(user.id);

    if (nextTransactions.length || nextWallets.length) {
      setTransactions(nextTransactions);
      setWallets(nextWallets);
      setLoading(false);
    }
  }, [currentMonth, user]);

  const loadData = async () => {
    if (!user) return;
    setLoading((prev) => (transactions.length === 0 && wallets.length === 0 ? true : prev));
    setError("");

    try {
      const [transactionList, walletList] = await Promise.all([
        getTransactions(user.id, { month: currentMonth }),
        getWallets(user.id),
      ]);
      setTransactions(transactionList);
      setWallets(walletList);
    } catch (loadError: any) {
      console.error(loadError);
      setError(loadError?.message || "Transaksi belum bisa dimuat.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, currentMonth]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const matchesSearch =
        transaction.note?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === "all" || transaction.type === typeFilter;
      const matchesCategory = categoryFilter === "all" || transaction.category === categoryFilter;
      return matchesSearch && matchesType && matchesCategory;
    });
  }, [transactions, searchQuery, typeFilter, categoryFilter]);

  const totalIncome = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0);
  const totalExpense = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0);
  const balance = totalIncome - totalExpense;

  const handleDelete = async (transactionId: string) => {
    if (!user) return;
    const confirmed = window.confirm("Yakin mau hapus transaksi ini?");
    if (!confirmed) return;

    try {
      await deleteTransaction(transactionId, user.id);
      await loadData();
    } catch (deleteError: any) {
      window.alert(deleteError?.message || "Transaksi gagal dihapus.");
    }
  };

  const handleExportCsv = () => {
    exportToCSV(transactions.map(mapTransactionToUi), wallets.map(mapWalletToUi), `transactions_${currentMonth}`);
  };

  const handleExportPdf = () => {
    exportToPDF(transactions.map(mapTransactionToUi), wallets.map(mapWalletToUi), {
      totalIncome,
      totalExpense,
      balance,
      period: monthLabel,
    });
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6 min-w-0">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">Transaksi</h1>
            <p className="text-sm text-muted-foreground break-words">Semua pemasukan dan pengeluaran untuk {monthLabel}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2 rounded-xl" onClick={handleExportCsv} disabled={!transactions.length}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" className="gap-2 rounded-xl" onClick={handleExportPdf} disabled={!transactions.length}>
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
            <AddTransactionFAB
              canCreateTransaction={wallets.length > 0}
              disabledReason="Tambahkan dompet terlebih dahulu melalui menu Pengaturan agar transaksi dapat disimpan."
              onSaved={loadData}
            />
          </div>
        </div>

        {!wallets.length && !loading && (
          <Card>
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-base font-semibold">Belum ada dompet</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Tambahkan dompet terlebih dahulu agar seluruh fitur pencatatan transaksi dapat digunakan.
                </p>
              </div>
              <Button asChild className="rounded-xl">
                <Link href="/settings#wallets">
                  <Wallet className="mr-2 h-4 w-4" />
                  Kelola dompet
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Pemasukan</p>
              <p className="mt-1 break-words text-xl font-bold text-emerald-600">{formatCurrency(totalIncome)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Pengeluaran</p>
              <p className="mt-1 break-words text-xl font-bold text-rose-600">{formatCurrency(totalExpense)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Saldo Bulan Ini</p>
              <p className={`mt-1 break-words text-xl font-bold ${balance >= 0 ? "text-primary" : "text-rose-600"}`}>
                {formatCurrency(balance)}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Cari transaksi..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
                <SelectTrigger className="w-full lg:w-40">
                  <SelectValue placeholder="Tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="income">Pemasukan</SelectItem>
                  <SelectItem value="expense">Pengeluaran</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full lg:w-52">
                  <SelectValue placeholder="Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua kategori</SelectItem>
                  {[...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.icon} {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

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
            <p className="text-xs text-muted-foreground">{filteredTransactions.length} transaksi tampil</p>
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

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Daftar transaksi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Memuat transaksi...</p>
            ) : error ? (
              <p className="rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-200">{error}</p>
            ) : filteredTransactions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center">
                <p className="text-base font-semibold">Belum ada transaksi</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Data transaksi akan ditampilkan setelah Anda mulai mencatat pemasukan atau pengeluaran.
                </p>
              </div>
            ) : (
              filteredTransactions.map((transaction) => {
                const category = getCategoryInfo(transaction.category, transaction.type);
                return (
                  <div key={transaction.id} className="rounded-2xl border border-border p-4 transition hover:border-primary/20 hover:bg-accent/30">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl" style={{ backgroundColor: `${category.color}20` }}>
                          {category.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="break-words text-sm font-semibold sm:text-base">{transaction.note || category.label}</p>
                          <p className="mt-1 break-words text-xs text-muted-foreground sm:text-sm">
                            {category.label} • {formatDate(transaction.date)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 sm:items-end">
                        <p className={`break-words text-sm font-bold sm:text-base ${transaction.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                          {transaction.type === "income" ? (
                            <ArrowUpRight className="mr-1 inline h-4 w-4" />
                          ) : (
                            <ArrowDownRight className="mr-1 inline h-4 w-4" />
                          )}
                          {formatCurrency(toNumber(transaction.amount))}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl"
                            onClick={() => setEditingTransaction(transaction)}
                          >
                            <Edit2 className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl text-rose-600 hover:text-rose-600"
                            onClick={() => handleDelete(transaction.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Hapus
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Dialog open={!!editingTransaction} onOpenChange={() => setEditingTransaction(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit transaksi</DialogTitle>
              <DialogDescription>Perbarui detail transaksi agar data tetap akurat.</DialogDescription>
            </DialogHeader>
            {editingTransaction && (
              <TransactionForm
                initialData={{
                  id: editingTransaction.id,
                  type: editingTransaction.type,
                  amount: toNumber(editingTransaction.amount),
                  category: editingTransaction.category,
                  walletId: editingTransaction.wallet_id,
                  date: new Date(editingTransaction.date),
                  note: editingTransaction.note,
                }}
                onSuccess={async () => {
                  setEditingTransaction(null);
                  await loadData();
                }}
                onCancel={() => setEditingTransaction(null)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
