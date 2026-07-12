"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser client — publishable key only (safe to expose by design).
 * Values are inlined at build time via next.config.mjs `env` mapping.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase browser env missing — set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in .env.local and restart the dev server."
    );
  }
  return createBrowserClient(url, key);
}
