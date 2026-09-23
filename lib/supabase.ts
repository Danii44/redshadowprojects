import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: { persistSession: true, autoRefreshToken: true },
      })
    : null;

// Sync auth session to document cookies so server proxy can authenticate requests
if (typeof window !== "undefined" && supabase) {
  supabase.auth.onAuthStateChange((event, session) => {
    if (session?.access_token) {
      document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=${
        60 * 60 * 24 * 7
      }; SameSite=Lax`;
    } else if (event === "SIGNED_OUT") {
      document.cookie =
        "sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;";
    }
  });
}
