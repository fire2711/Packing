import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthCtx = createContext(null);

export function useAuth() {
  return useContext(AuthCtx);
}

export default function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) console.warn(error);
      setSession(data.session ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription?.unsubscribe();
    };
  }, []);

  const value = useMemo(() => {
    return {
      session,
      user: session?.user ?? null,
      loading,
      signOut: () => supabase.auth.signOut(),
    };
  }, [session, loading]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}