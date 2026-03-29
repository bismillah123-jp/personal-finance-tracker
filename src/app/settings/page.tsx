import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CurrencyInput } from "@/components/ui/currency-input";
import { useTheme } from "@/components/providers";
import { useAuth } from "@/components/providers";
import { usePWAInstall } from "@/components/pwa-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  User,
  Mail,
  Globe,
  Palette,
  Shield,
  Download,
  Upload,
  Smartphone,
  Trash2,
  LogOut,
  Moon,
  Sun,
  Monitor,
  Plus,
  Edit2,
  CreditCard,
  Wallet,
  Loader2,
  Sparkles,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  clearUserData,
  createWallet,
  deleteWallet,
  exportUserBackup,
  getCachedWalletsSnapshot,
  getWallets,
  importUserBackup,
  type Wallet as DbWallet,
  updateWallet,
} from "@/lib/supabase";
import { WALLET_LABELS } from "@/types";

const WALLET_COLOR_BY_TYPE: Record<DbWallet["type"], string> = {
  cash: "#F59E0B",
  bank: "#3B82F6",
  "e-wallet": "#10B981",
  "credit-card": "#EF4444",
};

const WALLET_ICON_OPTIONS = [
  { value: "wallet", label: "Dompet", preview: "👛" },
  { value: "💵", label: "Tunai", preview: "💵" },
  { value: "🏦", label: "Bank", preview: "🏦" },
  { value: "📱", label: "E-Wallet", preview: "📱" },
  { value: "💳", label: "Kartu", preview: "💳" },
];

const WALLET_COLOR_PRESETS = [
  "#6366F1", "#3B82F6", "#10B981", "#F59E0B",
  "#EF4444", "#8B5CF6", "#06B6D4", "#F97316",
];

const CURRENCY_OPTIONS = [
  { value: "IDR", label: "IDR - Rupiah Indonesia" },
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "JPY", label: "JPY - Japanese Yen" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "SGD", label: "SGD - Singapore Dollar" },
  { value: "MYR", label: "MYR - Malaysian Ringgit" },
];

const LOCALE_OPTIONS = [
  { value: "id-ID", label: "Indonesia (id-ID)" },
  { value: "en-US", label: "English (en-US)" },
  { value: "ja-JP", label: "Japanese (ja-JP)" },
];

type WalletFormState = {
  name: string;
  type: DbWallet["type"] | "";
  balance: number;
  color: string;
  icon: string;
  isDefault: boolean;
};

const DEFAULT_WALLET_FORM: WalletFormState = {
  name: "",
  type: "bank",
  balance: 0,
  color: WALLET_COLOR_BY_TYPE.bank,
  icon: "wallet",
  isDefault: false,
};

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { profile, updateProfile, signOut, user, currency, locale } = useAuth();
  const { canInstall, isInstalled, isInstalling, installApp } = usePWAInstall();

  const fmt = (n: number) => formatCurrency(n, currency, locale);

  const [editProfile, setEditProfile] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: profile?.full_name || "",
    currency: profile?.currency || "IDR",
    locale: profile?.locale || "id-ID",
  });

  const cachedWallets = user ? getCachedWalletsSnapshot(user.id) : [];
  const [wallets, setWallets] = useState<DbWallet[]>(cachedWallets);
  const [walletsLoading, setWalletsLoading] = useState(!cachedWallets.length);
  const [walletError, setWalletError] = useState("");
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [editingWallet, setEditingWallet] = useState<DbWallet | null>(null);
  const [walletForm, setWalletForm] = useState<WalletFormState>(DEFAULT_WALLET_FORM);
  const [walletSaving, setWalletSaving] = useState(false);
  const [deletingWalletId, setDeletingWalletId] = useState<string | null>(null);

  const [exportingBackup, setExportingBackup] = useState(false);
  const [importingBackup, setImportingBackup] = useState(false);
  const [clearingData, setClearingData] = useState(false);
  const backupInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setProfileForm({
      full_name: profile?.full_name || "",
      currency: profile?.currency || "IDR",
      locale: profile?.locale || "id-ID",
    });
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    const snapshot = getCachedWalletsSnapshot(user.id);
    if (snapshot.length) {
      setWallets(snapshot);
      setWalletsLoading(false);
    }
  }, [user]);

  const loadWallets = async () => {
    if (!user) return;
    setWalletsLoading((prev) => (wallets.length === 0 ? true : prev));
    setWalletError("");

    try {
      const rows = await getWallets(user.id);
      setWallets(rows);
    } catch (error: any) {
      setWalletError(error?.message || "Dompet belum bisa dimuat.");
    } finally {
      setWalletsLoading(false);
    }
  };

  useEffect(() => {
    loadWallets();
  }, [user]);

  const totalWalletBalance = useMemo(
    () => wallets.reduce((sum, wallet) => sum + Number(wallet.balance || 0), 0),
    [wallets],
  );

  const openCreateWalletModal = () => {
    setEditingWallet(null);
    setWalletForm(DEFAULT_WALLET_FORM);
    setShowWalletModal(true);
  };

  const openEditWalletModal = (wallet: DbWallet) => {
    setEditingWallet(wallet);
    setWalletForm({
      name: wallet.name,
      type: wallet.type,
      balance: Number(wallet.balance || 0),
      color: wallet.color || WALLET_COLOR_BY_TYPE[wallet.type],
      icon: wallet.icon || "wallet",
      isDefault: wallet.is_default,
    });
    setShowWalletModal(true);
  };

  const enforceSingleDefaultWallet = async (activeWalletId: string) => {
    if (!user) return;
    const currentDefaults = wallets.filter((w) => w.id !== activeWalletId && w.is_default);
    if (!currentDefaults.length) return;
    await Promise.all(currentDefaults.map((w) => updateWallet(w.id, user.id, { is_default: false })));
  };

  const handleSaveWallet = async () => {
    if (!user) return;
    if (!walletForm.name.trim()) { window.alert("Nama dompet wajib diisi."); return; }
    if (!walletForm.type) { window.alert("Pilih jenis dompet."); return; }

    setWalletSaving(true);

    try {
      const normalizedType = walletForm.type as DbWallet["type"];
      const payload = {
        name: walletForm.name.trim(),
        type: normalizedType,
        balance: walletForm.balance,
        currency: currency,
        color: walletForm.color || WALLET_COLOR_BY_TYPE[normalizedType],
        icon: walletForm.icon || "wallet",
        is_default: walletForm.isDefault,
      };

      if (editingWallet) {
        const updated = await updateWallet(editingWallet.id, user.id, payload);
        if (payload.is_default) await enforceSingleDefaultWallet(updated.id);
      } else {
        const created = await createWallet({ user_id: user.id, ...payload });
        if (payload.is_default) await enforceSingleDefaultWallet(created.id);
      }

      setShowWalletModal(false);
      await loadWallets();
    } catch (error: any) {
      window.alert(error?.message || "Dompet gagal disimpan.");
    } finally {
      setWalletSaving(false);
    }
  };

  const handleDeleteWallet = async (wallet: DbWallet) => {
    if (!user) return;
    if (!window.confirm(`Yakin mau hapus dompet "${wallet.name}"?`)) return;

    setDeletingWalletId(wallet.id);

    try {
      await deleteWallet(wallet.id, user.id);
      await loadWallets();
    } catch (error: any) {
      window.alert(error?.message || "Dompet gagal dihapus.");
    } finally {
      setDeletingWalletId(null);
    }
  };

  const handleSaveProfile = async () => {
    setProfileSaving(true);

    try {
      const { error } = await updateProfile({
        full_name: profileForm.full_name,
        currency: profileForm.currency,
        locale: profileForm.locale,
      });

      if (error) {
        window.alert(error.message || "Profil gagal disimpan.");
        return;
      }

      setEditProfile(false);
      // Force reload to apply new locale/currency everywhere
      window.location.reload();
    } finally {
      setProfileSaving(false);
    }
  };

  const handleExportBackup = async () => {
    if (!user) return;
    setExportingBackup(true);
    try {
      const backup = await exportUserBackup(user.id);
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `fintrack-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      window.alert(error?.message || "Backup gagal diexport.");
    } finally {
      setExportingBackup(false);
    }
  };

  const handleImportBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !user) return;
    setImportingBackup(true);
    try {
      const rawText = await file.text();
      const parsed = JSON.parse(rawText);
      if (!window.confirm("Import backup akan menimpa SEMUA data sekarang. Lanjut?")) return;
      const summary = await importUserBackup(user.id, parsed, { wipeExisting: true });
      await loadWallets();
      window.alert(`Restore kelar! Wallet: ${summary.wallets}, Transaksi: ${summary.transactions}, Budget: ${summary.budgets}, Investasi: ${summary.investments}, Utang/Piutang: ${summary.debts}`);
    } catch (error: any) {
      window.alert(error?.message || "Import backup gagal.");
    } finally {
      setImportingBackup(false);
    }
  };

  const handleClearAllData = async () => {
    if (!user) return;
    const confirmation = window.prompt('Ketik "HAPUS" buat konfirmasi:');
    if (confirmation !== "HAPUS") return;
    setClearingData(true);
    try {
      await clearUserData(user.id);
      await loadWallets();
      window.alert("Semua data berhasil dihapus.");
    } catch (error: any) {
      window.alert(error?.message || "Gagal hapus data.");
    } finally {
      setClearingData(false);
    }
  };

  const handleInstallPWA = async () => {
    const accepted = await installApp();
    if (!accepted && canInstall) {
      window.alert("Instalasi dibatalkan.");
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Pengaturan</h1>
          <p className="text-sm text-muted-foreground">Kelola akun, dompet, backup, dan preferensi.</p>
        </div>

        {/* Profile Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-lg font-bold text-white">
                  {profile?.full_name?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="min-w-0">
                  <CardTitle className="truncate text-lg">{profile?.full_name || "User"}</CardTitle>
                  <CardDescription className="truncate">{profile?.email}</CardDescription>
                </div>
              </div>
              <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setEditProfile(true)}>
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-muted/50 p-3 space-y-1">
                <p className="text-[11px] text-muted-foreground">Mata Uang</p>
                <p className="text-sm font-medium">{currency}</p>
              </div>
              <div className="rounded-xl bg-muted/50 p-3 space-y-1">
                <p className="text-[11px] text-muted-foreground">Bahasa</p>
                <p className="text-sm font-medium">{locale}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Theme Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="h-4 w-4" />
              Tampilan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {([
                { key: "light", icon: Sun, label: "Light" },
                { key: "dark", icon: Moon, label: "Dark" },
                { key: "system", icon: Monitor, label: "System" },
              ] as const).map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => setTheme(key)}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all ${
                    theme === key ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Wallets Card */}
        <Card id="wallets">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wallet className="h-4 w-4" />
                  Dompet
                </CardTitle>
                <CardDescription>Kelola rekening dan dompet.</CardDescription>
              </div>
              <Button size="sm" className="rounded-xl" onClick={openCreateWalletModal}>
                <Plus className="mr-1.5 h-4 w-4" />
                Tambah
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-[11px] text-muted-foreground">Jumlah dompet</p>
                <p className="mt-0.5 text-lg font-bold">{wallets.length}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-[11px] text-muted-foreground">Total saldo</p>
                <p className="mt-0.5 text-lg font-bold">{fmt(totalWalletBalance)}</p>
              </div>
            </div>

            {walletsLoading ? (
              <div className="flex items-center justify-center gap-2 rounded-xl border p-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />Memuat dompet...
              </div>
            ) : walletError ? (
              <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-700">{walletError}</p>
            ) : wallets.length === 0 ? (
              <div className="rounded-2xl border border-dashed px-4 py-8 text-center">
                <Wallet className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="font-semibold text-sm">Belum ada dompet</p>
                <p className="mt-1 text-xs text-muted-foreground">Tambahkan dompet untuk mulai mencatat transaksi.</p>
              </div>
            ) : (
              wallets.map((wallet) => (
                <div key={wallet.id} className="flex items-center justify-between gap-3 rounded-xl border bg-muted/30 p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${wallet.color}20` }}>
                      {wallet.icon === "wallet" ? (
                        <CreditCard className="h-5 w-5" style={{ color: wallet.color }} />
                      ) : (
                        <span className="text-lg">{wallet.icon}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{wallet.name}</p>
                        {wallet.is_default && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Default</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{WALLET_LABELS[wallet.type]}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-semibold whitespace-nowrap ${Number(wallet.balance) < 0 ? "text-rose-600" : ""}`}>
                      {fmt(Number(wallet.balance))}
                    </p>
                    <Button size="icon" variant="outline" className="h-8 w-8 rounded-lg" onClick={() => openEditWalletModal(wallet)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="outline" className="h-8 w-8 rounded-lg text-rose-600" onClick={() => handleDeleteWallet(wallet)} disabled={deletingWalletId === wallet.id}>
                      {deletingWalletId === wallet.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Download className="h-4 w-4" />
              Kelola Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
              <div className="min-w-0 mr-3">
                <p className="text-sm font-medium">Export Backup</p>
                <p className="text-xs text-muted-foreground">Simpan data sebagai JSON.</p>
              </div>
              <Button variant="outline" size="sm" className="rounded-xl shrink-0" onClick={handleExportBackup} disabled={exportingBackup || !user}>
                {exportingBackup ? <Loader2 className="h-4 w-4 animate-spin" /> : "Export"}
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
              <div className="min-w-0 mr-3">
                <p className="text-sm font-medium">Import Backup</p>
                <p className="text-xs text-muted-foreground">Restore dari file JSON.</p>
              </div>
              <Button variant="outline" size="sm" className="rounded-xl shrink-0" onClick={() => backupInputRef.current?.click()} disabled={importingBackup || !user}>
                {importingBackup ? <Loader2 className="h-4 w-4 animate-spin" /> : "Import"}
              </Button>
            </div>
            <input ref={backupInputRef} type="file" accept="application/json" className="hidden" onChange={handleImportBackup} />
          </CardContent>
        </Card>

        {/* PWA */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Smartphone className="h-4 w-4" />
              Aplikasi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Status PWA</p>
                <p className="text-xs text-muted-foreground">{isInstalled ? "Terpasang" : "Siap install"}</p>
              </div>
              <Badge variant={isInstalled ? "default" : "outline"} className={isInstalled ? "bg-emerald-600 text-white" : ""}>
                {isInstalled ? "Terpasang" : "Siap"}
              </Badge>
            </div>
            <Button onClick={handleInstallPWA} disabled={!canInstall || isInstalling || isInstalled} className="w-full rounded-xl">
              {isInstalling ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Memproses...</>
              ) : isInstalled ? (
                <><Sparkles className="mr-2 h-4 w-4" />Sudah Terpasang</>
              ) : canInstall ? (
                <><Download className="mr-2 h-4 w-4" />Install Aplikasi</>
              ) : (
                "Buka di browser untuk install"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <Shield className="h-4 w-4" />
              Zona Berbahaya
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-destructive/5 p-3">
              <div className="min-w-0 mr-3">
                <p className="text-sm font-medium text-destructive">Hapus Semua Data</p>
                <p className="text-xs text-muted-foreground">Permanen, tidak bisa di-undo.</p>
              </div>
              <Button variant="destructive" size="sm" className="rounded-xl shrink-0" onClick={handleClearAllData} disabled={clearingData || !user}>
                {clearingData ? <Loader2 className="h-4 w-4 animate-spin" /> : "Hapus"}
              </Button>
            </div>
            <Button variant="outline" className="w-full rounded-xl border-destructive/50 text-destructive hover:bg-destructive/5" onClick={() => signOut()}>
              <LogOut className="mr-2 h-4 w-4" />
              Keluar dari Akun
            </Button>
          </CardContent>
        </Card>

        {/* Edit Profile Dialog */}
        <Dialog open={editProfile} onOpenChange={setEditProfile}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Profil</DialogTitle>
              <DialogDescription>Perbarui informasi profil. Perubahan mata uang & bahasa akan me-reload halaman.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nama Lengkap</Label>
                <Input className="rounded-xl" value={profileForm.full_name} onChange={(e) => setProfileForm((prev) => ({ ...prev, full_name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Mata Uang</Label>
                <Select value={profileForm.currency} onValueChange={(v) => setProfileForm((prev) => ({ ...prev, currency: v }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Bahasa / Locale</Label>
                <Select value={profileForm.locale} onValueChange={(v) => setProfileForm((prev) => ({ ...prev, locale: v }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LOCALE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" className="rounded-xl" onClick={() => setEditProfile(false)}>Batal</Button>
              <Button className="rounded-xl" onClick={handleSaveProfile} disabled={profileSaving}>
                {profileSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Wallet Dialog */}
        <Dialog open={showWalletModal} onOpenChange={setShowWalletModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingWallet ? "Edit Dompet" : "Tambah Dompet"}</DialogTitle>
              <DialogDescription>Simpan dompet atau rekening.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nama</Label>
                <Input className="rounded-xl" placeholder="Contoh: BCA Utama" value={walletForm.name} onChange={(e) => setWalletForm((prev) => ({ ...prev, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Jenis</Label>
                <Select value={walletForm.type} onValueChange={(v: DbWallet["type"]) => setWalletForm((prev) => ({ ...prev, type: v, color: WALLET_COLOR_BY_TYPE[v] }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Pilih jenis" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Tunai</SelectItem>
                    <SelectItem value="bank">Rekening Bank</SelectItem>
                    <SelectItem value="e-wallet">E-Wallet</SelectItem>
                    <SelectItem value="credit-card">Kartu Kredit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Saldo Awal</Label>
                <CurrencyInput value={String(walletForm.balance || "")} onValueChange={(raw) => setWalletForm((prev) => ({ ...prev, balance: raw }))} />
              </div>
              <div className="space-y-2">
                <Label>Ikon</Label>
                <Select value={walletForm.icon} onValueChange={(v) => setWalletForm((prev) => ({ ...prev, icon: v }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {WALLET_ICON_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.preview} {opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Warna</Label>
                <div className="flex flex-wrap gap-2">
                  {WALLET_COLOR_PRESETS.map((color) => (
                    <button key={color} type="button" onClick={() => setWalletForm((prev) => ({ ...prev, color }))}
                      className={`h-8 w-8 rounded-full border-2 transition-all ${walletForm.color === color ? "border-foreground scale-110" : "border-transparent"}`}
                      style={{ backgroundColor: color }} />
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="rounded" checked={walletForm.isDefault} onChange={(e) => setWalletForm((prev) => ({ ...prev, isDefault: e.target.checked }))} />
                Jadikan dompet default
              </label>
            </div>
            <DialogFooter>
              <Button variant="outline" className="rounded-xl" onClick={() => setShowWalletModal(false)}>Batal</Button>
              <Button className="rounded-xl" onClick={handleSaveWallet} disabled={walletSaving}>
                {walletSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
