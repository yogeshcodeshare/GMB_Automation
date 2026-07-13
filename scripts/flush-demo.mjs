/**
 * Flush demo/seed data before go-live (Day-7 launch checklist).
 * Deletes every business WHERE is_demo = true — ON DELETE CASCADE removes its
 * audits, scores, reviews, posts, grid scans/points, website audits, sprints,
 * fix tasks, service cycles, media, review requests, gbp connections — plus the
 * four seed public-checker leads. Real data (is_demo = false) is never touched.
 *
 * SAFE BY DEFAULT: dry-run (counts only). Pass --yes to actually delete.
 *   npm run flush:demo            # dry run — shows what would go
 *   npm run flush:demo -- --yes   # actually delete
 *
 * Reads SUPABASE_URL + SUPABASE_SECRET_KEY from .env.local. Never prints keys.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { fileURLToPath } from "node:url";

config({ path: fileURLToPath(new URL("../.env.local", import.meta.url)) });

const CONFIRM = process.argv.includes("--yes");
const SEED_LEAD_PHONES = [
  "+919000000101",
  "+919000000102",
  "+919000000103",
  "+919000000104",
];

const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  console.error("SUPABASE_URL / SUPABASE_SECRET_KEY missing — fill .env.local first.");
  process.exit(1);
}
const supabase = createClient(url, secret, { auth: { persistSession: false } });

// Count what would go (guards against the is_demo migration not being applied).
const { data: demoBiz, error: bizErr } = await supabase
  .from("businesses")
  .select("id, name")
  .eq("is_demo", true);
if (bizErr) {
  const hint = /column .*is_demo.* does not exist/i.test(bizErr.message)
    ? " — apply supabase/migrations/20260713000002_is_demo.sql first"
    : "";
  console.error(`Cannot read is_demo businesses: ${bizErr.message}${hint}`);
  process.exit(1);
}

const { count: leadCount } = await supabase
  .from("leads_public")
  .select("id", { count: "exact", head: true })
  .in("phone", SEED_LEAD_PHONES);

console.log(`\nDemo businesses to delete (cascade removes all their data): ${demoBiz.length}`);
for (const b of demoBiz) console.log(`  - ${b.name} (${b.id})`);
console.log(`Seed public-checker leads to delete: ${leadCount ?? 0}`);

if (!CONFIRM) {
  console.log("\nDRY RUN — nothing deleted. Re-run with:  npm run flush:demo -- --yes");
  process.exit(0);
}

// Delete. businesses cascade handles all dependents; leads are standalone.
const { error: delBizErr, count: delBiz } = await supabase
  .from("businesses")
  .delete({ count: "exact" })
  .eq("is_demo", true);
if (delBizErr) {
  console.error(`Business delete failed: ${delBizErr.message}`);
  process.exit(1);
}
const { error: delLeadErr, count: delLeads } = await supabase
  .from("leads_public")
  .delete({ count: "exact" })
  .in("phone", SEED_LEAD_PHONES);
if (delLeadErr) {
  console.error(`Lead delete failed: ${delLeadErr.message}`);
  process.exit(1);
}

console.log(`\n✓ Flushed ${delBiz ?? 0} demo businesses (+ cascaded data) and ${delLeads ?? 0} seed leads.`);
console.log("Next launch-checklist steps: delete the app/public/dev route, then run one real audit.");
