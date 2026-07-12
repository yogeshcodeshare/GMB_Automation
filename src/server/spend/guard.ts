/**
 * Spend guard — hard constraint #2 (EP-012 / TB-010).
 * Every DataForSEO call goes through `guarded()`: an ATOMIC cap-check +
 * reservation happens in the store BEFORE the call (fixing the TOCTOU race
 * where concurrent batch calls could overshoot the cap), and the reservation
 * is settled with the ACTUAL cost after. A failed call keeps the conservative
 * estimate on the books — the vendor may have billed it.
 *
 * "Daily" = the founder's calendar day, Asia/Kolkata (UTC+05:30, no DST).
 */

export interface SpendEntry {
  endpoint: string;
  cost_usd: number;
  task_id?: string | null;
}

export interface SpendStore {
  /** Sum of cost_usd for ledger rows created at/after `sinceIso` (computed DB-side). */
  sumSince(sinceIso: string): Promise<number>;
  /** Append one ledger row (TB-010) — for non-guarded records (e.g. verify pings). */
  insert(entry: SpendEntry): Promise<void>;
  /** Cap from settings (TB-011); null when the settings row is absent. */
  getDailyCapUsd(): Promise<number | null>;
  /**
   * ATOMIC cap-check + reservation insert for a paid call. Returns the
   * reservation row id; throws SpendCapError when the call must not run.
   * Estimate 0 (free calls) always reserves and is never blocked.
   */
  reserve(
    endpoint: string,
    estimateUsd: number,
    capUsd: number,
    sinceIso: string
  ): Promise<number>;
  /** Replace a reservation's estimate with the actual cost + task id. */
  settle(
    reservationId: number,
    endpoint: string,
    actualUsd: number,
    taskId: string | null
  ): Promise<void>;
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
/** Tolerance for floating-point cost sums (errs toward blocking). */
export const CAP_EPSILON = 1e-9;

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
      blocked: spent >= cap - CAP_EPSILON,
    };
  }

  /**
   * Read-only pre-check for cost previews and UI state. NOT the enforcement
   * path — enforcement is the atomic reserve inside `guarded()`.
   */
  async assertCanSpend(estimatedCostUsd: number): Promise<void> {
    if (estimatedCostUsd < 0) {
      throw new RangeError("estimatedCostUsd must be >= 0");
    }
    if (estimatedCostUsd === 0) return;
    const { spent_usd, cap_usd } = await this.getStatus();
    if (
      spent_usd >= cap_usd - CAP_EPSILON ||
      spent_usd + estimatedCostUsd > cap_usd + CAP_EPSILON
    ) {
      throw new SpendCapError(spent_usd, cap_usd, estimatedCostUsd);
    }
  }

  /** Record a call directly (TB-010) — for free pings and backfills. */
  async record(entry: SpendEntry): Promise<void> {
    if (entry.cost_usd < 0) throw new RangeError("cost_usd must be >= 0");
    await this.store.insert(entry);
  }

  /**
   * THE enforcement path for dataforseo.service:
   * atomic reserve (throws SpendCapError) → run → settle with actual cost.
   * On run failure the reservation keeps the conservative estimate — the
   * vendor may have billed the task even though we failed to parse/receive it.
   */
  async guarded<T>(
    endpoint: string,
    estimatedCostUsd: number,
    run: () => Promise<{ result: T; actualCostUsd: number; taskId?: string | null }>
  ): Promise<T> {
    if (estimatedCostUsd < 0) {
      throw new RangeError("estimatedCostUsd must be >= 0");
    }
    const capUsd = await this.resolveCapUsd();
    const since = startOfTodayIst(this.now()).toISOString();
    const reservationId = await this.store.reserve(
      endpoint,
      estimatedCostUsd,
      capUsd,
      since
    );
    try {
      const { result, actualCostUsd, taskId } = await run();
      if (estimatedCostUsd === 0 && actualCostUsd > 0) {
        console.warn(
          `[spend-guard] endpoint "${endpoint}" was estimated FREE but billed $${actualCostUsd} — fix its cost-table entry (src/server/costs.ts), it is bypassing the cap check.`
        );
      }
      await this.store.settle(
        reservationId,
        endpoint,
        Math.max(actualCostUsd, 0),
        taskId ?? null
      );
      return result;
    } catch (err) {
      try {
        await this.store.settle(
          reservationId,
          `${endpoint} (failed)`,
          estimatedCostUsd,
          null
        );
      } catch {
        // Settle failed — the reservation row already holds the estimate,
        // so the ledger stays conservative either way.
      }
      throw err;
    }
  }
}
