import { createServiceClient } from "@/lib/supabase/server";
import { envDailySpendCapUsd } from "@/lib/env";
import { SpendGuard } from "./guard";
import { SupabaseSpendStore } from "./store";

export * from "./guard";
export * from "./store";

/** Server-side factory: guard wired to the live spend_ledger + settings. */
export function makeSpendGuard(): SpendGuard {
  return new SpendGuard(new SupabaseSpendStore(createServiceClient()), {
    envCapUsd: envDailySpendCapUsd(),
  });
}
