import { supabase } from "@/lib/supabase";
import type { Landlord, Language, ReminderTone } from "@/types/domain";

export const OFFLINE_MESSAGE = "You are offline. Connect to the internet to sign in.";

/** Turns a Supabase auth error into plain language. */
export function authErrorMessage(error: unknown, step: "send" | "verify"): string {
  if (typeof navigator !== "undefined" && !navigator.onLine) return OFFLINE_MESSAGE;
  const e = (error ?? {}) as { code?: string; status?: number; name?: string; message?: string };
  const message = (e.message ?? "").toLowerCase();
  if (e.name === "AuthRetryableFetchError" || message.includes("failed to fetch")) {
    return OFFLINE_MESSAGE;
  }
  if (e.status === 429 || e.code?.startsWith("over_") || message.includes("rate limit")) {
    return "Too many tries. Wait a few minutes and try again.";
  }
  if (step === "verify") {
    if (message.includes("expired") && !message.includes("invalid")) {
      return "This code has expired. Ask for a new code.";
    }
    return "That code is not right, or it has expired. Check the SMS or ask for a new code.";
  }
  return "We could not send the SMS. Check the number and try again in a moment.";
}

export async function sendCode(e164: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({ phone: e164 });
  if (error) throw error;
}

export async function verifyCode(e164: string, token: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({ phone: e164, token, type: "sms" });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function fetchLandlord(userId: string): Promise<Landlord | null> {
  const { data, error } = await supabase
    .from("landlords")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as Landlord | null;
}

export async function updateLandlordPreferences(
  landlordId: string,
  preferences: { language?: Language; reminder_tone?: ReminderTone; upcoming_reminder_days?: number },
): Promise<void> {
  const { error } = await supabase.from("landlords").update(preferences).eq("id", landlordId);
  if (error) throw error;
}
