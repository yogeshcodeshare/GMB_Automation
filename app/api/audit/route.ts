import type { AuditRequest, CostPreview } from "@/types";
import { auditEstimateUsd, toInr } from "@/server/costs";
import { assertLiveDataEnabled } from "@/server/settings/live-flag";
import { makeSpendGuard } from "@/server/spend";
import { makeDataForSeoClient } from "@/server/dataforseo";
import { createServiceClient } from "@/lib/supabase/server";
import { startAudit } from "@/server/audit/pipeline";
import { err, errFrom, ok, readJson } from "@/server/http";

export const dynamic = "force-dynamic";

interface ParsedBody {
  preview: boolean;
  request: AuditRequest;
}

function parseBody(raw: unknown): ParsedBody | string {
  if (typeof raw !== "object" || raw === null) return "JSON body required";
  const b = raw as Record<string, unknown>;
  const opts = (b.options ?? {}) as Record<string, unknown>;

  const competitors = opts.competitors ?? 3;
  if (competitors !== 3 && competitors !== 5) {
    return "options.competitors must be 3 or 5";
  }
  const request: AuditRequest = {
    preview: b.preview === true,
    business_id: typeof b.business_id === "string" ? b.business_id : undefined,
    name: typeof b.name === "string" ? b.name.trim() : undefined,
    city: typeof b.city === "string" ? b.city.trim() : undefined,
    place_id: typeof b.place_id === "string" ? b.place_id : undefined,
    cid: typeof b.cid === "string" ? b.cid : undefined,
    options: {
      competitors,
      website_audit: opts.website_audit === true,
      post_audit: opts.post_audit !== false, // default on
    },
  };

  const hasTarget =
    request.business_id ||
    request.cid ||
    request.place_id ||
    (request.name && request.city);
  if (!hasTarget) {
    return "Provide business_id, cid, place_id, or name + city";
  }
  // my_business_info resolves by keyword or cid — a bare place_id cannot be
  // queried upstream (P2 manual fallback should send the CID variant).
  if (request.place_id && !request.cid && !request.business_id && !request.name) {
    return "A bare place_id cannot be audited — use the CID (Maps link shows both) or add name + city";
  }
  return { preview: request.preview === true, request };
}

/** EP-001 — POST /api/audit: `{preview:true}` → CostPreview; else start the
 * pipeline and return AuditProgress for P2's staged UI to poll. */
export async function POST(req: Request) {
  const parsed = parseBody(await readJson(req));
  if (typeof parsed === "string") return err("VALIDATION_ERROR", parsed);
  const { preview, request } = parsed;

  const estimate = auditEstimateUsd(request.options);
  if (preview) {
    const costPreview: CostPreview = {
      estimated_cost_usd: estimate,
      estimated_cost_inr: toInr(estimate),
      breakdown: [
        { item: "profile + reviews + posts + top-3 competitors", cost_usd: 0.022 },
        ...(request.options.competitors === 5
          ? [{ item: "top-5 competitors", cost_usd: 0.004 }]
          : []),
        ...(request.options.website_audit
          ? [{ item: "website audit (OnPage)", cost_usd: 0.003 }]
          : []),
      ],
    };
    return ok(costPreview);
  }

  try {
    const db = createServiceClient();
    // CR-1: clean 503 BEFORE any rows are created (the client-entry gate
    // enforces again inside the pipeline).
    await assertLiveDataEnabled(db);
    // Read-only pre-check for a clean 402 BEFORE creating rows; the real
    // enforcement stays the atomic reserve inside each guarded call.
    await makeSpendGuard().assertCanSpend(estimate);

    const started = await startAudit(
      { dfs: makeDataForSeoClient(), db },
      request
    );
    started.done.catch(() => undefined); // progress carries the failure
    return ok(
      {
        audit_id: started.audit_id,
        stage: "profile" as const,
        done_stages: [],
        status: "running" as const,
      },
      202
    );
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return err("NOT_FOUND", "business_id not found");
    }
    return errFrom(e);
  }
}
