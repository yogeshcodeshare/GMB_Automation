/** TB-010/011 + EP-012 spend guard shapes. */

export interface SpendLedgerEntry {
  id: number;
  endpoint: string;
  cost_usd: number;
  task_id: string | null;
  created_at: string;
}

/** EP-012 response — feeds the spend pill and the global cap-hit banner. */
export interface SpendToday {
  spent_usd: number;
  cap_usd: number;
  remaining_usd: number;
  blocked: boolean;
}

/** TB-011 settings (single row). */
export interface Settings {
  daily_spend_cap_usd: number;
  public_daily_limit: number;
  per_ip_limit: number;
  model_chain: string[];
}
