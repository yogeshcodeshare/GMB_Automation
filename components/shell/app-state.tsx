"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { BusinessListItem, SpendToday } from "@/types";
import { businessesMock } from "@/components/mocks/businesses";
import {
  spendTodayCapHitMock,
  spendTodayMock,
} from "@/components/mocks/spend";

interface AppState {
  /** All businesses (mock of GET /api/businesses until Day 5). */
  businesses: BusinessListItem[];
  /** Globally selected business (drives workspace screens). */
  bizSel: BusinessListItem;
  setBizSelId: (id: string) => void;
  /** EP-012 spend status — feeds pill, P1 card, cap banner. */
  spend: SpendToday;
  /** Global cap-hit state: disables every paid action app-wide. */
  capHit: boolean;
  /** Settings → "Preview cap-hit state" toggle (P11). */
  capPreview: boolean;
  setCapPreview: (on: boolean) => void;
  userName: string;
  userEmail: string;
}

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({
  children,
  initialCapPreview = false,
}: {
  children: React.ReactNode;
  /** Start in cap-hit preview (dev preview / tests). */
  initialCapPreview?: boolean;
}) {
  const [bizSelId, setBizSelId] = useState(businessesMock[0].id);
  const [capPreview, setCapPreview] = useState(initialCapPreview);

  const value = useMemo<AppState>(() => {
    const spend = capPreview ? spendTodayCapHitMock : spendTodayMock;
    return {
      businesses: businessesMock,
      bizSel:
        businessesMock.find((b) => b.id === bizSelId) ?? businessesMock[0],
      setBizSelId,
      spend,
      capHit: spend.blocked,
      capPreview,
      setCapPreview,
      userName: "Founder",
      userEmail: "founder@agency.in",
    };
  }, [bizSelId, capPreview]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppState outside <AppStateProvider>");
  return ctx;
}
