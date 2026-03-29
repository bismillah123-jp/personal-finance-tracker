import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, User, Check, X, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/providers";
import { isSupabaseConfigured } from "@/lib/supabase";
import { AuthShell } from "@/components/auth/auth-shell";

const REQS = [
  { test: (p: string) => p.length >= 8, label: "Minimal 8 karakter" },
  { test: (p: string) => /[A-Z]/.test(p), label: "1 huruf kapital" },
  { test: (p: string) => /[a-z]/.test(p), label: "1 huruf kecil" },
  { test: (p: string) => /[0-9]/.test(p), label: "1 angka" },
];

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { setMounted(true); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!isSupabaseConfigured) { setError("Supabase belum dikonfigurasi."); return; }
    if (password !== confirmPassword) { setError("Password tidak cocok."); return; }
    if (!REQS.every(r => r.test(password))) { setError("Password tidak memenuhi syarat."); return; }

    setLoading(true);
    const { error } = await signUp(email, password, fullName);
    if (error) { setError(error.message); setLoading(false); }
    else { navigate("/auth/login?registered=true"); }
  };

  return (
    <AuthShell title="Buat akun baru" subtitle="Gratis selamanya, mulai sekarang">
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
          <Label htmlFor="fullName" className="text-sm font-medium">Nama Lengkap</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input id="fullName" type="text" placeholder="Nama kamu"
              value={fullName} onChange={(e) => setFullName(e.target.value)} required
              className="pl-10 h-11 rounded-xl" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-medium">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input id="email" type="email" placeholder="nama@email.com"
              value={email} onChange={(e) => setEmail(e.target.value)} required
              className="pl-10 h-11 rounded-xl" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-sm font-medium">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input id="password" type={showPassword ? "text" : "password"} placeholder="Buat password kuat"
              value={password} onChange={(e) => setPassword(e.target.value)} required
              className="pl-10 pr-10 h-11 rounded-xl" />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {password && (
            <div className="grid grid-cols-2 gap-1 pt-1">
              {REQS.map((r, i) => {
                const ok = r.test(password);
                return (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    {ok
                      ? <Check className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                      : <X className="h-3 w-3 text-muted-foreground/40 flex-shrink-0" />}
                    <span className={ok ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/60"}>
                      {r.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword" className="text-sm font-medium">Konfirmasi Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input id="confirmPassword" type={showPassword ? "text" : "password"} placeholder="Ulangi password"
              value={confirmPassword} onChange={(e) => setConfirm(e.target.value)} required
              className={`pl-10 h-11 rounded-xl transition-colors ${
                confirmPassword && password !== confirmPassword
                  ? "border-red-400 focus:border-red-400"
                  : confirmPassword && password === confirmPassword
                  ? "border-emerald-400 focus:border-emerald-400"
                  : ""
              }`} />
            {confirmPassword && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {password === confirmPassword
                  ? <Check className="h-4 w-4 text-emerald-500" />
                  : <X className="h-4 w-4 text-red-400" />}
              </div>
            )}
          </div>
        </div>

        <button type="submit"
          disabled={loading || (mounted && !isSupabaseConfigured)}
          className="w-full h-11 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2
                     bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700
                     shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/30
                     disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all duration-200
                     relative overflow-hidden group">
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent
                           -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          {loading
            ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Membuat akun...</>
            : <>Daftar Sekarang <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" /></>
          }
        </button>
      </form>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">atau</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Sudah punya akun?{" "}
        <Link to="/auth/login" className="text-primary font-semibold hover:text-primary/80 transition-colors">
          Masuk
        </Link>
      </p>
    </AuthShell>
  );
}
