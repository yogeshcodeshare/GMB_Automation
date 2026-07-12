/**
 * M0 exit verification (run AFTER applying supabase/migrations/*.sql):
 *   1. env keys present (names only — values are never printed)
 *   2. Supabase reachable; settings + seed rows exist; RLS blocks anon reads
 *   3. DataForSEO reachable via the FREE balance endpoint (appendix/user_data)
 *   4. the test call is logged to spend_ledger (cost $0) — M0 exit criterion
 *   5. spend-today math works
 * Usage: npm run m0:verify
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { fileURLToPath } from "node:url";

config({ path: fileURLToPath(new URL("../.env.local", import.meta.url)) });

const results = [];
const ok = (name, detail = "") => results.push({ name, pass: true, detail });
const fail = (name, detail = "") => results.push({ name, pass: false, detail });

// 1 — env presence
const required = [
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "DATAFORSEO_LOGIN",
  "DATAFORSEO_PASSWORD",
  "DAILY_SPEND_CAP_USD",
];
for (const name of required) {
  process.env[name] ? ok(`env ${name}`) : fail(`env ${name}`, "missing in .env.local");
}

const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const publishable = process.env.SUPABASE_PUBLISHABLE_KEY;

// 2 — Supabase schema + seed + RLS
let service;
if (url && secret) {
  service = createClient(url, secret, { auth: { persistSession: false } });
  try {
    const { data: settings, error } = await service
      .from("settings")
      .select("daily_spend_cap_usd, public_daily_limit, per_ip_limit")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    settings
      ? ok("settings row (TB-011)", `cap $${settings.daily_spend_cap_usd}`)
      : fail("settings row (TB-011)", "run the seed migration");

    const { count, error: bizErr } = await service
      .from("businesses")
      .select("id", { count: "exact", head: true });
    if (bizErr) throw new Error(bizErr.message);
    count === 6
      ? ok("6 seed businesses (§2.9)")
      : fail("6 seed businesses (§2.9)", `found ${count ?? 0}`);

    const anon = createClient(url, publishable, { auth: { persistSession: false } });
    const { data: anonRows } = await anon.from("businesses").select("id");
    (anonRows ?? []).length === 0
      ? ok("RLS blocks anon reads")
      : fail("RLS blocks anon reads", `anon saw ${anonRows.length} rows!`);
  } catch (err) {
    fail("Supabase schema", `${err.message} — apply supabase/migrations/*.sql in the SQL editor`);
  }
}

// 3 + 4 — DataForSEO free ping, logged to the ledger (M0 exit criterion)
if (process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD && service) {
  try {
    const auth = Buffer.from(
      `${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`
    ).toString("base64");
    const res = await fetch("https://api.dataforseo.com/v3/appendix/user_data", {
      headers: { Authorization: `Basic ${auth}` },
    });
    const body = await res.json();
    const money = body?.tasks?.[0]?.result?.[0]?.money;
    if (res.ok && body.status_code === 20000) {
      ok("DataForSEO reachable (free balance ping)", `balance $${money?.balance ?? "?"}`);
      const { error: ledgerErr } = await service.from("spend_ledger").insert({
        endpoint: "appendix/user_data (m0-verify test call)",
        cost_usd: 0,
        task_id: null,
      });
      ledgerErr
        ? fail("test call logged to spend_ledger", ledgerErr.message)
        : ok("test call logged to spend_ledger (TB-010) — M0 exit criterion");
    } else {
      fail("DataForSEO reachable", `status ${body?.status_code ?? res.status} — check credentials/trial`);
    }
  } catch (err) {
    fail("DataForSEO reachable", err.message);
  }
}

// 5 — spend today math
if (service) {
  try {
    const istDayStart = new Date(
      Math.floor((Date.now() + 330 * 60_000) / 86_400_000) * 86_400_000 - 330 * 60_000
    ).toISOString();
    const { data, error } = await service
      .from("spend_ledger")
      .select("cost_usd")
      .gte("created_at", istDayStart);
    if (error) throw new Error(error.message);
    const spent = (data ?? []).reduce((s, r) => s + Number(r.cost_usd), 0);
    ok("spend today computed", `$${spent.toFixed(4)} across ${data.length} call(s)`);
  } catch (err) {
    fail("spend today computed", err.message);
  }
}

console.log("\n=== M0 VERIFY ===");
for (const r of results) {
  console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
}
const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
