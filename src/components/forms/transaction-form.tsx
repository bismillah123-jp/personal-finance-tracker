"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/types";
import { useAuth } from "@/components/providers";
import {
  createTransaction,
  getWallets,
  isSupabaseConfigured,
  supabaseConfigMessage,
} from "@/lib/supabase";
import { useEffect } from "react";

interface TransactionFormProps {
  defaultType?: "income" | "expense";
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: {
    id?: string;
    type: "income" | "expense";
    amount: number;
    category: string;
    walletId: string;
    date: Date;
    note?: string;
  };
}

const DEMO_WALLETS = [
  { id: "demo-bank", name: "BCA Utama", type: "bank" },
  { id: "demo-ewallet", name: "GoPay", type: "e-wallet" },
  { id: "demo-cash", name: "Tunai", type: "cash" },
];

export function TransactionForm({
  defaultType = "expense",
  onSuccess,
  onCancel,
  initialData,
}: TransactionFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [wallets, setWallets] = useState<{ id: string; name: string; type: string }[]>([]);
  const [type, setType] = useState<"income" | "expense">(initialData?.type || defaultType);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      amount: initialData?.amount?.toString() || "",
      category: initialData?.category || "",
      walletId: initialData?.walletId || "",
      date: initialData?.date ? format(initialData.date, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
      note: initialData?.note || "",
    },
  });

  const selectedCategory = watch("category");
  const selectedWallet = watch("walletId");

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setWallets(DEMO_WALLETS);
      return;
    }

    if (user) {
      getWallets(user.id)
        .then(setWallets)
        .catch(console.error);
    }
  }, [user]);

  useEffect(() => {
    if (!initialData) {
      setValue("category", "");
    }
  }, [type, setValue, initialData]);

  const categories = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const onSubmit = async (data: any) => {
    if (!isSupabaseConfigured) {
      reset();
      onSuccess?.();
      return;
    }

    if (!user) return;
    setLoading(true);

    try {
      await createTransaction({
        user_id: user.id,
        wallet_id: data.walletId || null,
        type,
        amount: parseFloat(data.amount),
        category: data.category,
        date: data.date,
        note: data.note || null,
      });

      reset();
      onSuccess?.();
    } catch (error) {
      console.error("Error creating transaction:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
      {!isSupabaseConfigured && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
          Demo mode aktif — {supabaseConfigMessage} Transaksi yang disimpan dari form ini belum permanen ya.
        </div>
      )}

      {/* Transaction Type Toggle */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-xl">
        <button
          type="button"
          onClick={() => setType("income")}
          className={`py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
            type === "income"
              ? "bg-emerald-500 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Pemasukan
        </button>
        <button
          type="button"
          onClick={() => setType("expense")}
          className={`py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
            type === "expense"
              ? "bg-rose-500 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Pengeluaran
        </button>
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <Label htmlFor="amount">Jumlah</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            Rp
          </span>
          <Input
            id="amount"
            type="number"
            inputMode="decimal"
            placeholder="0"
            className="pl-10 h-12 text-lg font-semibold"
            {...register("amount", {
              required: "Jumlah harus diisi",
              min: { value: "1", message: "Jumlah minimal 1" },
            })}
          />
        </div>
        {errors.amount && (
          <p className="text-xs text-destructive">{errors.amount.message as string}</p>
        )}
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label>Kategori</Label>
        <div className="grid grid-cols-4 gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setValue("category", cat.id)}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                selectedCategory === cat.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              <span className="text-xl">{cat.icon}</span>
              <span className="text-[10px] font-medium text-center leading-tight">
                {cat.label.split(" ")[0]}
              </span>
            </button>
          ))}
        </div>
        <input type="hidden" {...register("category", { required: "Kategori harus dipilih" })} />
        {errors.category && (
          <p className="text-xs text-destructive">{errors.category.message as string}</p>
        )}
      </div>

      {/* Wallet */}
      <div className="space-y-2">
        <Label htmlFor="walletId">Dompet</Label>
        <Select value={selectedWallet} onValueChange={(v) => setValue("walletId", v)}>
          <SelectTrigger>
            <SelectValue placeholder="Pilih dompet" />
          </SelectTrigger>
          <SelectContent>
            {wallets.map((wallet) => (
              <SelectItem key={wallet.id} value={wallet.id}>
                {wallet.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input type="hidden" {...register("walletId", { required: "Dompet harus dipilih" })} />
        {errors.walletId && (
          <p className="text-xs text-destructive">{errors.walletId.message as string}</p>
        )}
      </div>

      {/* Date */}
      <div className="space-y-2">
        <Label htmlFor="date">Tanggal</Label>
        <Input
          id="date"
          type="date"
          className="h-10"
          {...register("date", { required: "Tanggal harus diisi" })}
        />
        {errors.date && (
          <p className="text-xs text-destructive">{errors.date.message as string}</p>
        )}
      </div>

      {/* Note */}
      <div className="space-y-2">
        <Label htmlFor="note">Catatan (opsional)</Label>
        <Textarea
          id="note"
          placeholder="Tambahkan catatan..."
          className="h-20 resize-none"
          {...register("note")}
        />
      </div>

      {!isSupabaseConfigured && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          Mode demo aktif — transaksi bisa diisi buat preview UI, tapi belum bakal kesimpan sampai env Supabase dikonfigurasi.
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
            Batal
          </Button>
        )}
        <Button
          type="submit"
          variant={type === "income" ? "income" : "expense"}
          className="flex-1"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Menyimpan...
            </>
          ) : isSupabaseConfigured ? (
            <>Simpan {type === "income" ? "Pemasukan" : "Pengeluaran"}</>
          ) : (
            <>Simpan Demo</>
          )}
        </Button>
      </div>
    </form>
  );
}
