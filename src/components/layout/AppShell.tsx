"use client";

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
          {children}
        </main>
      </div>
    </div>
  );
}
