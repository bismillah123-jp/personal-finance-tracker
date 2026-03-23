"use client";

import * as React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import {
  supabase,
  Profile,
  isSupabaseConfigured,
  prefetchUserAppData,
  supabaseConfigMessage,
} from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { getCurrentMonth } from "@/lib/utils";

// ============================================================
// THEME CONTEXT
// ============================================================

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark";
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = React.useState<"light" | "dark">("light");

  React.useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    if (stored) setThemeState(stored);
  }, []);

  React.useEffect(() => {
    const root = document.documentElement;
    const resolved = theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      : theme;
    setResolvedTheme(resolved);
    root.classList.toggle("dark", resolved === "dark");
  }, [theme]);

  const setTheme = React.useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem("theme", t);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

// ============================================================
// AUTH CONTEXT
// ============================================================

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const demoTimestamp = new Date().toISOString();
const DEMO_PROFILE: Profile = {
  id: "demo-user",
  email: "demo@local",
  full_name: "Demo User",
  currency: "IDR",
  locale: "id-ID",
  theme: "system",
  created_at: demoTimestamp,
  updated_at: demoTimestamp,
};

const createSupabaseDisabledError = () =>
  new Error(
    "Supabase belum dikonfigurasi. Lengkapi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY terlebih dahulu."
  );

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!isSupabaseConfigured) {
      console.warn(supabaseConfigMessage);
      setUser(null);
      setSession(null);
      setProfile(DEMO_PROFILE);
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }

        const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
        const isAuthRoute = currentPath.startsWith("/auth");

        if (event === "SIGNED_OUT") {
          router.push("/auth/login");
        } else if (!session && !isAuthRoute) {
          router.push("/auth/login");
        }

        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user || !isSupabaseConfigured) return;

    const month = getCurrentMonth();
    const routesToPrefetch = [
      "/dashboard",
      "/transactions",
      "/budgeting",
      "/investments",
      "/debts",
      "/settings",
    ];

    routesToPrefetch.forEach((route) => {
      router.prefetch(route);
    });

    prefetchUserAppData(user.id, month).catch((error) => {
      console.error("Failed to prefetch app data", error);
    });
  }, [router, user]);

  const fetchProfile = async (userId: string) => {
    if (!isSupabaseConfigured) {
      setProfile(DEMO_PROFILE);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      
      if (error && error.code === "PGRST116") {
        const { data: newProfile } = await supabase
          .from("profiles")
          .insert({ id: userId, email: user?.email ?? "" })
          .select()
          .single();
        setProfile(newProfile);
      } else if (!error) {
        setProfile(data);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { error: createSupabaseDisabledError() };
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    if (!isSupabaseConfigured) {
      return { error: createSupabaseDisabledError() };
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    });
    return { error };
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) {
      setUser(null);
      setSession(null);
      setProfile(DEMO_PROFILE);
      router.push("/auth/login");
      return;
    }

    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  const updateProfileHandler = async (updates: Partial<Profile>) => {
    if (!isSupabaseConfigured) {
      setProfile(prev =>
        prev
          ? { ...prev, ...updates, updated_at: new Date().toISOString() }
          : { ...DEMO_PROFILE, ...updates, updated_at: new Date().toISOString() }
      );
      return { error: null };
    }

    if (!user) return { error: new Error("User not found") };
    
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id);
    
    if (!error) {
      setProfile(prev => prev ? { ...prev, ...updates } : null);
    }
    
    return { error };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        updateProfile: updateProfileHandler
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

// ============================================================
// AUTH GUARD
// ============================================================

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
