"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Wallet, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/providers";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const router = useRouter();

  const passwordRequirements = [
    { test: password.length >= 8, label: "Minimal 8 karakter" },
    { test: /[A-Z]/.test(password), label: "Setidaknya 1 huruf besar" },
    { test: /[a-z]/.test(password), label: "Setidaknya 1 huruf kecil" },
    { test: /[0-9]/.test(password), label: "Setidaknya 1 angka" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Password tidak cocok");
      return;
    }

    if (!passwordRequirements.every(r => r.test)) {
      setError("Password tidak memenuhi persyaratan");
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password, fullName);
    
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/auth/login?registered=true");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/30">
      {/* Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 p-6">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <Wallet className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">FinTrack</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          {/* Hero Text */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Buat Akun Baru</h1>
            <p className="text-muted-foreground">Mulai kelola keuangan Anda dengan lebih bijak</p>
          </div>

          {/* Register Form */}
          <Card className="border-0 shadow-xl bg-card/80 backdrop-blur">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl">Daftar</CardTitle>
              <CardDescription>
                Lengkapi data di bawah untuk membuat akun
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="fullName">Nama Lengkap</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Masukkan nama lengkap"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="nama@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Buat password kuat"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  
                  {/* Password Requirements */}
                  {password && (
                    <div className="space-y-1 mt-2">
                      {passwordRequirements.map((req, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          {req.test ? (
                            <Check className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <X className="h-3 w-3 text-muted-foreground/50" />
                          )}
                          <span className={req.test ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/70"}>
                            {req.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Ulangi password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="h-11"
                  />
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-destructive">Password tidak cocok</p>
                  )}
                </div>

                <Button type="submit" className="w-full h-11" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Membuat akun...
                    </span>
                  ) : (
                    "Daftar"
                  )}
                </Button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">atau</span>
                </div>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                Sudah punya akun?{" "}
                <Link href="/auth/login" className="text-primary font-medium hover:underline">
                  Masuk
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 p-6 text-center text-xs text-muted-foreground">
        Dengan daftar, Anda menyetujui{" "}
        <Link href="#" className="text-primary hover:underline">Syarat & Ketentuan</Link>
        {" "}dan{" "}
        <Link href="#" className="text-primary hover:underline">Kebijakan Privasi</Link>
      </footer>
    </div>
  );
}
