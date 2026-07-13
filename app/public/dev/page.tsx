import { notFound } from "next/navigation";
import { DevPreview } from "./preview";

/**
 * DEV-ONLY visual-verification route (mock phase, Days 2–4).
 *
 * The founder-auth middleware exempts /public/*, and agents can't sign in
 * during development (no password handling) — so this route mounts the
 * mock-driven internal screens for side-by-side checks against the design
 * prototype. Everything rendered is fixture data; no live data exists yet.
 * Hard-404s outside `next dev`. Flagged in docs/agents/HANDOFF.md — MAIN
 * can delete it any time; it must NOT survive past Day 5 integration.
 */
export default function DevPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DevPreview />;
}
