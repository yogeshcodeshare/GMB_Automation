import type { SupabaseClient } from "@supabase/supabase-js";
import { SpendCapError, type SpendEntry, type SpendStore } from "./guard";

const CAP_ERROR_RE = /SPEND_CAP_REACHED spent=([0-9.]+) estimate=([0-9.]+) cap=([0-9.]+)/;

/**
 * Production store — spend_ledger + settings via the service client.
 * Sums and cap-checks run INSIDE Postgres (supabase/migrations/
 * 20260712000003_spend_functions.sql): DB-side SUM avoids PostgREST's silent
 * 1000-row truncation; reserve_spend makes check+insert atomic under
 * concurrency (table lock).
 */
export class SupabaseSpendStore implements SpendStore {
  constructor(private readonly client: SupabaseClient) {}

  async sumSince(sinceIso: string): Promise<number> {
    const { data, error } = await this.client.rpc("sum_spend_since", {
      p_since: sinceIso,
    });
    if (error) throw new Error(`spend sum failed: ${error.message}`);
    return Number(data ?? 0);
  }

  async insert(entry: SpendEntry): Promise<void> {
    const { error } = await this.client.from("spend_ledger").insert({
      endpoint: entry.endpoint,
      cost_usd: entry.cost_usd,
      task_id: entry.task_id ?? null,
    });
    if (error) throw new Error(`spend_ledger insert failed: ${error.message}`);
  }

  async getDailyCapUsd(): Promise<number | null> {
    const { data, error } = await this.client
      .from("settings")
      .select("daily_spend_cap_usd")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error(`settings read failed: ${error.message}`);
    if (!data || data.daily_spend_cap_usd === null) return null;
    return Number(data.daily_spend_cap_usd);
  }

  async reserve(
    endpoint: string,
    estimateUsd: number,
    capUsd: number,
    sinceIso: string
  ): Promise<number> {
    const { data, error } = await this.client.rpc("reserve_spend", {
      p_endpoint: endpoint,
      p_estimate: estimateUsd,
      p_cap: capUsd,
      p_since: sinceIso,
    });
    if (error) {
      const m = CAP_ERROR_RE.exec(error.message);
      if (m) {
        throw new SpendCapError(Number(m[1]), Number(m[3]), Number(m[2]));
      }
      throw new Error(`spend reserve failed: ${error.message}`);
    }
    return Number(data);
  }

  async settle(
    reservationId: number,
    endpoint: string,
    actualUsd: number,
    taskId: string | null
  ): Promise<void> {
    const { error } = await this.client.rpc("settle_spend", {
      p_reservation_id: reservationId,
      p_endpoint: endpoint,
      p_actual: actualUsd,
      p_task_id: taskId,
    });
    if (error) throw new Error(`spend settle failed: ${error.message}`);
  }
}

/**
 * Test / offline store. `reserve` computes synchronously (no awaits between
 * check and insert), which is atomic on the JS event loop — mirroring the SQL
 * function's lock-based atomicity.
 */
export class InMemorySpendStore implements SpendStore {
  entries: Array<SpendEntry & { id?: number; created_at: string }> = [];
  dailyCapUsd: number | null = null;
  private seq = 1;
  private clock: () => Date;

  constructor(clock?: () => Date) {
    this.clock = clock ?? (() => new Date());
  }

  private sumSinceSync(sinceIso: string): number {
    const since = Date.parse(sinceIso);
    return this.entries
      .filter((e) => Date.parse(e.created_at) >= since)
      .reduce((sum, e) => sum + e.cost_usd, 0);
  }

  async sumSince(sinceIso: string): Promise<number> {
    return this.sumSinceSync(sinceIso);
  }

  async insert(entry: SpendEntry): Promise<void> {
    this.entries.push({ ...entry, created_at: this.clock().toISOString() });
  }

  async getDailyCapUsd(): Promise<number | null> {
    return this.dailyCapUsd;
  }

  async reserve(
    endpoint: string,
    estimateUsd: number,
    capUsd: number,
    sinceIso: string
  ): Promise<number> {
    const spent = this.sumSinceSync(sinceIso);
    if (
      estimateUsd > 0 &&
      (spent >= capUsd - 1e-9 || spent + estimateUsd > capUsd + 1e-9)
    ) {
      throw new SpendCapError(spent, capUsd, estimateUsd);
    }
    const id = this.seq++;
    this.entries.push({
      id,
      endpoint: `${endpoint} (reserved)`,
      cost_usd: estimateUsd,
      task_id: null,
      created_at: this.clock().toISOString(),
    });
    return id;
  }

  async settle(
    reservationId: number,
    endpoint: string,
    actualUsd: number,
    taskId: string | null
  ): Promise<void> {
    const row = this.entries.find((e) => e.id === reservationId);
    if (!row) throw new Error(`no reservation ${reservationId}`);
    row.endpoint = endpoint;
    row.cost_usd = Math.max(actualUsd, 0);
    row.task_id = taskId;
  }
}
