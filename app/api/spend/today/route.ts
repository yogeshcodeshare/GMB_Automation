import { NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";
import { makeSpendGuard } from "@/server/spend";

export const dynamic = "force-dynamic";

/** EP-012 — GET /api/spend/today (founder only; feeds the spend pill + cap banner). */
export async function GET() {
  const supabase = createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHORIZED", message: "Founder login required." } },
      { status: 401 }
    );
  }

  try {
    const status = await makeSpendGuard().getStatus();
    return NextResponse.json({ ok: true, data: status });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL",
          message:
            err instanceof Error
              ? err.message
              : "Spend ledger unavailable — have the Supabase migrations been applied?",
        },
      },
      { status: 500 }
    );
  }
}
