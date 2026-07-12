/**
 * Spend guard — hard constraint #2 (EP-012 / TB-010).
 * Every DataForSEO call must go through this guard: it checks the daily cap
 * BEFORE the call and records the cost in spend_ledger AFTER it.
 * Built and tested in M0 before ANY data feature.
 *
 * "Daily" = the founder's calendar day, Asia/Kolkata (UTC+05:30, no DST).
 */

export interface SpendEntry {
  endpoint: string;
  cost_usd: number;
  task_id?: string | null;
}

export interface SpendStore {
  /** Sum of cost_usd for ledger rows created at/after `sinceIso`. */
  sumSince(sinceIso: string): Promise<number>;
  /** Append one ledger row (TB-010). */
  insert(entry: SpendEntry): Promise<void>;
  /** Cap from settings (TB-011); null when the settings row is absent. */
  getDailyCapUsd(): Promise<number | null>;
}

export class SpendCapError extends Error {
  readonly code = "SPEND_CAP_REACHED" as const;
  constructor(
    readonly spentUsd: number,
    readonly capUsd: number,
    readonly estimatedUsd: number
  ) {
    super(
      `Daily spend cap reached: spent $${spentUsd.toFixed(4)} + estimated $${estimatedUsd.toFixed(
        4
      )} exceeds cap $${capUsd.toFixed(2)}. External calls paused until tomorrow.`
    );
    this.name = "SpendCapError";
  }
}

const IST_OFFSET_MINUTES = 5 * 60 + 30;
const DEFAULT_CAP_USD = 1.0;
/** Tolerance for floating-point cost sums. */
const EPSILON = 1e-9;

/** UTC instant at which "today" began in Asia/Kolkata. */
export function startOfTodayIst(now: Date): Date {
  const istMs = now.getTime() + IST_OFFSET_MINUTES * 60_000;
  const istDayStartMs = Math.floor(istMs / 86_400_000) * 86_400_000;
  return new Date(istDayStartMs - IST_OFFSET_MINUTES * 60_000);
}

export interface SpendStatus {
  spent_usd: number;
  cap_usd: number;
  remaining_usd: number;
  blocked: boolean;
}

export class SpendGuard {
  constructor(
    private readonly store: SpendStore,
    private readonly opts: {
      /** Fallback cap when the settings row is absent (env DAILY_SPEND_CAP_USD). */
      envCapUsd?: number | null;
      /** Injectable clock for tests. */
      now?: () => Date;
    } = {}
  ) {}

  private now(): Date {
    return this.opts.now ? this.opts.now() : new Date();
  }

  async resolveCapUsd(): Promise<number> {
    const fromSettings = await this.store.getDailyCapUsd();
    if (fromSettings !== null && fromSettings !== undefined) return fromSettings;
    if (this.opts.envCapUsd !== null && this.opts.envCapUsd !== undefined) {
      return this.opts.envCapUsd;
    }
    return DEFAULT_CAP_USD;
  }

  async getStatus(): Promise<SpendStatus> {
    const since = startOfTodayIst(this.now()).toISOString();
    const [spent, cap] = await Promise.all([
      this.store.sumSince(since),
      this.resolveCapUsd(),
    ]);
    return {
      spent_usd: spent,
      cap_usd: cap,
      remaining_usd: Math.max(0, cap - spent),
      blocked: spent >= cap - EPSILON,
    };
  }

  /**
   * Throws SpendCapError when a paid call must not run.
   * Rules: at/over the cap every PAID call (estimate > 0) is blocked, and a
   * call whose estimate would overshoot the cap is blocked too. Free calls
   * (estimate 0, e.g. the DataForSEO balance ping) always pass.
   */
  async assertCanSpend(estimatedCostUsd: number): Promise<void> {
    if (estimatedCostUsd < 0) {
      throw new RangeError("estimatedCostUsd must be >= 0");
    }
    if (estimatedCostUsd === 0) return;
    const { spent_usd, cap_usd } = await this.getStatus();
    if (
      spent_usd >= cap_usd - EPSILON ||
      spent_usd + estimatedCostUsd > cap_usd + EPSILON
    ) {
      throw new SpendCapError(spent_usd, cap_usd, estimatedCostUsd);
    }
  }

  /** Record an executed call in the ledger (TB-010). Always call after any paid request. */
  async record(entry: SpendEntry): Promise<void> {
    if (entry.cost_usd < 0) throw new RangeError("cost_usd must be >= 0");
    await this.store.insert(entry);
  }

  /**
   * Convenience wrapper for dataforseo.service: cap check → run → ledger.
   * The runner reports the ACTUAL cost so the ledger stays honest.
   */
  async guarded<T>(
    endpoint: string,
    estimatedCostUsd: number,
    run: () => Promise<{ result: T; actualCostUsd: number; taskId?: string | null }>
  ): Promise<T> {
    await this.assertCanSpend(estimatedCostUsd);
    const { result, actualCostUsd, taskId } = await run();
    await this.record({ endpoint, cost_usd: actualCostUsd, task_id: taskId ?? null });
    return result;
  }
}
