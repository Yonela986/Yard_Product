import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { SAPhone } from "@/lib/phone";

import { authErrorMessage, OFFLINE_MESSAGE, sendCode, verifyCode } from "../api";
import { codeSchema } from "../schema";

const RESEND_SECONDS = 60;

export function CodeStep({
  phone,
  onVerified,
  onChangeNumber,
}: {
  phone: SAPhone;
  onVerified: () => void;
  onChangeNumber: () => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [seconds, setSeconds] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = codeSchema.safeParse({ code });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    if (!navigator.onLine) {
      setError(OFFLINE_MESSAGE);
      return;
    }
    setError(undefined);
    setBusy(true);
    try {
      await verifyCode(phone.e164, code);
      onVerified();
    } catch (err) {
      setError(authErrorMessage(err, "verify"));
      setBusy(false);
    }
  }

  async function resend() {
    if (!navigator.onLine) {
      setError(OFFLINE_MESSAGE);
      return;
    }
    setResending(true);
    try {
      await sendCode(phone.e164);
      setError(undefined);
      setCode("");
      setSeconds(RESEND_SECONDS);
    } catch (err) {
      setError(authErrorMessage(err, "send"));
    } finally {
      setResending(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <p className="text-body text-ink">Enter the code sent to {phone.display}</p>
      <div className="flex flex-col gap-2">
        <Input
          label="Code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          error={error}
        />
        {seconds > 0 ? (
          <p className="text-secondary text-ink-muted" aria-live="off">
            You can ask for a new code in {seconds} seconds
          </p>
        ) : (
          <Button
            variant="quiet"
            className="w-fit px-0"
            onClick={() => void resend()}
            loading={resending}
            loadingLabel="Sending"
          >
            Send a new code
          </Button>
        )}
      </div>
      <Button type="submit" fullWidth loading={busy} loadingLabel="Checking">
        Confirm
      </Button>
      <Button variant="quiet" className="w-fit px-0" onClick={onChangeNumber}>
        Use a different number
      </Button>
    </form>
  );
}
