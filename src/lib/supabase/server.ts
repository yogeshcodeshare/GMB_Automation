import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Session-aware server client (publishable key + auth cookies).
 * Use for "who is logged in" checks in server components / route handlers.
 */
export function createSessionClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY missing in env.");
  }
  const cookieStore = cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component — session refresh is handled by middleware.
        }
      },
    },
  });
}

/**
 * Service client — SECRET key, bypasses RLS. SERVER ONLY (ADR-005).
 * Never import from client components; never expose the key.
 */
export function createServiceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SECRET_KEY missing in env.");
  }
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
