"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isSupabaseConfigured, requestPasswordReset } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!isSupabaseConfigured) {
      setError("Supabase belum dikonfigurasi. Lengkapi variabel lingkungan Supabase terlebih dahulu.");
      return;
    }

    setLoading(true);

    try {
      await requestPasswordReset(email);
      setSuccess("Tautan reset password telah dikirim. Silakan periksa inbox atau folder spam email Anda.");
    } catch (submitError: any) {
      setError(submitError?.message || "Gagal kirim reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 p-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md items-center justify-center">
        <Card className="w-full border-0 bg-card/80 shadow-xl backdrop-blur">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
                <Wallet className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">Reset Password</CardTitle>
                <CardDescription>FinTrack</CardDescription>
              </div>
            </div>
            <CardDescription>
              Masukkan email akun Anda. Kami akan mengirimkan tautan untuk membuat password baru.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-200">{error}</p>}
              {success && (
                <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-200">
                  {success}
                </p>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="nama@email.com"
                    className="pl-9"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading || !isSupabaseConfigured}>
                {loading ? "Ngirim link..." : "Kirim Link Reset"}
              </Button>
            </form>

            <p className="mt-5 text-center text-sm text-muted-foreground">
              Sudah ingat password? <Link href="/auth/login" className="font-medium text-primary hover:underline">Kembali ke login</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
