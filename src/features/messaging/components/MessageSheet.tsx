import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Sheet } from "@/components/ui/Sheet";
import { todayInSA } from "@/lib/dates";
import { buildWhatsAppUrl } from "@/features/messaging/whatsapp";
import { LANGUAGE_LABELS } from "@/types/domain";
import type {
  Language,
  Landlord,
  Payment,
  ReminderWording,
  Room,
  Tenant,
  TenantBalance,
} from "@/types/domain";

import { composeReceipt, composeReminder, composeWelcome } from "../compose";
import { TRANSLATION_REVIEWED } from "../templates";
import { useRecordMessageOpened } from "../hooks";

export type MessageSheetMode =
  | { kind: "welcome"; tenant: Tenant; room: Room }
  | { kind: "reminder"; tenant: Tenant; room: Room; balance: TenantBalance }
  | { kind: "receipt"; tenant: Tenant; room: Room; payment: Payment };

interface MessageSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: MessageSheetMode;
  landlord: Landlord;
  accessToken?: string;
  onOpened?: () => void;
}

const languageOptions = Object.entries(LANGUAGE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export function MessageSheet({
  open,
  onOpenChange,
  mode,
  landlord,
  accessToken,
  onOpened,
}: MessageSheetProps) {
  const [language, setLanguage] = useState<Language>(mode.tenant.language);
  const [wording, setWording] = useState<ReminderWording>(landlord.reminder_tone);
  const [copyState, setCopyState] = useState<"copied" | "error" | null>(null);
  const recordMessage = useRecordMessageOpened();
  const lateReminder =
    mode.kind === "reminder" && mode.balance.balanceCents > 0 && mode.balance.overdueCents > 0;

  useEffect(() => {
    if (open) {
      setLanguage(mode.tenant.language);
      setWording(landlord.reminder_tone);
      setCopyState(null);
    }
  }, [open, mode.tenant.language, landlord.reminder_tone]);

  const composedResult = useMemo(() => {
    try {
      const selectedTenant =
        accessToken === undefined ? mode.tenant : { ...mode.tenant, access_token: accessToken };
      if (mode.kind === "welcome") {
        return { composed: composeWelcome(selectedTenant, mode.room, language), error: "" };
      }
      if (mode.kind === "reminder") {
        return {
          composed: composeReminder(
            selectedTenant,
            mode.room,
            mode.balance,
            lateReminder ? wording : "friendly",
            todayInSA(),
            language,
          ),
          error: "",
        };
      }
      return {
        composed: composeReceipt(selectedTenant, mode.room, mode.payment, language),
        error: "",
      };
    } catch (error) {
      return {
        composed: null,
        error: error instanceof Error ? error.message : "The message could not be prepared.",
      };
    }
  }, [accessToken, language, lateReminder, mode, wording]);
  const { composed, error: composeError } = composedResult;

  const linkResult = useMemo(() => {
    if (!composed) return { url: "", error: "" };
    try {
      return { url: buildWhatsAppUrl(mode.tenant.phone, composed.text), error: "" };
    } catch (error) {
      return {
        url: "",
        error: error instanceof Error ? error.message : "The WhatsApp link is invalid.",
      };
    }
  }, [composed, mode.tenant.phone]);
  const whatsappUrl = linkResult.url;

  async function copyMessage() {
    if (!composed) return;
    try {
      await navigator.clipboard.writeText(composed.text);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  const first = mode.tenant.name.trim().split(/\s+/)[0] ?? mode.tenant.name;
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Message to ${first}`}
      description="Review the message before opening WhatsApp."
    >
      <div className="space-y-4">
        <Select
          label="Language"
          value={language}
          onChange={(event) => setLanguage(event.target.value as Language)}
          options={languageOptions}
        />
        {mode.kind === "reminder" && lateReminder && (
          <Select
            label="Wording"
            value={wording}
            onChange={(event) => setWording(event.target.value as ReminderWording)}
            options={[
              { value: "friendly", label: "Friendly" },
              { value: "firm", label: "Firm" },
            ]}
          />
        )}
        {composed && (
          <div
            className="rounded-sm border border-line bg-ground p-3 text-body break-words whitespace-pre-wrap text-ink"
            aria-label="Message preview"
          >
            {composed.text}
          </div>
        )}
        {(composeError || linkResult.error) && (
          <p role="alert" className="text-secondary text-ink">
            {composeError || linkResult.error}
          </p>
        )}
        <p className="text-secondary text-ink-muted">
          You can still edit the message in WhatsApp before you send it.
        </p>
        {!TRANSLATION_REVIEWED[language] && (
          <p className="text-secondary text-ink">
            This translation has not been checked by a native speaker yet. Read it before you send
            it.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {whatsappUrl && composed && (
            <a
              className="text-white inline-flex min-h-12 items-center justify-center rounded-sm bg-brand px-4 text-body font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                onOpened?.();
                void recordMessage
                  .mutateAsync({
                    tenantId: mode.tenant.id,
                    kind: composed.kind,
                    language: composed.language,
                    ...(mode.kind === "receipt" ? { paymentId: mode.payment.id } : {}),
                  })
                  .catch(() => undefined);
              }}
            >
              Open WhatsApp
            </a>
          )}
          <Button variant="secondary" disabled={!composed} onClick={() => void copyMessage()}>
            Copy message
          </Button>
        </div>
        {copyState === "copied" && (
          <p role="status" className="text-secondary text-ink">
            Copied
          </p>
        )}
        {copyState === "error" && (
          <p role="alert" className="text-secondary text-ink">
            The message could not be copied. Check clipboard permissions.
          </p>
        )}
      </div>
    </Sheet>
  );
}
