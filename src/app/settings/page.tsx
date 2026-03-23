"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  "#6366F1",
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#06B6D4",
  "#F97316",
];

type WalletFormState = {
  name: string;
  type: DbWallet["type"] | "";
  balance: string;
  color: string;
  icon: string;
  isDefault: boolean;
};

const DEFAULT_WALLET_FORM: WalletFormState = {
  name: "",
  type: "bank",
  balance: "",
  color: WALLET_COLOR_BY_TYPE.bank,
  icon: "wallet",
  isDefault: false,
};

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { profile, updateProfile, signOut, user } = useAuth();
  const { canInstall, isInstalled, isInstalling, installApp } = usePWAInstall();

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      balance: String(Number(wallet.balance || 0)),
      color: wallet.color || WALLET_COLOR_BY_TYPE[wallet.type],
      icon: wallet.icon || "wallet",
      isDefault: wallet.is_default,
    });
    setShowWalletModal(true);
  };

  const enforceSingleDefaultWallet = async (activeWalletId: string) => {
    if (!user) return;

    const currentDefaults = wallets.filter((wallet) => wallet.id !== activeWalletId && wallet.is_default);
    if (!currentDefaults.length) return;

    await Promise.all(
      currentDefaults.map((wallet) =>
        updateWallet(wallet.id, user.id, {
          is_default: false,
        }),
      ),
    );
  };

  const handleSaveWallet = async () => {
    if (!user) return;

    if (!walletForm.name.trim()) {
      window.alert("Nama dompet wajib diisi.");
      return;
    }

    if (!walletForm.type) {
      window.alert("Pilih jenis dompet terlebih dahulu.");
      return;
    }

    setWalletSaving(true);

    try {
      const normalizedType = walletForm.type as DbWallet["type"];
      const payload = {
        name: walletForm.name.trim(),
        type: normalizedType,
        balance: Number(walletForm.balance || 0),
        currency: profile?.currency || "IDR",
        color: walletForm.color || WALLET_COLOR_BY_TYPE[normalizedType],
        icon: walletForm.icon || "wallet",
        is_default: walletForm.isDefault,
      };

      if (editingWallet) {
        const updated = await updateWallet(editingWallet.id, user.id, payload);

        if (payload.is_default) {
          await enforceSingleDefaultWallet(updated.id);
        }
      } else {
        const created = await createWallet({
          user_id: user.id,
          ...payload,
        });

        if (payload.is_default) {
          await enforceSingleDefaultWallet(created.id);
        }
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
    } finally {
      setProfileSaving(false);
    }
  };

  const handleExportBackup = async () => {
    if (!user) return;

    setExportingBackup(true);

    try {
      const backup = await exportUserBackup(user.id);
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const dateTag = new Date().toISOString().replace(/[:.]/g, "-");
      anchor.href = url;
      anchor.download = `fintrack-backup-${dateTag}.json`;
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

  const triggerBackupImport = () => {
    backupInputRef.current?.click();
  };

  const handleImportBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !user) return;

    setImportingBackup(true);

    try {
      const rawText = await file.text();
      const parsed = JSON.parse(rawText);

      if (!window.confirm("Import backup akan menimpa SEMUA data sekarang. Lanjut?")) {
        return;
      }

      const summary = await importUserBackup(user.id, parsed, { wipeExisting: true });
      await loadWallets();

      window.alert(
        `Restore kelar ✅\nWallet: ${summary.wallets}\nTransaksi: ${summary.transactions}\nBudget: ${summary.budgets}\nInvestasi: ${summary.investments}\nUtang/Piutang: ${summary.debts}`,
      );
    } catch (error: any) {
      window.alert(error?.message || "Import backup gagal.");
    } finally {
      setImportingBackup(false);
    }
  };

  const handleClearAllData = async () => {
    if (!user) return;

    const confirmation = window.prompt('Ketik "HAPUS" buat konfirmasi hapus semua data:');
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
      window.alert("Instalasi dibatalkan. Anda dapat mencobanya kembali kapan saja.");
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Pengaturan</h1>
          <p className="text-sm text-muted-foreground">Kelola akun, dompet, backup, dan install PWA dari sini.</p>
        </div>

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
              <Button variant="outline" size="sm" onClick={() => setEditProfile(true)}>
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Nama Lengkap</Label>
                <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{profile?.full_name || "-"}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Email</Label>
                <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{profile?.email}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Mata Uang</Label>
                <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span>{profile?.currency || "IDR"} - Rupiah Indonesia</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Bahasa</Label>
                <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span>{profile?.locale || "id-ID"}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Palette className="h-5 w-5" />
              Tampilan
            </CardTitle>
            <CardDescription>Sesuaikan tema aplikasi</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Tema</Label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setTheme("light")}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                    theme === "light" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <Sun className="h-6 w-6" />
                  <span className="text-sm font-medium">Light</span>
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                    theme === "dark" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <Moon className="h-6 w-6" />
                  <span className="text-sm font-medium">Dark</span>
                </button>
                <button
                  onClick={() => setTheme("system")}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                    theme === "system" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <Monitor className="h-6 w-6" />
                  <span className="text-sm font-medium">System</span>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card id="wallets">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Wallet className="h-5 w-5" />
                  Dompet
                </CardTitle>
                <CardDescription>Kelola rekening dan dompet yang terhubung dengan akun Anda.</CardDescription>
              </div>
              <Button size="sm" onClick={openCreateWalletModal}>
                <Plus className="mr-2 h-4 w-4" />
                Tambah
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">Jumlah dompet</p>
                <p className="mt-1 text-xl font-bold">{wallets.length}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">Total saldo</p>
                <p className="mt-1 text-xl font-bold">{formatCurrency(totalWalletBalance, profile?.currency || "IDR")}</p>
              </div>
            </div>

            {walletsLoading ? (
              <div className="flex items-center justify-center rounded-xl border border-border p-8 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Memuat dompet...
              </div>
            ) : walletError ? (
              <p className="rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-200">{walletError}</p>
            ) : wallets.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center">
                <p className="text-base font-semibold">Belum ada dompet</p>
                <p className="mt-2 text-sm text-muted-foreground">Tambahkan dompet pertama untuk mulai menggunakan fitur transaksi.</p>
              </div>
            ) : (
              wallets.map((wallet) => (
                <div key={wallet.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 p-3">
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
                        <p className="truncate font-medium">{wallet.name}</p>
                        {wallet.is_default && <Badge variant="outline">Default</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{WALLET_LABELS[wallet.type]}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-semibold ${Number(wallet.balance) < 0 ? "text-rose-600" : ""}`}>
                      {formatCurrency(Number(wallet.balance), wallet.currency || profile?.currency || "IDR")}
                    </p>
                    <Button size="icon" variant="outline" className="h-9 w-9 rounded-xl" onClick={() => openEditWalletModal(wallet)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-9 w-9 rounded-xl text-rose-600 hover:text-rose-600"
                      onClick={() => handleDeleteWallet(wallet)}
                      disabled={deletingWalletId === wallet.id}
                    >
                      {deletingWalletId === wallet.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Download className="h-5 w-5" />
              Kelola Data
            </CardTitle>
            <CardDescription>Backup dan pemulihan data akun melalui file JSON.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
              <div className="flex items-center gap-3">
                <Download className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Export Backup JSON</p>
                  <p className="text-xs text-muted-foreground">Simpan seluruh data akun sebagai backup lokal.</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleExportBackup} disabled={exportingBackup || !user}>
                {exportingBackup ? <Loader2 className="h-4 w-4 animate-spin" /> : "Export"}
              </Button>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
              <div className="flex items-center gap-3">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Import Backup JSON</p>
                  <p className="text-xs text-muted-foreground">Restore backup (akan overwrite data yang sekarang).</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={triggerBackupImport} disabled={importingBackup || !user}>
                {importingBackup ? <Loader2 className="h-4 w-4 animate-spin" /> : "Import"}
              </Button>
            </div>

            <input ref={backupInputRef} type="file" accept="application/json" className="hidden" onChange={handleImportBackup} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Smartphone className="h-5 w-5" />
              Aplikasi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Versi App</p>
                <p className="text-xs text-muted-foreground">1.1.0</p>
              </div>
              <Badge>Latest</Badge>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">Status PWA</p>
                <p className="text-xs text-muted-foreground">
                  {isInstalled
                    ? "Aplikasi sudah terpasang di perangkat ini."
                    : "Belum ter-install. Bisa dipasang ke home screen."}
                </p>
              </div>
              <Badge variant={isInstalled ? "default" : "outline"} className={isInstalled ? "bg-emerald-600 text-white" : ""}>
                {isInstalled ? "Terpasang" : "Siap Install"}
              </Badge>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
              <p>
                Android: klik tombol install di bawah. iPhone/iPad: buka menu Share di Safari lalu pilih
                <span className="font-medium"> Add to Home Screen</span>.
              </p>
            </div>

            <Button onClick={handleInstallPWA} disabled={!canInstall || isInstalling || isInstalled} className="w-full">
              {isInstalling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memproses instalasi...
                </>
              ) : isInstalled ? (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Sudah Terpasang
                </>
              ) : canInstall ? (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Install Aplikasi
                </>
              ) : (
                "Tunggu prompt install dari browser"
              )}
            </Button>
          </CardContent>
        </Card>

        <Card id="account-management" className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-destructive">
              <Shield className="h-5 w-5" />
              Zona Berbahaya
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-destructive/5 p-3">
              <div className="flex items-center gap-3">
                <Trash2 className="h-5 w-5 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">Hapus Semua Data</p>
                  <p className="text-xs text-muted-foreground">Aksi ini permanen dan tidak bisa di-undo.</p>
                </div>
              </div>
              <Button variant="destructive" size="sm" onClick={handleClearAllData} disabled={clearingData || !user}>
                {clearingData ? <Loader2 className="h-4 w-4 animate-spin" /> : "Hapus"}
              </Button>
            </div>

            <Button variant="outline" className="w-full border-destructive/50 text-destructive hover:bg-destructive/5" onClick={() => signOut()}>
              <LogOut className="mr-2 h-4 w-4" />
              Keluar dari Akun
            </Button>
          </CardContent>
        </Card>

        <Dialog open={editProfile} onOpenChange={setEditProfile}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Profil</DialogTitle>
              <DialogDescription>Perbarui informasi profil Anda.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nama Lengkap</Label>
                <Input
                  value={profileForm.full_name}
                  onChange={(event) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      full_name: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Mata Uang</Label>
                <Select value={profileForm.currency} onValueChange={(value) => setProfileForm((prev) => ({ ...prev, currency: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IDR">IDR - Rupiah Indonesia</SelectItem>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Locale</Label>
                <Select value={profileForm.locale} onValueChange={(value) => setProfileForm((prev) => ({ ...prev, locale: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="id-ID">Indonesia (id-ID)</SelectItem>
                    <SelectItem value="en-US">English (en-US)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditProfile(false)}>
                Batal
              </Button>
              <Button onClick={handleSaveProfile} disabled={profileSaving}>
                {profileSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showWalletModal} onOpenChange={setShowWalletModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingWallet ? "Edit Dompet" : "Tambah Dompet"}</DialogTitle>
              <DialogDescription>Simpan dompet atau rekening agar transaksi tercatat sesuai akun Anda.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nama Dompet</Label>
                <Input
                  placeholder="Contoh: BCA Utama, GoPay"
                  value={walletForm.name}
                  onChange={(event) => setWalletForm((prev) => ({ ...prev, name: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Jenis</Label>
                <Select
                  value={walletForm.type}
                  onValueChange={(value: DbWallet["type"]) =>
                    setWalletForm((prev) => ({
                      ...prev,
                      type: value,
                      color: WALLET_COLOR_BY_TYPE[value],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jenis" />
                  </SelectTrigger>
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
                <Input
                  type="number"
                  placeholder="0"
                  value={walletForm.balance}
                  onChange={(event) => setWalletForm((prev) => ({ ...prev, balance: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Ikon</Label>
                <Select value={walletForm.icon} onValueChange={(value) => setWalletForm((prev) => ({ ...prev, icon: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WALLET_ICON_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.preview} {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Warna</Label>
                <div className="flex flex-wrap gap-2">
                  {WALLET_COLOR_PRESETS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setWalletForm((prev) => ({ ...prev, color }))}
                      className={`h-8 w-8 rounded-full border-2 ${walletForm.color === color ? "border-foreground" : "border-transparent"}`}
                      style={{ backgroundColor: color }}
                      aria-label={`Pilih warna ${color}`}
                    />
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={walletForm.isDefault}
                  onChange={(event) => setWalletForm((prev) => ({ ...prev, isDefault: event.target.checked }))}
                />
                Jadikan dompet default
              </label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowWalletModal(false)}>
                Batal
              </Button>
              <Button onClick={handleSaveWallet} disabled={walletSaving}>
                {walletSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
