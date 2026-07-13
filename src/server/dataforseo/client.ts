import type { CostPreview } from "@/types";
import { COST_USD, toInr } from "@/server/costs";
import { makeSpendGuard, type SpendGuard } from "@/server/spend";
import { makeLiveGate } from "@/server/settings/live-flag";
import { createServiceClient } from "@/lib/supabase/server";
import { dataForSeoCredentials } from "@/lib/env";
import type {
  DfsEnvelope,
  RawBusinessInfo,
  RawKeywordVolume,
  RawMapsResult,
  RawReviewsResult,
  RawUpdatesResult,
} from "./types";

/**
 * dataforseo.service — the ONLY module that talks to the ONLY paid vendor.
 * Hard constraint #2: every request runs inside SpendGuard.guarded()
 * (atomic cap-check + reservation BEFORE the call, settled with the actual
 * vendor cost after). Every paid method supports `{ preview: true }` and
 * then returns a CostPreview without touching the network or the ledger.
 * Credentials are used only to build the Authorization header — never
 * logged, never echoed into errors.
 */

const BASE_URL = "https://api.dataforseo.com/v3";
const MAX_ATTEMPTS = 3; // 1 try + 2 retries (Day-1 brief: "retry ×2")
// 20100 Task Created (task_post ack) · 40601 Task Handed · 40602 In Progress
const PENDING_STATUS = new Set([20100, 40601, 40602]);

export class DfsConfigError extends Error {
  readonly code = "FEATURE_DISABLED" as const;
  constructor() {
    super(
      "DataForSEO credentials missing — set DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD (names only; never print values)."
    );
    this.name = "DfsConfigError";
  }
}

export class DfsUpstreamError extends Error {
  readonly code = "UPSTREAM_ERROR" as const;
  constructor(message: string, readonly statusCode?: number) {
    super(message);
    this.name = "DfsUpstreamError";
  }
}

export class DfsTimeoutError extends Error {
  readonly code = "UPSTREAM_TIMEOUT" as const;
  constructor(readonly taskId: string, readonly endpoint: string) {
    super(`DataForSEO task ${taskId} (${endpoint}) did not finish in time.`);
    this.name = "DfsTimeoutError";
  }
}

export interface DfsClientDeps {
  guard: SpendGuard;
  credentials: { login: string; password: string } | null;
  /** CR-1 live-data master switch: awaited at EVERY paid entry BEFORE the
   * spend reserve and before any network I/O. Throws LiveDataDisabledError
   * while settings.dataforseo_live_enabled is false (the default). */
  liveGate?: () => Promise<void>;
  fetchImpl?: typeof fetch;
  pollIntervalMs?: number;
  maxPollMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

export interface PreviewOpts {
  preview: true;
}

function preview(costUsd: number, item: string): CostPreview {
  return {
    estimated_cost_usd: costUsd,
    estimated_cost_inr: toInr(costUsd),
    breakdown: [{ item, cost_usd: costUsd }],
  };
}

/** Conservative estimate for a reviews task (base + per-10-reviews units). */
export function reviewsEstimateUsd(depth: number): number {
  return COST_USD.reviews_task * (1 + Math.ceil(depth / 10));
}

export interface MyBusinessQuery {
  keyword: string; // "business name city" or "cid:123…"
  location_code?: number;
  language_code?: string;
}

export interface SerpMapsQuery {
  keyword: string;
  /** "lat,lng,zoom" — the grid/teleport pin. */
  location_coordinate?: string;
  location_code?: number;
  language_code?: string;
  depth?: number;
}

export class DataForSeoClient {
  private readonly fetchImpl: typeof fetch;
  private readonly pollIntervalMs: number;
  private readonly maxPollMs: number;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(private readonly deps: DfsClientDeps) {
    this.fetchImpl = deps.fetchImpl ?? fetch;
    this.pollIntervalMs = deps.pollIntervalMs ?? 3_000;
    this.maxPollMs = deps.maxPollMs ?? 180_000;
    this.sleep =
      deps.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  // ---------- transport ----------

  private authHeader(): string {
    const creds = this.deps.credentials;
    if (!creds) throw new DfsConfigError();
    return `Basic ${Buffer.from(`${creds.login}:${creds.password}`).toString("base64")}`;
  }

  /**
   * POST (or GET when body omitted) with ×2 retry on network/5xx.
   * `retry: false` (task_post!) sends EXACTLY ONE request: a 5xx after a
   * server-side success would otherwise create a duplicate, double-charged
   * task (Day-2 review follow-up). Live endpoints keep the retry — same
   * theoretical risk, but their failure rate dominates and the ledger's
   * conservative settle keeps cap math honest either way.
   */
  private async request<R>(
    path: string,
    body?: unknown,
    opts: { retry?: boolean } = {}
  ): Promise<DfsEnvelope<R>> {
    const auth = this.authHeader();
    const maxAttempts = opts.retry === false ? 1 : MAX_ATTEMPTS;
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await this.fetchImpl(`${BASE_URL}/${path}`, {
          method: body === undefined ? "GET" : "POST",
          headers: {
            Authorization: auth,
            "Content-Type": "application/json",
          },
          body: body === undefined ? undefined : JSON.stringify([body]),
        });
        if (res.status >= 500) {
          lastError = new DfsUpstreamError(
            `DataForSEO HTTP ${res.status} on ${path}`,
            res.status
          );
          continue; // retryable (loop ends immediately when maxAttempts = 1)
        }
        if (!res.ok) {
          throw new DfsUpstreamError(
            `DataForSEO HTTP ${res.status} on ${path}`,
            res.status
          );
        }
        const json = (await res.json()) as DfsEnvelope<R>;
        if (json.status_code !== 20000) {
          throw new DfsUpstreamError(
            `DataForSEO error ${json.status_code}: ${json.status_message} (${path})`,
            json.status_code
          );
        }
        return json;
      } catch (err) {
        // HTTP 5xx never throws inside the loop (it `continue`s above), so any
        // DfsUpstreamError here is a vendor-level/4xx error — not retryable.
        if (err instanceof DfsUpstreamError) throw err;
        lastError = err; // network/parse failure — retry
        if (attempt < maxAttempts) await this.sleep(250 * attempt);
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new DfsUpstreamError(`DataForSEO request failed (${path})`);
  }

  private firstTask<R>(envelope: DfsEnvelope<R>, path: string) {
    const task = envelope.tasks?.[0];
    if (!task) throw new DfsUpstreamError(`DataForSEO returned no task (${path})`);
    if (task.status_code !== 20000 && !PENDING_STATUS.has(task.status_code)) {
      throw new DfsUpstreamError(
        `DataForSEO task error ${task.status_code}: ${task.status_message} (${path})`,
        task.status_code
      );
    }
    return task;
  }

  /** Live endpoints: one guarded POST, cost settled from the response. */
  private async liveCall<R>(
    path: string,
    estimateUsd: number,
    body: unknown
  ): Promise<R[]> {
    if (this.deps.liveGate) await this.deps.liveGate(); // CR-1: before everything
    this.authHeader(); // fail fast on missing creds BEFORE reserving spend
    return this.deps.guard.guarded(path, estimateUsd, async () => {
      const envelope = await this.request<R>(path, body);
      const task = this.firstTask(envelope, path);
      return {
        result: task.result ?? [],
        actualCostUsd: task.cost ?? envelope.cost ?? estimateUsd,
        taskId: task.id ?? null,
      };
    });
  }

  /**
   * Standard (queued) endpoints: guarded task_post — the charge happens
   * there — then FREE task_get polling outside the guard.
   */
  private async taskCall<R>(
    postPath: string,
    getPath: (taskId: string) => string,
    estimateUsd: number,
    body: unknown
  ): Promise<R[]> {
    if (this.deps.liveGate) await this.deps.liveGate(); // CR-1: before everything
    this.authHeader();
    const posted = await this.deps.guard.guarded(postPath, estimateUsd, async () => {
      // NO transport retry on task_post — a duplicate would double-charge.
      const envelope = await this.request<R>(postPath, body, { retry: false });
      const task = this.firstTask(envelope, postPath);
      return {
        result: task.id,
        actualCostUsd: task.cost ?? envelope.cost ?? estimateUsd,
        taskId: task.id ?? null,
      };
    });

    const deadline = Date.now() + this.maxPollMs;
    for (;;) {
      const envelope = await this.request<R>(getPath(posted));
      const task = this.firstTask(envelope, getPath(posted));
      if (task.status_code === 20000 && task.result !== null) {
        return task.result;
      }
      if (Date.now() >= deadline) throw new DfsTimeoutError(posted, postPath);
      await this.sleep(this.pollIntervalMs);
    }
  }

  // ---------- §2.6 endpoints ----------

  /** Audit target / competitor profile (live, ~$0.002). */
  myBusinessInfo(q: MyBusinessQuery, opts: PreviewOpts): Promise<CostPreview>;
  myBusinessInfo(q: MyBusinessQuery): Promise<RawBusinessInfo | null>;
  async myBusinessInfo(
    q: MyBusinessQuery,
    opts?: Partial<PreviewOpts>
  ): Promise<RawBusinessInfo | null | CostPreview> {
    const path = "business_data/google/my_business_info/live";
    if (opts?.preview) return preview(COST_USD.my_business_info, path);
    const results = await this.liveCall<{ items?: RawBusinessInfo[] }>(
      path,
      COST_USD.my_business_info,
      { language_code: "en", ...q }
    );
    return results[0]?.items?.[0] ?? null;
  }

  /** Last N reviews (standard mode task). */
  reviews(
    q: { keyword?: string; cid?: string; place_id?: string; depth?: number },
    opts: PreviewOpts
  ): Promise<CostPreview>;
  reviews(q: {
    keyword?: string;
    cid?: string;
    place_id?: string;
    depth?: number;
  }): Promise<RawReviewsResult | null>;
  async reviews(
    q: { keyword?: string; cid?: string; place_id?: string; depth?: number },
    opts?: Partial<PreviewOpts>
  ): Promise<RawReviewsResult | null | CostPreview> {
    const depth = q.depth ?? 30;
    const postPath = "business_data/google/reviews/task_post";
    if (opts?.preview) return preview(reviewsEstimateUsd(depth), postPath);
    const results = await this.taskCall<RawReviewsResult>(
      postPath,
      (id) => `business_data/google/reviews/task_get/${id}`,
      reviewsEstimateUsd(depth),
      { language_code: "en", depth, sort_by: "newest", ...q }
    );
    return results[0] ?? null;
  }

  /** GBP posts for ANY profile (standard mode task). */
  myBusinessUpdates(
    q: { keyword?: string; cid?: string; depth?: number },
    opts: PreviewOpts
  ): Promise<CostPreview>;
  myBusinessUpdates(q: {
    keyword?: string;
    cid?: string;
    depth?: number;
  }): Promise<RawUpdatesResult | null>;
  async myBusinessUpdates(
    q: { keyword?: string; cid?: string; depth?: number },
    opts?: Partial<PreviewOpts>
  ): Promise<RawUpdatesResult | null | CostPreview> {
    const postPath = "business_data/google/my_business_updates/task_post";
    if (opts?.preview) return preview(COST_USD.my_business_updates, postPath);
    const results = await this.taskCall<RawUpdatesResult>(
      postPath,
      (id) => `business_data/google/my_business_updates/task_get/${id}`,
      COST_USD.my_business_updates,
      { language_code: "en", depth: q.depth ?? 20, ...q }
    );
    return results[0] ?? null;
  }

  /** Maps SERP — resolver, grid points, Teleport. */
  serpMaps(
    q: SerpMapsQuery,
    mode: "standard" | "live",
    opts: PreviewOpts
  ): Promise<CostPreview>;
  serpMaps(q: SerpMapsQuery, mode?: "standard" | "live"): Promise<RawMapsResult | null>;
  async serpMaps(
    q: SerpMapsQuery,
    mode: "standard" | "live" = "standard",
    opts?: Partial<PreviewOpts>
  ): Promise<RawMapsResult | null | CostPreview> {
    const estimate =
      mode === "live" ? COST_USD.serp_maps_live : COST_USD.serp_maps_standard;
    const body = { language_code: "en", depth: q.depth ?? 20, ...q };
    if (mode === "live") {
      const path = "serp/google/maps/live/advanced";
      if (opts?.preview) return preview(estimate, path);
      const results = await this.liveCall<RawMapsResult>(path, estimate, body);
      return results[0] ?? null;
    }
    const postPath = "serp/google/maps/task_post";
    if (opts?.preview) return preview(estimate, postPath);
    const results = await this.taskCall<RawMapsResult>(
      postPath,
      (id) => `serp/google/maps/task_get/advanced/${id}`,
      estimate,
      body
    );
    return results[0] ?? null;
  }

  /** Local Finder — competitor discovery (standard mode). */
  localFinder(q: SerpMapsQuery, opts: PreviewOpts): Promise<CostPreview>;
  localFinder(q: SerpMapsQuery): Promise<RawMapsResult | null>;
  async localFinder(
    q: SerpMapsQuery,
    opts?: Partial<PreviewOpts>
  ): Promise<RawMapsResult | null | CostPreview> {
    const postPath = "serp/google/local_finder/task_post";
    if (opts?.preview) return preview(COST_USD.local_finder, postPath);
    const results = await this.taskCall<RawMapsResult>(
      postPath,
      (id) => `serp/google/local_finder/task_get/advanced/${id}`,
      COST_USD.local_finder,
      { language_code: "en", depth: q.depth ?? 20, ...q }
    );
    return results[0] ?? null;
  }

  /** Category/keyword search volume (live, fractions of a paisa/keyword). */
  keywordsData(
    keywords: string[],
    opts: PreviewOpts & { location_code?: number }
  ): Promise<CostPreview>;
  keywordsData(
    keywords: string[],
    opts?: { location_code?: number }
  ): Promise<RawKeywordVolume[]>;
  async keywordsData(
    keywords: string[],
    opts?: { preview?: boolean; location_code?: number }
  ): Promise<RawKeywordVolume[] | CostPreview> {
    const path = "keywords_data/google_ads/search_volume/live";
    const estimate = Math.max(1, keywords.length) * COST_USD.keywords_data_per_kw;
    if (opts?.preview) return preview(estimate, path);
    const results = await this.liveCall<RawKeywordVolume>(path, estimate, {
      keywords,
      location_code: opts?.location_code ?? 2356, // India
      language_code: "en",
    });
    return results;
  }
}

/** Server-side factory wired to live guard + env credentials + the CR-1
 * live-data master switch (default OFF). */
export function makeDataForSeoClient(): DataForSeoClient {
  return new DataForSeoClient({
    guard: makeSpendGuard(),
    credentials: dataForSeoCredentials(),
    liveGate: makeLiveGate(createServiceClient()),
  });
}
