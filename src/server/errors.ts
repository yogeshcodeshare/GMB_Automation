/** Shared service-level errors (framework-free — importable from anywhere). */

export class FeatureDisabledError extends Error {
  readonly code = "FEATURE_DISABLED" as const;
  constructor(message: string) {
    super(message);
    this.name = "FeatureDisabledError";
  }
}
