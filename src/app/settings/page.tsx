"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/components/providers";
import { useAuth } from "@/components/providers";
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
  Bell,
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
} from "lucide-react";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { profile, updateProfile, signOut } = useAuth();
  const [showAddWalletModal, setShowAddWalletModal] = useState(false);
  const [newWallet, setNewWallet] = useState({ name: "", type: "", balance: "" });
  const [editProfile, setEditProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: profile?.full_name || "",
    currency: profile?.currency || "IDR",
    locale: profile?.locale || "id-ID",
  });

  const MOCK_WALLETS = [
    { id: "w1", name: "BCA Utama", type: "bank", balance: 12_500_000, color: "#2563EB" },
    { id: "w2", name: "GoPay", type: "e-wallet", balance: 850_000, color: "#10B981" },
    { id: "w3", name: "Tunai", type: "cash", balance: 300_000, color: "#F59E0B" },
    { id: "w4", name: "BCA Credit", type: "credit-card", balance: -2_100_000, color: "#EF4444" },
  ];

  const handleSaveProfile = async () => {
    await updateProfile(profileForm);
    setEditProfile(false);
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Pengaturan</h1>
          <p className="text-sm text-muted-foreground">Kelola akun dan preferensi Anda</p>
        </div>

        {/* Profile Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-lg font-bold">
                  {profile?.full_name?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || "U"}
                </div>
                <div>
                  <CardTitle className="text-lg">{profile?.full_name || "User"}</CardTitle>
                  <CardDescription>{profile?.email}</CardDescription>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setEditProfile(true)}>
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Nama Lengkap</Label>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span>{profile?.full_name || "-"}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Email</Label>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{profile?.email}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Mata Uang</Label>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <span>{profile?.currency || "IDR"} - Rupiah Indonesia</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Bahasa</Label>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <span>Indonesia (ID)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appearance Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Tampilan
            </CardTitle>
            <CardDescription>Sesuaikan tampilan aplikasi</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Tema</Label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setTheme("light")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    theme === "light" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <Sun className="w-6 h-6" />
                  <span className="text-sm font-medium">Light</span>
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    theme === "dark" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <Moon className="w-6 h-6" />
                  <span className="text-sm font-medium">Dark</span>
                </button>
                <button
                  onClick={() => setTheme("system")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    theme === "system" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <Monitor className="w-6 h-6" />
                  <span className="text-sm font-medium">System</span>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Wallets Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  Dompet
                </CardTitle>
                <CardDescription>Kelola dompet dan rekening Anda</CardDescription>
              </div>
              <Button size="sm" onClick={() => setShowAddWalletModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Tambah
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {MOCK_WALLETS.map((wallet) => (
              <div key={wallet.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: wallet.color + "20" }}>
                    <CreditCard className="w-5 h-5" style={{ color: wallet.color }} />
                  </div>
                  <div>
                    <p className="font-medium">{wallet.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{wallet.type.replace("-", " ")}</p>
                  </div>
                </div>
                <p className={`font-semibold ${wallet.balance < 0 ? "text-rose-600" : ""}`}>
                  Rp {(wallet.balance / 1000).toFixed(0)}K
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Download className="w-5 h-5" />
              Kelola Data
            </CardTitle>
            <CardDescription>Export dan import data Anda</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
              <div className="flex items-center gap-3">
                <Download className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Export Data</p>
                  <p className="text-xs text-muted-foreground">Download laporan dalam format PDF atau CSV</p>
                </div>
              </div>
              <Button variant="outline" size="sm">Export</Button>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
              <div className="flex items-center gap-3">
                <Upload className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Import Data</p>
                  <p className="text-xs text-muted-foreground">Import data dari file CSV</p>
                </div>
              </div>
              <Button variant="outline" size="sm">Import</Button>
            </div>
          </CardContent>
        </Card>

        {/* App Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Aplikasi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Versi App</p>
                <p className="text-xs text-muted-foreground">1.0.0 (Build 1)</p>
              </div>
              <Badge>Latest</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">PWA Mode</p>
                <p className="text-xs text-muted-foreground">Aktif - dapat digunakan offline</p>
              </div>
              <Badge variant="outline" className="text-emerald-500 border-emerald-500">Aktif</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-destructive">
              <Shield className="w-5 h-5" />
              Zona Berbahaya
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-destructive/5">
              <div className="flex items-center gap-3">
                <Trash2 className="w-5 h-5 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">Hapus Semua Data</p>
                  <p className="text-xs text-muted-foreground">Data tidak dapat dikembalikan</p>
                </div>
              </div>
              <Button variant="destructive" size="sm">Hapus</Button>
            </div>
            <Button variant="outline" className="w-full text-destructive border-destructive/50 hover:bg-destructive/5" onClick={() => signOut()}>
              <LogOut className="w-4 h-4 mr-2" />
              Keluar dari Akun
            </Button>
          </CardContent>
        </Card>

        {/* Edit Profile Modal */}
        <Dialog open={editProfile} onOpenChange={setEditProfile}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Profil</DialogTitle>
              <DialogDescription>Ubah informasi profil Anda</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nama Lengkap</Label>
                <Input
                  value={profileForm.full_name}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, full_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Mata Uang</Label>
                <Select value={profileForm.currency} onValueChange={(v) => setProfileForm(prev => ({ ...prev, currency: v }))}>
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
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditProfile(false)}>Batal</Button>
              <Button onClick={handleSaveProfile}>Simpan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Wallet Modal */}
        <Dialog open={showAddWalletModal} onOpenChange={setShowAddWalletModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Dompet Baru</DialogTitle>
              <DialogDescription>Tambahkan dompet atau rekening baru</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nama Dompet</Label>
                <Input
                  placeholder="Contoh: BCA Utama, GoPay"
                  value={newWallet.name}
                  onChange={(e) => setNewWallet(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Jenis</Label>
                <Select value={newWallet.type} onValueChange={(v) => setNewWallet(prev => ({ ...prev, type: v }))}>
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
                  value={newWallet.balance}
                  onChange={(e) => setNewWallet(prev => ({ ...prev, balance: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddWalletModal(false)}>Batal</Button>
              <Button onClick={() => setShowAddWalletModal(false)}>Simpan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
