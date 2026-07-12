import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Public liveness probe (deploy checks). No auth, no data. */
export async function GET() {
  return NextResponse.json({ ok: true, data: { service: "gmb-sarathi", ts: new Date().toISOString() } });
}
