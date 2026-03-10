"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

export default function SessionProvider({ children }: { children: ReactNode }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Provider = NextAuthSessionProvider as any;
  return <Provider>{children}</Provider>;
}
