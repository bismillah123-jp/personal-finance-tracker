"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Edit2,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  Briefcase,
  Landmark,
  Bitcoin,
  Package,
  Shield,
} from "lucide-react";

interface Investment {
  id: string;
  name: string;
  type: "saham" | "reksadana" | "deposito" | "crypto" | "emtas" | "obligasi" | "lainnya";
  initialValue: number;
  currentValue: number;
  purchaseDate: string;
  notes?: string;
}

const MOCK_INVESTMENTS: Investment[] = [
  { id: "i1", name: "BBCA", type: "saham", initialValue: 5_000_000, currentValue: 6_500_000, purchaseDate: "2024-01-15", notes: "Bank BCA" },
  { id: "i2", name: "Reksa Dana Saham", type: "reksadana", initialValue: 10_000_000, currentValue: 11_200_000, purchaseDate: "2024-02-01", notes: "Netflix" },
  { id: "i3", name: "Deposito 12 Bulan", type: "deposito", initialValue: 20_000_000, currentValue: 21_200_000, purchaseDate: "2024-01-01" },
  { id: "i4", name: "BTC", type: "crypto", initialValue: 3_000_000, currentValue: 4_500_000, purchaseDate: "2024-02-15", notes: "Bitcoin" },
  { id: "i5", name: "Emas 50 gram", type: "emtas", initialValue: 25_000_000, currentValue: 28_500_000, purchaseDate: "2023-12-01" },
];

const INVESTMENT_TYPES = [
  { id: "saham", label: "Saham", icon: Briefcase, color: "#3B82F6" },
  { id: "reksadana", label: "Reksa Dana", icon: Landmark, color: "#10B981" },
  { id: "deposito", label: "Deposito", icon: Shield, color: "#8B5CF6" },
  { id: "crypto", label: "Kripto", icon: Bitcoin, color: "#F59E0B" },
  { id: "emtas", label: "Emas/Commodity", icon: Package, color: "#EF4444" },
  { id: "obligasi", label: "Obligasi", icon: Landmark, color: "#6366F1" },
  { id: "lainnya", label: "Lainnya", icon: Package, color: "#888" },
];

const getInvestmentTypeInfo = (type: string) => {
  return INVESTMENT_TYPES.find(t => t.id === type) || INVESTMENT_TYPES[6];
};

export default function InvestmentsPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newInvestment, setNewInvestment] = useState({
    name: "",
    type: "" as Investment["type"] | "",
    initialValue: "",
    currentValue: "",
    purchaseDate: "",
    notes: "",
  });

  const totalInitial = MOCK_INVESTMENTS.reduce((s, i) => s + i.initialValue, 0);
  const totalCurrent = MOCK_INVESTMENTS.reduce((s, i) => s + i.currentValue, 0);
  const totalGain = totalCurrent - totalInitial;
  const percentageGain = totalInitial > 0 ? (totalGain / totalInitial) * 100 : 0;
  const isGain = totalGain >= 0;

  const handleAddInvestment = () => {
    if (!newInvestment.name || !newInvestment.type || !newInvestment.initialValue || !newInvestment.currentValue) return;
    // Add investment logic
    setShowAddModal(false);
    setNewInvestment({ name: "", type: "", initialValue: "", currentValue: "", purchaseDate: "", notes: "" });
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Investasi</h1>
            <p className="text-sm text-muted-foreground">Pantau portofolio investasi Anda</p>
          </div>
          <Button onClick={() => setShowAddModal(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Tambah Investasi
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Nilai Awal</p>
              <p className="text-xl font-bold">{formatCurrency(totalInitial)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Nilai Saat Ini</p>
              <p className="text-xl font-bold">{formatCurrency(totalCurrent)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isGain ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
                  {isGain ? <ArrowUpRight className="w-5 h-5 text-emerald-500" /> : <ArrowDownRight className="w-5 h-5 text-rose-500" />}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Gain/Loss</p>
                  <p className={`text-lg font-bold ${isGain ? "text-emerald-600" : "text-rose-600"}`}>
                    {isGain ? "+" : ""}{formatCurrency(totalGain)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isGain ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
                  {isGain ? <TrendingUp className="w-5 h-5 text-emerald-500" /> : <TrendingDown className="w-5 h-5 text-rose-500" />}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Persentase</p>
                  <p className={`text-lg font-bold ${isGain ? "text-emerald-600" : "text-rose-600"}`}>
                    {isGain ? "+" : ""}{percentageGain.toFixed(2)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Investment List */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {MOCK_INVESTMENTS.map((investment) => {
            const typeInfo = getInvestmentTypeInfo(investment.type);
            const gain = investment.currentValue - investment.initialValue;
            const gainPercentage = (gain / investment.initialValue) * 100;
            const isGain = gain >= 0;
            const Icon = typeInfo.icon;
            
            return (
              <Card key={investment.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: typeInfo.color + "20" }}
                      >
                        <Icon className="w-6 h-6" style={{ color: typeInfo.color }} />
                      </div>
                      <div>
                        <p className="font-semibold">{investment.name}</p>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {typeInfo.label}
                        </Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Nilai Awal</span>
                      <span className="font-medium">{formatCurrency(investment.initialValue)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Nilai Saat Ini</span>
                      <span className="font-medium">{formatCurrency(investment.currentValue)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Gain/Loss</span>
                      <span className={`font-bold ${isGain ? "text-emerald-600" : "text-rose-600"}`}>
                        {isGain ? "+" : ""}{formatCurrency(gain)} ({gainPercentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  
                  {investment.notes && (
                    <p className="mt-3 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
                      {investment.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Add Investment Modal */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Investasi Baru</DialogTitle>
              <DialogDescription>Catat investasi baru ke dalam portofolio Anda</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nama Investasi</Label>
                <Input
                  placeholder="Contoh: BBCA, BTC, Emas 50gr"
                  value={newInvestment.name}
                  onChange={(e) => setNewInvestment(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Jenis Investasi</Label>
                <Select value={newInvestment.type} onValueChange={(v: any) => setNewInvestment(prev => ({ ...prev, type: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jenis" />
                  </SelectTrigger>
                  <SelectContent>
                    {INVESTMENT_TYPES.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nilai Awal (Rp)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={newInvestment.initialValue}
                    onChange={(e) => setNewInvestment(prev => ({ ...prev, initialValue: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nilai Saat Ini (Rp)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={newInvestment.currentValue}
                    onChange={(e) => setNewInvestment(prev => ({ ...prev, currentValue: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tanggal Pembelian</Label>
                <Input
                  type="date"
                  value={newInvestment.purchaseDate}
                  onChange={(e) => setNewInvestment(prev => ({ ...prev, purchaseDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Catatan (opsional)</Label>
                <Input
                  placeholder="Tambahkan catatan..."
                  value={newInvestment.notes}
                  onChange={(e) => setNewInvestment(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddModal(false)}>Batal</Button>
              <Button onClick={handleAddInvestment}>Simpan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
