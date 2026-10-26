import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

import { envResult } from "./env";

// When env is missing the root shows a setup screen, so this placeholder is never called.
const env = envResult.ok
  ? envResult.env
  : { VITE_SUPABASE_URL: "http://localhost.invalid", VITE_SUPABASE_ANON_KEY: "missing" };

/** The one typed Supabase client. Uses the public anon key only. */
export const supabase = createClient<Database>(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
