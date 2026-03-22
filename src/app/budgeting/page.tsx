"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EXPENSE_CATEGORIES } from "@/types";
import { formatCurrency, getMonthName, getCurrentMonth } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  PiggyBank,
} from "lucide-react";

interface BudgetItem {
  id: string;
  category: string;
  limit: number;
  spent: number;
  month: string;
}

const MOCK_BUDGETS: BudgetItem[] = [
  { id: "b1", category: "makanan", limit: 2_000_000, spent: 1_650_000, month: "2024-03" },
  { id: "b2", category: "transportasi", limit: 500_000, spent: 350_000, month: "2024-03" },
  { id: "b3", category: "hiburan", limit: 600_000, spent: 450_000, month: "2024-03" },
  { id: "b4", category: "belanja", limit: 1_500_000, spent: 1_890_000, month: "2024-03" },
  { id: "b5", category: "kesehatan", limit: 300_000, spent: 250_000, month: "2024-03" },
  { id: "b6", category: "tagihan", limit: 800_000, spent: 550_000, month: "2024-03" },
];

const getCategoryInfo = (categoryId: string) => {
  return EXPENSE_CATEGORIES.find(c => c.id === categoryId) || { label: categoryId, icon: "📦", color: "#888" };
};

export default function BudgetingPage() {
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth());
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetItem | null>(null);
  const [newBudget, setNewBudget] = useState({ category: "", limit: "" });
  
  const monthLabel = getMonthName(currentMonth);
  
  const totalBudget = MOCK_BUDGETS.reduce((s, b) => s + b.limit, 0);
  const totalSpent = MOCK_BUDGETS.reduce((s, b) => s + b.spent, 0);
  const totalRemaining = totalBudget - totalSpent;
  
  const overBudgetCount = MOCK_BUDGETS.filter(b => b.spent > b.limit).length;
  const healthyBudgetCount = MOCK_BUDGETS.filter(b => b.spent <= b.limit * 0.8).length;

  const handleAddBudget = () => {
    if (!newBudget.category || !newBudget.limit) return;
    // Add budget logic here
    setShowAddModal(false);
    setNewBudget({ category: "", limit: "" });
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Budgeting</h1>
            <p className="text-sm text-muted-foreground">Kelola batas pengeluaran Anda</p>
          </div>
          <Button onClick={() => setShowAddModal(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Tambah Budget
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <PiggyBank className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Budget</p>
                  <p className="text-lg font-bold">{formatCurrency(totalBudget)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Terpakai</p>
                  <p className="text-lg font-bold">{formatCurrency(totalSpent)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sisa Budget</p>
                  <p className="text-lg font-bold text-emerald-600">{formatCurrency(totalRemaining)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Melebihi Budget</p>
                  <p className="text-lg font-bold">{overBudgetCount} kategori</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

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
          <div className="text-center">
            <h2 className="text-lg font-semibold">{monthLabel}</h2>
            <p className="text-xs text-muted-foreground">{MOCK_BUDGETS.length} kategori budget</p>
          </div>
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

        {/* Overall Progress */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Penggunaan Budget Keseluruhan</span>
              <span className="text-sm font-bold">{Math.round((totalSpent / totalBudget) * 100)}%</span>
            </div>
            <Progress 
              value={(totalSpent / totalBudget) * 100} 
              className="h-3"
              indicatorClassName={totalSpent > totalBudget ? "bg-rose-500" : ""}
            />
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>{formatCurrency(totalSpent)} terpakai</span>
              <span>{formatCurrency(totalRemaining)} tersisa</span>
            </div>
          </CardContent>
        </Card>

        {/* Budget List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MOCK_BUDGETS.map((budget) => {
            const cat = getCategoryInfo(budget.category);
            const percentage = Math.min((budget.spent / budget.limit) * 100, 100);
            const isOverBudget = budget.spent > budget.limit;
            const isWarning = percentage >= 80 && percentage < 100;
            
            return (
              <Card 
                key={budget.id} 
                className={`hover:shadow-md transition-shadow cursor-pointer ${isOverBudget ? "border-rose-500/50" : ""}`}
                onClick={() => setEditingBudget(budget)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                        style={{ backgroundColor: cat.color + "20" }}
                      >
                        {cat.icon}
                      </div>
                      <div>
                        <p className="font-medium">{cat.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(budget.spent)} / {formatCurrency(budget.limit)}
                        </p>
                      </div>
                    </div>
                    {isOverBudget && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Over
                      </Badge>
                    )}
                    {isWarning && (
                      <Badge variant="outline" className="gap-1 text-amber-500 border-amber-500">
                        <AlertTriangle className="w-3 h-3" />
                        Hampir
                      </Badge>
                    )}
                  </div>
                  
                  <Progress 
                    value={percentage} 
                    className="h-2"
                    indicatorClassName={isOverBudget ? "bg-rose-500" : isWarning ? "bg-amber-500" : ""}
                  />
                  
                  <div className="flex justify-between mt-2 text-xs">
                    <span className={isOverBudget ? "text-rose-600 font-medium" : "text-muted-foreground"}>
                      {isOverBudget ? "Melebihi " : ""}{formatCurrency(Math.abs(budget.limit - budget.spent))}
                      {!isOverBudget && " tersisa"}
                    </span>
                    <span className="font-medium">{Math.round(percentage)}%</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Add Budget Modal */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Budget Baru</DialogTitle>
              <DialogDescription>Atur batas pengeluaran untuk kategori ini</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Select value={newBudget.category} onValueChange={(v) => setNewBudget(prev => ({ ...prev, category: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.icon} {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Batas Budget (Rp)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={newBudget.limit}
                  onChange={(e) => setNewBudget(prev => ({ ...prev, limit: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddModal(false)}>Batal</Button>
              <Button onClick={handleAddBudget}>Simpan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
