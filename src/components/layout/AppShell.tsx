"use client";

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
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex">
        <Sidebar />
      </div>

      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
        <MobileNav />
      </div>

      <div className="lg:pl-64 pb-24 lg:pb-0 min-w-0">
        <Header />
        <main className="min-w-0 p-4 sm:p-5 lg:p-6">
          {!isSupabaseConfigured && (
            <div className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed text-amber-800 dark:text-amber-200">
              Mode demo aktif — lengkapi <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> dan <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> di <code className="font-mono">.env.local</code> untuk mengaktifkan login dan sinkronisasi data.
            </div>
          )}

          <AuthGuard>{children}</AuthGuard>
        </main>
      </div>
    </div>
  );
}
