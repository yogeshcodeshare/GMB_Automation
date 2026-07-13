/** Shared service-level errors (framework-free — importable from anywhere). */

export class FeatureDisabledError extends Error {
  readonly code = "FEATURE_DISABLED" as const;
  constructor(message: string) {
    super(message);
    this.name = "FeatureDisabledError";
  }
}

/** CR-1 — the live-data master switch is OFF (settings.dataforseo_live_enabled,
 * default false). Thrown at the DataForSEO client entry BEFORE any spend
 * reservation or network call. HTTP 503. */
export class LiveDataDisabledError extends Error {
  readonly code = "LIVE_DATA_DISABLED" as const;
  constructor() {
    super("Live data is off — enable in Settings → Data sources.");
    this.name = "LiveDataDisabledError";
  }
}
