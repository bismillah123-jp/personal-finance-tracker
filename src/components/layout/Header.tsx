"use client";

import { Bell, Plus, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/components/providers";

export function Header() {
  const { profile } = useAuth();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="flex items-center justify-between px-4 lg:px-6 py-3">
        {/* Mobile Logo */}
        <div className="flex items-center gap-2 lg:hidden">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <span className="text-white text-xs font-extrabold">FD</span>
          </div>
          <span className="text-lg font-bold">Fintrack</span>
        </div>

        {/* Desktop - hidden on mobile */}
        <div className="hidden lg:block" />

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="icon" className="rounded-xl relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
          </Button>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-xs font-bold shadow-md ml-1">
            {profile?.full_name ? getInitials(profile.full_name) : profile?.email?.[0]?.toUpperCase() || "U"}
          </div>
        </div>
      </div>
    </header>
  );
}
