"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  HandCoins,
  CreditCard,
  Calendar,
} from "lucide-react";

interface Debt {
  id: string;
  name: string;
  debtType: "hutang" | "piutang";
  totalAmount: number;
  remainingAmount: number;
  dueDate?: string;
  interestRate?: number;
  monthlyPayment?: number;
  creditorName?: string;
  notes?: string;
}

const MOCK_DEBTS: Debt[] = [
  { id: "d1", name: "KPR Rumah", debtType: "hutang", totalAmount: 500_000_000, remainingAmount: 450_000_000, dueDate: "2035-01-15", interestRate: 8.5, monthlyPayment: 5_000_000, creditorName: "Bank BTN" },
  { id: "d2", name: "Mobil", debtType: "hutang", totalAmount: 200_000_000, remainingAmount: 150_000_000, dueDate: "2026-06-01", interestRate: 6.5, monthlyPayment: 4_000_000, creditorName: "Bank BCA" },
  { id: "d3", name: "Pinjaman Online", debtType: "hutang", totalAmount: 5_000_000, remainingAmount: 2_000_000, dueDate: "2024-04-15", interestRate: 12, monthlyPayment: 500_000 },
  { id: "d4", name: "Piutang Client A", debtType: "piutang", totalAmount: 15_000_000, remainingAmount: 10_000_000, dueDate: "2024-05-01", notes: "Project web design" },
  { id: "d5", name: "Piutang Teman", debtType: "piutang", totalAmount: 500_000, remainingAmount: 500_000, notes: "Makan siang" },
];

export default function DebtsPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDebt, setNewDebt] = useState({
    name: "",
    debtType: "" as "hutang" | "piutang" | "",
    totalAmount: "",
    remainingAmount: "",
    dueDate: "",
    interestRate: "",
    monthlyPayment: "",
    creditorName: "",
    notes: "",
  });

  const debts = MOCK_DEBTS.filter(d => d.debtType === "hutang");
  const receivables = MOCK_DEBTS.filter(d => d.debtType === "piutang");
  
  const totalDebts = debts.reduce((s, d) => s + d.remainingAmount, 0);
  const totalReceivables = receivables.reduce((s, d) => s + d.remainingAmount, 0);
  const netDebt = totalDebts - totalReceivables;

  const handleAddDebt = () => {
    if (!newDebt.name || !newDebt.debtType || !newDebt.totalAmount) return;
    // Add debt logic
    setShowAddModal(false);
    setNewDebt({ name: "", debtType: "", totalAmount: "", remainingAmount: "", dueDate: "", interestRate: "", monthlyPayment: "", creditorName: "", notes: "" });
  };

  const DebtCard = ({ debt }: { debt: Debt }) => {
    const paidPercentage = ((debt.totalAmount - debt.remainingAmount) / debt.totalAmount) * 100;
    const isOverdue = debt.dueDate && new Date(debt.dueDate) < new Date();
    
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${debt.debtType === "hutang" ? "bg-rose-500/10" : "bg-emerald-500/10"}`}>
                {debt.debtType === "hutang" ? (
                  <CreditCard className="w-5 h-5 text-rose-500" />
                ) : (
                  <HandCoins className="w-5 h-5 text-emerald-500" />
                )}
              </div>
              <div>
                <p className="font-semibold">{debt.name}</p>
                <p className="text-xs text-muted-foreground">
                  {debt.creditorName || (debt.debtType === "piutang" ? "Piutang" : "Tidak ada info")}
                </p>
              </div>
            </div>
            <Badge variant={debt.debtType === "hutang" ? "destructive" : "secondary"}>
              {debt.debtType === "hutang" ? "Hutang" : "Piutang"}
            </Badge>
          </div>

          <div className="space-y-2 mb-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-medium">{formatCurrency(debt.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sisa</span>
              <span className={`font-bold ${debt.debtType === "hutang" ? "text-rose-600" : "text-emerald-600"}`}>
                {formatCurrency(debt.remainingAmount)}
              </span>
            </div>
            {(debt.interestRate ?? 0) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Bunga</span>
                <span className="font-medium">{debt.interestRate}%/tahun</span>
              </div>
            )}
            {debt.monthlyPayment && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cicilan/bulan</span>
                <span className="font-medium">{formatCurrency(debt.monthlyPayment)}</span>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Terbayar</span>
              <span className="font-medium">{paidPercentage.toFixed(0)}%</span>
            </div>
            <Progress value={paidPercentage} className="h-2" />
          </div>

          {debt.dueDate && (
            <div className="flex items-center gap-2 mt-3 text-xs">
              <Calendar className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">
                Jatuh tempo: {formatDate(debt.dueDate)}
              </span>
              {isOverdue && (
                <Badge variant="destructive" className="ml-auto text-xs">
                  Terlambat
                </Badge>
              )}
            </div>
          )}

          <div className="flex gap-2 mt-3">
            <Button variant="outline" size="sm" className="flex-1 gap-1">
              Bayar
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Edit2 className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Utang & Piutang</h1>
            <p className="text-sm text-muted-foreground">Kelola hutang dan piutang Anda</p>
          </div>
          <Button onClick={() => setShowAddModal(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Tambah {newDebt.debtType === "piutang" ? "Piutang" : "Hutang"}
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Hutang</p>
                  <p className="text-lg font-bold text-rose-600">{formatCurrency(totalDebts)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <HandCoins className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Piutang</p>
                  <p className="text-lg font-bold text-emerald-600">{formatCurrency(totalReceivables)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${netDebt >= 0 ? "bg-rose-500/10" : "bg-emerald-500/10"}`}>
                  {netDebt >= 0 ? (
                    <ArrowUpRight className="w-5 h-5 text-rose-500" />
                  ) : (
                    <ArrowDownRight className="w-5 h-5 text-emerald-500" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Net</p>
                  <p className={`text-lg font-bold ${netDebt >= 0 ? "text-rose-600" : "text-emerald-600"}`}>
                    {netDebt >= 0 ? "" : "+"}{formatCurrency(Math.abs(netDebt))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Hutang Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold">Hutang</h2>
            <Badge variant="outline">{debts.length}</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {debts.map((debt) => (
              <DebtCard key={debt.id} debt={debt} />
            ))}
          </div>
        </div>

        {/* Piutang Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold">Piutang</h2>
            <Badge variant="outline">{receivables.length}</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {receivables.map((debt) => (
              <DebtCard key={debt.id} debt={debt} />
            ))}
          </div>
        </div>

        {/* Add Debt Modal */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Tambah Hutang/Piutang</DialogTitle>
              <DialogDescription>Catat hutang atau piutang baru</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Jenis</Label>
                <Select value={newDebt.debtType} onValueChange={(v: any) => setNewDebt(prev => ({ ...prev, debtType: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jenis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hutang">Hutang</SelectItem>
                    <SelectItem value="piutang">Piutang</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nama</Label>
                <Input
                  placeholder="Contoh: KPR, Pinjaman Bank, Piutang Client"
                  value={newDebt.name}
                  onChange={(e) => setNewDebt(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Total Amount (Rp)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={newDebt.totalAmount}
                    onChange={(e) => setNewDebt(prev => ({ ...prev, totalAmount: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sisa Amount (Rp)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={newDebt.remainingAmount}
                    onChange={(e) => setNewDebt(prev => ({ ...prev, remainingAmount: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bunga (%/tahun)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={newDebt.interestRate}
                    onChange={(e) => setNewDebt(prev => ({ ...prev, interestRate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cicilan/bulan (Rp)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={newDebt.monthlyPayment}
                    onChange={(e) => setNewDebt(prev => ({ ...prev, monthlyPayment: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Kreditur/Pemohon</Label>
                <Input
                  placeholder="Nama bank atau orang"
                  value={newDebt.creditorName}
                  onChange={(e) => setNewDebt(prev => ({ ...prev, creditorName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Jatuh Tempo</Label>
                <Input
                  type="date"
                  value={newDebt.dueDate}
                  onChange={(e) => setNewDebt(prev => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Catatan</Label>
                <Input
                  placeholder="Tambahkan catatan"
                  value={newDebt.notes}
                  onChange={(e) => setNewDebt(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddModal(false)}>Batal</Button>
              <Button onClick={handleAddDebt}>Simpan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
