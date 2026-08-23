import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { loginServerFn, registerServerFn, logoutServerFn, getMeServerFn } from "@/lib/auth/auth.functions";
import type { UserProfile } from "@/lib/auth/service.server";

export type Profile = UserProfile;

export type AuthUser = {
  id: string;
  email: string;
  role?: string;
  user_metadata?: {
    username?: string;
    full_name?: string;
    is_admin?: boolean;
  };
};

type AuthContextValue = {
  session: { user: AuthUser } | null;
  user: AuthUser | null;
  profile: Profile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username?: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCurrentAuth = async () => {
    try {
      const res = await getMeServerFn();
      if (res?.profile) {
        setProfile(res.profile);
        setUser({
          id: res.profile.id,
          email: res.profile.email,
          role: res.profile.role,
          user_metadata: {
            username: res.profile.username ?? undefined,
            full_name: res.profile.full_name ?? undefined,
            is_admin: res.profile.role === "admin",
          },
        });
      } else {
        setUser(null);
        setProfile(null);
      }
    } catch {
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCurrentAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const result = await loginServerFn({ data: { email, password } });
    if (result?.profile) {
      setProfile(result.profile);
      setUser({
        id: result.profile.id,
        email: result.profile.email,
        role: result.profile.role,
        user_metadata: {
          username: result.profile.username ?? undefined,
          full_name: result.profile.full_name ?? undefined,
          is_admin: result.profile.role === "admin",
        },
      });
    }
  };

  const register = async (email: string, password: string, username?: string, fullName?: string) => {
    const result = await registerServerFn({ data: { email, password, username, fullName } });
    if (result?.profile) {
      setProfile(result.profile);
      setUser({
        id: result.profile.id,
        email: result.profile.email,
        role: result.profile.role,
        user_metadata: {
          username: result.profile.username ?? undefined,
          full_name: result.profile.full_name ?? undefined,
          is_admin: result.profile.role === "admin",
        },
      });
    }
  };

  const logout = async () => {
    try {
      await logoutServerFn();
    } finally {
      setUser(null);
      setProfile(null);
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      session: user ? { user } : null,
      user,
      profile,
      loading,
      login,
      register,
      logout,
      refreshProfile: loadCurrentAuth,
    }),
    [user, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
