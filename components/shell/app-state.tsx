"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { BusinessListItem, PdfLanguage, SpendToday } from "@/types";
import {
  apiFetchResult,
  setLiveDataDisabledHandler,
} from "@/components/lib/api";
import { useApiGet } from "@/components/hooks/use-api-get";
import { businessesMock, isFixtureBusiness } from "@/components/mocks/businesses";
import {
  spendTodayCapHitMock,
  spendTodayMock,
} from "@/components/mocks/spend";

/** CR-3 — EP-006 PDF language (now the official contract type). */
export type PdfLang = PdfLanguage;

interface AppState {
  /** All businesses — live `/api/businesses` when flipped, mock fallback. */
  businesses: BusinessListItem[];
  /** Where the businesses list came from — "mock" rows are demo data (UAT-5
   *  badges contacts sourced from them as DEMO). */
  businessesSource: "live" | "mock";
  /** Globally selected business (drives workspace screens). */
  bizSel: BusinessListItem;
  setBizSelId: (id: string) => void;
  /** True when bizSel is the Manovedh fixture (mock id or seeded UUID). */
  bizSelIsFixture: boolean;
  /** EP-012 spend status — live when flipped; feeds pill + cap banner. */
  spend: SpendToday;
  /** Global cap-hit state: disables every paid action app-wide. */
  capHit: boolean;
  /** Settings → "Preview cap-hit state" toggle (P11). */
  capPreview: boolean;
  setCapPreview: (on: boolean) => void;
  /** CR-1 — DataForSEO live-data master switch (default OFF, client call). */
  liveDataEnabled: boolean;
  setLiveDataEnabled: (on: boolean) => void;
  /** Category Finder → "Apply to audit" (updates P3 chips + fix #1). */
  catApplied: boolean;
  setCatApplied: (on: boolean) => void;
  /** CR-3 — last chosen PDF language per business (default मराठी). */
  pdfLangFor: (bizId: string) => PdfLang;
  setPdfLang: (bizId: string, lang: PdfLang) => void;
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
  // Live-or-mock reads (LIVE_ENDPOINTS gates; mock fallback on any failure).
  const businessesQ = useApiGet("/api/businesses", businessesMock, {
    delayMs: 0,
  });
  const spendQ = useApiGet("/api/spend/today", spendTodayMock, { delayMs: 0 });
  // Empty-live-array protection now lives inside useApiGet (default on),
  // so `data` is either a non-empty live list or null → mock.
  const businesses = businessesQ.data ?? businessesMock;

  const [bizSelId, setBizSelId] = useState(businessesMock[0].id);
  const [capPreview, setCapPreview] = useState(initialCapPreview);
  const [catApplied, setCatApplied] = useState(false);
  const [liveDataEnabled, setLiveDataEnabledState] = useState(false);
  const [pdfLangByBiz, setPdfLangByBiz] = useState<Record<string, PdfLang>>({});

  // CR-1: any route replying LIVE_DATA_DISABLED syncs the toggle off, so
  // every paid button renders the same blocked state.
  useEffect(() => {
    setLiveDataDisabledHandler(() => setLiveDataEnabledState(false));
    return () => setLiveDataDisabledHandler(null);
  }, []);

  // When the live list arrives with different ids (seed UUIDs), keep the
  // selection valid — prefer the fixture business, else the first row.
  useEffect(() => {
    if (!businesses.some((b) => b.id === bizSelId)) {
      const fixture = businesses.find((b) => isFixtureBusiness(b.id));
      setBizSelId(fixture?.id ?? businesses[0].id);
    }
  }, [businesses, bizSelId]);

  // CR-1: toggling persists via PATCH /api/settings when that route is
  // flipped live; local state either way so the UI stays consistent.
  const setLiveDataEnabled = useCallback((on: boolean) => {
    setLiveDataEnabledState(on);
    void apiFetchResult("/api/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      // Contract field name (Settings type + validateSettingsPatch) — B2 fix.
      body: JSON.stringify({ dataforseo_live_enabled: on }),
    });
  }, []);

  const setPdfLang = useCallback((bizId: string, lang: PdfLang) => {
    setPdfLangByBiz((m) => ({ ...m, [bizId]: lang }));
  }, []);

  const value = useMemo<AppState>(() => {
    const spend = capPreview
      ? spendTodayCapHitMock
      : (spendQ.data ?? spendTodayMock);
    const bizSel =
      businesses.find((b) => b.id === bizSelId) ?? businesses[0];
    return {
      businesses,
      businessesSource: businessesQ.source,
      bizSel,
      setBizSelId,
      bizSelIsFixture: isFixtureBusiness(bizSel.id),
      spend,
      capHit: spend.blocked,
      capPreview,
      setCapPreview,
      liveDataEnabled,
      setLiveDataEnabled,
      catApplied,
      setCatApplied,
      pdfLangFor: (bizId: string) => pdfLangByBiz[bizId] ?? "mr",
      setPdfLang,
      userName: "Founder",
      userEmail: "founder@agency.in",
    };
  }, [
    businesses,
    businessesQ.source,
    bizSelId,
    capPreview,
    catApplied,
    liveDataEnabled,
    setLiveDataEnabled,
    pdfLangByBiz,
    setPdfLang,
    spendQ.data,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppState outside <AppStateProvider>");
  return ctx;
}
