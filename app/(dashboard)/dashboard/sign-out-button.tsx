"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={signOut}
      className="rounded-lg border-[1.5px] border-brand px-4 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand hover:text-white"
    >
      Sign out
    </button>
  );
}
