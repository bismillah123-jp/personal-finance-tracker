"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, CreditCard, Edit2, HandCoins, Plus, Trash2, Loader2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { CurrencyInput } from "@/components/ui/currency-input";
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
import { addDebtPayment, createDebt, deleteDebt, getCachedDebtsSnapshot, getDebts, updateDebt, type Debt as DbDebt, isSupabaseConfigured } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toNumber } from "@/lib/data-utils";

export default function DebtsPage() {
  const { user, currency, locale } = useAuth();
  const cachedDebts = user ? getCachedDebtsSnapshot(user.id) : [];
  const [debts, setDebts] = useState<DbDebt[]>(cachedDebts);
  const [loading, setLoading] = useState(!cachedDebts.length && isSupabaseConfigured);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingDebt, setEditingDebt] = useState<DbDebt | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<DbDebt | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentNote, setPaymentNote] = useState("");
  const [payingSaving, setPayingSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    debtType: "hutang" as "hutang" | "piutang",
    totalAmount: 0,
    remainingAmount: 0,
    dueDate: "",
    interestRate: "",
    monthlyPayment: 0,
    creditorName: "",
    notes: "",
  });

  const fmt = (n: number) => formatCurrency(n, currency, locale);

  useEffect(() => {
    if (!user) return;
    const snapshot = getCachedDebtsSnapshot(user.id);
    if (snapshot.length) {
      setDebts(snapshot);
      setLoading(false);
    }
  }, [user]);

  const loadDebts = async () => {
    if (!user) return;
    setLoading((prev) => (debts.length === 0 ? true : prev));
    setError("");

    try {
      const data = await getDebts(user.id);
      setDebts(data);
    } catch (loadError: any) {
      console.error(loadError);
      setError(loadError?.message || "Data utang/piutang belum bisa dimuat.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDebts();
  }, [user]);

  const hutang = useMemo(() => debts.filter((debt) => debt.debt_type === "hutang"), [debts]);
  const piutang = useMemo(() => debts.filter((debt) => debt.debt_type === "piutang"), [debts]);
  const totalHutang = hutang.reduce((sum, debt) => sum + toNumber(debt.remaining_amount), 0);
  const totalPiutang = piutang.reduce((sum, debt) => sum + toNumber(debt.remaining_amount), 0);
  const netDebt = totalHutang - totalPiutang;

  const openCreateModal = (debtType: "hutang" | "piutang" = "hutang") => {
    setEditingDebt(null);
    setForm({
      name: "",
      debtType,
      totalAmount: 0,
      remainingAmount: 0,
      dueDate: "",
      interestRate: "",
      monthlyPayment: 0,
      creditorName: "",
      notes: "",
    });
    setShowModal(true);
  };

  const openEditModal = (debt: DbDebt) => {
    setEditingDebt(debt);
    setForm({
      name: debt.name,
      debtType: debt.debt_type,
      totalAmount: toNumber(debt.total_amount),
      remainingAmount: toNumber(debt.remaining_amount),
      dueDate: debt.due_date || "",
      interestRate: String(toNumber(debt.interest_rate) || ""),
      monthlyPayment: toNumber(debt.monthly_payment),
      creditorName: debt.creditor_name || "",
      notes: debt.notes || "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!form.name || !form.debtType || form.totalAmount <= 0) {
      window.alert("Nama, jenis, dan total nominal wajib diisi.");
      return;
    }

    setSaving(true);

    // If remaining is 0 or not set, default to total
    const remaining = form.remainingAmount > 0 ? form.remainingAmount : form.totalAmount;

    const payload: any = {
      name: form.name,
      debt_type: form.debtType,
      total_amount: form.totalAmount,
      remaining_amount: remaining,
      due_date: form.dueDate || null,
      interest_rate: Number(form.interestRate || 0),
      monthly_payment: form.monthlyPayment || null,
      creditor_name: form.creditorName || null,
      notes: form.notes || null,
    };

    try {
      if (editingDebt) {
        await updateDebt(editingDebt.id, user.id, payload);
      } else {
        await createDebt({ user_id: user.id, ...payload });
      }
      setShowModal(false);
      await loadDebts();
    } catch (saveError: any) {
      console.error(saveError);
      window.alert(saveError?.message || "Data utang/piutang gagal disimpan.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (debtId: string) => {
    if (!user) return;
    if (!window.confirm("Yakin mau hapus catatan ini?")) return;

    try {
      await deleteDebt(debtId, user.id);
      await loadDebts();
    } catch (deleteError: any) {
      window.alert(deleteError?.message || "Catatan gagal dihapus.");
    }
  };

  const openPaymentModal = (debt: DbDebt) => {
    setSelectedDebt(debt);
    setPaymentAmount(0);
    setPaymentNote("");
    setShowPaymentModal(true);
  };

  const handlePayment = async () => {
    if (!selectedDebt || paymentAmount <= 0) {
      window.alert("Masukkan jumlah pembayaran yang valid.");
      return;
    }

    if (paymentAmount > toNumber(selectedDebt.remaining_amount)) {
      window.alert("Jumlah pembayaran melebihi sisa hutang/piutang.");
      return;
    }

    setPayingSaving(true);

    try {
      await addDebtPayment({
        debt_id: selectedDebt.id,
        amount: paymentAmount,
        payment_date: new Date().toISOString().split("T")[0],
        note: paymentNote || undefined,
      });
      setShowPaymentModal(false);
      await loadDebts();
    } catch (paymentError: any) {
      console.error(paymentError);
      window.alert(paymentError?.message || "Pembayaran gagal dicatat.");
    } finally {
      setPayingSaving(false);
    }
  };

  const renderDebtCard = (debt: DbDebt) => {
    const total = toNumber(debt.total_amount);
    const remaining = toNumber(debt.remaining_amount);
    const paid = total - remaining;
    const paidPercentage = total > 0 ? (paid / total) * 100 : 0;
    const isOverdue = debt.due_date ? new Date(debt.due_date) < new Date() : false;
    const isFullyPaid = remaining <= 0;

    return (
      <div key={debt.id} className={`rounded-2xl border p-4 transition-all hover:shadow-sm ${isFullyPaid ? 'border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/10' : 'border-border'}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${debt.debt_type === "hutang" ? "bg-rose-500/10" : "bg-emerald-500/10"}`}>
              {debt.debt_type === "hutang" ? (
                <CreditCard className="h-5 w-5 text-rose-500" />
              ) : (
                <HandCoins className="h-5 w-5 text-emerald-500" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold">{debt.name}</p>
              <p className="text-xs text-muted-foreground">
                {debt.creditor_name || (debt.debt_type === "piutang" ? "Piutang" : "Belum ada kreditur")}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <Button size="icon" variant="outline" className="h-8 w-8 rounded-lg" onClick={() => openEditModal(debt)}>
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="outline" className="h-8 w-8 rounded-lg text-rose-600 hover:text-rose-600" onClick={() => handleDelete(debt.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="mt-4 space-y-1.5 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Total</span>
            <span className="font-medium">{fmt(total)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Sisa</span>
            <span className={`font-bold ${isFullyPaid ? 'text-emerald-600' : debt.debt_type === "hutang" ? "text-rose-600" : "text-emerald-600"}`}>
              {isFullyPaid ? 'Lunas!' : fmt(remaining)}
            </span>
          </div>
          {(toNumber(debt.interest_rate) || 0) > 0 && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Bunga</span>
              <span className="font-medium">{toNumber(debt.interest_rate)}%/tahun</span>
            </div>
          )}
          {toNumber(debt.monthly_payment) > 0 && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Cicilan/bulan</span>
              <span className="font-medium">{fmt(toNumber(debt.monthly_payment))}</span>
            </div>
          )}
        </div>

        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>{Math.round(paidPercentage)}% lunas</span>
            <span>{fmt(paid)} terbayar</span>
          </div>
          <Progress value={paidPercentage} className="h-2" indicatorClassName={isFullyPaid ? 'bg-emerald-500' : debt.debt_type === 'hutang' ? 'bg-rose-500' : 'bg-emerald-500'} />
        </div>

        {debt.due_date && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>Jatuh tempo {formatDate(debt.due_date, locale)}</span>
            {isOverdue && !isFullyPaid && (
              <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-rose-600 font-medium">Terlambat</span>
            )}
          </div>
        )}

        {debt.notes && (
          <p className="mt-3 rounded-xl bg-muted/50 p-2.5 text-xs leading-relaxed text-muted-foreground break-words">{debt.notes}</p>
        )}

        {!isFullyPaid && (
          <div className="mt-4">
            <Button
              className="w-full rounded-xl text-sm"
              variant={debt.debt_type === "hutang" ? "expense" : "income"}
              onClick={() => openPaymentModal(debt)}
            >
              {debt.debt_type === "hutang" ? "Catat Pembayaran" : "Catat Pelunasan"}
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-5 min-w-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Utang & Piutang</h1>
            <p className="text-sm text-muted-foreground">Kelola kewajiban dan piutang agar tetap terpantau.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-xl text-sm" onClick={() => openCreateModal("piutang")}>
              <Plus className="mr-1.5 h-4 w-4" />
              Piutang
            </Button>
            <Button className="gap-1.5 rounded-xl text-sm" onClick={() => openCreateModal("hutang")}>
              <Plus className="h-4 w-4" />
              Hutang
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Hutang</p>
              <p className="mt-1 break-words text-xl font-bold text-rose-600">{fmt(totalHutang)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Piutang</p>
              <p className="mt-1 break-words text-xl font-bold text-emerald-600">{fmt(totalPiutang)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Net</p>
              <p className={`mt-1 break-words text-xl font-bold ${netDebt > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                {fmt(Math.abs(netDebt))}
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  {netDebt > 0 ? "(masih hutang)" : netDebt < 0 ? "(surplus)" : ""}
                </span>
              </p>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <Card><CardContent className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Memuat data...</CardContent></Card>
        ) : error ? (
          <Card><CardContent className="p-6 text-sm text-rose-700 dark:text-rose-200">{error}</CardContent></Card>
        ) : debts.length === 0 ? (
          <Card>
            <CardContent className="rounded-2xl border border-dashed border-border p-10 text-center">
              <CreditCard className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-base font-semibold">Belum ada catatan</p>
              <p className="mt-2 text-sm text-muted-foreground">Tambahkan hutang atau piutang untuk mulai memantau.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            {hutang.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Hutang</CardTitle>
                  <CardDescription>{hutang.length} catatan aktif</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {hutang.map(renderDebtCard)}
                  </div>
                </CardContent>
              </Card>
            )}

            {piutang.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Piutang</CardTitle>
                  <CardDescription>{piutang.length} catatan aktif</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {piutang.map(renderDebtCard)}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Create/Edit Debt Modal */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingDebt ? "Edit data" : "Tambah Hutang/Piutang"}</DialogTitle>
              <DialogDescription>Simpan data kewajiban atau piutang untuk dipantau.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Jenis</Label>
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, debtType: "hutang" }))}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${form.debtType === "hutang" ? "bg-rose-500 text-white shadow-sm" : "text-muted-foreground"}`}
                  >
                    Hutang
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, debtType: "piutang" }))}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${form.debtType === "piutang" ? "bg-emerald-500 text-white shadow-sm" : "text-muted-foreground"}`}
                  >
                    Piutang
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Nama</Label>
                <Input className="rounded-xl" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Contoh: KPR, Pinjaman kantor" />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Total nominal</Label>
                  <CurrencyInput
                    value={String(form.totalAmount || "")}
                    onValueChange={(raw) => setForm((prev) => ({ ...prev, totalAmount: raw, remainingAmount: prev.remainingAmount || raw }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sisa nominal</Label>
                  <CurrencyInput
                    value={String(form.remainingAmount || "")}
                    onValueChange={(raw) => setForm((prev) => ({ ...prev, remainingAmount: raw }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Bunga (%/tahun)</Label>
                  <Input className="rounded-xl" type="number" value={form.interestRate} onChange={(e) => setForm((prev) => ({ ...prev, interestRate: e.target.value }))} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>Cicilan/bulan</Label>
                  <CurrencyInput
                    value={String(form.monthlyPayment || "")}
                    onValueChange={(raw) => setForm((prev) => ({ ...prev, monthlyPayment: raw }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Kreditur / pihak terkait</Label>
                <Input className="rounded-xl" value={form.creditorName} onChange={(e) => setForm((prev) => ({ ...prev, creditorName: e.target.value }))} placeholder="Nama bank / orang / client" />
              </div>
              <div className="space-y-2">
                <Label>Jatuh tempo</Label>
                <Input className="rounded-xl" type="date" value={form.dueDate} onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Catatan</Label>
                <Input className="rounded-xl" value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Catatan tambahan" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" className="rounded-xl" onClick={() => setShowModal(false)}>Batal</Button>
              <Button className="rounded-xl" onClick={handleSave} disabled={saving}>
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menyimpan...</> : "Simpan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Payment Modal */}
        <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Catat Pembayaran</DialogTitle>
              <DialogDescription>
                {selectedDebt ? `Update progres untuk "${selectedDebt.name}".` : "Catat pembayaran atau pelunasan."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedDebt && (
                <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm space-y-1">
                  <p className="font-medium text-foreground">Sisa: {fmt(toNumber(selectedDebt.remaining_amount))}</p>
                  <p className="text-xs text-muted-foreground">Jenis: {selectedDebt.debt_type === "hutang" ? "Hutang" : "Piutang"}</p>
                </div>
              )}
              <div className="space-y-2">
                <Label>Jumlah pembayaran</Label>
                <CurrencyInput
                  value={String(paymentAmount || "")}
                  onValueChange={(raw) => setPaymentAmount(raw)}
                />
              </div>
              <div className="space-y-2">
                <Label>Catatan (opsional)</Label>
                <Input className="rounded-xl" value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} placeholder="Opsional" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" className="rounded-xl" onClick={() => setShowPaymentModal(false)}>Batal</Button>
              <Button className="rounded-xl" onClick={handlePayment} disabled={payingSaving}>
                {payingSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menyimpan...</> : "Simpan Pembayaran"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
