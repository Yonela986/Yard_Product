import { z } from "zod";

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
  VITE_PUBLIC_APP_URL: z.string().url().optional().or(z.literal("")),
});

export type Env = z.infer<typeof envSchema>;

export type EnvResult = { ok: true; env: Env } | { ok: false; missing: string[] };

// Public project defaults. The anon key is a publishable key (RLS protects data),
// so it is safe in the bundle. Env vars override these when set.
const DEFAULT_SUPABASE_URL = "https://pqgimjlsksisvfhvdcxx.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxZ2ltamxza3Npc3ZmaHZkY3h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2NTUyOTIsImV4cCI6MjEwNzIzMTI5Mn0.7OCq5_jdmHTF5byHUgEqwRW8463HTFmTEglBQxa21-A";

function pick(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() !== "" ? value : fallback;
}

function readEnv(): EnvResult {
  const parsed = envSchema.safeParse({
    VITE_SUPABASE_URL: pick(import.meta.env["VITE_SUPABASE_URL"], DEFAULT_SUPABASE_URL),
    VITE_SUPABASE_ANON_KEY: pick(
      import.meta.env["VITE_SUPABASE_ANON_KEY"],
      DEFAULT_SUPABASE_ANON_KEY,
    ),
    VITE_PUBLIC_APP_URL: import.meta.env["VITE_PUBLIC_APP_URL"],
  });
  if (parsed.success) return { ok: true, env: parsed.data };
  const missing = [...new Set(parsed.error.issues.map((i) => String(i.path[0])))];
  return { ok: false, missing };
}

export const envResult: EnvResult = readEnv();

export function requireEnv(): Env {
  if (!envResult.ok) {
    throw new Error(`Missing or invalid environment variable: ${envResult.missing.join(", ")}`);
  }
  return envResult.env;
}
