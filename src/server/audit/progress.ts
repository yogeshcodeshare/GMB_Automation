import type { AuditProgress, AuditStage } from "@/types";

/**
 * Staged progress for P2 (profile→reviews→posts→competitors→website→scoring).
 * In-process registry for fast polling; the pipeline ALSO persists each
 * update into audits.raw_snapshot.progress, so GET /progress still answers
 * after a restart (or on a different serverless instance).
 */

const registry = new Map<string, AuditProgress>();

export const STAGES: AuditStage[] = [
  "profile",
  "reviews",
  "posts",
  "competitors",
  "website",
  "scoring",
];

export function initProgress(auditId: string): AuditProgress {
  const p: AuditProgress = {
    audit_id: auditId,
    stage: "profile",
    done_stages: [],
    status: "running",
  };
  registry.set(auditId, p);
  return p;
}

export function setStage(
  auditId: string,
  stage: AuditStage,
  detail?: string
): AuditProgress {
  const prev = registry.get(auditId) ?? initProgress(auditId);
  const done = STAGES.slice(0, STAGES.indexOf(stage));
  const p: AuditProgress = {
    audit_id: auditId,
    stage,
    done_stages: done,
    status: "running",
    detail,
  };
  registry.set(auditId, p);
  return p;
}

export function finishProgress(
  auditId: string,
  status: "done" | "failed" | "partial",
  detail?: string
): AuditProgress {
  const p: AuditProgress = {
    audit_id: auditId,
    stage: "scoring",
    done_stages: status === "failed" ? registry.get(auditId)?.done_stages ?? [] : STAGES,
    status,
    detail,
  };
  registry.set(auditId, p);
  return p;
}

export function getProgress(auditId: string): AuditProgress | null {
  return registry.get(auditId) ?? null;
}
