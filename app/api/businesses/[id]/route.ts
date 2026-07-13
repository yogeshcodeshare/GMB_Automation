import type { Business, Plan, PlanAddon } from "@/types";
import { createServiceClient } from "@/lib/supabase/server";
import { getBusiness, patchBusiness } from "@/server/audit/repo";
import { err, errFrom, ok, readJson } from "@/server/http";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** GET /api/businesses/:id → Business. */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  if (!UUID_RE.test(params.id)) {
    return err("VALIDATION_ERROR", "business id must be a UUID");
  }
  try {
    const business = await getBusiness(createServiceClient(), params.id);
    if (!business) return err("NOT_FOUND", "No business with this id");
    return ok(business);
  } catch (e) {
    return errFrom(e);
  }
}

const ADDONS: PlanAddon[] = ["content", "whatsapp", "social", "ads"];

function parsePlan(raw: unknown): Plan | null | string {
  if (raw === null) return null;
  if (typeof raw !== "object") return "plan must be an object or null";
  const p = raw as Record<string, unknown>;
  if (p.base !== "gmb_boost") return 'plan.base must be "gmb_boost"';
  if (
    !Array.isArray(p.addons) ||
    p.addons.some((a) => !ADDONS.includes(a as PlanAddon))
  ) {
    return `plan.addons must be an array of: ${ADDONS.join(", ")}`;
  }
  return { base: "gmb_boost", addons: p.addons as PlanAddon[] };
}

/** PATCH /api/businesses/:id — only the contract-listed fields. */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  if (!UUID_RE.test(params.id)) {
    return err("VALIDATION_ERROR", "business id must be a UUID");
  }
  const raw = await readJson(req);
  if (typeof raw !== "object" || raw === null) {
    return err("VALIDATION_ERROR", "JSON body required");
  }
  const b = raw as Record<string, unknown>;
  const patch: Partial<
    Pick<Business, "is_client" | "plan" | "owner_name" | "owner_whatsapp">
  > = {};

  if ("is_client" in b) {
    if (typeof b.is_client !== "boolean") {
      return err("VALIDATION_ERROR", "is_client must be boolean");
    }
    patch.is_client = b.is_client;
  }
  if ("plan" in b) {
    const plan = parsePlan(b.plan);
    if (typeof plan === "string") return err("VALIDATION_ERROR", plan);
    patch.plan = plan;
  }
  if ("owner_name" in b) {
    if (b.owner_name !== null && typeof b.owner_name !== "string") {
      return err("VALIDATION_ERROR", "owner_name must be a string or null");
    }
    patch.owner_name = b.owner_name as string | null;
  }
  if ("owner_whatsapp" in b) {
    if (b.owner_whatsapp !== null && typeof b.owner_whatsapp !== "string") {
      return err("VALIDATION_ERROR", "owner_whatsapp must be a string or null");
    }
    if (
      typeof b.owner_whatsapp === "string" &&
      !/^\+?[0-9][0-9 -]{7,14}$/.test(b.owner_whatsapp)
    ) {
      return err("VALIDATION_ERROR", "owner_whatsapp must be a phone number");
    }
    patch.owner_whatsapp = b.owner_whatsapp as string | null;
  }

  if (Object.keys(patch).length === 0) {
    return err(
      "VALIDATION_ERROR",
      "Nothing to update — allowed fields: is_client, plan, owner_name, owner_whatsapp"
    );
  }

  try {
    const updated = await patchBusiness(createServiceClient(), params.id, patch);
    if (!updated) return err("NOT_FOUND", "No business with this id");
    return ok(updated);
  } catch (e) {
    return errFrom(e);
  }
}
