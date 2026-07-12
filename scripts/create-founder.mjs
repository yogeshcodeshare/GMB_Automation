/**
 * Create the single founder auth user (MS0-T04).
 * Usage: npm run create-founder -- founder@example.com "a-strong-password"
 * Reads SUPABASE_URL + SUPABASE_SECRET_KEY from .env.local. Never prints keys.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { fileURLToPath } from "node:url";

config({ path: fileURLToPath(new URL("../.env.local", import.meta.url)) });

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error('Usage: npm run create-founder -- <email> "<password>"');
  process.exit(1);
}
const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  console.error("SUPABASE_URL / SUPABASE_SECRET_KEY missing — fill .env.local first.");
  process.exit(1);
}

const supabase = createClient(url, secret, { auth: { persistSession: false } });
const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (error) {
  console.error(`Failed: ${error.message}`);
  process.exit(1);
}
console.log(`Founder user created: ${data.user?.email} (id ${data.user?.id})`);
console.log("You can now sign in at /login.");
