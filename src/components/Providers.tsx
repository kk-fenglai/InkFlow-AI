"use client";

import { SessionProvider } from "next-auth/react";
import DeferredMaterialSymbols from "@/components/DeferredMaterialSymbols";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false} refetchInterval={0}>
      <DeferredMaterialSymbols />
      {children}
    </SessionProvider>
  );
}
