import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/components/providers";
import {
  createTransaction,
  getWallets,
  isSupabaseConfigured,
  supabaseConfigMessage,
  updateTransaction,
} from "@/lib/supabase";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/types";

interface TransactionFormProps {
  defaultType?: "income" | "expense";
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: {
    id?: string;
    type: "income" | "expense";
    amount: number;
    category: string;
    walletId?: string;
    date: Date;
    note?: string;
  };
}

type WalletOption = { id: string; name: string; type: string };

type FormValues = {
  amount: string;
  category: string;
  walletId: string;
  date: string;
  note: string;
};

const DEMO_WALLETS: WalletOption[] = [
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
  const [wallets, setWallets] = useState<WalletOption[]>([]);
  const [error, setError] = useState("");
  const [type, setType] = useState<"income" | "expense">(initialData?.type || defaultType);
  const [amountRaw, setAmountRaw] = useState(initialData?.amount || 0);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      amount: initialData?.amount?.toString() || "",
      category: initialData?.category || "",
      walletId: initialData?.walletId || "",
      date: initialData?.date
        ? format(initialData.date, "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd"),
      note: initialData?.note || "",
    },
  });

  const selectedCategory = watch("category");
  const selectedWallet = watch("walletId");
  const categories = useMemo(
    () => (type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES),
    [type],
  );

  useEffect(() => {
    const loadWallets = async () => {
      if (!isSupabaseConfigured) {
        setWallets(DEMO_WALLETS);
        return;
      }

      if (!user) return;

      try {
        const walletList = await getWallets(user.id);
        setWallets(walletList.map((wallet) => ({ id: wallet.id, name: wallet.name, type: wallet.type })));
      } catch (loadError) {
        console.error("Failed to load wallets", loadError);
        setError("Daftar dompet belum dapat dimuat. Silakan muat ulang halaman.");
      }
    };

    loadWallets();
  }, [user]);

  useEffect(() => {
    if (!initialData) {
      setValue("category", "");
    }
  }, [initialData, setValue, type]);

  const saveDisabled = isSupabaseConfigured && wallets.length === 0;

  const onSubmit = async (data: FormValues) => {
    setError("");

    if (!isSupabaseConfigured) {
      reset();
      setAmountRaw(0);
      onSuccess?.();
      return;
    }

    if (!user) {
      setError("Silakan login terlebih dahulu.");
      return;
    }

    if (wallets.length === 0) {
      setError("Tambah dompet dulu sebelum nyimpan transaksi.");
      return;
    }

    if (amountRaw <= 0) {
      setError("Jumlah harus lebih dari 0.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        user_id: user.id,
        wallet_id: data.walletId || undefined,
        type,
        amount: amountRaw,
        category: data.category,
        date: data.date,
        note: data.note || undefined,
      };

      if (initialData?.id) {
        await updateTransaction(initialData.id, user.id, payload);
      } else {
        await createTransaction(payload);
      }

      reset({
        amount: "",
        category: "",
        walletId: "",
        date: format(new Date(), "yyyy-MM-dd"),
        note: "",
      });
      setAmountRaw(0);
      onSuccess?.();
    } catch (submitError: any) {
      console.error("Error saving transaction:", submitError);
      setError(submitError?.message || "Transaksi gagal disimpan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
      {!isSupabaseConfigured && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-800 dark:text-amber-200">
          Mode demo aktif — {supabaseConfigMessage}
        </div>
      )}

      {saveDisabled && (
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs leading-relaxed text-blue-900 dark:text-blue-100">
          Belum ada dompet. Tambahkan dompet melalui menu pengaturan agar transaksi dapat disimpan.
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
        <button
          type="button"
          onClick={() => setType("income")}
          className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
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
          className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
            type === "expense"
              ? "bg-rose-500 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Pengeluaran
        </button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Jumlah</Label>
        <CurrencyInput
          value={String(amountRaw || "")}
          onValueChange={(raw) => {
            setAmountRaw(raw);
            setValue("amount", String(raw));
          }}
          className="h-12 text-base font-semibold sm:text-lg"
          placeholder="0"
        />
        {amountRaw <= 0 && errors.amount && <p className="text-xs text-destructive">Jumlah harus diisi</p>}
      </div>

      <div className="space-y-2">
        <Label>Kategori</Label>
        <div className="grid grid-cols-4 gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setValue("category", category.id)}
              className={`flex min-h-[70px] flex-col items-center justify-center gap-1 rounded-xl border p-1.5 text-center transition-all ${
                selectedCategory === category.id
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              <span className="text-lg">{category.icon}</span>
              <span className="line-clamp-2 text-[9px] font-medium leading-tight sm:text-xs">
                {category.label}
              </span>
            </button>
          ))}
        </div>
        <input type="hidden" {...register("category", { required: "Kategori harus dipilih" })} />
        {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="walletId">Dompet</Label>
          <Select value={selectedWallet} onValueChange={(value) => setValue("walletId", value)}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder={wallets.length ? "Pilih dompet" : "Belum ada dompet"} />
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
          {errors.walletId && <p className="text-xs text-destructive">{errors.walletId.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="date">Tanggal</Label>
          <Input
            id="date"
            type="date"
            className="h-10 rounded-xl"
            {...register("date", { required: "Tanggal harus diisi" })}
          />
          {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">Catatan (opsional)</Label>
        <Textarea
          id="note"
          placeholder="Tambahkan catatan..."
          className="min-h-[72px] resize-none rounded-xl"
          {...register("note")}
        />
      </div>

      <div className="flex flex-col gap-2 pt-2 sm:flex-row">
        {onCancel && (
          <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={onCancel}>
            Batal
          </Button>
        )}
        <Button
          type="submit"
          variant={type === "income" ? "income" : "expense"}
          className="flex-1 rounded-xl"
          disabled={loading || saveDisabled}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Menyimpan...
            </>
          ) : !isSupabaseConfigured ? (
            <>Simpan Demo</>
          ) : initialData?.id ? (
            <>Update transaksi</>
          ) : (
            <>Simpan {type === "income" ? "pemasukan" : "pengeluaran"}</>
          )}
        </Button>
      </div>
    </form>
  );
}
