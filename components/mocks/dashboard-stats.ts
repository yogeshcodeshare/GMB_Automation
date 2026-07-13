import type { DashboardStats } from "@/types";

/**
 * Typed mock of `GET /api/dashboard/stats` (contract row added 13 Jul).
 * Values are the prototype's P1 KPI strip. Swapped for the real route the
 * moment backend lands it (Day-5 policy: all mocks flushable).
 */
export const dashboardStatsMock: DashboardStats = {
  audits_this_week: 12,
  audits_delta: 3,
  leads_total: 4,
  leads_new_today: 2,
  clients_on_track: 3,
  clients_behind: 1,
  behind_note: "Patil Coaching: posts 6/8 behind",
};
