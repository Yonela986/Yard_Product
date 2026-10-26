import { subDays } from "date-fns";

import { supabase } from "@/lib/supabase";
import type { Language, MessageKind, MessageLogEntry } from "@/types/domain";

export interface RecordMessageInput {
  tenantId: string;
  kind: MessageKind;
  language: Language;
  paymentId?: string;
}

export async function recordMessageOpened(input: RecordMessageInput): Promise<void> {
  const { error } = await supabase.from("message_log").insert({
    tenant_id: input.tenantId,
    kind: input.kind,
    language: input.language,
    ...(input.paymentId ? { payment_id: input.paymentId } : {}),
  });
  if (error) throw error;
}

export async function listRecentMessageLog(): Promise<MessageLogEntry[]> {
  const since = subDays(new Date(), 30).toISOString();
  const { data, error } = await supabase
    .from("message_log")
    .select("*")
    .gte("created_at", since)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MessageLogEntry[];
}
