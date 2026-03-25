"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Bitcoin,
  Briefcase,
  Edit2,
  Landmark,
  Package,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  createInvestment,
  deleteInvestment,
  getCachedInvestmentsSnapshot,
  getInvestments,
  updateInvestment,
  type Investment as DbInvestment,
} from "@/lib/supabase";
import { exportInvestmentReport } from "@/lib/export";
import { toNumber } from "@/lib/data-utils";
import {
  GOLD_INVESTMENT_TYPE,
  enrichInvestmentsWithGoldPrice,
  estimateGoldGramsForBudget,
  parseInvestmentNotes,
  serializeInvestmentNotes,
} from "@/lib/gold-investments";
import { formatLastUpdate, getGoldPrice, refreshGoldPrice, type GoldPriceData } from "@/lib/gold-price";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Investment as UiInvestment } from "@/types";

const INVESTMENT_TYPES = [
  { id: "saham", label: "Saham", icon: Briefcase, color: "#3B82F6" },
  { id: "reksadana", label: "Reksa Dana", icon: Landmark, color: "#10B981" },
  { id: "deposito", label: "Deposito", icon: Shield, color: "#8B5CF6" },
  { id: "crypto", label: "Kripto", icon: Bitcoin, color: "#F59E0B" },
  { id: GOLD_INVESTMENT_TYPE, label: "Emas", icon: Package, color: "#EAB308" },
  { id: "obligasi", label: "Obligasi", icon: Landmark, color: "#6366F1" },
  { id: "lainnya", label: "Lainnya", icon: Package, color: "#888" },
] as const;

const getInvestmentTypeInfo = (type: string) => INVESTMENT_TYPES.find((item) => item.id === type) || INVESTMENT_TYPES[6];

type InvestmentFormState = {
  name: string;
  type: DbInvestment["type"] | "";
  initialValue: string;
  currentValue: string;
  purchaseDate: string;
  notes: string;
  grams: string;
  monthlyBudget: string;
};

const EMPTY_FORM: InvestmentFormState = {
  name: "",
  type: "",
  initialValue: "",
  currentValue: "",
  purchaseDate: "",
  notes: "",
  grams: "",
  monthlyBudget: "",
};

export default function InvestmentsPage() {
  const { user } = useAuth();
  const cachedInvestments = user ? getCachedInvestmentsSnapshot(user.id) : [];
  const [investments, setInvestments] = useState<DbInvestment[]>(cachedInvestments);
  const [loading, setLoading] = useState(!cachedInvestments.length);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<DbInvestment | null>(null);
  const [form, setForm] = useState<InvestmentFormState>(EMPTY_FORM);
  const [goldPrice, setGoldPrice] = useState<GoldPriceData | null>(null);
  const [goldPriceError, setGoldPriceError] = useState("");
  const [goldPriceLoading, setGoldPriceLoading] = useState(false);

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

  const loadGoldPrice = async (forceRefresh = false) => {
    setGoldPriceLoading(true);
    setGoldPriceError("");

    try {
      const data = forceRefresh ? await refreshGoldPrice() : await getGoldPrice();
      setGoldPrice(data);
    } catch (loadError: any) {
      console.error(loadError);
      setGoldPriceError(loadError?.message || "Harga emas live belum tersedia.");
    } finally {
      setGoldPriceLoading(false);
    }
  };

  useEffect(() => {
    loadInvestments();
  }, [user]);

  useEffect(() => {
    loadGoldPrice();
  }, []);

  const enrichedInvestments = useMemo(
    () => enrichInvestmentsWithGoldPrice(investments, goldPrice),
    [investments, goldPrice],
  );

  const exportableInvestments = useMemo<UiInvestment[]>(
    () =>
      enrichedInvestments.map((investment) => ({
        id: investment.id,
        name: investment.name,
        type: investment.type as UiInvestment["type"],
        initialValue: toNumber(investment.initial_value),
        currentValue: investment.live_current_value,
        purchaseDate: investment.purchase_date,
        notes: investment.user_notes,
      })),
    [enrichedInvestments],
  );

  const totalInitial = useMemo(
    () => enrichedInvestments.reduce((sum, investment) => sum + toNumber(investment.initial_value), 0),
    [enrichedInvestments],
  );
  const totalCurrent = useMemo(
    () => enrichedInvestments.reduce((sum, investment) => sum + investment.live_current_value, 0),
    [enrichedInvestments],
  );
  const totalGain = totalCurrent - totalInitial;
  const percentageGain = totalInitial > 0 ? (totalGain / totalInitial) * 100 : 0;

  const isGoldForm = form.type === GOLD_INVESTMENT_TYPE;
  const liveGoldPreviewValue = useMemo(() => {
    if (!isGoldForm) return toNumber(form.currentValue);
    if (!goldPrice?.gold) return toNumber(form.currentValue);

    const grams = toNumber(form.grams);
    if (grams <= 0) return 0;

    return grams * goldPrice.gold;
  }, [form.currentValue, form.grams, goldPrice, isGoldForm]);

  const estimatedMonthlyGoldGrams = useMemo(
    () => estimateGoldGramsForBudget(toNumber(form.monthlyBudget), goldPrice?.gold),
    [form.monthlyBudget, goldPrice],
  );

  const openCreateModal = () => {
    setEditingInvestment(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEditModal = (investment: DbInvestment) => {
    const { userNotes, goldMeta } = parseInvestmentNotes(investment.notes);
    const savedCurrentValue = toNumber(investment.current_value);
    const liveCurrentValue = goldMeta?.grams && goldPrice?.gold ? goldMeta.grams * goldPrice.gold : savedCurrentValue;

    setEditingInvestment(investment);
    setForm({
      name: investment.name,
      type: investment.type,
      initialValue: String(toNumber(investment.initial_value)),
      currentValue: String(liveCurrentValue || savedCurrentValue),
      purchaseDate: investment.purchase_date,
      notes: userNotes || "",
      grams: goldMeta?.grams ? String(goldMeta.grams) : "",
      monthlyBudget: goldMeta?.monthlyBudget ? String(goldMeta.monthlyBudget) : "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!user) return;

    if (!form.name || !form.type || !form.initialValue || !form.purchaseDate) {
      window.alert("Nama, jenis, nilai awal, dan tanggal beli wajib diisi.");
      return;
    }

    if (isGoldForm && !form.grams) {
      window.alert("Berat emas wajib diisi biar nilai live bisa dihitung.");
      return;
    }

    if (!isGoldForm && !form.currentValue) {
      window.alert("Nilai sekarang wajib diisi untuk investasi non-emas.");
      return;
    }

    const calculatedCurrentValue = isGoldForm
      ? liveGoldPreviewValue || toNumber(form.initialValue)
      : toNumber(form.currentValue);

    const serializedNotes = serializeInvestmentNotes({
      type: form.type,
      userNotes: form.notes,
      grams: form.grams,
      monthlyBudget: form.monthlyBudget,
    });

    try {
      if (editingInvestment) {
        await updateInvestment(editingInvestment.id, user.id, {
          name: form.name,
          type: form.type,
          initial_value: toNumber(form.initialValue),
          current_value: calculatedCurrentValue,
          purchase_date: form.purchaseDate,
          notes: serializedNotes,
        });
      } else {
        await createInvestment({
          user_id: user.id,
          name: form.name,
          type: form.type,
          initial_value: toNumber(form.initialValue),
          current_value: calculatedCurrentValue,
          purchase_date: form.purchaseDate,
          notes: serializedNotes,
        });
      }

      setShowModal(false);
      setForm(EMPTY_FORM);
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
      <div className="mx-auto max-w-7xl min-w-0 space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Investasi</h1>
            <p className="text-sm text-muted-foreground">Pantau portofolio, nilai live emas, dan pertumbuhan investasi Anda.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => exportInvestmentReport(exportableInvestments)}
              disabled={!exportableInvestments.length}
            >
              Export laporan
            </Button>
            <Button onClick={openCreateModal} className="gap-2 rounded-xl">
              <Plus className="h-4 w-4" />
              Tambah investasi
            </Button>
          </div>
        </div>

        <Card className="border-yellow-200/70 bg-yellow-50/50 dark:border-yellow-900/60 dark:bg-yellow-950/20">
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">Harga emas live</p>
              <p className="mt-1 text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                {goldPrice ? `${formatCurrency(goldPrice.gold)} / gram` : "Belum tersedia"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {goldPrice
                  ? `Update terakhir ${formatLastUpdate(goldPrice.lastUpdate)}`
                  : goldPriceError || "Belum bisa mengambil harga live, nilai tersimpan tetap dipakai sebagai cadangan."}
              </p>
            </div>
            <Button variant="outline" className="gap-2 rounded-xl" onClick={() => loadGoldPrice(true)} disabled={goldPriceLoading}>
              <RefreshCw className={`h-4 w-4 ${goldPriceLoading ? "animate-spin" : ""}`} />
              Refresh harga emas
            </Button>
          </CardContent>
        </Card>

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
                {totalGain >= 0 ? "+" : ""}
                {formatCurrency(totalGain)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Persentase</p>
              <p className={`mt-1 break-words text-xl font-bold ${percentageGain >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {percentageGain >= 0 ? "+" : ""}
                {percentageGain.toFixed(2)}%
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Portofolio investasi</CardTitle>
            <CardDescription>Investasi emas akan otomatis mengikuti harga API kalau berat emasnya diisi.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Memuat investasi...</p>
            ) : error ? (
              <p className="rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-200">{error}</p>
            ) : enrichedInvestments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center">
                <p className="text-base font-semibold">Belum ada investasi</p>
                <p className="mt-2 text-sm text-muted-foreground">Belum ada data investasi yang tercatat.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {enrichedInvestments.map((investment) => {
                  const typeInfo = getInvestmentTypeInfo(investment.type);
                  const Icon = typeInfo.icon;
                  const currentValue = investment.live_current_value;
                  const initialValue = toNumber(investment.initial_value);
                  const gain = currentValue - initialValue;
                  const gainPercentage = initialValue > 0 ? (gain / initialValue) * 100 : 0;
                  const isGain = gain >= 0;
                  const monthlyGoldEstimate = estimateGoldGramsForBudget(investment.monthly_budget, investment.live_price_per_gram);

                  return (
                    <div key={investment.id} className="rounded-2xl border border-border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: `${typeInfo.color}20` }}>
                            <Icon className="h-6 w-6" style={{ color: typeInfo.color }} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-base font-semibold">{investment.name}</p>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-xs text-muted-foreground">{typeInfo.label}</p>
                              {investment.is_live_gold && (
                                <span className="rounded-full bg-yellow-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-yellow-700 dark:text-yellow-300">
                                  Live harga emas
                                </span>
                              )}
                            </div>
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
                          <span className="font-medium">{formatCurrency(initialValue)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Nilai sekarang</span>
                          <span className="font-medium">{formatCurrency(currentValue)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Growth</span>
                          <span className={`font-bold ${isGain ? "text-emerald-600" : "text-rose-600"}`}>
                            {isGain ? <ArrowUpRight className="mr-1 inline h-4 w-4" /> : <ArrowDownRight className="mr-1 inline h-4 w-4" />}
                            {formatCurrency(gain)} ({gainPercentage.toFixed(1)}%)
                          </span>
                        </div>
                        {typeof investment.gold_grams === "number" && investment.gold_grams > 0 && (
                          <>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">Berat emas</span>
                              <span className="font-medium">{investment.gold_grams.toFixed(4)} gram</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">Harga per gram</span>
                              <span className="font-medium">
                                {investment.live_price_per_gram ? formatCurrency(investment.live_price_per_gram) : "Belum tersedia"}
                              </span>
                            </div>
                          </>
                        )}
                        {typeof investment.monthly_budget === "number" && investment.monthly_budget > 0 && (
                          <>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">Invest rutin / bulan</span>
                              <span className="font-medium">{formatCurrency(investment.monthly_budget)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">Estimasi gram / bulan</span>
                              <span className="font-medium">{monthlyGoldEstimate.toFixed(4)} gram</span>
                            </div>
                          </>
                        )}
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Tanggal beli</span>
                          <span className="font-medium">{formatDate(investment.purchase_date)}</span>
                        </div>
                      </div>

                      {investment.user_notes && (
                        <p className="mt-4 break-words rounded-xl bg-muted/50 p-3 text-sm leading-relaxed text-muted-foreground">
                          {investment.user_notes}
                        </p>
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
              <DialogDescription>
                Simpan data investasi. Untuk emas, cukup isi berat emas dan nilainya akan mengikuti harga API.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nama investasi</Label>
                <Input
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Contoh: BBCA, BTC, Emas Antam"
                />
              </div>
              <div className="space-y-2">
                <Label>Jenis investasi</Label>
                <Select value={form.type} onValueChange={(value: DbInvestment["type"]) => setForm((prev) => ({ ...prev, type: value }))}>
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

              {isGoldForm ? (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Total modal beli</Label>
                      <Input
                        type="number"
                        value={form.initialValue}
                        onChange={(event) => setForm((prev) => ({ ...prev, initialValue: event.target.value }))}
                        placeholder="Contoh: 1200000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Berat emas (gram)</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={form.grams}
                        onChange={(event) => setForm((prev) => ({ ...prev, grams: event.target.value }))}
                        placeholder="Contoh: 1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Nilai sekarang</Label>
                      <Input
                        type="text"
                        value={
                          goldPriceLoading
                            ? "Memuat harga emas..."
                            : goldPriceError
                              ? "Harga emas gagal dimuat"
                              : !toNumber(form.grams)
                                ? "Masukkan berat emas dulu"
                                : liveGoldPreviewValue
                                  ? formatCurrency(liveGoldPreviewValue)
                                  : "—"
                        }
                        readOnly
                      />
                      {goldPriceError && (
                        <p className="text-xs text-red-500">{goldPriceError}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Investasi rutin per bulan</Label>
                      <Input
                        type="number"
                        value={form.monthlyBudget}
                        onChange={(event) => setForm((prev) => ({ ...prev, monthlyBudget: event.target.value }))}
                        placeholder="Contoh: 100000"
                      />
                    </div>
                  </div>
                  <div className="rounded-xl border border-dashed border-yellow-300 bg-yellow-50/60 p-3 text-sm text-yellow-900 dark:border-yellow-900 dark:bg-yellow-950/30 dark:text-yellow-100">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">Preview emas live</p>
                      {goldPrice && (
                        <p className="text-xs opacity-70">{formatCurrency(goldPrice.gold)}/gram</p>
                      )}
                    </div>
                    {goldPriceError ? (
                      <div className="mt-2">
                        <p className="text-red-600 dark:text-red-400">Gagal memuat harga emas: {goldPriceError}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => loadGoldPrice(true)}
                          disabled={goldPriceLoading}
                        >
                          {goldPriceLoading ? "Memuat..." : "Coba lagi"}
                        </Button>
                      </div>
                    ) : goldPriceLoading ? (
                      <p className="mt-1">Memuat harga emas...</p>
                    ) : (
                      <>
                        <p className="mt-1">Nilai sekarang otomatis ikut harga emas API.</p>
                        {estimatedMonthlyGoldGrams > 0 && (
                          <p className="mt-1">Dengan budget {formatCurrency(toNumber(form.monthlyBudget))}/bulan, estimasinya dapat {estimatedMonthlyGoldGrams.toFixed(4)} gram per bulan.</p>
                        )}
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nilai awal</Label>
                    <Input
                      type="number"
                      value={form.initialValue}
                      onChange={(event) => setForm((prev) => ({ ...prev, initialValue: event.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nilai sekarang</Label>
                    <Input
                      type="number"
                      value={form.currentValue}
                      onChange={(event) => setForm((prev) => ({ ...prev, currentValue: event.target.value }))}
                      placeholder="0"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Tanggal beli</Label>
                <Input
                  type="date"
                  value={form.purchaseDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, purchaseDate: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Catatan</Label>
                <Input
                  value={form.notes}
                  onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                  placeholder="Catatan tambahan (opsional)"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Batal
              </Button>
              <Button onClick={handleSave}>Simpan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
