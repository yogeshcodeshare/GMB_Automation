import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Business,
  FixTask,
  ServiceCycle,
  TodaysWorkItem,
} from "@/types";

/**
 * P9 Client Ops — READ endpoints (Day 6; the write-side machinery is M9).
 * Everything here is TB-001/012/014/015/016/006/018 DB reads — ₹0.
 * Month filtering happens in JS: per-client row counts are tiny and it keeps
 * the queries portable across the real client and test stubs.
 */

export interface ClientCycleView {
  business: Pick<
    Business,
    "id" | "name" | "city" | "plan" | "connection_status" | "owner_whatsapp"
  >;
  cycle: ServiceCycle | null;
  counts: {
    reviews_month: number;
    posts_month: number;
    review_requests_month: number;
    media_pending: number;
    pending_replies: number;
  };
  /** Sprint work finished this month (done fix_tasks across the client's sprints). */
  work_log: Array<{ title: string; done_at: string; rubric_key: string }>;
}

function monthRange(month: string): { start: number; end: number } {
  const [y, m] = month.split("-").map(Number);
  return {
    start: Date.UTC(y, m - 1, 1) - (5 * 60 + 30) * 60_000, // IST month start
    end: Date.UTC(y, m, 1) - (5 * 60 + 30) * 60_000,
  };
}

function inMonth(ts: string | null, range: { start: number; end: number }): boolean {
  if (!ts) return false;
  const t = Date.parse(ts);
  return Number.isFinite(t) && t >= range.start && t < range.end;
}

async function rows<T>(
  db: SupabaseClient,
  table: string,
  col: string,
  value: unknown
): Promise<T[]> {
  const { data, error } = await db.from(table).select().eq(col, value);
  if (error) throw new Error(`${table} read failed: ${error.message}`);
  return (data ?? []) as T[];
}

export async function listCycles(
  db: SupabaseClient,
  month: string // "YYYY-MM"
): Promise<ClientCycleView[]> {
  const range = monthRange(month);
  const monthDate = `${month}-01`;

  const { data: clients, error } = await db
    .from("businesses")
    .select()
    .eq("is_client", true);
  if (error) throw new Error(`businesses read failed: ${error.message}`);

  const views: ClientCycleView[] = [];
  for (const raw of (clients ?? []) as Business[]) {
    const [cycles, reviews, posts, requests, media, sprints] = await Promise.all([
      rows<ServiceCycle>(db, "service_cycles", "business_id", raw.id),
      rows<{ review_ts: string | null; replied: boolean }>(db, "reviews_cache", "business_id", raw.id),
      rows<{ post_ts: string | null }>(db, "posts_cache", "business_id", raw.id),
      rows<{ sent_ts: string }>(db, "review_requests", "business_id", raw.id),
      rows<{ published: boolean }>(db, "media_inbox", "business_id", raw.id),
      rows<{ id: string }>(db, "optimization_sprints", "business_id", raw.id),
    ]);

    const workLog: ClientCycleView["work_log"] = [];
    for (const sprint of sprints) {
      const tasks = await rows<FixTask>(db, "fix_tasks", "sprint_id", sprint.id);
      for (const t of tasks) {
        if (t.status === "done" && t.done_at && inMonth(t.done_at, range)) {
          workLog.push({ title: t.title, done_at: t.done_at, rubric_key: t.rubric_key });
        }
      }
    }
    workLog.sort((a, b) => (a.done_at < b.done_at ? 1 : -1));

    views.push({
      business: {
        id: raw.id,
        name: raw.name,
        city: raw.city,
        plan: raw.plan,
        connection_status: raw.connection_status,
        owner_whatsapp: raw.owner_whatsapp,
      },
      cycle:
        cycles.find((c) => String(c.month).slice(0, 10) === monthDate) ?? null,
      counts: {
        reviews_month: reviews.filter((r) => inMonth(r.review_ts, range)).length,
        posts_month: posts.filter((p) => inMonth(p.post_ts, range)).length,
        review_requests_month: requests.filter((r) => inMonth(r.sent_ts, range)).length,
        media_pending: media.filter((m) => !m.published).length,
        pending_replies: reviews.filter((r) => !r.replied).length,
      },
      work_log: workLog,
    });
  }
  return views;
}

const MS_PER_DAY = 86_400_000;

/** P9 "Today's work" strip — one-tap pending actions across ALL clients. */
export async function todaysWork(
  db: SupabaseClient,
  now = new Date()
): Promise<TodaysWorkItem[]> {
  const month = new Date(now.getTime() + (5 * 60 + 30) * 60_000)
    .toISOString()
    .slice(0, 7);
  const views = await listCycles(db, month);
  const items: TodaysWorkItem[] = [];

  for (const v of views) {
    if (v.counts.media_pending > 0) {
      items.push({
        business_id: v.business.id,
        business_name: v.business.name,
        kind: "publish_photo",
        label: `${v.counts.media_pending} photo${v.counts.media_pending > 1 ? "s" : ""} waiting in the media inbox`,
        count: v.counts.media_pending,
      });
    }
    if (v.counts.pending_replies > 0) {
      items.push({
        business_id: v.business.id,
        business_name: v.business.name,
        kind: "pending_reply",
        label: `${v.counts.pending_replies} review${v.counts.pending_replies > 1 ? "s" : ""} awaiting a reply`,
        count: v.counts.pending_replies,
      });
    }
    if (v.cycle && v.cycle.posts_done < v.cycle.posts_target) {
      const due = v.cycle.posts_target - v.cycle.posts_done;
      items.push({
        business_id: v.business.id,
        business_name: v.business.name,
        kind: "post_due",
        label: `${due} post${due > 1 ? "s" : ""} left of this month's ${v.cycle.posts_target}`,
        count: due,
      });
    }
    if (v.cycle && !v.cycle.report_sent) {
      // due in the last 5 days of the IST month
      const ist = new Date(now.getTime() + (5 * 60 + 30) * 60_000);
      const daysInMonth = new Date(
        Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth() + 1, 0)
      ).getUTCDate();
      if (daysInMonth - ist.getUTCDate() <= 4) {
        items.push({
          business_id: v.business.id,
          business_name: v.business.name,
          kind: "report_due",
          label: "Monthly client report not sent yet",
          count: 1,
        });
      }
    }
  }

  // Reminder pass: requests >3 days old, never reminded, no review detected.
  const { data: clients } = await db.from("businesses").select().eq("is_client", true);
  for (const raw of (clients ?? []) as Business[]) {
    const requests = await rows<{
      sent_ts: string;
      reminded_ts: string | null;
      review_detected: boolean;
    }>(db, "review_requests", "business_id", raw.id);
    const overdue = requests.filter(
      (r) =>
        !r.reminded_ts &&
        !r.review_detected &&
        now.getTime() - Date.parse(r.sent_ts) > 3 * MS_PER_DAY
    ).length;
    if (overdue > 0) {
      items.push({
        business_id: raw.id,
        business_name: raw.name,
        kind: "review_request_reminder",
        label: `${overdue} review request${overdue > 1 ? "s" : ""} need the 3-day reminder`,
        count: overdue,
      });
    }
  }

  return items;
}
