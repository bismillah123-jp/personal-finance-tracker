"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Edit2, PiggyBank, Plus, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/components/providers";
import { createBudget, deleteBudget, getBudgetProgress, getCachedBudgetProgressSnapshot, updateBudget, isSupabaseConfigured } from "@/lib/supabase";
import { exportBudgetReport } from "@/lib/export";
import { mapBudgetToUi, toNumber } from "@/lib/data-utils";
import { EXPENSE_CATEGORIES } from "@/types";
import { formatCurrency, getCurrentMonth, getMonthName } from "@/lib/utils";

interface BudgetProgressItem {
  id: string;
  user_id: string;
  category: string;
  limit_amount: number;
  wallet_id?: string;
  month: string;
  created_at: string;
  updated_at: string;
  spent: number;
  percentage: number;
  isOverBudget: boolean;
}

const getCategoryInfo = (categoryId: string) =>
  EXPENSE_CATEGORIES.find((category) => category.id === categoryId) || {
    label: categoryId,
    icon: "📦",
    color: "#888",
  };

export default function BudgetingPage() {
  const { user, currency, locale } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth());
  const cachedBudgets = user ? getCachedBudgetProgressSnapshot(user.id, currentMonth) : [];
  const [budgets, setBudgets] = useState<BudgetProgressItem[]>(cachedBudgets as BudgetProgressItem[]);
  const [loading, setLoading] = useState(!cachedBudgets.length && isSupabaseConfigured);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetProgressItem | null>(null);
  const [form, setForm] = useState({ category: "", limit: "" });

  const monthLabel = getMonthName(currentMonth, locale);

  useEffect(() => {
    if (!user) return;

    const snapshot = getCachedBudgetProgressSnapshot(user.id, currentMonth);
    if (snapshot.length) {
      setBudgets(snapshot as BudgetProgressItem[]);
      setLoading(false);
    }
  }, [currentMonth, user]);

  const loadBudgets = async () => {
    if (!user) return;
    setLoading((prev) => (budgets.length === 0 ? true : prev));
    setError("");

    try {
      const data = await getBudgetProgress(user.id, currentMonth);
      setBudgets(data as BudgetProgressItem[]);
    } catch (loadError: any) {
      console.error(loadError);
      setError(loadError?.message || "Budget belum bisa dimuat.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBudgets();
  }, [user, currentMonth]);

  const totalBudget = useMemo(() => budgets.reduce((sum, budget) => sum + toNumber(budget.limit_amount), 0), [budgets]);
  const totalSpent = useMemo(() => budgets.reduce((sum, budget) => sum + toNumber(budget.spent), 0), [budgets]);
  const totalRemaining = totalBudget - totalSpent;
  const overBudgetCount = budgets.filter((budget) => budget.isOverBudget).length;

  const openCreateModal = () => {
    setEditingBudget(null);
    setForm({ category: "", limit: "" });
    setShowModal(true);
  };

  const openEditModal = (budget: BudgetProgressItem) => {
    setEditingBudget(budget);
    setForm({ category: budget.category, limit: String(toNumber(budget.limit_amount)) });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!form.category || !form.limit) {
      window.alert("Kategori dan batas anggaran wajib diisi.");
      return;
    }

    try {
      if (editingBudget) {
        await updateBudget(editingBudget.id, user.id, {
          category: form.category,
          limit_amount: Number(form.limit),
          month: currentMonth,
        });
      } else {
        await createBudget({
          user_id: user.id,
          category: form.category,
          limit_amount: Number(form.limit),
          month: currentMonth,
        });
      }

      setShowModal(false);
      await loadBudgets();
    } catch (saveError: any) {
      window.alert(saveError?.message || "Budget gagal disimpan.");
    }
  };

  const handleDelete = async (budgetId: string) => {
    if (!user) return;
    if (!window.confirm("Yakin mau hapus budget ini?")) return;

    try {
      await deleteBudget(budgetId, user.id);
      await loadBudgets();
    } catch (deleteError: any) {
      window.alert(deleteError?.message || "Budget gagal dihapus.");
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6 min-w-0">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Budgeting</h1>
            <p className="text-sm text-muted-foreground">Tetapkan batas pengeluaran untuk membantu pengendalian anggaran.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => exportBudgetReport(budgets.map(mapBudgetToUi), monthLabel)} disabled={!budgets.length}>
              Export laporan
            </Button>
            <Button onClick={openCreateModal} className="gap-2 rounded-xl">
              <Plus className="h-4 w-4" />
              Tambah budget
            </Button>
          </div>
        </div>

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
            <p className="text-xs text-muted-foreground">{budgets.length} kategori budget</p>
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <PiggyBank className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Budget</p>
                  <p className="break-words text-lg font-bold">{formatCurrency(totalBudget, currency, locale)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10">
                  <TrendingDown className="h-5 w-5 text-rose-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Terpakai</p>
                  <p className="break-words text-lg font-bold">{formatCurrency(totalSpent, currency, locale)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sisa Budget</p>
                  <p className={`break-words text-lg font-bold ${totalRemaining >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{formatCurrency(totalRemaining, currency, locale)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Melebihi Budget</p>
                  <p className="break-words text-lg font-bold">{overBudgetCount} kategori</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Progress keseluruhan</CardTitle>
            <CardDescription>Semakin mendekati 100%, semakin dekat penggunaan terhadap batas anggaran.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex items-center justify-between gap-3 text-sm">
              <span>{formatCurrency(totalSpent, currency, locale)} terpakai</span>
              <span className="font-semibold">{totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0}%</span>
            </div>
            <Progress value={totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0} className="h-3" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daftar budget</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Memuat anggaran...</p>
            ) : error ? (
              <p className="rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-200">{error}</p>
            ) : budgets.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center">
                <p className="text-base font-semibold">Belum ada budget</p>
                <p className="mt-2 text-sm text-muted-foreground">Tambahkan anggaran pertama untuk mulai memantau batas pengeluaran.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {budgets.map((budget) => {
                  const category = getCategoryInfo(budget.category);
                  const percentage = Math.min((toNumber(budget.spent) / Math.max(1, toNumber(budget.limit_amount))) * 100, 100);
                  const isOver = budget.isOverBudget;
                  const isWarning = percentage >= 80 && percentage < 100;

                  return (
                    <div key={budget.id} className={`rounded-2xl border p-4 ${isOver ? "border-rose-500/40" : "border-border"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl" style={{ backgroundColor: `${category.color}20` }}>
                            {category.icon}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{category.label}</p>
                            <p className="text-xs text-muted-foreground">{formatCurrency(toNumber(budget.spent), currency, locale)} / {formatCurrency(toNumber(budget.limit_amount), currency, locale)}</p>
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <Button size="icon" variant="outline" className="h-9 w-9 rounded-xl" onClick={() => openEditModal(budget)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="outline" className="h-9 w-9 rounded-xl text-rose-600 hover:text-rose-600" onClick={() => handleDelete(budget.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                        <Progress
                          value={percentage}
                          className="h-2"
                          indicatorClassName={isOver ? "bg-rose-500" : isWarning ? "bg-amber-500" : "bg-emerald-500"}
                        />
                        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                          <span className="break-words">{isOver ? `Lebih ${formatCurrency(toNumber(budget.spent) - toNumber(budget.limit_amount), currency, locale)}` : `${formatCurrency(toNumber(budget.limit_amount) - toNumber(budget.spent), currency, locale)} tersisa`}</span>
                          <span className="font-semibold">{Math.round(percentage)}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingBudget ? "Edit budget" : "Tambah budget"}</DialogTitle>
              <DialogDescription>Tetapkan batas pengeluaran per kategori.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Select value={form.category} onValueChange={(value) => setForm((prev) => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.icon} {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Batas budget</Label>
                <CurrencyInput value={form.limit} onValueChange={(raw) => setForm((prev) => ({ ...prev, limit: String(raw) }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowModal(false)}>Batal</Button>
              <Button onClick={handleSave}>Simpan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
