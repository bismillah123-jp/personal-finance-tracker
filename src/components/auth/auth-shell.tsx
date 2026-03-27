"use client";

import { ReactNode } from "react";
import { Wallet } from "lucide-react";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative bg-background">

      {/* ── Soft blobs ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-32 w-80 h-80 rounded-full bg-blue-200/50 dark:bg-blue-700/15 blur-[120px] animate-pulse" style={{ animationDuration: "6s" }} />
        <div className="absolute -bottom-40 -left-32 w-80 h-80 rounded-full bg-violet-200/50 dark:bg-violet-700/15 blur-[120px] animate-pulse" style={{ animationDuration: "7s", animationDelay: "1s" }} />
        {/* dot grid */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
      </div>

      <div className="relative z-10 w-full max-w-[400px] space-y-6">

        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-md shadow-blue-500/20">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight">FinTrack</span>
            <span className="ml-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30">Pro</span>
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-xl p-6 space-y-5 shadow-lg dark:shadow-black/20">
          {children}
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-muted-foreground/60">
          © 2025 FinTrack · Kelola keuangan dengan bijak
        </p>
      </div>
    </div>
  );
}
