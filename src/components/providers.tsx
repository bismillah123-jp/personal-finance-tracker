import * as React from "react";
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { User, Session } from "@supabase/supabase-js";
import { useNavigate, useLocation } from "react-router-dom";
import {
  supabase,
  Profile,
  isSupabaseConfigured,
  prefetchUserAppData,
  supabaseConfigMessage,
  clearLocalQueryCache,
} from "@/lib/supabase";
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
    const resolved =
      theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
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
// VISIBILITY HOOK — reconnect on tab focus / online
// ============================================================

export function usePageVisibility(onVisible: () => void) {
  const onVisibleRef = React.useRef(onVisible);
  onVisibleRef.current = onVisible;

  React.useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "visible") {
        onVisibleRef.current();
      }
    };
    document.addEventListener("visibilitychange", handler);
    window.addEventListener("focus", handler);
    window.addEventListener("online", handler);
    return () => {
      document.removeEventListener("visibilitychange", handler);
      window.removeEventListener("focus", handler);
      window.removeEventListener("online", handler);
    };
  }, []);
}

// ============================================================
// AUTH CONTEXT
// ============================================================

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  currency: string;
  locale: string;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  reconnect: () => void;
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
    "Supabase belum dikonfigurasi. Lengkapi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY."
  );

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const currency = profile?.currency || "IDR";
  const locale = profile?.locale || "id-ID";

  const fetchProfile = useCallback(async (userId: string, userEmail?: string) => {
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
          .insert({ id: userId, email: userEmail ?? "" })
          .select()
          .single();
        setProfile(newProfile);
      } else if (!error) {
        setProfile(data);
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Reconnect: clear stale cache + refresh session + re-fetch profile
  const reconnect = useCallback(() => {
    if (!isSupabaseConfigured) return;

    clearLocalQueryCache();

    supabase.auth
      .getSession()
      .then(async ({ data: { session: freshSession } }) => {
        if (freshSession) {
          setSession(freshSession);
          setUser(freshSession.user);
          await fetchProfile(freshSession.user.id, freshSession.user.email);
        } else {
          setUser(null);
          setSession(null);
          setProfile(null);
          const currentPath = location.pathname;
          if (!currentPath.startsWith("/auth")) {
            navigate("/auth/login");
          }
        }
      })
      .catch(async () => {
        await new Promise((r) => setTimeout(r, 1500));
        try {
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (retrySession) {
            setSession(retrySession);
            setUser(retrySession.user);
            await fetchProfile(retrySession.user.id, retrySession.user.email);
          }
        } catch {
          // Silently handle double failure
        }
      });
  }, [navigate, location.pathname, fetchProfile]);

  // Auto-reconnect on tab visibility / focus / online
  usePageVisibility(reconnect);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      console.warn(supabaseConfigMessage);
      setUser(null);
      setSession(null);
      setProfile(DEMO_PROFILE);
      setLoading(false);
      return;
    }

    // Timeout after 5 seconds — prevents infinite spinning on network/CORS issues
    const timeoutId = setTimeout(() => {
      console.warn("[Auth] getSession timed out — showing app anyway");
      setLoading(false);
    }, 5000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeoutId);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email);
      } else {
        setLoading(false);
      }
    }).catch((err) => {
      clearTimeout(timeoutId);
      console.error("[Auth] getSession error:", err);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchProfile(session.user.id, session.user.email);
        } else {
          setProfile(null);
        }

        const currentPath = location.pathname;
        const isAuthRoute = currentPath.startsWith("/auth");

        if (event === "SIGNED_OUT") {
          navigate("/auth/login");
        } else if (!session && !isAuthRoute) {
          navigate("/auth/login");
        }

        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user || !isSupabaseConfigured) return;
    const month = getCurrentMonth();
    prefetchUserAppData(user.id, month).catch((error) => {
      console.error("Failed to prefetch app data", error);
    });
  }, [user]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) return { error: createSupabaseDisabledError() };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    if (!isSupabaseConfigured) return { error: createSupabaseDisabledError() };
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setUser(null);
      setSession(null);
      setProfile(DEMO_PROFILE);
      navigate("/auth/login");
      return;
    }
    await supabase.auth.signOut();
    clearLocalQueryCache();
    navigate("/auth/login");
  }, [navigate]);

  const updateProfileHandler = useCallback(async (updates: Partial<Profile>) => {
    if (!isSupabaseConfigured) {
      setProfile((prev) =>
        prev
          ? { ...prev, ...updates, updated_at: new Date().toISOString() }
          : { ...DEMO_PROFILE, ...updates, updated_at: new Date().toISOString() }
      );
      return { error: null };
    }
    if (!user) return { error: new Error("User not found") };

    const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
    if (!error) {
      setProfile((prev) => (prev ? { ...prev, ...updates } : null));
      clearLocalQueryCache();
    }
    return { error };
  }, [user]);

  const contextValue = useMemo(
    () => ({
      user,
      session,
      profile,
      loading,
      currency,
      locale,
      signIn,
      signUp,
      signOut,
      updateProfile: updateProfileHandler,
      reconnect,
    }),
    [user, session, profile, loading, currency, locale, signIn, signUp, signOut, updateProfileHandler, reconnect]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (ctx === undefined) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

// ============================================================
// AUTH GUARD
// ============================================================

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user && isSupabaseConfigured) {
      navigate("/auth/login", { state: { from: location.pathname } });
    }
  }, [user, loading, navigate, location.pathname]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Memuat FinTrack...</p>
        </div>
      </div>
    );
  }

  if (!user && isSupabaseConfigured) return null;

  return <>{children}</>;
}
