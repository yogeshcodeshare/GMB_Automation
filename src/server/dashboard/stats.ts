import type { SupabaseClient } from "@supabase/supabase-js";
import type { DashboardStats } from "@/types";
import { startOfTodayIst } from "@/server/spend";

/**
 * GET /api/dashboard/stats — P1 KPI strip aggregates. Derived entirely from
 * existing tables (₹0, no DataForSEO).
 *
 * Conventions (documented in the HANDOFF note):
 * - "this week" = rolling 7-day window ending now; delta vs the 7 days before.
 * - "today" = the founder's calendar day, Asia/Kolkata (same as the spend guard).
 * - on-track = for the current IST month's service cycle, done posts AND photos
 *   are at or above the linear pace for the day of month; clients with no cycle
 *   row are "behind" (cycle not started).
 */

const MS_PER_DAY = 86_400_000;

/** The tiny slice of PostgREST's builder the counters use. */
interface CountQuery extends PromiseLike<{
  count: number | null;
  error: { message: string } | null;
}> {
  gte(column: string, value: string): CountQuery;
  lt(column: string, value: string): CountQuery;
}

async function countRows(
  db: SupabaseClient,
  table: string,
  apply: (q: CountQuery) => CountQuery
): Promise<number> {
  const base = db
    .from(table)
    .select("id", { count: "exact", head: true }) as unknown as CountQuery;
  const { count, error } = await apply(base);
  if (error) throw new Error(`${table} count failed: ${error.message}`);
  return count ?? 0;
}

function istMonthStart(now: Date): { monthStartIso: string; dayFraction: number } {
  const istMs = now.getTime() + (5 * 60 + 30) * 60_000;
  const ist = new Date(istMs);
  const year = ist.getUTCFullYear();
  const month = ist.getUTCMonth();
  const day = ist.getUTCDate();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const monthStartUtcMs = Date.UTC(year, month, 1) - (5 * 60 + 30) * 60_000;
  return {
    monthStartIso: new Date(monthStartUtcMs).toISOString(),
    dayFraction: day / daysInMonth,
  };
}

export async function computeDashboardStats(
  db: SupabaseClient,
  now = new Date()
): Promise<DashboardStats> {
  const nowMs = now.getTime();
  const sevenDaysAgo = new Date(nowMs - 7 * MS_PER_DAY).toISOString();
  const fourteenDaysAgo = new Date(nowMs - 14 * MS_PER_DAY).toISOString();
  const todayStart = startOfTodayIst(now).toISOString();
  const { dayFraction } = istMonthStart(now);

  const [auditsThisWeek, auditsLastWeek, leadsTotal, leadsToday] =
    await Promise.all([
      countRows(db, "audits", (q) => q.gte("created_at", sevenDaysAgo)),
      countRows(db, "audits", (q) =>
        q.gte("created_at", fourteenDaysAgo).lt("created_at", sevenDaysAgo)
      ),
      countRows(db, "leads_public", (q) => q),
      countRows(db, "leads_public", (q) => q.gte("created_at", todayStart)),
    ]);

  // Client pace: current month's service_cycles joined to client businesses.
  const { data: clients, error: clientsErr } = await db
    .from("businesses")
    .select("id, name")
    .eq("is_client", true);
  if (clientsErr) throw new Error(`clients read failed: ${clientsErr.message}`);

  // month column is a DATE (first of month); compare in IST.
  const istNow = new Date(nowMs + (5 * 60 + 30) * 60_000);
  const monthDate = `${istNow.getUTCFullYear()}-${String(istNow.getUTCMonth() + 1).padStart(2, "0")}-01`;
  const { data: cycles, error: cyclesErr } = await db
    .from("service_cycles")
    .select("business_id, posts_done, posts_target, photos_done, photos_target")
    .eq("month", monthDate);
  if (cyclesErr) throw new Error(`service_cycles read failed: ${cyclesErr.message}`);

  const pace = clientPace(
    (clients ?? []) as Array<{ id: string; name: string }>,
    (cycles ?? []) as CycleRow[],
    dayFraction
  );

  return {
    audits_this_week: auditsThisWeek,
    audits_delta: auditsThisWeek - auditsLastWeek,
    leads_total: leadsTotal,
    leads_new_today: leadsToday,
    clients_on_track: pace.on_track,
    clients_behind: pace.behind,
    behind_note: pace.note,
  };
}

export interface CycleRow {
  business_id: string;
  posts_done: number | null;
  posts_target: number | null;
  photos_done: number | null;
  photos_target: number | null;
}

/** Pure pace rule: at/above linear month pace on BOTH quotas = on track;
 * a client without a cycle row this month counts behind. */
export function clientPace(
  clients: Array<{ id: string; name: string }>,
  cycles: CycleRow[],
  dayFraction: number
): { on_track: number; behind: number; note: string | null } {
  const cycleByBusiness = new Map(cycles.map((c) => [c.business_id, c]));
  let on_track = 0;
  let behind = 0;
  let note: string | null = null;

  for (const client of clients) {
    const cycle = cycleByBusiness.get(client.id);
    if (!cycle) {
      behind += 1;
      note = note ?? `${client.name}: service cycle not started`;
      continue;
    }
    const lag: string[] = [];
    const check = (done: number | null, target: number | null, label: string) => {
      const expected = Math.floor((target ?? 0) * dayFraction);
      if ((done ?? 0) < expected) lag.push(`${label} ${done ?? 0}/${target ?? 0} behind`);
    };
    check(cycle.posts_done, cycle.posts_target, "posts");
    check(cycle.photos_done, cycle.photos_target, "photos");
    if (lag.length === 0) {
      on_track += 1;
    } else {
      behind += 1;
      note = note ?? `${client.name}: ${lag[0]}`;
    }
  }
  return { on_track, behind, note };
}
