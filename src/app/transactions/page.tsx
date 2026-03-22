"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { AddTransactionFAB } from "@/components/add-transaction-fab";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { TransactionForm } from "@/components/forms/transaction-form";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, Transaction } from "@/types";
import { formatCurrency, formatDate, getMonthName, getCurrentMonth } from "@/lib/utils";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  Edit2,
  Trash2,
  Download,
} from "lucide-react";

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: "t1", type: "income", amount: 8_500_000, category: "gaji", walletId: "w1", date: "2024-03-01", note: "Gaji bulan Maret", createdAt: "2024-03-01" },
  { id: "t2", type: "expense", amount: 1_200_000, category: "makanan", walletId: "w1", date: "2024-03-02", note: "Belanja mingguan", createdAt: "2024-03-02" },
  { id: "t3", type: "expense", amount: 350_000, category: "transportasi", walletId: "w2", date: "2024-03-03", note: "Grab ke kantor", createdAt: "2024-03-03" },
  { id: "t4", type: "expense", amount: 450_000, category: "hiburan", walletId: "w1", date: "2024-03-05", note: "Nonton bioskop", createdAt: "2024-03-05" },
  { id: "t5", type: "income", amount: 1_500_000, category: "freelance", walletId: "w1", date: "2024-03-07", note: "Project freelance desain", createdAt: "2024-03-07" },
  { id: "t6", type: "expense", amount: 75_000, category: "makanan", walletId: "w2", date: "2024-03-08", note: "Kopi & snack", createdAt: "2024-03-08" },
  { id: "t7", type: "expense", amount: 890_000, category: "belanja", walletId: "w1", date: "2024-03-10", note: "Shopping online", createdAt: "2024-03-10" },
  { id: "t8", type: "expense", amount: 250_000, category: "kesehatan", walletId: "w3", date: "2024-03-12", note: "Vitamin & obat", createdAt: "2024-03-12" },
  { id: "t9", type: "expense", amount: 550_000, category: "tagihan", walletId: "w1", date: "2024-03-15", note: "Token listrik", createdAt: "2024-03-15" },
  { id: "t10", type: "expense", amount: 125_000, category: "transportasi", walletId: "w2", date: "2024-03-16", note: "Parkir & tol", createdAt: "2024-03-16" },
];

const getCategoryInfo = (categoryId: string, type: "income" | "expense") => {
  const categories = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  return categories.find(c => c.id === categoryId) || { label: categoryId, icon: "📦", color: "#888" };
};

export default function TransactionsPage() {
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth());
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState<"income" | "expense">("expense");

  const monthLabel = getMonthName(currentMonth);
  
  const filteredTransactions = MOCK_TRANSACTIONS.filter(t => {
    const matchesSearch = t.note?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || t.type === typeFilter;
    const matchesCategory = categoryFilter === "all" || t.category === categoryFilter;
    return matchesSearch && matchesType && matchesCategory;
  });

  const totalIncome = MOCK_TRANSACTIONS.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = MOCK_TRANSACTIONS.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Transaksi</h1>
            <p className="text-sm text-muted-foreground">{monthLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Pemasukan</p>
                  <p className="text-sm font-bold text-emerald-600">{formatCurrency(totalIncome)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                  <ArrowDownRight className="w-4 h-4 text-rose-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Pengeluaran</p>
                  <p className="text-sm font-bold text-rose-600">{formatCurrency(totalExpense)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-xs">=</span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Saldo</p>
                  <p className={`text-sm font-bold ${balance >= 0 ? "text-primary" : "text-rose-600"}`}>
                    {formatCurrency(balance)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cari transaksi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue placeholder="Tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="income">Pemasukan</SelectItem>
                  <SelectItem value="expense">Pengeluaran</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v)}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {[...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.icon} {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              const [y, m] = currentMonth.split("-").map(Number);
              const d = new Date(y, m - 2, 1);
              setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
            }}
            className="p-2 rounded-xl hover:bg-accent transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <h2 className="text-lg font-semibold">{monthLabel}</h2>
          <button
            onClick={() => {
              const [y, m] = currentMonth.split("-").map(Number);
              const d = new Date(y, m, 1);
              setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
            }}
            className="p-2 rounded-xl hover:bg-accent transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Transaction List */}
        <Card>
          <CardContent className="p-0 divide-y divide-border">
            {filteredTransactions.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <p>Tidak ada transaksi ditemukan</p>
              </div>
            ) : (
              filteredTransactions.map((transaction) => {
                const cat = getCategoryInfo(transaction.category, transaction.type);
                return (
                  <div
                    key={transaction.id}
                    className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => setEditingTransaction(transaction)}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                      style={{ backgroundColor: cat.color + "20" }}
                    >
                      {cat.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{transaction.note || cat.label}</p>
                      <p className="text-xs text-muted-foreground">{cat.label} · {formatDate(transaction.date)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${transaction.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                        {transaction.type === "income" ? "+" : "-"}
                        {formatCurrency(transaction.amount)}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* FAB */}
        <AddTransactionFAB />

        {/* Edit Modal */}
        <Dialog open={!!editingTransaction} onOpenChange={() => setEditingTransaction(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Transaksi</DialogTitle>
              <DialogDescription>Ubah detail transaksi ini</DialogDescription>
            </DialogHeader>
            {editingTransaction && (
              <TransactionForm
                initialData={{
                  id: editingTransaction.id,
                  type: editingTransaction.type,
                  amount: editingTransaction.amount,
                  category: editingTransaction.category,
                  walletId: editingTransaction.walletId,
                  date: new Date(editingTransaction.date),
                  note: editingTransaction.note,
                }}
                onSuccess={() => setEditingTransaction(null)}
                onCancel={() => setEditingTransaction(null)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
