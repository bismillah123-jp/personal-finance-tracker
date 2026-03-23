"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Briefcase, Landmark, Bitcoin, Package, Shield, Plus, Edit2, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { createInvestment, deleteInvestment, getCachedInvestmentsSnapshot, getInvestments, updateInvestment, type Investment as DbInvestment } from "@/lib/supabase";
import { exportInvestmentReport } from "@/lib/export";
import { mapInvestmentToUi, toNumber } from "@/lib/data-utils";
import { formatCurrency, formatDate } from "@/lib/utils";

const INVESTMENT_TYPES = [
  { id: "saham", label: "Saham", icon: Briefcase, color: "#3B82F6" },
  { id: "reksadana", label: "Reksa Dana", icon: Landmark, color: "#10B981" },
  { id: "deposito", label: "Deposito", icon: Shield, color: "#8B5CF6" },
  { id: "crypto", label: "Kripto", icon: Bitcoin, color: "#F59E0B" },
  { id: "emtas", label: "Emas/Commodity", icon: Package, color: "#EF4444" },
  { id: "obligasi", label: "Obligasi", icon: Landmark, color: "#6366F1" },
  { id: "lainnya", label: "Lainnya", icon: Package, color: "#888" },
] as const;

const getInvestmentTypeInfo = (type: string) => INVESTMENT_TYPES.find((item) => item.id === type) || INVESTMENT_TYPES[6];

export default function InvestmentsPage() {
  const { user } = useAuth();
  const cachedInvestments = user ? getCachedInvestmentsSnapshot(user.id) : [];
  const [investments, setInvestments] = useState<DbInvestment[]>(cachedInvestments);
  const [loading, setLoading] = useState(!cachedInvestments.length);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<DbInvestment | null>(null);
  const [form, setForm] = useState({
    name: "",
    type: "" as DbInvestment["type"] | "",
    initialValue: "",
    currentValue: "",
    purchaseDate: "",
    notes: "",
  });

  useEffect(() => {
    if (!user) return;

    const snapshot = getCachedInvestmentsSnapshot(user.id);
    if (snapshot.length) {
      setInvestments(snapshot);
      setLoading(false);
    }
  }, [user]);

  const loadInvestments = async () => {
    if (!user) return;
    setLoading((prev) => (investments.length === 0 ? true : prev));
    setError("");

    try {
      const data = await getInvestments(user.id);
      setInvestments(data);
    } catch (loadError: any) {
      console.error(loadError);
      setError(loadError?.message || "Investasi belum bisa dimuat.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvestments();
  }, [user]);

  const totalInitial = useMemo(() => investments.reduce((sum, investment) => sum + toNumber(investment.initial_value), 0), [investments]);
  const totalCurrent = useMemo(() => investments.reduce((sum, investment) => sum + toNumber(investment.current_value), 0), [investments]);
  const totalGain = totalCurrent - totalInitial;
  const percentageGain = totalInitial > 0 ? (totalGain / totalInitial) * 100 : 0;

  const openCreateModal = () => {
    setEditingInvestment(null);
    setForm({ name: "", type: "", initialValue: "", currentValue: "", purchaseDate: "", notes: "" });
    setShowModal(true);
  };

  const openEditModal = (investment: DbInvestment) => {
    setEditingInvestment(investment);
    setForm({
      name: investment.name,
      type: investment.type,
      initialValue: String(toNumber(investment.initial_value)),
      currentValue: String(toNumber(investment.current_value)),
      purchaseDate: investment.purchase_date,
      notes: investment.notes || "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!form.name || !form.type || !form.initialValue || !form.currentValue || !form.purchaseDate) {
      window.alert("Seluruh data utama investasi wajib diisi.");
      return;
    }

    try {
      if (editingInvestment) {
        await updateInvestment(editingInvestment.id, user.id, {
          name: form.name,
          type: form.type,
          initial_value: Number(form.initialValue),
          current_value: Number(form.currentValue),
          purchase_date: form.purchaseDate,
          notes: form.notes || undefined,
        });
      } else {
        await createInvestment({
          user_id: user.id,
          name: form.name,
          type: form.type,
          initial_value: Number(form.initialValue),
          current_value: Number(form.currentValue),
          purchase_date: form.purchaseDate,
          notes: form.notes || undefined,
        });
      }

      setShowModal(false);
      await loadInvestments();
    } catch (saveError: any) {
      window.alert(saveError?.message || "Investasi gagal disimpan.");
    }
  };

  const handleDelete = async (investmentId: string) => {
    if (!user) return;
    if (!window.confirm("Yakin mau hapus investasi ini?")) return;

    try {
      await deleteInvestment(investmentId, user.id);
      await loadInvestments();
    } catch (deleteError: any) {
      window.alert(deleteError?.message || "Investasi gagal dihapus.");
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6 min-w-0">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Investasi</h1>
            <p className="text-sm text-muted-foreground">Pantau portofolio, nilai terkini, dan pertumbuhan investasi Anda.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => exportInvestmentReport(investments.map(mapInvestmentToUi))} disabled={!investments.length}>
              Export laporan
            </Button>
            <Button onClick={openCreateModal} className="gap-2 rounded-xl">
              <Plus className="h-4 w-4" />
              Tambah investasi
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Nilai Awal</p>
              <p className="mt-1 break-words text-xl font-bold">{formatCurrency(totalInitial)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Nilai Saat Ini</p>
              <p className="mt-1 break-words text-xl font-bold">{formatCurrency(totalCurrent)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Gain / Loss</p>
              <p className={`mt-1 break-words text-xl font-bold ${totalGain >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {totalGain >= 0 ? "+" : ""}{formatCurrency(totalGain)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Persentase</p>
              <p className={`mt-1 break-words text-xl font-bold ${percentageGain >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {percentageGain >= 0 ? "+" : ""}{percentageGain.toFixed(2)}%
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Portofolio investasi</CardTitle>
            <CardDescription>Daftar investasi akan tampil setelah Anda menambahkan aset pertama.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Memuat investasi...</p>
            ) : error ? (
              <p className="rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-200">{error}</p>
            ) : investments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center">
                <p className="text-base font-semibold">Belum ada investasi</p>
                <p className="mt-2 text-sm text-muted-foreground">Belum ada data investasi yang tercatat.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {investments.map((investment) => {
                  const typeInfo = getInvestmentTypeInfo(investment.type);
                  const Icon = typeInfo.icon;
                  const gain = toNumber(investment.current_value) - toNumber(investment.initial_value);
                  const gainPercentage = toNumber(investment.initial_value) > 0 ? (gain / toNumber(investment.initial_value)) * 100 : 0;
                  const isGain = gain >= 0;

                  return (
                    <div key={investment.id} className="rounded-2xl border border-border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: `${typeInfo.color}20` }}>
                            <Icon className="h-6 w-6" style={{ color: typeInfo.color }} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-base font-semibold">{investment.name}</p>
                            <p className="text-xs text-muted-foreground">{typeInfo.label}</p>
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <Button size="icon" variant="outline" className="h-9 w-9 rounded-xl" onClick={() => openEditModal(investment)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="outline" className="h-9 w-9 rounded-xl text-rose-600 hover:text-rose-600" onClick={() => handleDelete(investment.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Nilai awal</span>
                          <span className="font-medium">{formatCurrency(toNumber(investment.initial_value))}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Nilai sekarang</span>
                          <span className="font-medium">{formatCurrency(toNumber(investment.current_value))}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Growth</span>
                          <span className={`font-bold ${isGain ? "text-emerald-600" : "text-rose-600"}`}>
                            {isGain ? <ArrowUpRight className="mr-1 inline h-4 w-4" /> : <ArrowDownRight className="mr-1 inline h-4 w-4" />}
                            {formatCurrency(gain)} ({gainPercentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Tanggal beli</span>
                          <span className="font-medium">{formatDate(investment.purchase_date)}</span>
                        </div>
                      </div>

                      {investment.notes && (
                        <p className="mt-4 rounded-xl bg-muted/50 p-3 text-sm leading-relaxed text-muted-foreground break-words">{investment.notes}</p>
                      )}
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
              <DialogTitle>{editingInvestment ? "Edit investasi" : "Tambah investasi"}</DialogTitle>
              <DialogDescription>Simpan data investasi agar portofolio tercatat dengan rapi.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nama investasi</Label>
                <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Contoh: BBCA, BTC, Emas 50gr" />
              </div>
              <div className="space-y-2">
                <Label>Jenis investasi</Label>
                <Select value={form.type} onValueChange={(value: any) => setForm((prev) => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jenis" />
                  </SelectTrigger>
                  <SelectContent>
                    {INVESTMENT_TYPES.map((type) => (
                      <SelectItem key={type.id} value={type.id}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nilai awal</Label>
                  <Input type="number" value={form.initialValue} onChange={(event) => setForm((prev) => ({ ...prev, initialValue: event.target.value }))} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>Nilai sekarang</Label>
                  <Input type="number" value={form.currentValue} onChange={(event) => setForm((prev) => ({ ...prev, currentValue: event.target.value }))} placeholder="0" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tanggal beli</Label>
                <Input type="date" value={form.purchaseDate} onChange={(event) => setForm((prev) => ({ ...prev, purchaseDate: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Catatan</Label>
                <Input value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Catatan tambahan (opsional)" />
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
