import type { SprintGroup, SprintPatchRequest } from "@/types";
import { createServiceClient } from "@/lib/supabase/server";
import {
  assertStrictPatchShape,
  getSprintDetail,
  patchSprint,
  SprintGateError,
  SprintPatchError,
} from "@/server/sprint";
import { err, errFrom, ok, readJson } from "@/server/http";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** GET /api/sprint/:id → SprintDetail (P12 render). */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  if (!UUID_RE.test(params.id)) {
    return err("VALIDATION_ERROR", "sprint id must be a UUID");
  }
  try {
    const detail = await getSprintDetail({ db: createServiceClient() }, params.id);
    if (!detail) return err("NOT_FOUND", "No sprint with this id");
    return ok(detail);
  } catch (e) {
    return errFrom(e);
  }
}

/** EP-021 — PATCH /api/sprint/:id (STRICT SprintPatchRequest) → SprintDetail.
 * Unknown keys → VALIDATION_ERROR; baseline/after fields are locked (#3). */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  if (!UUID_RE.test(params.id)) {
    return err("VALIDATION_ERROR", "sprint id must be a UUID");
  }
  const raw = await readJson(req);
  if (typeof raw !== "object" || raw === null) {
    return err("VALIDATION_ERROR", "JSON body required");
  }
  const body = raw as Record<string, unknown>;

  try {
    assertStrictPatchShape(body); // locked/unknown keys → VALIDATION_ERROR

    const patch: SprintPatchRequest = {};
    if (body.task_id !== undefined) {
      if (typeof body.task_id !== "string" || !UUID_RE.test(body.task_id)) {
        return err("VALIDATION_ERROR", "task_id must be a UUID");
      }
      patch.task_id = body.task_id;
    }
    if (body.task_status !== undefined) {
      patch.task_status = body.task_status as SprintPatchRequest["task_status"];
    }
    if (body.task_approved !== undefined) {
      if (typeof body.task_approved !== "boolean") {
        return err("VALIDATION_ERROR", "task_approved must be boolean");
      }
      patch.task_approved = body.task_approved;
    }
    if (body.task_note !== undefined) {
      if (typeof body.task_note !== "string" || body.task_note.length > 2000) {
        return err("VALIDATION_ERROR", "task_note must be a string (≤2000)");
      }
      patch.task_note = body.task_note;
    }
    for (const key of ["change_before", "change_after"] as const) {
      if (body[key] !== undefined) {
        if (typeof body[key] !== "string" || (body[key] as string).length > 4000) {
          return err("VALIDATION_ERROR", `${key} must be a string (≤4000)`);
        }
        patch[key] = body[key] as string;
      }
    }
    if (body.add_custom_task !== undefined) {
      const c = body.add_custom_task as Record<string, unknown>;
      if (typeof c?.title !== "string" || typeof c?.group !== "string") {
        return err("VALIDATION_ERROR", "add_custom_task needs { title, group }");
      }
      patch.add_custom_task = { title: c.title, group: c.group as SprintGroup };
    }
    if (body.complete_sprint !== undefined) {
      if (typeof body.complete_sprint !== "boolean") {
        return err("VALIDATION_ERROR", "complete_sprint must be boolean");
      }
      patch.complete_sprint = body.complete_sprint;
    }

    const detail = await patchSprint({ db: createServiceClient() }, params.id, patch);
    return ok(detail);
  } catch (e) {
    if (e instanceof SprintPatchError) return err(e.code, e.message);
    if (e instanceof SprintGateError) {
      return err("FORBIDDEN", e.message, { reasons: e.reasons });
    }
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return err("NOT_FOUND", "sprint or task not found");
    }
    return errFrom(e);
  }
}
