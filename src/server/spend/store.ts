import type { SupabaseClient } from "@supabase/supabase-js";
import type { SpendEntry, SpendStore } from "./guard";

/** Production store — spend_ledger + settings via the service client. */
export class SupabaseSpendStore implements SpendStore {
  constructor(private readonly client: SupabaseClient) {}

  async sumSince(sinceIso: string): Promise<number> {
    const { data, error } = await this.client
      .from("spend_ledger")
      .select("cost_usd")
      .gte("created_at", sinceIso);
    if (error) throw new Error(`spend_ledger read failed: ${error.message}`);
    return (data ?? []).reduce(
      (sum, row) => sum + Number(row.cost_usd ?? 0),
      0
    );
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
}

/** Test / offline store. */
export class InMemorySpendStore implements SpendStore {
  entries: Array<SpendEntry & { created_at: string }> = [];
  dailyCapUsd: number | null = null;
  private clock: () => Date;

  constructor(clock?: () => Date) {
    this.clock = clock ?? (() => new Date());
  }

  async sumSince(sinceIso: string): Promise<number> {
    const since = Date.parse(sinceIso);
    return this.entries
      .filter((e) => Date.parse(e.created_at) >= since)
      .reduce((sum, e) => sum + e.cost_usd, 0);
  }

  async insert(entry: SpendEntry): Promise<void> {
    this.entries.push({ ...entry, created_at: this.clock().toISOString() });
  }

  async getDailyCapUsd(): Promise<number | null> {
    return this.dailyCapUsd;
  }
}
