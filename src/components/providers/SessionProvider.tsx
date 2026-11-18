"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { SessionUser } from "@/lib/session";

interface SessionContextValue {
  user: SessionUser;
  logout: () => Promise<void>;
  loggingOut: boolean;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const [loggingOut, setLoggingOut] = useState(false);

  const logout = useCallback(async () => {
    setLoggingOut(true);
    try {
      await api("/auth/logout", { method: "POST" });
    } finally {
      // Recarga completa para limpiar cualquier estado en memoria.
      window.location.assign("/login");
    }
  }, []);

  const value = useMemo(() => ({ user, logout, loggingOut }), [user, logout, loggingOut]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession debe usarse dentro de <SessionProvider>.");
  }
  return context;
}
