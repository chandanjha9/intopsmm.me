import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  loginServerFn,
  registerServerFn,
  logoutServerFn,
  getMeServerFn,
  googleAuthServerFn,
} from "@/lib/auth/auth.functions";
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
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function profileToAuthUser(profile: UserProfile): AuthUser {
  return {
    id: profile.id,
    email: profile.email,
    role: profile.role,
    user_metadata: {
      username: profile.username ?? undefined,
      full_name: profile.full_name ?? undefined,
      is_admin: profile.role === "admin",
    },
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCurrentAuth = async () => {
    try {
      const res = await getMeServerFn();
      if (res?.profile) {
        setProfile(res.profile);
        setUser(profileToAuthUser(res.profile));
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
      setUser(profileToAuthUser(result.profile));
    }
  };

  const register = async (email: string, password: string, username?: string, fullName?: string) => {
    const result = await registerServerFn({ data: { email, password, username, fullName } });
    if (result?.profile) {
      setProfile(result.profile);
      setUser(profileToAuthUser(result.profile));
    }
  };

  const loginWithGoogle = async () => {
    // Lazy-load Firebase so the bundle only pulls it in when Google sign-in is used
    const { getFirebaseAuth, GoogleAuthProvider, signInWithPopup } = await import("@/lib/firebase");
    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const credential = await signInWithPopup(auth, provider);

    // Send the signed ID token — the server verifies it with Google.
    const idToken = await credential.user.getIdToken();
    const result = await googleAuthServerFn({ data: { idToken } });

    if (result?.profile) {
      setProfile(result.profile);
      setUser(profileToAuthUser(result.profile));
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
      loginWithGoogle,
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
