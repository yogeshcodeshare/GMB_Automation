/**
 * Demo founder identity for the sidebar account footer — Supabase auth
 * supplies the real session identity post-wiring. Flushable per the client
 * data policy (sweep fix: was hardcoded inside AppStateProvider).
 */
export const founderMock = {
  name: "Founder",
  email: "founder@agency.in",
};
