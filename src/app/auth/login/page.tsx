"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Wallet, TrendingUp, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/providers";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await signIn(email, password);
    
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
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
            <h1 className="text-3xl font-bold tracking-tight">Selamat Datang Kembali</h1>
            <p className="text-muted-foreground">Masuk untuk melanjutkan pengelolaan keuangan Anda</p>
          </div>

          {/* Login Form */}
          <Card className="border-0 shadow-xl bg-card/80 backdrop-blur">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl">Masuk</CardTitle>
              <CardDescription>
                Masukkan email dan password Anda
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
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">
                      Lupa password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
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
                </div>

                <Button type="submit" className="w-full h-11" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Memasuki...
                    </span>
                  ) : (
                    "Masuk"
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
                Belum punya akun?{" "}
                <Link href="/auth/register" className="text-primary font-medium hover:underline">
                  Daftar sekarang
                </Link>
              </p>
            </CardContent>
          </Card>

          {/* Features */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-2 p-4 rounded-xl bg-card/50 backdrop-blur">
              <div className="h-10 w-10 mx-auto rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <p className="text-xs font-medium">Track Cash Flow</p>
            </div>
            <div className="space-y-2 p-4 rounded-xl bg-card/50 backdrop-blur">
              <div className="h-10 w-10 mx-auto rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <PiggyBank className="h-5 w-5 text-emerald-500" />
              </div>
              <p className="text-xs font-medium">Budgeting Cerdas</p>
            </div>
            <div className="space-y-2 p-4 rounded-xl bg-card/50 backdrop-blur">
              <div className="h-10 w-10 mx-auto rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-amber-500" />
              </div>
              <p className="text-xs font-medium">Multi Wallet</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 p-6 text-center text-xs text-muted-foreground">
        Dengan masuk, Anda menyetujui{" "}
        <Link href="#" className="text-primary hover:underline">Syarat & Ketentuan</Link>
        {" "}dan{" "}
        <Link href="#" className="text-primary hover:underline">Kebijakan Privasi</Link>
      </footer>
    </div>
  );
}
