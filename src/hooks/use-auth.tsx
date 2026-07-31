import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  wallet_balance: number;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (user: User) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url, wallet_balance")
      .eq("id", user.id)
      .maybeSingle();

    if (data) {
      setProfile(data as Profile);
      return;
    }

    // No profile row yet (e.g. first Google sign-in). Create it from the
    // identity the provider returned so wallet/orders have somewhere to live.
    const meta = (user.user_metadata ?? {}) as Record<string, string | undefined>;
    const emailLocal = (user.email ?? "user").split("@")[0];
    const { data: created } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        username: meta.username ?? `${emailLocal}_${user.id.slice(0, 6)}`,
        full_name: meta.full_name ?? meta.name ?? null,
        avatar_url: meta.avatar_url ?? meta.picture ?? null,
      })
      .select("id, username, full_name, avatar_url, wallet_balance")
      .maybeSingle();

    setProfile((created as Profile | null) ?? null);
  };


  useEffect(() => {
    // Register the listener before the initial read so no event is missed.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user) void loadProfile(nextSession.user);
      else setProfile(null);
    });

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) void loadProfile(data.session.user);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      refreshProfile: async () => {
        if (session?.user) await loadProfile(session.user);
      },
    }),
    [session, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
