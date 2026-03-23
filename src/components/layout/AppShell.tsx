"use client";

import { isSupabaseConfigured } from "@/lib/supabase";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex">
        <Sidebar />
      </div>

      {/* Mobile Bottom Nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
        <MobileNav />
      </div>

      {/* Main Content */}
      <div className="lg:pl-64 pb-20 lg:pb-0">
        <Header />
        <main className="p-4 lg:p-6">
          {!isSupabaseConfigured && (
            <div className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
              Demo mode aktif — isi <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> dan <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> di <code className="font-mono">.env.local</code> buat ngaktifin login dan sinkronisasi data.
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
