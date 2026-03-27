"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isSupabaseConfigured, requestPasswordReset } from "@/lib/supabase";
import { AuthShell } from "@/components/auth/auth-shell";

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!isSupabaseConfigured) {
      setError("Supabase belum dikonfigurasi.");
      return;
    }
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal mengirim link reset.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={success ? "Email terkirim!" : "Reset password"}
      subtitle={success ? `Link reset dikirim ke ${email}` : "Masukkan email untuk reset password"}
    >
      {success ? (
        /* ── Success state ── */
        <div className="space-y-5 text-center">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Cek inbox atau folder spam kamu. Link reset password aktif selama <strong className="text-foreground">1 jam</strong>.
          </p>
          <button
            onClick={() => { setSuccess(false); setEmail(""); }}
            className="w-full h-10 rounded-xl text-sm font-medium border border-border
                       hover:bg-muted transition-colors text-muted-foreground">
            Kirim ulang ke email lain
          </button>
          <Link href="/auth/login"
            className="flex items-center justify-center gap-2 text-sm text-primary font-semibold hover:text-primary/80 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali ke login
          </Link>
        </div>
      ) : (
        /* ── Form state ── */
        <>
          {mounted && !isSupabaseConfigured && (
            <div className="px-3 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
              Mode demo aktif — env Supabase belum diisi.
            </div>
          )}
          {error && (
            <div className="px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input id="email" type="email" placeholder="nama@email.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} required
                  className="pl-10 h-11 rounded-xl" />
              </div>
            </div>

            <button type="submit"
              disabled={loading || (mounted && !isSupabaseConfigured)}
              className="w-full h-11 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2
                         bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700
                         shadow-md shadow-blue-500/20 hover:shadow-blue-500/30
                         disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all duration-200
                         relative overflow-hidden group">
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent
                               -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              {loading
                ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Mengirim...</>
                : "Kirim Link Reset"
              }
            </button>
          </form>

          <Link href="/auth/login"
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali ke login
          </Link>
        </>
      )}
    </AuthShell>
  );
}
