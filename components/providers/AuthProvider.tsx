"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { usePathname, useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";

type Role = "super_admin" | "pengelola_tps3r" | "pengelola_sampah" | null;

interface AuthContextType {
  user: User | null;
  role: Role;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);
  
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    async function loadUser() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUser(session.user);
        // Fetch role from profiles table
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();
          
        if (profile) setRole(profile.role as Role);
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    }

    loadUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();
        if (profile) setRole(profile.role as Role);
      } else {
        setUser(null);
        setRole(null);
        if (pathname !== "/login" && pathname !== "/publik" && pathname !== "/") {
          router.push("/login");
        }
      }
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [pathname, router]);

  // Route protection
  useEffect(() => {
    if (!loading) {
      if (!user && pathname !== "/login" && pathname !== "/publik" && pathname !== "/") {
        router.push("/login");
      }
      if (user && pathname === "/login") {
        if (role === "pengelola_sampah") {
          router.push("/pengumpulan");
        } else {
          router.push("/dashboard");
        }
      }
    }
  }, [user, role, loading, pathname, router]);

  async function logout() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
  }

  // Optional global loading state
  if (loading && pathname !== "/publik" && pathname !== "/login" && pathname !== "/") {
    return (
      <div style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", color: "var(--teal)", fontFamily: "var(--font-display)" }}>
        <h2>Memuat sesi...</h2>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
