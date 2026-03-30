import { AuthGuard } from "@/components/providers";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";
import { Sidebar } from "./Sidebar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex">
        <Sidebar />
      </div>

      {/* Mobile bottom nav */}
      <MobileNav />

      {/* Main content */}
      <div className="lg:pl-64 pb-24 lg:pb-0 min-w-0">
        <Header />
        <main className="min-w-0 px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
          {!isSupabaseConfigured && (
            <div className="mb-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-sm leading-relaxed text-amber-800 dark:text-amber-200">
              Mode demo aktif — lengkapi{" "}
              <code className="font-mono text-xs">VITE_SUPABASE_URL</code> dan{" "}
              <code className="font-mono text-xs">VITE_SUPABASE_ANON_KEY</code>{" "}
              untuk koneksi Supabase.
            </div>
          )}
          <AuthGuard>{children}</AuthGuard>
        </main>
      </div>
    </div>
  );
}
