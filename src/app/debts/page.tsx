"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowDownRight, ArrowUpRight, Calendar, CreditCard, Edit2, HandCoins, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { addDebtPayment, createDebt, deleteDebt, getDebts, updateDebt, type Debt as DbDebt } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toNumber } from "@/lib/data-utils";

export default function DebtsPage() {
  const { user } = useAuth();
  const [debts, setDebts] = useState<DbDebt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingDebt, setEditingDebt] = useState<DbDebt | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<DbDebt | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [form, setForm] = useState({
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

  const loadDebts = async () => {
    if (!user) return;
    setLoading(true);
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
      totalAmount: "",
      remainingAmount: "",
      dueDate: "",
      interestRate: "",
      monthlyPayment: "",
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
      totalAmount: String(toNumber(debt.total_amount)),
      remainingAmount: String(toNumber(debt.remaining_amount)),
      dueDate: debt.due_date || "",
      interestRate: String(toNumber(debt.interest_rate) || ""),
      monthlyPayment: String(toNumber(debt.monthly_payment) || ""),
      creditorName: debt.creditor_name || "",
      notes: debt.notes || "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!form.name || !form.debtType || !form.totalAmount) {
      window.alert("Nama, jenis, dan total amount wajib diisi ya.");
      return;
    }

    const payload = {
      name: form.name,
      debt_type: form.debtType,
      total_amount: Number(form.totalAmount),
      remaining_amount: Number(form.remainingAmount || form.totalAmount),
      due_date: form.dueDate || undefined,
      interest_rate: Number(form.interestRate || 0),
      monthly_payment: form.monthlyPayment ? Number(form.monthlyPayment) : undefined,
      creditor_name: form.creditorName || undefined,
      notes: form.notes || undefined,
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
      window.alert(saveError?.message || "Data utang/piutang gagal disimpan.");
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
    setPaymentAmount("");
    setPaymentNote("");
    setShowPaymentModal(true);
  };

  const handlePayment = async () => {
    if (!selectedDebt || !paymentAmount) {
      window.alert("Isi jumlah pembayaran dulu ya.");
      return;
    }

    try {
      await addDebtPayment({
        debt_id: selectedDebt.id,
        amount: Number(paymentAmount),
        payment_date: new Date().toISOString().split("T")[0],
        note: paymentNote || undefined,
      });
      setShowPaymentModal(false);
      await loadDebts();
    } catch (paymentError: any) {
      window.alert(paymentError?.message || "Pembayaran gagal dicatat.");
    }
  };

  const renderDebtCard = (debt: DbDebt) => {
    const paidPercentage = toNumber(debt.total_amount) > 0
      ? ((toNumber(debt.total_amount) - toNumber(debt.remaining_amount)) / toNumber(debt.total_amount)) * 100
      : 0;
    const isOverdue = debt.due_date ? new Date(debt.due_date) < new Date() : false;

    return (
      <div key={debt.id} className="rounded-2xl border border-border p-4">
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
              <p className="text-xs text-muted-foreground">{debt.creditor_name || (debt.debt_type === "piutang" ? "Piutang" : "Belum ada kreditur")}</p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button size="icon" variant="outline" className="h-9 w-9 rounded-xl" onClick={() => openEditModal(debt)}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="outline" className="h-9 w-9 rounded-xl text-rose-600 hover:text-rose-600" onClick={() => handleDelete(debt.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-4 space-y-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Total</span>
            <span className="font-medium">{formatCurrency(toNumber(debt.total_amount))}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Sisa</span>
            <span className={`font-bold ${debt.debt_type === "hutang" ? "text-rose-600" : "text-emerald-600"}`}>
              {formatCurrency(toNumber(debt.remaining_amount))}
            </span>
          </div>
          {(toNumber(debt.interest_rate) || 0) > 0 && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Bunga</span>
              <span className="font-medium">{toNumber(debt.interest_rate)}%/tahun</span>
            </div>
          )}
          {debt.monthly_payment && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Cicilan / bulan</span>
              <span className="font-medium">{formatCurrency(toNumber(debt.monthly_payment))}</span>
            </div>
          )}
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>{paidPercentage.toFixed(0)}% selesai</span>
            <span>{formatCurrency(toNumber(debt.total_amount) - toNumber(debt.remaining_amount))} sudah tercatat</span>
          </div>
          <Progress value={paidPercentage} className="h-2" />
        </div>

        {debt.due_date && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>Jatuh tempo {formatDate(debt.due_date)}</span>
            {isOverdue && (
              <span className="rounded-full bg-rose-500/10 px-2 py-1 text-rose-600">Terlambat</span>
            )}
          </div>
        )}

        {debt.notes && (
          <p className="mt-4 rounded-xl bg-muted/50 p-3 text-sm leading-relaxed text-muted-foreground break-words">{debt.notes}</p>
        )}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button className="rounded-xl" variant={debt.debt_type === "hutang" ? "expense" : "income"} onClick={() => openPaymentModal(debt)}>
            {debt.debt_type === "hutang" ? "Catat pembayaran" : "Catat pelunasan"}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6 min-w-0">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Utang & Piutang</h1>
            <p className="text-sm text-muted-foreground">Semua cicilan, pinjaman, dan piutang dicatet biar gak ada yang kelewat.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => openCreateModal("piutang")}>Tambah piutang</Button>
            <Button className="gap-2 rounded-xl" onClick={() => openCreateModal("hutang")}>
              <Plus className="h-4 w-4" />
              Tambah hutang
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Hutang</p>
              <p className="mt-1 break-words text-xl font-bold text-rose-600">{formatCurrency(totalHutang)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Piutang</p>
              <p className="mt-1 break-words text-xl font-bold text-emerald-600">{formatCurrency(totalPiutang)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Net</p>
              <p className={`mt-1 break-words text-xl font-bold ${netDebt >= 0 ? "text-rose-600" : "text-emerald-600"}`}>
                {netDebt >= 0 ? <ArrowUpRight className="mr-1 inline h-4 w-4" /> : <ArrowDownRight className="mr-1 inline h-4 w-4" />}
                {formatCurrency(Math.abs(netDebt))}
              </p>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Lagi muat catatan utang/piutang...</CardContent></Card>
        ) : error ? (
          <Card><CardContent className="p-6 text-sm text-rose-700 dark:text-rose-200">{error}</CardContent></Card>
        ) : debts.length === 0 ? (
          <Card>
            <CardContent className="rounded-2xl border border-dashed border-border p-10 text-center">
              <p className="text-base font-semibold">Belum ada catatan utang atau piutang</p>
              <p className="mt-2 text-sm text-muted-foreground">Akun baru wajar masih bersih. Tambah data kalau memang ada kewajiban atau tagihan yang perlu dipantau.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Hutang</CardTitle>
                <CardDescription>{hutang.length} catatan aktif</CardDescription>
              </CardHeader>
              <CardContent>
                {hutang.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada hutang aktif.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {hutang.map(renderDebtCard)}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Piutang</CardTitle>
                <CardDescription>{piutang.length} catatan aktif</CardDescription>
              </CardHeader>
              <CardContent>
                {piutang.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada piutang aktif.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {piutang.map(renderDebtCard)}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingDebt ? "Edit data" : "Tambah hutang / piutang"}</DialogTitle>
              <DialogDescription>Simpan data kewajiban atau tagihan yang perlu kamu pantau.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Jenis</Label>
                <Select value={form.debtType} onValueChange={(value: any) => setForm((prev) => ({ ...prev, debtType: value }))}>
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
                <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Contoh: KPR, Pinjaman kantor, Piutang client" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Total amount</Label>
                  <Input type="number" value={form.totalAmount} onChange={(event) => setForm((prev) => ({ ...prev, totalAmount: event.target.value }))} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>Sisa amount</Label>
                  <Input type="number" value={form.remainingAmount} onChange={(event) => setForm((prev) => ({ ...prev, remainingAmount: event.target.value }))} placeholder="0" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Bunga (%/tahun)</Label>
                  <Input type="number" value={form.interestRate} onChange={(event) => setForm((prev) => ({ ...prev, interestRate: event.target.value }))} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>Cicilan / bulan</Label>
                  <Input type="number" value={form.monthlyPayment} onChange={(event) => setForm((prev) => ({ ...prev, monthlyPayment: event.target.value }))} placeholder="0" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Kreditur / pihak terkait</Label>
                <Input value={form.creditorName} onChange={(event) => setForm((prev) => ({ ...prev, creditorName: event.target.value }))} placeholder="Nama bank / orang / client" />
              </div>
              <div className="space-y-2">
                <Label>Jatuh tempo</Label>
                <Input type="date" value={form.dueDate} onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Catatan</Label>
                <Input value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Catatan tambahan" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowModal(false)}>Batal</Button>
              <Button onClick={handleSave}>Simpan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Catat pembayaran</DialogTitle>
              <DialogDescription>
                {selectedDebt ? `Update progres untuk ${selectedDebt.name}.` : "Catat pembayaran atau pelunasan di sini."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                {selectedDebt ? (
                  <>
                    <p className="font-medium text-foreground">Sisa sekarang: {formatCurrency(toNumber(selectedDebt.remaining_amount))}</p>
                    <p className="mt-1">Jenis: {selectedDebt.debt_type === "hutang" ? "Hutang" : "Piutang"}</p>
                  </>
                ) : (
                  "Pilih data dulu ya."
                )}
              </div>
              <div className="space-y-2">
                <Label>Jumlah</Label>
                <Input type="number" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Catatan</Label>
                <Input value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} placeholder="Opsional" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPaymentModal(false)}>Batal</Button>
              <Button onClick={handlePayment}>Simpan pembayaran</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
